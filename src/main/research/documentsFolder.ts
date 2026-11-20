import { copyFile, cp, mkdir, readdir, readFile, rename, rm, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { fr } from '../../renderer/i18n/fr'
import type { SaveStatus } from '../../shared/api'
import {
  DOCUMENTS_FOLDER,
  documentFolderName,
  documentKey,
  documentNoteFileName,
  joinPath,
  noteDisplayName,
  type DocumentFolder,
  type DocumentImage
} from '../../shared/research/documents'
import { isDisplayedImageName } from '../../shared/research/sheetImages'
import {
  cleanSheetName,
  MAX_SHEET_NAME_LENGTH,
  SHEET_EXTENSION,
  uniqueFileName
} from '../../shared/research/sheetNames'
import { checkPathLength, checkTypedName } from '../fs/nameChecks'
import { writeFileSafely } from '../fs/safeWrite'
import { checkImage, MAX_IMAGE_BYTES } from '../images/thumbnailFiles'
import { AutoSaver } from '../project/autoSaver'
import { isNotFoundError, ProjectError } from '../project/errors'
import { BACKUP_FOLDER, backupStamp } from '../project/linkBackups'
import { safeImageName } from './sheetFolder'

/** Dossiers et notes supprimés : copiés ici (jamais effacés sans copie). */
export const DELETED_DOCUMENTS_FOLDER = 'documents_supprimes'
/** Images retirées d'une galerie : déplacées ici, jamais supprimées. */
export const REMOVED_IMAGES_FOLDER = 'documents_images_retirees'

const MAX_DEPTH = 20

export interface DocumentsFolderOptions {
  /** Dossier neoscenar/ du projet. */
  dataDir: string
  onStatus(status: SaveStatus): void
  delayMs?: number
}

/** Segments d'un chemin envoyé par l'interface ; refuse tout ce qui sortirait de documents/. */
function parseSegments(raw: unknown, allowRoot: boolean): string[] {
  if (typeof raw !== 'string') throw new ProjectError(fr.research.docs.notFound)
  const segments = raw === '' ? [] : raw.split('/')
  const bad = segments.some(
    (segment) =>
      segment === '' ||
      segment === '.' ||
      segment === '..' ||
      segment.startsWith('.') ||
      /[\\:*?"<>|]/.test(segment)
  )
  if (bad || (segments.length === 0 && !allowRoot) || segments.length > MAX_DEPTH) {
    throw new ProjectError(fr.research.docs.notFound)
  }
  return segments
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

function byName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name, 'fr', { numeric: true, sensitivity: 'base' })
}

/**
 * Les documents du projet (neoscenar/documents/) : de vrais dossiers, des notes Markdown et des
 * images posées dans les dossiers. L'arbre est toujours relu sur le disque : ce qui est ajouté
 * dans le Finder ou Obsidian apparaît au retour dans NeoScenar.
 */
export class DocumentsFolder {
  private queued = new Map<string, string>()
  private readonly saver: AutoSaver<true>

  constructor(private readonly options: DocumentsFolderOptions) {
    this.saver = new AutoSaver<true>({
      write: () => this.writeQueued(),
      delayMs: options.delayMs,
      onStatus: (status) => {
        if (status.state !== 'blocked') options.onStatus(status)
      }
    })
  }

  private get root(): string {
    return join(this.options.dataDir, DOCUMENTS_FOLDER)
  }

  private absolute(segments: string[]): string {
    return join(this.root, ...segments)
  }

  get hasUnsavedChanges(): boolean {
    return this.saver.hasUnsavedChanges
  }

  flush(): Promise<boolean> {
    return this.saver.flush()
  }

  discard(): void {
    this.queued.clear()
    this.saver.discard()
  }

  private async readFolder(segments: string[]): Promise<DocumentFolder> {
    const path = segments.join('/')
    const folder: DocumentFolder = {
      path,
      name: (segments.at(-1) ?? '').normalize('NFC'),
      folders: [],
      notes: [],
      images: []
    }
    let entries
    try {
      entries = await readdir(this.absolute(segments), { withFileTypes: true })
    } catch (error) {
      if (isNotFoundError(error)) return folder
      throw error
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      if (entry.isDirectory()) {
        if (segments.length < MAX_DEPTH) {
          folder.folders.push(await this.readFolder([...segments, entry.name]))
        }
      } else if (entry.isFile()) {
        const lower = entry.name.toLowerCase()
        if (lower.endsWith(SHEET_EXTENSION)) {
          folder.notes.push({ path: joinPath(path, entry.name), name: noteDisplayName(entry.name) })
        } else if (isDisplayedImageName(entry.name)) {
          folder.images.push({
            fileName: entry.name,
            path: [DOCUMENTS_FOLDER, ...segments, entry.name].join('/')
          })
        }
      }
    }
    folder.folders.sort(byName)
    folder.notes.sort(byName)
    folder.images.sort((a, b) => byName({ name: a.fileName }, { name: b.fileName }))
    return folder
  }

  /** L'arbre complet, relu sur le disque (après avoir écrit ce qui était en attente). */
  async list(): Promise<DocumentFolder> {
    await this.flush()
    return this.readFolder([])
  }

  /** Nom propre d'une nouvelle entrée, refusé s'il est vide, trop long ou pris par un voisin. */
  private async checkNewName(
    parent: string[],
    rawName: unknown,
    kind: 'folder' | 'note',
    except?: string
  ): Promise<string> {
    const name = typeof rawName === 'string' ? cleanSheetName(rawName) : ''
    if (name === '') throw new ProjectError(fr.research.emptyName)
    if (name.length > MAX_SHEET_NAME_LENGTH) throw new ProjectError(fr.research.nameTooLong)
    // Ici le nom tapé devient le nom du fichier : refusé plutôt que changé en silence.
    checkTypedName(name)
    const fileName = kind === 'folder' ? documentFolderName(name) : documentNoteFileName(name)
    checkPathLength(this.absolute([...parent, fileName]))
    const key = documentKey(fileName)
    let siblings: string[] = []
    try {
      const entries = await readdir(this.absolute(parent), { withFileTypes: true })
      siblings = entries
        .filter((entry) => (kind === 'folder' ? entry.isDirectory() : entry.isFile()))
        .map((entry) => entry.name)
    } catch (error) {
      if (!isNotFoundError(error)) throw error
    }
    const taken = siblings.find((other) => other !== except && documentKey(other) === key)
    if (taken) {
      const shown = kind === 'folder' ? taken : noteDisplayName(taken)
      throw new ProjectError(fr.research.docs.nameTaken(shown.normalize('NFC')))
    }
    return fileName
  }

  private async requireFolder(raw: unknown): Promise<string[]> {
    const segments = parseSegments(raw, true)
    let info
    try {
      info = await stat(this.absolute(segments))
    } catch (error) {
      // La racine n'existe pas tant qu'on n'y a rien créé.
      if (segments.length === 0 && isNotFoundError(error)) return segments
      if (isNotFoundError(error)) throw new ProjectError(fr.research.docs.notFound)
      throw error
    }
    if (!info.isDirectory()) throw new ProjectError(fr.research.docs.notFound)
    return segments
  }

  async createFolder(rawParent: unknown, rawName: unknown): Promise<string> {
    const parent = await this.requireFolder(rawParent)
    const name = await this.checkNewName(parent, rawName, 'folder')
    await mkdir(this.absolute([...parent, name]), { recursive: true })
    return joinPath(parent.join('/'), name)
  }

  async createNote(rawFolder: unknown, rawName: unknown): Promise<string> {
    const folder = await this.requireFolder(rawFolder)
    const fileName = await this.checkNewName(folder, rawName, 'note')
    await mkdir(this.absolute(folder), { recursive: true })
    await writeFileSafely(this.absolute([...folder, fileName]), '')
    return joinPath(folder.join('/'), fileName)
  }

  private async requireNote(raw: unknown): Promise<string[]> {
    const segments = parseSegments(raw, false)
    const last = segments[segments.length - 1]
    if (!last.toLowerCase().endsWith(SHEET_EXTENSION)) {
      throw new ProjectError(fr.research.docs.notFound)
    }
    return segments
  }

  async readNote(rawPath: unknown): Promise<string> {
    await this.flush()
    const segments = await this.requireNote(rawPath)
    try {
      return await readFile(this.absolute(segments), 'utf8')
    } catch (error) {
      if (isNotFoundError(error)) throw new ProjectError(fr.research.docs.notFound)
      throw error
    }
  }

  /** Nouveau texte d'une note, écrit un peu plus tard (regroupé pendant la saisie). */
  async writeNote(rawPath: unknown, text: unknown): Promise<void> {
    const segments = await this.requireNote(rawPath)
    if (typeof text !== 'string' || text.length > 5_000_000) {
      throw new ProjectError(fr.research.docs.notFound)
    }
    this.queued.set(segments.join('/'), text)
    this.saver.update(true)
  }

  private async writeQueued(): Promise<void> {
    const batch = this.queued
    this.queued = new Map()
    const remaining = new Map(batch)
    try {
      for (const [path, text] of batch) {
        const absolute = this.absolute(path.split('/'))
        // Note supprimée ailleurs entre-temps : on ne la recrée pas.
        if (await exists(absolute)) await writeFileSafely(absolute, text)
        remaining.delete(path)
      }
    } catch (error) {
      for (const [path, text] of remaining) {
        if (!this.queued.has(path)) this.queued.set(path, text)
      }
      throw error
    }
  }

  /** Renomme un dossier ou une note ; renvoie le nouveau chemin. */
  async renameEntry(rawPath: unknown, rawName: unknown): Promise<string> {
    await this.flush()
    const segments = parseSegments(rawPath, false)
    const source = this.absolute(segments)
    let info
    try {
      info = await stat(source)
    } catch (error) {
      if (isNotFoundError(error)) throw new ProjectError(fr.research.docs.notFound)
      throw error
    }
    const parent = segments.slice(0, -1)
    const kind = info.isDirectory() ? 'folder' : 'note'
    if (kind === 'note') await this.requireNote(rawPath)
    const name = await this.checkNewName(parent, rawName, kind, segments.at(-1))
    if (name !== segments.at(-1)) await rename(source, this.absolute([...parent, name]))
    return joinPath(parent.join('/'), name)
  }

  /** Copie dans sauvegardes/documents_supprimes/, puis supprime le dossier ou la note. */
  async removeEntry(rawPath: unknown, now = new Date()): Promise<string> {
    await this.flush()
    const segments = parseSegments(rawPath, false)
    const source = this.absolute(segments)
    let info
    try {
      info = await stat(source)
    } catch (error) {
      if (isNotFoundError(error)) throw new ProjectError(fr.research.docs.notFound)
      throw error
    }
    const folder = [BACKUP_FOLDER, DELETED_DOCUMENTS_FOLDER]
    const backupDir = join(this.options.dataDir, ...folder)
    await mkdir(backupDir, { recursive: true })
    const backupName = uniqueFileName(
      `${backupStamp(now)}_${segments.at(-1)}`,
      await readdir(backupDir)
    )
    const target = join(backupDir, backupName)
    if (info.isDirectory()) await cp(source, target, { recursive: true })
    else await copyFile(source, target)
    await rm(source, { recursive: true })
    this.queued.delete(segments.join('/'))
    return [...folder, backupName].join('/')
  }

  private async imageTarget(rawFolder: unknown): Promise<string[]> {
    const folder = await this.requireFolder(rawFolder)
    await mkdir(this.absolute(folder), { recursive: true })
    return folder
  }

  /** Copie une image dans le dossier, sous son nom d'origine (suffixe -2, -3 si le nom est pris). */
  async storeImageBytes(
    rawFolder: unknown,
    bytes: Uint8Array,
    originalName: string
  ): Promise<DocumentImage> {
    checkImage(bytes)
    const folder = await this.imageTarget(rawFolder)
    const dir = this.absolute(folder)
    const fileName = uniqueFileName(safeImageName(originalName), await readdir(dir))
    await writeFileSafely(join(dir, fileName), bytes)
    return { fileName, path: [DOCUMENTS_FOLDER, ...folder, fileName].join('/') }
  }

  async storeImageFile(rawFolder: unknown, sourcePath: string): Promise<DocumentImage> {
    try {
      const info = await stat(sourcePath)
      if (!info.isFile()) throw new ProjectError(fr.images.unsupported)
      if (info.size > MAX_IMAGE_BYTES) throw new ProjectError(fr.images.tooHeavy)
    } catch (error) {
      if (error instanceof ProjectError) throw error
      throw new ProjectError(fr.images.unreadable)
    }
    return this.storeImageBytes(rawFolder, await readFile(sourcePath), basename(sourcePath))
  }

  /** Retire une image de la galerie : le fichier est déplacé dans sauvegardes/, pas supprimé. */
  async removeImage(rawFolder: unknown, rawFileName: unknown, now = new Date()): Promise<string> {
    const folder = await this.requireFolder(rawFolder)
    if (
      typeof rawFileName !== 'string' ||
      basename(rawFileName) !== rawFileName ||
      rawFileName.startsWith('.') ||
      !isDisplayedImageName(rawFileName)
    ) {
      throw new ProjectError(fr.research.docs.notFound)
    }
    const source = this.absolute([...folder, rawFileName])
    if (!(await exists(source))) throw new ProjectError(fr.research.docs.notFound)
    const target = [BACKUP_FOLDER, REMOVED_IMAGES_FOLDER]
    const backupDir = join(this.options.dataDir, ...target)
    await mkdir(backupDir, { recursive: true })
    const backupName = uniqueFileName(
      `${backupStamp(now)}_${rawFileName}`,
      await readdir(backupDir)
    )
    await copyFile(source, join(backupDir, backupName))
    await rm(source)
    return [...target, backupName].join('/')
  }
}
