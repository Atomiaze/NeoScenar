import { readFile } from 'node:fs/promises'
import { writeFileSafely } from '../fs/safeWrite'
import { WriteBlockedError } from './autoSaver'
import { isNotFoundError } from './errors'

/** Opérations disque, remplaçables dans les tests. */
export interface ScenarioDisk {
  /** Contenu du fichier, ou null s'il n'existe pas. */
  read(path: string): Promise<string | null>
  write(path: string, text: string): Promise<void>
}

const realDisk: ScenarioDisk = {
  async read(path) {
    try {
      return await readFile(path, 'utf8')
    } catch (error) {
      if (isNotFoundError(error)) return null
      throw error
    }
  },
  write: (path, text) => writeFileSafely(path, text)
}

/**
 * Fichier scenario.fountain : retient le dernier contenu connu sur le disque (lu ou écrit par
 * NeoScenar) pour ne jamais écraser une modification faite dans un autre logiciel (Obsidian…).
 */
export class ScenarioFile {
  private known: string | null = null

  constructor(
    readonly path: string,
    private readonly disk: ScenarioDisk = realDisk
  ) {}

  /** Lit le fichier et le retient comme version connue. */
  async load(): Promise<string> {
    const text = (await this.disk.read(this.path)) ?? ''
    this.known = text
    return text
  }

  /** Contenu actuel du disque s'il a été modifié ailleurs depuis la dernière lecture ou écriture. */
  async externalChange(): Promise<string | null> {
    const disk = await this.disk.read(this.path)
    return disk !== null && disk !== this.known ? disk : null
  }

  /** Écrit le texte, sauf si le fichier a été modifié ailleurs : WriteBlockedError. */
  async write(text: string): Promise<void> {
    if ((await this.externalChange()) !== null) throw new WriteBlockedError()
    await this.disk.write(this.path, text)
    this.known = text
  }

  /** L'élève garde la version de NeoScenar : la version du disque est acceptée comme connue. */
  accept(diskText: string): void {
    this.known = diskText
  }
}
