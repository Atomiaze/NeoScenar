import { randomUUID } from 'node:crypto'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fr } from '../../renderer/i18n/fr'
import type { CreateProjectRequest } from '../../shared/api'
import { sanitizeFolderName } from '../../shared/folderName'
import type { FolderTemplate } from '../../shared/folderTemplate'
import {
  DATA_FOLDER_NAME,
  DATA_SUBFOLDERS,
  PROJECT_FILE_EXTENSION,
  PROJECT_FILES,
  PROJECT_TYPES
} from '../../shared/projectTypes'
import { checkPathLength } from '../fs/nameChecks'
import { writeFileSafely, writeJsonSafely } from '../fs/safeWrite'
import { ProjectError } from './errors'
import { createFilmFolder, isDirectory, pickTemplateFolders } from './filmFolders'
import {
  buildInitialDecoupage,
  buildInitialScenario,
  buildProjectData,
  buildProjectFile,
  type ContentSources
} from './initialContent'
import { readProject, type LoadedProject } from './readProject'

const defaultSources: ContentSources = { now: () => new Date(), newId: () => randomUUID() }

/** Titre sur une seule ligne, sans espaces superflus. */
/** Longueur réservée sous le dossier du film pour les fichiers de NeoScenar. */
const INNER_PATH_MARGIN = 100

export function cleanTitle(title: string): string {
  return title.replace(/\s+/g, ' ').trim()
}

/**
 * Crée le dossier du film, son dossier neoscenar/ et les dossiers du film cochés.
 * Si quoi que ce soit échoue, le dossier qui vient d'être créé est retiré : pas de projet à moitié fait.
 */
export async function createProject(
  request: CreateProjectRequest,
  template: FolderTemplate,
  sources: ContentSources = defaultSources
): Promise<LoadedProject> {
  const title = cleanTitle(request.title)
  if (title === '') throw new ProjectError(fr.create.emptyName)
  const folderName = sanitizeFolderName(title)
  if (folderName === '') throw new ProjectError(fr.create.invalidName)
  if (!PROJECT_TYPES.includes(request.projectType)) {
    throw new ProjectError(fr.errors.unexpected(`type de projet « ${request.projectType} »`))
  }
  if (!(await isDirectory(request.location))) throw new ProjectError(fr.errors.locationNotFound)
  const filmFolders = pickTemplateFolders(template, request.folders)

  const rootDir = join(request.location, folderName)
  // Place laissée aux chemins internes les plus longs (sauvegardes, vignettes retirées, fiches).
  checkPathLength(join(rootDir, 'x'.repeat(INNER_PATH_MARGIN)))
  try {
    // Sans « recursive » : échoue si le dossier existe déjà, sans rien toucher.
    await mkdir(rootDir)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new ProjectError(fr.create.folderExists(folderName))
    }
    throw error
  }

  const projectFilePath = join(rootDir, `${folderName}.${PROJECT_FILE_EXTENSION}`)
  try {
    const dataDir = join(rootDir, DATA_FOLDER_NAME)
    for (const subfolder of DATA_SUBFOLDERS) {
      await mkdir(join(dataDir, ...subfolder.split('/')), { recursive: true })
    }
    const project = buildProjectData(
      {
        title,
        folderName,
        projectType: request.projectType,
        template: template.id,
        filmFolders: filmFolders.map((folder) => folder.name),
        settings: request.settings
      },
      sources
    )
    await writeFileSafely(join(dataDir, PROJECT_FILES.scenario), buildInitialScenario(title))
    await writeJsonSafely(join(dataDir, PROJECT_FILES.project), project)
    await writeJsonSafely(join(dataDir, PROJECT_FILES.decoupage), buildInitialDecoupage(sources))
    for (const folder of filmFolders) {
      await createFilmFolder(rootDir, folder, request.withReadme)
    }
    // Le fichier .neoscenar est écrit en dernier : sa présence signale un projet complet.
    await writeJsonSafely(projectFilePath, buildProjectFile())
  } catch (error) {
    await rm(rootDir, { recursive: true, force: true })
    throw error
  }

  return readProject(projectFilePath)
}
