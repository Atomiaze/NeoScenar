import type { ScenarioConflictChoice, ScenarioSaveStatus } from '../../shared/api'
import { AutoSaver } from './autoSaver'
import { ScenarioFile, type ScenarioDisk } from './scenarioFile'

export interface ScenarioSessionOptions {
  path: string
  onStatus(status: ScenarioSaveStatus): void
  disk?: ScenarioDisk
  delayMs?: number
}

/**
 * Le scénario du projet ouvert : dernier texte reçu de l'éditeur, enregistrement automatique, et
 * arrêt des écritures quand le fichier a été modifié dans un autre logiciel, jusqu'à la décision
 * de l'élève (recharger le fichier ou garder la version de NeoScenar).
 */
export class ScenarioSession {
  private text: string | null = null
  private readonly file: ScenarioFile
  private readonly saver: AutoSaver<string>

  constructor(options: ScenarioSessionOptions) {
    this.file = new ScenarioFile(options.path, options.disk)
    this.saver = new AutoSaver<string>({
      write: (text) => this.file.write(text),
      onStatus: (status) =>
        options.onStatus(status.state === 'blocked' ? { state: 'conflict' } : status),
      delayMs: options.delayMs
    })
  }

  get hasUnsavedChanges(): boolean {
    return this.saver.hasUnsavedChanges || this.saver.isBlocked
  }

  /** Texte complet du fichier (page de titre comprise), lu au premier appel. */
  async get(): Promise<string> {
    this.text ??= await this.file.load()
    return this.text
  }

  update(text: string): void {
    this.text = text
    this.saver.update(text)
  }

  flush(): Promise<boolean> {
    return this.saver.flush()
  }

  discard(): void {
    this.saver.discard()
  }

  /**
   * Vérifie si le fichier a été modifié ailleurs (au retour dans NeoScenar, par exemple).
   * Sans modification en attente dans NeoScenar, le fichier est simplement relu : renvoie son texte.
   * Si les deux côtés ont été modifiés, les écritures s'arrêtent jusqu'à la décision de l'élève.
   */
  async check(): Promise<string | null> {
    if (this.text === null || this.saver.isBlocked) return null
    if ((await this.file.externalChange()) === null) return null
    if (this.saver.hasUnsavedChanges) {
      this.saver.block()
      return null
    }
    this.text = await this.file.load()
    return this.text
  }

  /** Décision de l'élève après une modification extérieure ; renvoie le texte à afficher. */
  async resolve(choice: ScenarioConflictChoice): Promise<string> {
    if (choice === 'reload') {
      this.saver.discard()
      this.text = await this.file.load()
      return this.text
    }
    const disk = await this.file.externalChange()
    if (disk !== null) this.file.accept(disk)
    this.saver.resume()
    // La version de NeoScenar remplace celle du disque, même sans modification en attente.
    if (this.text !== null) this.saver.update(this.text)
    return this.text ?? ''
  }
}
