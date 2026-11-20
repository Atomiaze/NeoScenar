import { access } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { fr } from '../../renderer/i18n/fr'
import { PROJECT_FILES, type Decoupage, type ProjectData } from '../../shared/projectTypes'
import { isNotFoundError, ProjectError } from './errors'
import { readJsonFile } from './jsonChecker'
import { parseDecoupage, parseProjectData, parseProjectFile } from './validators'

/** Projet lu et vérifié. Les chemins absolus ne servent qu'en mémoire, jamais dans les fichiers. */
export interface LoadedProject {
  /** Chemin du fichier .neoscenar. */
  projectFilePath: string
  /** Dossier du film (celui qui contient le fichier .neoscenar). */
  rootDir: string
  /** Dossier de données neoscenar/. */
  dataDir: string
  project: ProjectData
  decoupage: Decoupage
}

/** Lit et vérifie un projet complet, sans jamais rien écrire. */
export async function readProject(projectFilePath: string): Promise<LoadedProject> {
  const fileName = basename(projectFilePath)
  let rawProjectFile: unknown
  try {
    rawProjectFile = await readJsonFile(projectFilePath, fileName)
  } catch (error) {
    // Le fichier .neoscenar lui-même a disparu : le projet a été déplacé ou renommé.
    if (error instanceof ProjectError && (await isMissing(projectFilePath))) {
      throw new ProjectError(fr.errors.projectNotFound(projectFilePath))
    }
    throw error
  }

  const projectFile = parseProjectFile(rawProjectFile, fileName)
  const rootDir = dirname(projectFilePath)
  const dataDir = join(rootDir, projectFile.dataFolder)

  const project = parseProjectData(
    await readJsonFile(join(dataDir, PROJECT_FILES.project), PROJECT_FILES.project)
  )
  const decoupage = parseDecoupage(
    await readJsonFile(join(dataDir, PROJECT_FILES.decoupage), PROJECT_FILES.decoupage)
  )
  if (await isMissing(join(dataDir, PROJECT_FILES.scenario))) {
    throw new ProjectError(fr.errors.missingFile(PROJECT_FILES.scenario))
  }

  return { projectFilePath, rootDir, dataDir, project, decoupage }
}

async function isMissing(path: string): Promise<boolean> {
  try {
    await access(path)
    return false
  } catch (error) {
    return isNotFoundError(error)
  }
}
