import { copyFile, mkdir, open, readdir, rename, rm, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { ProjectError } from './project/errors'
import {
  WELCOME_IMAGE_MAX_BYTES,
  isWelcomeImageCopyName,
  sniffImageExtension,
  welcomeImageExtension
} from '../shared/welcomeImage'

const WELCOME_FOLDER = 'accueil'

export function welcomeFolder(userDataDir: string): string {
  return join(userDataDir, WELCOME_FOLDER)
}

/** Chemin de la copie choisie, ou null si elle n'existe plus (retour à l'image d'origine). */
export function welcomeCopyPath(userDataDir: string, name: string | null): string | null {
  if (name === null || !isWelcomeImageCopyName(name)) return null
  const path = join(welcomeFolder(userDataDir), name)
  return existsSync(path) ? path : null
}

/**
 * Copie l'image choisie dans les données de l'application (jamais lue à son emplacement d'origine)
 * et supprime la copie précédente. Renvoie le nom de la nouvelle copie.
 */
export async function installWelcomeImage(
  userDataDir: string,
  sourcePath: string
): Promise<string> {
  if (welcomeImageExtension(sourcePath) === null) {
    throw new ProjectError('Choisissez une image JPG, PNG ou WebP.')
  }
  const info = await stat(sourcePath)
  if (info.size > WELCOME_IMAGE_MAX_BYTES) {
    throw new ProjectError('Cette image dépasse 10 Mo. Choisissez une image plus légère.')
  }
  const head = Buffer.alloc(12)
  const handle = await open(sourcePath, 'r')
  try {
    await handle.read(head, 0, 12, 0)
  } finally {
    await handle.close()
  }
  const real = sniffImageExtension(head)
  if (real === null) throw new ProjectError('Ce fichier n’est pas une image JPG, PNG ou WebP.')

  const folder = welcomeFolder(userDataDir)
  await mkdir(folder, { recursive: true })
  const name = `image-accueil-${Date.now()}.${real}`
  const temporary = join(folder, `${name}.tmp`)
  await copyFile(sourcePath, temporary)
  await rename(temporary, join(folder, name))
  await removeWelcomeCopies(userDataDir, name)
  return name
}

/** Supprime les copies de NeoScenar (sauf `keep`), seulement aux noms qu'il produit lui-même. */
export async function removeWelcomeCopies(userDataDir: string, keep: string | null): Promise<void> {
  let names: string[]
  try {
    names = await readdir(welcomeFolder(userDataDir))
  } catch {
    return
  }
  await Promise.all(
    names
      .filter((name) => name !== keep && (isWelcomeImageCopyName(name) || name.endsWith('.tmp')))
      .map((name) => rm(join(welcomeFolder(userDataDir), name), { force: true }))
  )
}
