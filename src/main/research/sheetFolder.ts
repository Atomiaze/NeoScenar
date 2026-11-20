import { copyFile, mkdir, readdir, readFile, rename, rm, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { fr } from '../../renderer/i18n/fr'
import type { SaveStatus } from '../../shared/api'
import {
  applySheetPatch,
  newSheetText,
  parseSheet,
  renameSheetText
} from '../../shared/research/sheetEngine'
import { avoidReservedName, isPathTooLong } from '../../shared/fileNameRules'
import { sameIgnoringLineEndings } from '../../shared/lineEndings'
import { imageCandidates } from '../../shared/research/sheetImages'
import {
  cleanSheetName,
  fileNameTaken,
  MAX_SHEET_NAME_LENGTH,
  nameKey,
  proposeColor,
  SHEET_EXTENSION,
  sheetFileName,
  uniqueFileName
} from '../../shared/research/sheetNames'
import {
  SHEET_IMAGES_FOLDER,
  type Sheet,
  type SheetImage,
  type SheetKind,
  type SheetPatch
} from '../../shared/research/types'
import { checkPathLength } from '../fs/nameChecks'
import { writeFileSafely } from '../fs/safeWrite'
import { checkImage, MAX_IMAGE_BYTES, resolveDataPath } from '../images/thumbnailFiles'
import { AutoSaver } from '../project/autoSaver'
import { isNotFoundError, ProjectError } from '../project/errors'
import { BACKUP_FOLDER, backupStamp } from '../project/linkBackups'

/** Fiches supprimées : copiées ici (jamais effacées), dans un sous-dossier par type. */
export const DELETED_SHEETS_FOLDER = 'fiches_supprimees'

/** Nom d'image venu d'ailleurs (presse-papiers, autre application) : réduit à un nom simple. */
export function safeImageName(name: string): string {
  const clean = basename(name.replace(/\\/g, '/'))
    .replace(/[/\\:*?"<>|]/g, '_')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f]/g, '_')
    .replace(/^\.+/, '')
    .trim()
    // Windows refuse un point ou une espace final, et les noms réservés (« aux.png »).
    .replace(/[. ]+$/, '')
  return clean === '' ? 'image.png' : avoidReservedName(clean)
}

/** Deux modifications successives d'une même fiche : la plus récente l'emporte, champ par champ. */
function mergePatches(older: SheetPatch | undefined, newer: SheetPatch): SheetPatch {
  if (!older) return newer
  return {
    props: older.props || newer.props ? { ...older.props, ...newer.props } : undefined,
    sections:
      older.sections || newer.sections ? { ...older.sections, ...newer.sections } : undefined,
    auto: newer.auto ?? older.auto,
    images: newer.images ?? older.images
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

export interface SheetFolderOptions {
  /** Dossier neoscenar/ du projet. */
  dataDir: string
  kind: SheetKind
  onStatus(status: SaveStatus): void
  /** Délai de regroupement des écritures (tests). */
  delayMs?: number
}

/**
 * Les fiches d'un dossier (personnages/…) : lecture, création, suppression, images, et
 * enregistrement automatique. Chaque modification est appliquée à la version du disque au moment
 * d'écrire : ce qu'un autre logiciel (Obsidian) a ajouté entre-temps n'est jamais écrasé.
 */
export class SheetFolder {
  private queued = new Map<string, SheetPatch>()
  private readonly saver: AutoSaver<true>

  constructor(private readonly options: SheetFolderOptions) {
    this.saver = new AutoSaver<true>({
      write: () => this.writeQueued(),
      delayMs: options.delayMs,
      onStatus: (status) => {
        if (status.state !== 'blocked') options.onStatus(status)
      }
    })
  }

  private get dir(): string {
    return join(this.options.dataDir, this.options.kind)
  }

  private get imagesDir(): string {
    return join(this.dir, SHEET_IMAGES_FOLDER)
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

  /** Noms des fichiers de fiches du dossier (fichiers cachés et temporaires exclus). */
  private async fileNames(): Promise<string[]> {
    try {
      const entries = await readdir(this.dir, { withFileTypes: true })
      return entries
        .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
        .map((entry) => entry.name)
        .filter((name) => name.toLowerCase().endsWith(SHEET_EXTENSION))
    } catch (error) {
      if (isNotFoundError(error)) return []
      throw error
    }
  }

  /** Refuse tout nom qui n'est pas celui d'une fiche de ce dossier (le nom vient de l'interface). */
  private checkFileName(fileName: unknown): string {
    if (
      typeof fileName !== 'string' ||
      basename(fileName) !== fileName ||
      fileName.startsWith('.') ||
      !fileName.toLowerCase().endsWith(SHEET_EXTENSION)
    ) {
      throw new ProjectError(fr.research.sheetNotFound)
    }
    return fileName
  }

  private async resolveImage(ref: string): Promise<SheetImage> {
    for (const candidate of imageCandidates(this.options.kind, ref)) {
      if (await exists(resolveDataPath(this.options.dataDir, candidate))) {
        return { ref, path: candidate }
      }
    }
    return { ref, path: null }
  }

  private async readSheet(fileName: string): Promise<Sheet> {
    const raw = await readFile(join(this.dir, fileName), 'utf8')
    const content = parseSheet(raw, this.options.kind)
    return {
      ...content,
      // Une fiche sans propriété « nom » (créée à la main) prend le nom de son fichier.
      nom: content.nom || fileName.slice(0, -SHEET_EXTENSION.length),
      kind: this.options.kind,
      fileName,
      images: await Promise.all(content.images.map((ref) => this.resolveImage(ref)))
    }
  }

  /** Toutes les fiches, relues sur le disque (après avoir écrit ce qui était en attente). */
  async list(): Promise<Sheet[]> {
    await this.flush()
    const sheets: Sheet[] = []
    for (const fileName of await this.fileNames()) {
      // Une fiche illisible (fichier verrouillé…) n'empêche pas d'afficher les autres.
      await this.readSheet(fileName).then(
        (sheet) => sheets.push(sheet),
        () => undefined
      )
    }
    return sheets
  }

  /** Nouvelle fiche ; refusée si le nom (ou le nom de fichier) est déjà pris. */
  async create(rawName: unknown): Promise<Sheet> {
    const name = typeof rawName === 'string' ? cleanSheetName(rawName) : ''
    if (name === '') throw new ProjectError(fr.research.emptyName)
    if (name.length > MAX_SHEET_NAME_LENGTH) throw new ProjectError(fr.research.nameTooLong)
    const sheets = await this.list()
    const fileName = sheetFileName(name)
    const taken = sheets.find(
      (sheet) => nameKey(sheet.nom) === nameKey(name) || fileNameTaken(fileName, [sheet.fileName])
    )
    if (taken) throw new ProjectError(fr.research.nameTaken(taken.nom))
    checkPathLength(join(this.dir, fileName))
    const couleur = proposeColor(sheets.map((sheet) => sheet.props.couleur ?? ''))
    await mkdir(this.imagesDir, { recursive: true })
    await writeFileSafely(
      join(this.dir, fileName),
      newSheetText(this.options.kind, name, { couleur })
    )
    return this.readSheet(fileName)
  }

  /**
   * Fiches vides (« auto: true ») pour des noms trouvés dans le scénario (étape 10C). Un nom déjà
   * pris (nom ou fichier) est passé sans erreur : la fiche existe déjà. Renvoie les fiches créées.
   */
  async createAuto(rawNames: readonly unknown[]): Promise<Sheet[]> {
    const sheets = await this.list()
    const names = sheets.map((sheet) => sheet.nom)
    const fileNames = sheets.map((sheet) => sheet.fileName)
    const colors = sheets.map((sheet) => sheet.props.couleur ?? '')
    const created: Sheet[] = []
    for (const raw of rawNames) {
      const name = typeof raw === 'string' ? cleanSheetName(raw) : ''
      if (name === '' || name.length > MAX_SHEET_NAME_LENGTH) continue
      const fileName = sheetFileName(name)
      if (isPathTooLong(join(this.dir, fileName))) continue
      const key = nameKey(name)
      if (names.some((other) => nameKey(other) === key) || fileNameTaken(fileName, fileNames)) {
        continue
      }
      const couleur = proposeColor(colors)
      await mkdir(this.dir, { recursive: true })
      await writeFileSafely(
        join(this.dir, fileName),
        newSheetText(this.options.kind, name, { couleur }, true)
      )
      names.push(name)
      fileNames.push(fileName)
      colors.push(couleur)
      created.push(await this.readSheet(fileName))
    }
    return created
  }

  /** Modification d'une fiche, écrite un peu plus tard (regroupée pendant la saisie). */
  update(rawFileName: unknown, patch: SheetPatch): void {
    const fileName = this.checkFileName(rawFileName)
    this.queued.set(fileName, mergePatches(this.queued.get(fileName), patch))
    this.saver.update(true)
  }

  private async writeQueued(): Promise<void> {
    const batch = this.queued
    this.queued = new Map()
    const remaining = new Map(batch)
    try {
      for (const [fileName, patch] of batch) {
        const path = join(this.dir, fileName)
        let raw: string
        try {
          raw = await readFile(path, 'utf8')
        } catch (error) {
          // Fiche supprimée ailleurs entre-temps : on ne la recrée pas à moitié.
          if (isNotFoundError(error)) {
            remaining.delete(fileName)
            continue
          }
          throw error
        }
        let updated: string
        try {
          updated = applySheetPatch(raw, this.options.kind, patch)
        } catch {
          throw new ProjectError(fr.research.unreadableProperties(fileName))
        }
        if (!sameIgnoringLineEndings(updated, raw)) await writeFileSafely(path, updated)
        remaining.delete(fileName)
      }
    } catch (error) {
      // Rien n'est perdu : ce qui n'a pas été écrit repasse avant les modifications plus récentes.
      for (const [fileName, patch] of remaining) {
        this.queued.set(fileName, mergePatches(patch, this.queued.get(fileName) ?? {}))
      }
      throw error
    }
  }

  /**
   * Fiche existante, prête à être renommée en `rawName` : refus si le nom est vide, trop long, ou
   * déjà pris par une autre fiche (MARIE = Marie). Renvoie le nom propre.
   */
  async checkRename(rawFileName: unknown, rawName: unknown): Promise<string> {
    const fileName = this.checkFileName(rawFileName)
    const name = typeof rawName === 'string' ? cleanSheetName(rawName) : ''
    if (name === '') throw new ProjectError(fr.research.emptyName)
    if (name.length > MAX_SHEET_NAME_LENGTH) throw new ProjectError(fr.research.nameTooLong)
    const sheets = await this.list()
    const self = sheets.find((sheet) => sheet.fileName === fileName)
    if (!self) throw new ProjectError(fr.research.sheetNotFound)
    if (self.unreadable) throw new ProjectError(fr.research.unreadableProperties(fileName))
    const newFileName = sheetFileName(name)
    const taken = sheets.find(
      (sheet) =>
        sheet !== self &&
        (nameKey(sheet.nom) === nameKey(name) || fileNameTaken(newFileName, [sheet.fileName]))
    )
    if (taken) throw new ProjectError(fr.research.renameTaken(taken.nom))
    checkPathLength(join(this.dir, newFileName))
    return name
  }

  /**
   * Renomme une fiche (étape 10D) : propriété « nom » et nom du fichier. Les images ne bougent
   * pas (leurs liens sont relatifs au dossier, pas au nom de la fiche).
   */
  async rename(rawFileName: unknown, rawName: unknown): Promise<Sheet> {
    const name = await this.checkRename(rawFileName, rawName)
    const fileName = this.checkFileName(rawFileName)
    const source = join(this.dir, fileName)
    const raw = await readFile(source, 'utf8')
    let updated: string
    try {
      updated = renameSheetText(raw, name)
    } catch {
      throw new ProjectError(fr.research.unreadableProperties(fileName))
    }
    if (!sameIgnoringLineEndings(updated, raw)) await writeFileSafely(source, updated)
    const newFileName = sheetFileName(name)
    // Même quand seule la casse change (Marie → MARIE), un simple renommage suffit, Mac compris.
    if (newFileName !== fileName) await rename(source, join(this.dir, newFileName))
    return this.readSheet(newFileName)
  }

  /**
   * Supprime une fiche après l'avoir copiée dans sauvegardes/fiches_supprimees/<type>/. Ses images
   * restent en place. Renvoie le chemin de la copie, relatif à neoscenar/.
   */
  async remove(rawFileName: unknown, now = new Date()): Promise<string> {
    const fileName = this.checkFileName(rawFileName)
    await this.flush()
    this.queued.delete(fileName)
    const source = join(this.dir, fileName)
    if (!(await exists(source))) throw new ProjectError(fr.research.sheetNotFound)
    const folder = [BACKUP_FOLDER, DELETED_SHEETS_FOLDER, this.options.kind]
    const backupDir = join(this.options.dataDir, ...folder)
    await mkdir(backupDir, { recursive: true })
    const backupName = uniqueFileName(`${backupStamp(now)}_${fileName}`, await readdir(backupDir))
    await copyFile(source, join(backupDir, backupName))
    await rm(source)
    return [...folder, backupName].join('/')
  }

  /** Copie une image dans le dossier images/ des fiches, sous son nom d'origine (libre). */
  async storeImageBytes(bytes: Uint8Array, originalName: string): Promise<SheetImage> {
    checkImage(bytes)
    await mkdir(this.imagesDir, { recursive: true })
    const fileName = uniqueFileName(safeImageName(originalName), await readdir(this.imagesDir))
    await writeFileSafely(join(this.imagesDir, fileName), bytes)
    const ref = `${SHEET_IMAGES_FOLDER}/${fileName}`
    return { ref, path: `${this.options.kind}/${ref}` }
  }

  async storeImageFile(sourcePath: string): Promise<SheetImage> {
    try {
      const info = await stat(sourcePath)
      if (!info.isFile()) throw new ProjectError(fr.images.unsupported)
      if (info.size > MAX_IMAGE_BYTES) throw new ProjectError(fr.images.tooHeavy)
    } catch (error) {
      if (error instanceof ProjectError) throw error
      throw new ProjectError(fr.images.unreadable)
    }
    return this.storeImageBytes(await readFile(sourcePath), basename(sourcePath))
  }
}
