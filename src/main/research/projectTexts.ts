import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fr } from '../../renderer/i18n/fr'
import type { SaveStatus } from '../../shared/api'
import {
  isProjectTextName,
  PROJECT_TEXT_FILES,
  MAX_TEXT_LENGTH,
  type ProjectTextName
} from '../../shared/projectTexts'
import { writeFileSafely } from '../fs/safeWrite'
import { AutoSaver } from '../project/autoSaver'
import { isNotFoundError, ProjectError } from '../project/errors'

// Synopsis, pitch et note d'intention : un fichier Markdown chacun dans neoscenar/. Un fichier
// absent est un texte vide ; il n'est créé qu'à la première saisie.

export interface ProjectTextsOptions {
  /** Dossier neoscenar/ du projet. */
  dataDir: string
  onStatus(status: SaveStatus): void
  delayMs?: number
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function checkName(name: unknown): ProjectTextName {
  if (!isProjectTextName(name)) throw new ProjectError(fr.research.docs.notFound)
  return name
}

export class ProjectTexts {
  private readonly saver: AutoSaver<true>
  private queued = new Map<ProjectTextName, string>()

  constructor(private readonly options: ProjectTextsOptions) {
    this.saver = new AutoSaver<true>({
      write: () => this.writeQueued(),
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
    this.queued = new Map()
    this.saver.discard()
  }

  private path(name: ProjectTextName): string {
    return join(this.options.dataDir, PROJECT_TEXT_FILES[name])
  }

  async read(rawName: unknown): Promise<string> {
    const name = checkName(rawName)
    await this.flush()
    try {
      return await readFile(this.path(name), 'utf8')
    } catch (error) {
      if (isNotFoundError(error)) return ''
      throw error
    }
  }

  /** Nouveau texte, écrit un peu plus tard (regroupé pendant la saisie). */
  write(rawName: unknown, text: unknown): void {
    const name = checkName(rawName)
    if (typeof text !== 'string' || text.length > MAX_TEXT_LENGTH) {
      throw new ProjectError(fr.research.docs.notFound)
    }
    this.queued.set(name, text)
    this.saver.update(true)
  }

  private async writeQueued(): Promise<void> {
    const batch = this.queued
    this.queued = new Map()
    const remaining = new Map(batch)
    try {
      for (const [name, text] of batch) {
        const file = this.path(name)
        // Rien n'a été tapé : le fichier n'est pas créé pour un texte vide.
        if (text !== '' || (await exists(file))) await writeFileSafely(file, text)
        remaining.delete(name)
      }
    } catch (error) {
      for (const [name, text] of remaining) {
        if (!this.queued.has(name)) this.queued.set(name, text)
      }
      throw error
    }
  }
}
