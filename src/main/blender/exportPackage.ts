import { randomUUID } from 'node:crypto'
import { copyFile, mkdir, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import {
  buildExchange,
  EXCHANGE_FILE_NAME,
  EXCHANGE_THUMBNAILS_FOLDER
} from '../../shared/blender/exchange'
import type { Decoupage, ProjectData } from '../../shared/projectTypes'
import { isSafeRelativePath } from '../../shared/relativePath'
import { writeJsonSafely } from '../fs/safeWrite'
import { resolveDataPath } from '../images/thumbnailFiles'
import { toPortableRelative } from '../portablePath'
import { fileExists } from './blendTarget'

// Écriture du paquet d'échange dans neoscenar/blender/export/. Le paquet est d'abord écrit en
// entier dans un dossier temporaire, puis il remplace l'ancien : jamais de paquet à moitié écrit,
// et aucun fichier d'un export précédent ne subsiste.

export const BLENDER_DATA_FOLDER = 'blender'
export const EXPORT_FOLDER = 'export'

export interface ExportPackageOptions {
  /** Dossier neoscenar/. */
  dataDir: string
  project: ProjectData
  decoupage: Decoupage
  /** Chemin absolu du .blend visé. */
  blendPath: string
  neoscenarVersion: string
  now: Date
}

export function exportFolder(dataDir: string): string {
  return join(dataDir, BLENDER_DATA_FOLDER, EXPORT_FOLDER)
}

/** Vignettes réellement présentes sur le disque (chemins relatifs à neoscenar/). */
async function existingThumbnails(dataDir: string, decoupage: Decoupage): Promise<Set<string>> {
  const paths = decoupage.scenes.flatMap((scene) =>
    scene.shots.flatMap((shot) => (shot.thumbnail === null ? [] : [shot.thumbnail]))
  )
  const found = new Set<string>()
  for (const path of paths) {
    if (isSafeRelativePath(path) && (await fileExists(resolveDataPath(dataDir, path)))) {
      found.add(path)
    }
  }
  return found
}

/** Remplace `target` par `replacement` ; en cas d'échec, l'ancien dossier est remis en place. */
async function replaceFolder(target: string, replacement: string): Promise<void> {
  const previous = `${target}.ancien-${randomUUID()}`
  const hadPrevious = await fileExists(target)
  if (hadPrevious) await rename(target, previous)
  try {
    await rename(replacement, target)
  } catch (error) {
    if (hadPrevious) await rename(previous, target).catch(() => undefined)
    throw error
  }
  if (hadPrevious) await rm(previous, { recursive: true, force: true })
}

/** Écrit le paquet et renvoie le chemin absolu de son decoupage.json. */
export async function writeExportPackage(options: ExportPackageOptions): Promise<string> {
  const { dataDir } = options
  const target = exportFolder(dataDir)
  const parent = join(dataDir, BLENDER_DATA_FOLDER)
  await mkdir(parent, { recursive: true })

  const available = await existingThumbnails(dataDir, options.decoupage)
  const { file, thumbnails } = buildExchange({
    project: options.project,
    decoupage: options.decoupage,
    targetBlend: toPortableRelative(target, options.blendPath),
    exportedAt: options.now,
    neoscenarVersion: options.neoscenarVersion,
    hasThumbnailFile: (path) => available.has(path)
  })

  // Nom caché (point au début) : le dossier en cours d'écriture ne se confond pas avec un export.
  const temporary = join(parent, `.${EXPORT_FOLDER}-${randomUUID()}.tmp`)
  try {
    await mkdir(join(temporary, EXCHANGE_THUMBNAILS_FOLDER), { recursive: true })
    for (const thumbnail of thumbnails) {
      await copyFile(
        resolveDataPath(dataDir, thumbnail.source),
        join(temporary, ...thumbnail.target.split('/'))
      )
    }
    await writeJsonSafely(join(temporary, EXCHANGE_FILE_NAME), file)
    await replaceFolder(target, temporary)
  } catch (error) {
    await rm(temporary, { recursive: true, force: true }).catch(() => undefined)
    throw error
  }
  return join(target, EXCHANGE_FILE_NAME)
}
