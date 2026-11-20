import { access } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { fr } from '../../renderer/i18n/fr'
import { isDirectory } from '../project/filmFolders'
import { isInsideFolder, toPortableRelative } from '../portablePath'
import { ProjectError } from '../project/errors'

// Fichier .blend que le plugin storyboard va créer. NeoScenar ne l'écrit jamais lui-même et
// n'en propose jamais un qui existe déjà : le travail fait dans Blender ne doit pas être écrasé.

export const BLENDER_FOLDER = '06_Blender'
export const STORYBOARD_FOLDER = 'Storyboard'
export const BLEND_EXTENSION = '.blend'

/** Fichier .blend retenu pour l'export. */
export interface BlendTarget {
  /** Chemin absolu (en mémoire seulement). */
  path: string
  /** Relatif au dossier du film, avec « / » (affiché et enregistré dans projet.json). */
  relativePath: string
  /** Le fichier demandé existait : `path` est un nom libre proposé à la place. */
  replacedExisting: boolean
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/** « Mon_Film_storyboard.blend » */
export function defaultBlendName(folderName: string): string {
  return `${folderName}_storyboard${BLEND_EXTENSION}`
}

/** Ajoute « .blend » si l'élève l'a oublié. */
export function withBlendExtension(path: string): string {
  return path.toLowerCase().endsWith(BLEND_EXTENSION) ? path : `${path}${BLEND_EXTENSION}`
}

/**
 * Premier nom libre : le fichier lui-même s'il n'existe pas, sinon « …_v2.blend », « …_v3.blend »…
 * Un nom qui finit déjà par « _v2 » continue la série au lieu de donner « _v2_v2 ».
 */
export async function freeBlendPath(
  path: string,
  exists: (path: string) => Promise<boolean> = fileExists
): Promise<string> {
  if (!(await exists(path))) return path
  const folder = dirname(path)
  const stem = basename(path).slice(0, -BLEND_EXTENSION.length)
  const match = /^(.*)_v(\d+)$/.exec(stem)
  const base = match ? match[1] : stem
  for (let version = match ? Number(match[2]) + 1 : 2; ; version++) {
    const candidate = join(folder, `${base}_v${version}${BLEND_EXTENSION}`)
    if (!(await exists(candidate))) return candidate
  }
}

/**
 * Vérifie un .blend choisi (ou proposé) : dans le dossier du film, avec l'extension .blend,
 * et remplacé par un nom libre s'il existe déjà.
 */
export async function checkBlendTarget(
  rootDir: string,
  requested: string,
  exists: (path: string) => Promise<boolean> = fileExists
): Promise<BlendTarget> {
  const wanted = withBlendExtension(requested)
  if (!isInsideFolder(rootDir, wanted)) throw new ProjectError(fr.blender.outsideFilm)
  const path = await freeBlendPath(wanted, exists)
  return {
    path,
    relativePath: toPortableRelative(rootDir, path),
    replacedExisting: path !== wanted
  }
}

/**
 * Proposition par défaut : 06_Blender/Storyboard/<Nom>_storyboard.blend. Null si le film n'a pas
 * de dossier 06_Blender : l'élève choisit alors lui-même l'emplacement.
 * Le dossier Storyboard/ peut manquer : le plugin Blender crée les dossiers manquants.
 */
export async function defaultBlendTarget(
  rootDir: string,
  folderName: string
): Promise<BlendTarget | null> {
  if (!(await isDirectory(join(rootDir, BLENDER_FOLDER)))) return null
  const path = join(rootDir, BLENDER_FOLDER, STORYBOARD_FOLDER, defaultBlendName(folderName))
  return checkBlendTarget(rootDir, path)
}
