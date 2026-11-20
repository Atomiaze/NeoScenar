import { mkdir, readdir, readFile, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { fr } from '../../renderer/i18n/fr'
import type { SaveStatus } from '../../shared/api'
import { parseCreditsData } from '../../shared/credits/creditsData'
import { CREDITS_LOGOS_FOLDER, type CreditsData } from '../../shared/credits/types'
import { isDisplayedImageName } from '../../shared/research/sheetImages'
import { avoidReservedName } from '../../shared/fileNameRules'
import { uniqueFileName } from '../../shared/research/sheetNames'
import { writeFileSafely } from '../fs/safeWrite'
import { checkImage, MAX_IMAGE_BYTES } from '../images/thumbnailFiles'
import { AutoSaver } from '../project/autoSaver'
import { ProjectError } from '../project/errors'
import { readCreditsFile, writeCreditsFile } from './creditsFile'

// Le générique du projet ouvert : lecture, enregistrement automatique et copie des logos.

export interface CreditsSessionOptions {
  /** Dossier neoscenar/ du projet. */
  dataDir: string
  onStatus(status: SaveStatus): void
  delayMs?: number
}

/** Nom de fichier de logo sans accent ni espace (règle des fichiers créés par l'application). */
export function logoFileName(original: string): string {
  const name = basename(original.replace(/\\/g, '/'))
  const dot = name.lastIndexOf('.')
  const clean = (text: string): string =>
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
  const base = clean(dot > 0 ? name.slice(0, dot) : name) || 'logo'
  const extension = dot > 0 ? name.slice(dot).toLowerCase() : '.png'
  return `${avoidReservedName(base)}${extension}`
}

export class CreditsSession {
  private readonly saver: AutoSaver<CreditsData>

  constructor(private readonly options: CreditsSessionOptions) {
    this.saver = new AutoSaver<CreditsData>({
      write: (data) => writeCreditsFile(options.dataDir, data),
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

  /** Données du disque (un fichier absent donne un générique vide). */
  async read(): Promise<CreditsData> {
    return (await readCreditsFile(this.options.dataDir)).data
  }

  /** Nouvelles données de l'interface : revérifiées, puis écrites un peu plus tard. */
  update(raw: unknown): void {
    this.saver.update(parseCreditsData(raw))
  }

  /** Copie un logo dans generique/logos/ ; renvoie son chemin relatif à neoscenar/. */
  async storeLogoBytes(bytes: Uint8Array, originalName: string): Promise<string> {
    const wanted = logoFileName(originalName)
    if (!isDisplayedImageName(wanted)) throw new ProjectError(fr.images.unsupported)
    checkImage(bytes)
    const folder = join(this.options.dataDir, ...CREDITS_LOGOS_FOLDER.split('/'))
    await mkdir(folder, { recursive: true })
    const fileName = uniqueFileName(wanted, await readdir(folder))
    await writeFileSafely(join(folder, fileName), bytes)
    return `${CREDITS_LOGOS_FOLDER}/${fileName}`
  }

  async storeLogoFile(sourcePath: string): Promise<string> {
    try {
      const info = await stat(sourcePath)
      if (!info.isFile()) throw new ProjectError(fr.images.unsupported)
      if (info.size > MAX_IMAGE_BYTES) throw new ProjectError(fr.images.tooHeavy)
    } catch (error) {
      if (error instanceof ProjectError) throw error
      throw new ProjectError(fr.images.unreadable)
    }
    return this.storeLogoBytes(await readFile(sourcePath), basename(sourcePath))
  }
}
