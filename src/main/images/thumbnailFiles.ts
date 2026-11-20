import { mkdir, readFile, stat } from 'node:fs/promises'
import { fr } from '../../renderer/i18n/fr'
import {
  imageFileName,
  isStoryboardImagePath,
  ORIGINALS_DIR,
  THUMBNAILS_DIR,
  type ImageExtension
} from '../../shared/thumbnail/files'
import { writeFileSafely } from '../fs/safeWrite'
import { resolveRelative } from '../portablePath'
import { ProjectError } from '../project/errors'
import { readImageHeader, type ImageHeader } from './imageHeader'

/** Au-delà, l'image est refusée avec un message clair (spécification de l'étape 3). */
export const MAX_IMAGE_BYTES = 50 * 1024 * 1024
export const MAX_IMAGE_SIDE = 16000

/**
 * Chemin absolu d'un chemin relatif au dossier neoscenar/ (« storyboard/vignettes/… »).
 * Lève une erreur pour un chemin qui sortirait de neoscenar/ (« .. », « \\ », « C: »).
 */
export function resolveDataPath(dataDir: string, relativePath: string): string {
  return resolveRelative(dataDir, relativePath)
}

/** Vérifie qu'il s'agit d'un PNG ou d'un JPEG de taille raisonnable. */
export function checkImage(bytes: Uint8Array): ImageHeader {
  if (bytes.length > MAX_IMAGE_BYTES) throw new ProjectError(fr.images.tooHeavy)
  const header = readImageHeader(bytes)
  if (!header) throw new ProjectError(fr.images.unsupported)
  if (Math.max(header.width, header.height) > MAX_IMAGE_SIDE) {
    throw new ProjectError(fr.images.tooLarge)
  }
  return header
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

/** Écrit un nouveau fichier (jamais d'écrasement) et renvoie son chemin relatif. */
async function writeNewImage(
  dataDir: string,
  folder: string,
  shotId: string,
  extension: ImageExtension,
  bytes: Uint8Array,
  now: Date
): Promise<string> {
  await mkdir(resolveDataPath(dataDir, folder), { recursive: true })
  for (let attempt = 1; ; attempt++) {
    const relative = `${folder}/${imageFileName(shotId, now, extension, attempt)}`
    const absolute = resolveDataPath(dataDir, relative)
    if (await exists(absolute)) continue
    await writeFileSafely(absolute, bytes)
    return relative
  }
}

export interface StoredOriginal {
  /** Chemin relatif au dossier neoscenar/. */
  path: string
  width: number
  height: number
}

/** Copie une image d'origine (octets déjà lus) dans storyboard/originaux/. */
export async function storeOriginalBytes(
  dataDir: string,
  shotId: string,
  bytes: Uint8Array,
  now = new Date()
): Promise<StoredOriginal> {
  const header = checkImage(bytes)
  const extension = header.kind === 'png' ? 'png' : 'jpg'
  const path = await writeNewImage(dataDir, ORIGINALS_DIR, shotId, extension, bytes, now)
  return { path, width: header.width, height: header.height }
}

/** Copie un fichier image choisi par l'élève dans storyboard/originaux/. */
export async function storeOriginalFile(
  dataDir: string,
  shotId: string,
  sourcePath: string,
  now = new Date()
): Promise<StoredOriginal> {
  let size: number
  try {
    const info = await stat(sourcePath)
    if (!info.isFile()) throw new ProjectError(fr.images.unsupported)
    size = info.size
  } catch (error) {
    if (error instanceof ProjectError) throw error
    throw new ProjectError(fr.images.unreadable)
  }
  if (size > MAX_IMAGE_BYTES) throw new ProjectError(fr.images.tooHeavy)
  return storeOriginalBytes(dataDir, shotId, await readFile(sourcePath), now)
}

/** Enregistre une vignette PNG fabriquée par l'interface dans storyboard/vignettes/. */
export async function storeThumbnail(
  dataDir: string,
  shotId: string,
  bytes: Uint8Array,
  now = new Date()
): Promise<string> {
  const header = readImageHeader(bytes)
  if (header?.kind !== 'png') throw new ProjectError(fr.images.unsupported)
  return writeNewImage(dataDir, THUMBNAILS_DIR, shotId, 'png', bytes, now)
}

export interface ThumbnailFiles {
  thumbnail: string | null
  thumbnailSource: string | null
}

/** Copie une image du storyboard sous un nouveau nom ; garde l'ancien chemin si c'est impossible. */
async function copyImage(
  dataDir: string,
  shotId: string,
  path: string | null,
  now: Date
): Promise<string | null> {
  if (!path || !isStoryboardImagePath(path)) return path
  const [folderStart, folderEnd] = path.split('/')
  const extension = path.endsWith('.png') ? 'png' : 'jpg'
  try {
    const bytes = await readFile(resolveDataPath(dataDir, path))
    return await writeNewImage(
      dataDir,
      `${folderStart}/${folderEnd}`,
      shotId,
      extension,
      bytes,
      now
    )
  } catch {
    // Fichier manquant : la copie pointe vers le même fichier (jamais modifié), rien n'est perdu.
    return path
  }
}

/**
 * Duplication d'un plan : la vignette et l'image d'origine sont copiées dans de nouveaux fichiers
 * nommés d'après la copie. Les deux vignettes sont ensuite indépendantes.
 */
export async function copyThumbnailFiles(
  dataDir: string,
  shotId: string,
  files: ThumbnailFiles,
  now = new Date()
): Promise<ThumbnailFiles> {
  return {
    thumbnail: await copyImage(dataDir, shotId, files.thumbnail, now),
    thumbnailSource: await copyImage(dataDir, shotId, files.thumbnailSource, now)
  }
}
