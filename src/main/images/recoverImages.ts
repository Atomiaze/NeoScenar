import { copyFile, mkdir, rename, stat } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { Decoupage } from '../../shared/projectTypes'
import { isStoryboardImagePath, RETIRED_DIR } from '../../shared/thumbnail/files'
import { referencedImages } from './retireImages'
import { resolveDataPath } from './thumbnailFiles'

// Restauration ou duplicata d'une version (étape 13C) : les vignettes de la version ont pu être
// rangées dans sauvegardes/vignettes_retirees/ depuis (fermeture du projet). Elles sont remises en
// place. Une image introuvable partout reste une case vide, sans erreur.

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

/** Chemin, dans sauvegardes/vignettes_retirees/, d'une image retirée (« storyboard/vignettes/x.png »). */
export function retiredPath(path: string): string {
  const [, folder, name] = path.split('/')
  return `${RETIRED_DIR}/${folder}/${name}`
}

/**
 * Pour chaque image (vignette ou image d'origine) utilisée par `decoupage` et absente de
 * `targetDataDir`, cherche le fichier du même nom dans les images retirées de `sourceDataDir`, puis
 * le déplace (`move`, même projet) ou le copie (`copy`, duplicata). Renvoie les chemins remis.
 */
export async function recoverRetiredImages(
  sourceDataDir: string,
  targetDataDir: string,
  decoupage: Decoupage,
  mode: 'move' | 'copy'
): Promise<string[]> {
  const recovered: string[] = []
  for (const path of [...referencedImages(decoupage)].sort()) {
    if (!isStoryboardImagePath(path)) continue
    const target = resolveDataPath(targetDataDir, path)
    if (await exists(target)) continue
    const source = resolveDataPath(sourceDataDir, retiredPath(path))
    if (!(await exists(source))) continue
    try {
      await mkdir(dirname(target), { recursive: true })
      if (mode === 'move') await rename(source, target)
      else await copyFile(source, target)
      recovered.push(path)
    } catch {
      // Clé USB retirée, droits… : l'image reste introuvable, comme avant.
    }
  }
  return recovered
}
