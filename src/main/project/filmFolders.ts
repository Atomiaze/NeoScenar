import { mkdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fr } from '../../renderer/i18n/fr'
import type { FolderTemplate, TemplateFolder } from '../../shared/folderTemplate'
import { writeFileSafely } from '../fs/safeWrite'
import { ProjectError } from './errors'

export const README_FILE_NAME = 'LISEZMOI.txt'

export async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

/** Retrouve les dossiers du modèle à partir de leurs noms, dans l'ordre du modèle. */
export function pickTemplateFolders(template: FolderTemplate, names: string[]): TemplateFolder[] {
  for (const name of names) {
    if (!template.folders.some((folder) => folder.name === name)) {
      throw new ProjectError(fr.errors.unknownFolder(name))
    }
  }
  return template.folders.filter((folder) => names.includes(folder.name))
}

/** Crée un dossier du film, ses sous-dossiers et, si demandé, son LISEZMOI. */
export async function createFilmFolder(
  rootDir: string,
  folder: TemplateFolder,
  withReadme: boolean
): Promise<void> {
  const folderPath = join(rootDir, folder.name)
  await mkdir(folderPath, { recursive: true })
  for (const subfolder of folder.subfolders) {
    // « Assets/Personnages » est découpé pour construire un chemin propre à chaque système.
    await mkdir(join(folderPath, ...subfolder.split('/')), { recursive: true })
  }
  if (withReadme) {
    const content = fr.readme.content(folder.name, folder.description, folder.subfolders)
    await writeFileSafely(join(folderPath, README_FILE_NAME), content)
  }
}
