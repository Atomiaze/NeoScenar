import { join } from 'node:path'
import type { FolderStatus } from '../../shared/api'
import type { FolderTemplate } from '../../shared/folderTemplate'
import { PROJECT_FILES } from '../../shared/projectTypes'
import { writeJsonSafely } from '../fs/safeWrite'
import { createFilmFolder, isDirectory, pickTemplateFolders } from './filmFolders'
import { createChecker, readJsonFile } from './jsonChecker'
import { readProject, type LoadedProject } from './readProject'

/** Dossiers du modèle, avec l'indication de ceux qui existent déjà dans le projet. */
export async function getStructureStatus(
  rootDir: string,
  template: FolderTemplate
): Promise<FolderStatus[]> {
  return Promise.all(
    template.folders.map(async (folder) => ({
      ...folder,
      exists: await isDirectory(join(rootDir, folder.name))
    }))
  )
}

/**
 * Ajoute les dossiers demandés qui n'existent pas encore. Rien n'est jamais supprimé ni déplacé.
 * projet.json est relu et vérifié avant d'être mis à jour, et ses champs inconnus sont conservés.
 */
export async function completeStructure(
  projectFilePath: string,
  folderNames: string[],
  withReadme: boolean,
  template: FolderTemplate,
  now: () => Date = () => new Date()
): Promise<LoadedProject> {
  const loaded = await readProject(projectFilePath)
  const requested = pickTemplateFolders(template, folderNames)

  const created: string[] = []
  for (const folder of requested) {
    if (await isDirectory(join(loaded.rootDir, folder.name))) continue
    await createFilmFolder(loaded.rootDir, folder, withReadme)
    created.push(folder.name)
  }
  if (created.length === 0) return loaded

  const projectPath = join(loaded.dataDir, PROJECT_FILES.project)
  const raw = createChecker(PROJECT_FILES.project).root(
    await readJsonFile(projectPath, PROJECT_FILES.project)
  )
  const allFolders = new Set([...loaded.project.filmFolders, ...created])
  // Ordre du modèle d'abord, puis les éventuels dossiers qui n'en font pas partie.
  const ordered = [
    ...template.folders.map((folder) => folder.name).filter((name) => allFolders.has(name)),
    ...loaded.project.filmFolders.filter(
      (name) => !template.folders.some((folder) => folder.name === name)
    )
  ]
  await writeJsonSafely(projectPath, {
    ...raw,
    filmFolders: ordered,
    modifiedAt: now().toISOString()
  })
  return readProject(projectFilePath)
}
