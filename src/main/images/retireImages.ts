import { mkdir, readdir, rename, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { Decoupage } from '../../shared/projectTypes'
import {
  isStoryboardImagePath,
  ORIGINALS_DIR,
  RETIRED_DIR,
  THUMBNAILS_DIR
} from '../../shared/thumbnail/files'
import { resolveDataPath } from './thumbnailFiles'

// À la fermeture du projet, l'historique d'annulation disparaît : les images qui ne servent plus
// à aucun plan sont rangées dans sauvegardes/vignettes_retirees/. Rien n'est jamais supprimé.

/** Images utilisées par le découpage (vignettes et images d'origine). */
export function referencedImages(decoupage: Decoupage): Set<string> {
  const used = new Set<string>()
  for (const scene of decoupage.scenes) {
    for (const shot of scene.shots) {
      if (shot.thumbnail) used.add(shot.thumbnail)
      if (shot.thumbnailSource) used.add(shot.thumbnailSource)
    }
  }
  return used
}

/** Images de vignettes/ et originaux/ qu'aucun plan n'utilise (chemins relatifs). */
export async function findUnusedImages(dataDir: string, decoupage: Decoupage): Promise<string[]> {
  const used = referencedImages(decoupage)
  const unused: string[] = []
  for (const folder of [THUMBNAILS_DIR, ORIGINALS_DIR]) {
    let names: string[]
    try {
      names = await readdir(resolveDataPath(dataDir, folder))
    } catch {
      continue // dossier absent : rien à ranger
    }
    for (const name of names.sort()) {
      const path = `${folder}/${name}`
      // Seuls les fichiers créés par NeoScenar sont concernés (pas un .DS_Store, par exemple).
      if (isStoryboardImagePath(path) && !used.has(path)) unused.push(path)
    }
  }
  return unused
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

/**
 * Déplace les images inutilisées dans sauvegardes/vignettes_retirees/vignettes (ou originaux).
 * Renvoie les chemins relatifs d'arrivée.
 */
export async function retireUnusedImages(dataDir: string, decoupage: Decoupage): Promise<string[]> {
  const moved: string[] = []
  for (const path of await findUnusedImages(dataDir, decoupage)) {
    const [, folder, name] = path.split('/')
    const targetDir = join(resolveDataPath(dataDir, RETIRED_DIR), folder)
    await mkdir(targetDir, { recursive: true })
    // Un fichier du même nom déjà retiré n'est jamais écrasé.
    let target = join(targetDir, name)
    for (let attempt = 2; await exists(target); attempt++) {
      target = join(targetDir, name.replace(/(\.\w+)$/, `-${attempt}$1`))
    }
    await rename(resolveDataPath(dataDir, path), target)
    moved.push(`${RETIRED_DIR}/${folder}/${target.split(/[\\/]/).pop()}`)
  }
  return moved
}
