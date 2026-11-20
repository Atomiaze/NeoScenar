import { randomUUID } from 'node:crypto'
import { access, copyFile, cp, mkdir, readdir, readFile, rename, rm } from 'node:fs/promises'
import { basename, join, relative, resolve } from 'node:path'
import { fr } from '../../renderer/i18n/fr'
import { PROJECT_FILES, type Decoupage, type ProjectData } from '../../shared/projectTypes'
import {
  isVersionFolderName,
  parseVersionData,
  sortVersions,
  VERSION_FILE,
  VERSION_FORMAT,
  versionFolderName,
  VERSIONS_FOLDER,
  type VersionData,
  type VersionEntry
} from '../../shared/versions/versions'
import { writeFileSafely, writeJsonSafely } from '../fs/safeWrite'
import { isSameOrInside } from '../portablePath'
import { BACKUP_FOLDER } from '../project/linkBackups'
import { ProjectError } from '../project/errors'
import { parseDecoupage, parseProjectData } from '../project/validators'
import { parseJsonText } from '../../shared/lineEndings'

// Versions sur le disque (étape 13C) : neoscenar/versions/<AAAAMMJJ-HHMMSS>_<nom>/. Une version n'est
// jamais supprimée automatiquement ; « Supprimer » la déplace dans sauvegardes/versions_supprimees/.

/** Les trois fichiers copiés dans une version. */
export const VERSIONED_FILES = [
  PROJECT_FILES.scenario,
  PROJECT_FILES.decoupage,
  PROJECT_FILES.project
] as const

export const DELETED_VERSIONS_FOLDER = 'versions_supprimees'

/** Contenu d'une version, lu et vérifié. */
export interface VersionFiles {
  data: VersionData
  scenario: string
  decoupage: Decoupage
  /** projet.json tel qu'il est écrit (clés inconnues gardées). */
  projectRaw: Record<string, unknown>
  project: ProjectData
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function versionsDir(dataDir: string): string {
  return join(dataDir, VERSIONS_FOLDER)
}

function versionDir(dataDir: string, folder: unknown): string {
  if (!isVersionFolderName(folder)) throw new ProjectError(fr.versions.notFound)
  return join(versionsDir(dataDir), folder)
}

async function subfolders(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
  } catch {
    return []
  }
}

async function readEntry(dataDir: string, folder: string): Promise<VersionEntry> {
  const dir = join(versionsDir(dataDir), folder)
  try {
    const data = parseVersionData(parseJsonText(await readFile(join(dir, VERSION_FILE), 'utf8')))
    if (!data) return { folder, broken: true }
    for (const file of VERSIONED_FILES)
      if (!(await exists(join(dir, file)))) return { folder, broken: true }
    return { folder, broken: false, ...data }
  } catch {
    return { folder, broken: true }
  }
}

/** Toutes les versions ; une version abîmée est listée comme telle, sans gêner les autres. */
export async function listVersions(dataDir: string): Promise<VersionEntry[]> {
  const folders = (await subfolders(versionsDir(dataDir))).filter(isVersionFolderName)
  return sortVersions(await Promise.all(folders.map((folder) => readEntry(dataDir, folder))))
}

export interface NewVersion {
  name: string
  note: string
  pages: number
  seconds: number
}

/**
 * Enregistre une version des trois fichiers actuels. Tout est écrit dans un dossier temporaire
 * (caché), renommé ensuite : une coupure ne laisse jamais une version à moitié copiée.
 */
export async function saveVersion(
  dataDir: string,
  version: NewVersion,
  now = new Date()
): Promise<VersionEntry> {
  const root = versionsDir(dataDir)
  await mkdir(root, { recursive: true })
  const folder = versionFolderName(now, version.name, new Set(await subfolders(root)))
  const temporary = join(root, `.${folder}.${randomUUID()}.tmp`)
  await mkdir(temporary)
  try {
    for (const file of VERSIONED_FILES) await copyFile(join(dataDir, file), join(temporary, file))
    const data: VersionData = {
      formatVersion: VERSION_FORMAT,
      name: version.name,
      note: version.note,
      createdAt: now.toISOString(),
      pages: version.pages,
      seconds: version.seconds
    }
    await writeJsonSafely(join(temporary, VERSION_FILE), data)
    await rename(temporary, join(root, folder))
    return { folder, broken: false, ...data }
  } catch (error) {
    await rm(temporary, { recursive: true, force: true }).catch(() => undefined)
    throw error
  }
}

/** Lit les trois fichiers d'une version et les vérifie. Version abîmée : erreur claire. */
export async function readVersionFiles(dataDir: string, folder: unknown): Promise<VersionFiles> {
  const dir = versionDir(dataDir, folder)
  try {
    const data = parseVersionData(parseJsonText(await readFile(join(dir, VERSION_FILE), 'utf8')))
    if (!data) throw new Error(VERSION_FILE)
    const scenario = await readFile(join(dir, PROJECT_FILES.scenario), 'utf8')
    const decoupage = parseDecoupage(
      parseJsonText(await readFile(join(dir, PROJECT_FILES.decoupage), 'utf8'))
    )
    const projectRaw = parseJsonText(
      await readFile(join(dir, PROJECT_FILES.project), 'utf8')
    ) as Record<string, unknown>
    const project = parseProjectData(projectRaw)
    return { data, scenario, decoupage, projectRaw, project }
  } catch {
    throw new ProjectError(fr.versions.broken)
  }
}

/**
 * Écrit les trois fichiers d'une version dans un dossier neoscenar/ (enregistrement sûr). `keep` :
 * clés de projet.json qui ne viennent pas de la version (identifiant et dossier du projet actuel).
 */
export async function writeVersionFiles(
  targetDataDir: string,
  files: VersionFiles,
  keep: Partial<Pick<ProjectData, 'id' | 'folderName'>>
): Promise<void> {
  const project = { ...files.projectRaw, ...keep, modifiedAt: new Date().toISOString() }
  await writeJsonSafely(join(targetDataDir, PROJECT_FILES.decoupage), files.decoupage)
  await writeJsonSafely(join(targetDataDir, PROJECT_FILES.project), project)
  await writeFileSafely(join(targetDataDir, PROJECT_FILES.scenario), files.scenario)
}

/** Déplace une version dans sauvegardes/versions_supprimees/ ; renvoie son nouveau chemin relatif. */
export async function deleteVersion(dataDir: string, folder: unknown): Promise<string> {
  const source = versionDir(dataDir, folder)
  if (!(await exists(source))) throw new ProjectError(fr.versions.notFound)
  const trash = join(dataDir, BACKUP_FOLDER, DELETED_VERSIONS_FOLDER)
  await mkdir(trash, { recursive: true })
  const taken = new Set(await subfolders(trash))
  let name = basename(source)
  for (let i = 2; taken.has(name); i++) name = `${basename(source)}_${i}`
  await rename(source, join(trash, name))
  return `${BACKUP_FOLDER}/${DELETED_VERSIONS_FOLDER}/${name}`
}

/**
 * Copie complète du dossier du film dans `target` (qui ne doit pas exister), sans le dossier
 * neoscenar/sauvegardes/. Les trois fichiers sont ensuite remplacés par ceux de la version.
 * Renvoie le chemin du fichier .neoscenar de la copie.
 */
export async function duplicateFromVersion(
  project: { rootDir: string; dataDir: string; projectFilePath: string },
  files: VersionFiles,
  target: string
): Promise<string> {
  if (isSameOrInside(project.rootDir, target)) throw new ProjectError(fr.versions.duplicateInside)
  if (await exists(target)) throw new ProjectError(fr.versions.duplicateExists)
  const backups = resolve(project.dataDir, BACKUP_FOLDER)
  await cp(project.rootDir, target, {
    recursive: true,
    errorOnExist: true,
    filter: (source) => resolve(source) !== backups
  })
  const targetDataDir = join(target, relative(project.rootDir, project.dataDir))
  await writeVersionFiles(targetDataDir, files, {})
  return join(target, basename(project.projectFilePath))
}
