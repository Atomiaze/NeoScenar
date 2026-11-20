import nodePath, { type PlatformPath } from 'node:path'
import { isSafeRelativePath } from '../shared/relativePath'

// Passage entre les chemins du système (« C:\Films\Mon_Film », « /home/eleve/Mon_Film ») et les
// chemins relatifs enregistrés dans le projet, toujours écrits avec « / ». Le module `path` est
// passé en paramètre pour pouvoir tester les règles de Windows sur un Mac (`path.win32`).

/** Vrai si `target` est `folder` lui-même ou se trouve dedans (même disque). */
export function isSameOrInside(
  folder: string,
  target: string,
  p: PlatformPath = nodePath
): boolean {
  const rel = p.relative(p.resolve(folder), p.resolve(target))
  // Sous Windows, un autre disque donne un chemin absolu (« D:\… »), pas « ..\… ».
  return rel === '' || (!p.isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${p.sep}`))
}

/** Vrai si `target` se trouve dans `folder` (pas le dossier lui-même). */
export function isInsideFolder(
  folder: string,
  target: string,
  p: PlatformPath = nodePath
): boolean {
  return isSameOrInside(folder, target, p) && p.relative(folder, target) !== ''
}

/** Chemin relatif avec « / », le même sur les trois systèmes. */
export function toPortableRelative(from: string, to: string, p: PlatformPath = nodePath): string {
  return p.relative(from, to).split(p.sep).join('/')
}

/**
 * Chemin à afficher pour un fichier exporté : relatif au dossier du film s'il s'y trouve
 * (« 01_Production/Planning/x.pdf »), sinon le chemin complet du système tel quel.
 */
export function displayPathInFilm(
  rootDir: string,
  path: string,
  p: PlatformPath = nodePath
): string {
  return isSameOrInside(rootDir, path, p) ? toPortableRelative(rootDir, path, p) : path
}

/**
 * Chemin du système pour un chemin relatif du projet (« storyboard/vignettes/a.png »).
 * Refuse tout ce qui sortirait de `base` ou serait lu autrement sous Windows (« \ », « C: »).
 */
export function resolveRelative(
  base: string,
  relativePath: string,
  p: PlatformPath = nodePath
): string {
  if (!isSafeRelativePath(relativePath)) {
    throw new Error(`Chemin relatif refusé : ${relativePath}`)
  }
  return p.join(base, ...relativePath.split('/'))
}
