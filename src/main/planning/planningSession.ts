import { randomUUID } from 'node:crypto'
import type { SaveStatus } from '../../shared/api'
import { parsePlanning } from '../../shared/planning/planningData'
import type { Planning } from '../../shared/planning/types'
import { AutoSaver } from '../project/autoSaver'
import { planningFileStamp, readPlanningFile, writePlanningFile } from './planningFile'

// Le planning du projet ouvert : lecture, création à la première ouverture, enregistrement
// automatique, et détection d'une modification faite ailleurs (date de modification du fichier).

export interface PlanningSessionOptions {
  /** Dossier neoscenar/ du projet. */
  dataDir: string
  onStatus(status: SaveStatus): void
  delayMs?: number
}

export class PlanningSession {
  private readonly saver: AutoSaver<Planning>
  /** Date de modification du fichier à la dernière lecture ou au dernier enregistrement. */
  private knownStamp: number | null = null

  constructor(private readonly options: PlanningSessionOptions) {
    this.saver = new AutoSaver<Planning>({
      write: async (planning) => {
        await writePlanningFile(options.dataDir, planning)
        this.knownStamp = await planningFileStamp(options.dataDir)
      },
      delayMs: options.delayMs,
      onStatus: (status) => {
        if (status.state !== 'blocked') options.onStatus(status)
      }
    })
  }

  get hasUnsavedChanges(): boolean {
    return this.saver.hasUnsavedChanges
  }

  flush(): Promise<boolean> {
    return this.saver.flush()
  }

  discard(): void {
    this.saver.discard()
  }

  /**
   * Planning du disque. Ce qui est en attente est écrit d'abord. Un fichier absent est créé tout de
   * suite avec les cinq phases par défaut (leurs identifiants doivent rester les mêmes ensuite).
   * `changed` : le fichier n'est plus celui que cette session a lu ou écrit en dernier.
   */
  async read(): Promise<{ planning: Planning; changed: boolean }> {
    await this.saver.flush()
    const stamp = await planningFileStamp(this.options.dataDir)
    const { planning } = await readPlanningFile(this.options.dataDir)
    if (stamp === 0) {
      await writePlanningFile(this.options.dataDir, planning)
      this.knownStamp = await planningFileStamp(this.options.dataDir)
      return { planning, changed: false }
    }
    const changed = this.knownStamp !== null && this.knownStamp !== stamp
    this.knownStamp = stamp
    return { planning, changed }
  }

  /** Nouveau planning de l'interface : revérifié, puis écrit un peu plus tard. */
  update(raw: unknown): void {
    this.saver.update(parsePlanning(raw, { newId: () => randomUUID() }))
  }
}
