import { headingLine } from '../../shared/scriptLink/textChanges'
import {
  DATA_FOLDER_NAME,
  PROJECT_FILE_TYPE,
  PROJECT_FORMAT_VERSION,
  type Decoupage,
  type ProjectData,
  type ProjectFile,
  type ProjectSettings,
  type ProjectType
} from '../../shared/projectTypes'
import { DEFAULT_PDF_OPTIONS } from '../../shared/pdfExport'
import { DEFAULT_STORYBOARD_OPTIONS } from '../../shared/storyboardExport'
import { createScene, NUMBER_STEP } from '../../shared/decoupage'

/** Sources d'identifiants et de dates, remplaçables dans les tests. */
export interface ContentSources {
  now(): Date
  newId(): string
}

export function buildProjectFile(): ProjectFile {
  return {
    type: PROJECT_FILE_TYPE,
    formatVersion: PROJECT_FORMAT_VERSION,
    dataFolder: DATA_FOLDER_NAME
  }
}

export interface ProjectDataInput {
  title: string
  folderName: string
  projectType: ProjectType
  template: string
  filmFolders: string[]
  settings: ProjectSettings
}

export function buildProjectData(input: ProjectDataInput, sources: ContentSources): ProjectData {
  const now = sources.now().toISOString()
  return {
    formatVersion: PROJECT_FORMAT_VERSION,
    id: sources.newId(),
    title: input.title,
    folderName: input.folderName,
    projectType: input.projectType,
    template: input.template,
    createdAt: now,
    modifiedAt: now,
    logline: '',
    synopsis: '',
    settings: input.settings,
    filmFolders: input.filmFolders,
    lastBlenderExport: null,
    exportPdf: { ...DEFAULT_PDF_OPTIONS },
    exportStoryboard: { ...DEFAULT_STORYBOARD_OPTIONS }
  }
}

/**
 * Un nouveau projet contient d'office la scène S_0010 avec un premier plan P_0010. Il est déjà relié
 * au scénario, qui contient l'en-tête de cette scène (étape 8).
 */
export function buildInitialDecoupage(sources: ContentSources): Decoupage {
  return {
    formatVersion: PROJECT_FORMAT_VERSION,
    numbersLocked: false,
    scriptLinked: true,
    scenes: [createScene({ number: NUMBER_STEP, letter: '' }, sources)]
  }
}

/** Page de titre Fountain, puis l'en-tête à écrire de la scène S_0010 : `.SCÈNE À ÉCRIRE #10#`. */
export function buildInitialScenario(title: string): string {
  const firstScene = headingLine('', { number: NUMBER_STEP, letter: '' })
  return `Title: ${title}\nAuthor:\n\n${firstScene}\n`
}
