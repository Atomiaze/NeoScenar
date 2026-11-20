import { nativeImage } from 'electron'
import { mkdir, open, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { Size } from '../../shared/imageFormat'
import { isStoryboardImagePath } from '../../shared/thumbnail/files'
import { fileSafeId } from '../../shared/thumbnail/files'
import { readImageHeader } from './imageHeader'
import { resolveDataPath } from './thumbnailFiles'

// Aperçus réduits des vignettes pour les cartes, rangés dans le dossier de l'application (jamais
// dans le projet). Une vignette n'est jamais modifiée (chaque import crée un nouveau fichier) :
// un aperçu déjà fabriqué reste donc valable.

/** Côté le plus long des aperçus. */
export const PREVIEW_LONG_SIDE = 400

/** Emplacement de l'aperçu d'une vignette, par projet. */
export function previewPath(cacheDir: string, projectId: string, thumbnail: string): string {
  const name = thumbnail.split('/').pop() ?? 'vignette.png'
  return join(cacheDir, fileSafeId(projectId), name.replace(/\.png$/, '.jpg'))
}

/** Taille de l'aperçu : 400 pixels sur le côté le plus long, sans jamais agrandir. */
export function previewSize(size: Size): Size {
  const scale = Math.min(1, PREVIEW_LONG_SIDE / Math.max(size.width, size.height))
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale))
  }
}

const pending = new Map<string, Promise<string | null>>()

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function makePreview(source: string, target: string): Promise<string | null> {
  if (await exists(target)) return target
  const image = nativeImage.createFromPath(source)
  if (image.isEmpty()) return null
  const resized = image.resize({ ...previewSize(image.getSize()), quality: 'good' })
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, resized.toJPEG(85))
  return target
}

/** Fabrique l'aperçu au besoin ; renvoie son chemin absolu, ou null si la vignette est illisible. */
export function ensurePreview(
  dataDir: string,
  cacheDir: string,
  projectId: string,
  thumbnail: string
): Promise<string | null> {
  if (!isStoryboardImagePath(thumbnail)) return Promise.resolve(null)
  const target = previewPath(cacheDir, projectId, thumbnail)
  // Deux cartes peuvent demander le même aperçu en même temps : une seule fabrication.
  let job = pending.get(target)
  if (!job) {
    job = makePreview(resolveDataPath(dataDir, thumbnail), target)
      .catch(() => null)
      .finally(() => pending.delete(target))
    pending.set(target, job)
  }
  return job
}

/** Dimensions des vignettes, lues dans leurs premiers octets (rapide, même pour 300 vignettes). */
export async function readImageSizes(
  dataDir: string,
  paths: readonly string[]
): Promise<Record<string, Size | null>> {
  const result: Record<string, Size | null> = {}
  for (const path of paths) {
    result[path] = null
    if (!isStoryboardImagePath(path)) continue
    try {
      const file = await open(resolveDataPath(dataDir, path), 'r')
      try {
        // Un PNG donne ses dimensions dans ses 24 premiers octets.
        const { buffer, bytesRead } = await file.read(new Uint8Array(64), 0, 64, 0)
        const header = readImageHeader(buffer.subarray(0, bytesRead))
        if (header) result[path] = { width: header.width, height: header.height }
      } finally {
        await file.close()
      }
    } catch {
      // Fichier manquant (projet incomplet) : taille inconnue.
    }
  }
  return result
}

/** Place occupée par le cache des aperçus, en octets (0 s'il n'existe pas). */
export async function previewsCacheSize(cacheDir: string): Promise<number> {
  let total = 0
  try {
    for (const entry of await readdir(cacheDir, { recursive: true, withFileTypes: true })) {
      if (entry.isFile()) total += (await stat(join(entry.parentPath, entry.name))).size
    }
  } catch {
    return 0
  }
  return total
}

/**
 * Vide le cache des aperçus. Il ne contient que des copies réduites, refabriquées
 * automatiquement : aucune donnée d'élève n'est touchée.
 */
export async function clearPreviewsCache(cacheDir: string): Promise<void> {
  await rm(cacheDir, { recursive: true, force: true })
}
