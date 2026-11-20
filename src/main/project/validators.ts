import { isAbsolute } from 'node:path'
import { fr } from '../../renderer/i18n/fr'
import type { FolderTemplate, TemplateFolder } from '../../shared/folderTemplate'
import {
  PROJECT_FILE_TYPE,
  PROJECT_FILES,
  PROJECT_TYPES,
  type BlenderExportRecord,
  type Decoupage,
  type ProjectData,
  type ProjectFile,
  type Scene,
  type Shot,
  type ThumbnailCrop,
  type ThumbnailRotation
} from '../../shared/projectTypes'
import type { PdfExportOptions } from '../../shared/pdfExport'
import { PLANNING_EXPORT_KINDS, type PlanningExportOptions } from '../../shared/planningExport'
import type { StoryboardExportOptions } from '../../shared/storyboardExport'
import { ProjectError } from './errors'
import { createChecker, type JsonObject } from './jsonChecker'
import { READ_DEFAULTS, withDefaults } from './readDefaults'
import { findDecoupageProblem, type DecoupageProblem } from '../../shared/decoupage'

// Ces fonctions transforment le contenu brut d'un fichier en données typées,
// ou lèvent une ProjectError au message clair. Elles ne modifient jamais le disque.

/** Nom de dossier simple, sans séparateur ni remontée (« neoscenar », « 04_Son »). */
function isSimpleFolderName(name: string): boolean {
  return name !== '' && name !== '.' && name !== '..' && !/[\\/]/.test(name) && !isAbsolute(name)
}

export function parseProjectFile(raw: unknown, fileName: string): ProjectFile {
  const check = createChecker(fileName)
  const data = check.root(raw)
  if (data['type'] !== PROJECT_FILE_TYPE) throw new ProjectError(fr.errors.notAProject(fileName))
  const formatVersion = check.formatVersion(data)
  const dataFolder = check.string(data['dataFolder'], 'dataFolder')
  if (!isSimpleFolderName(dataFolder)) check.fail('dataFolder')
  return { type: PROJECT_FILE_TYPE, formatVersion, dataFolder }
}

export function parseProjectData(raw: unknown): ProjectData {
  const check = createChecker(PROJECT_FILES.project)
  const data = withDefaults(check.root(raw), READ_DEFAULTS.project)
  const formatVersion = check.formatVersion(data)
  const settings = check.object(data['settings'], 'settings')
  const resolution = check.object(settings['resolution'], 'settings.resolution')
  const filmFolders = check.stringArray(data['filmFolders'], 'filmFolders')
  if (!filmFolders.every(isSimpleFolderName)) check.fail('filmFolders')

  return {
    formatVersion,
    id: check.string(data['id'], 'id'),
    title: check.string(data['title'], 'title'),
    folderName: check.string(data['folderName'], 'folderName'),
    projectType: check.oneOf(data['projectType'], PROJECT_TYPES, 'projectType'),
    template: check.string(data['template'], 'template'),
    createdAt: check.string(data['createdAt'], 'createdAt'),
    modifiedAt: check.string(data['modifiedAt'], 'modifiedAt'),
    logline: check.string(data['logline'], 'logline'),
    synopsis: check.string(data['synopsis'], 'synopsis'),
    settings: {
      fps: check.positiveNumber(settings['fps'], 'settings.fps'),
      resolution: {
        width: check.positiveInteger(resolution['width'], 'settings.resolution.width'),
        height: check.positiveInteger(resolution['height'], 'settings.resolution.height')
      }
    },
    filmFolders,
    lastBlenderExport: parseBlenderExport(check, data['lastBlenderExport']),
    exportPdf: parsePdfOptions(check, data['exportPdf']),
    exportStoryboard: parseStoryboardOptions(check, data['exportStoryboard']),
    ...parsePlanningExportOptions(data['exportPlanning'])
  }
}

function parsePdfOptions(check: Checker, value: unknown): PdfExportOptions {
  const record = check.object(value, 'exportPdf')
  return {
    pageDeTitre: record['pageDeTitre'] === true,
    numerotation: check.oneOf(
      record['numerotation'],
      ['fountain', 'continue'],
      'exportPdf.numerotation'
    ),
    // Étape 13D : absent des projets plus anciens, donc désactivé.
    nouvellePageParActe: record['nouvellePageParActe'] === true
  }
}

export function parseStoryboardOptions(check: Checker, value: unknown): StoryboardExportOptions {
  const record = check.object(value, 'exportStoryboard')
  return {
    kind: check.oneOf(record['kind'], ['planches', 'storyboard'], 'exportStoryboard.kind'),
    scope: check.oneOf(record['scope'], ['all', 'scenes'], 'exportStoryboard.scope'),
    sceneNumbers: check.stringArray(record['sceneNumbers'], 'exportStoryboard.sceneNumbers'),
    newPagePerScene: record['newPagePerScene'] === true
  }
}

/** Étape 15E-2 : absent des projets plus anciens ; une valeur abîmée est ignorée (valeurs par défaut). */
function parsePlanningExportOptions(value: unknown): { exportPlanning?: PlanningExportOptions } {
  if (typeof value !== 'object' || value === null) return {}
  const record = value as Record<string, unknown>
  const kind = PLANNING_EXPORT_KINDS.find((k) => k === record['kind'])
  const person = record['person']
  if (!kind || !(person === null || typeof person === 'string')) return {}
  return { exportPlanning: { kind, person } }
}

function parseBlenderExport(check: Checker, value: unknown): BlenderExportRecord | null {
  if (value === null) return null
  const record = check.object(value, 'lastBlenderExport')
  return {
    exportedAt: check.string(record['exportedAt'], 'lastBlenderExport.exportedAt'),
    blendPath: check.string(record['blendPath'], 'lastBlenderExport.blendPath')
  }
}

type Checker = ReturnType<typeof createChecker>

function parseLetter(check: Checker, value: unknown, field: string): string {
  const letter = check.string(value, field)
  return /^[A-Z]*$/.test(letter) ? letter : check.fail(field)
}

const ROTATIONS: readonly ThumbnailRotation[] = [0, 90, 180, 270]

/** Fraction entre 0 et 1 (petite marge pour les arrondis). */
function fraction(check: Checker, value: unknown, field: string): number {
  return typeof value === 'number' && value >= -1e-6 && value <= 1 + 1e-6
    ? value
    : check.fail(field)
}

function parseCrop(check: Checker, raw: unknown, path: string): ThumbnailCrop | null {
  if (raw === null) return null
  const crop = check.object(raw, path)
  const frame = check.object(crop['frame'], `${path}.frame`)
  const parsed: ThumbnailCrop = {
    rotation: ROTATIONS.includes(crop['rotation'] as ThumbnailRotation)
      ? (crop['rotation'] as ThumbnailRotation)
      : check.fail(`${path}.rotation`),
    mode:
      crop['mode'] === 'crop' || crop['mode'] === 'fit' ? crop['mode'] : check.fail(`${path}.mode`),
    frame: {
      x: fraction(check, frame['x'], `${path}.frame.x`),
      y: fraction(check, frame['y'], `${path}.frame.y`),
      width: fraction(check, frame['width'], `${path}.frame.width`),
      height: fraction(check, frame['height'], `${path}.frame.height`)
    },
    bands:
      crop['bands'] === 'white' || crop['bands'] === 'black'
        ? crop['bands']
        : check.fail(`${path}.bands`),
    auto: check.boolean(crop['auto'], `${path}.auto`)
  }
  const { x, y, width, height } = parsed.frame
  if (width <= 0 || height <= 0 || x + width > 1 + 1e-6 || y + height > 1 + 1e-6) {
    check.fail(`${path}.frame`)
  }
  return parsed
}

function parseShot(check: Checker, raw: unknown, path: string): Shot {
  const shot = withDefaults(check.object(raw, path), READ_DEFAULTS.shot)
  const field = (key: string): string => `${path}.${key}`
  return {
    id: check.string(shot['id'], field('id')),
    number: check.positiveInteger(shot['number'], field('number')),
    letter: parseLetter(check, shot['letter'], field('letter')),
    name: check.string(shot['name'], field('name')),
    color: check.nullableString(shot['color'], field('color')),
    thumbnail: check.nullableString(shot['thumbnail'], field('thumbnail')),
    thumbnailSource: check.nullableString(shot['thumbnailSource'], field('thumbnailSource')),
    thumbnailCrop: parseCrop(check, shot['thumbnailCrop'], field('thumbnailCrop')),
    duration: check.nullableDuration(shot['duration'], field('duration')),
    shotSize: check.nullableString(shot['shotSize'], field('shotSize')),
    cameraMovement: check.nullableString(shot['cameraMovement'], field('cameraMovement')),
    cameraAngle: check.nullableString(shot['cameraAngle'], field('cameraAngle')),
    sound: check.string(shot['sound'], field('sound')),
    music: check.string(shot['music'], field('music')),
    description: check.string(shot['description'], field('description'))
  }
}

function parseScene(check: Checker, raw: unknown, path: string): Scene {
  const scene = withDefaults(check.object(raw, path), READ_DEFAULTS.scene)
  const field = (key: string): string => `${path}.${key}`
  const shots = check.array(scene['shots'], field('shots'))
  return {
    id: check.string(scene['id'], field('id')),
    number: check.positiveInteger(scene['number'], field('number')),
    letter: parseLetter(check, scene['letter'], field('letter')),
    name: check.string(scene['name'], field('name')),
    heading: check.string(scene['heading'], field('heading')),
    color: check.nullableString(scene['color'], field('color')),
    shots: shots.map((shot, index) => parseShot(check, shot, `${field('shots')}[${index}]`)),
    orphan: check.boolean(scene['orphan'], field('orphan'))
  }
}

function describeProblem(problem: DecoupageProblem): string {
  const file = PROJECT_FILES.decoupage
  if (problem.kind === 'duplicate-id') return fr.errors.duplicateId(file, problem.id)
  if (problem.kind === 'too-large') return fr.errors.numberTooLarge(file, problem.where)
  return problem.where === 'scenes'
    ? fr.errors.badSceneOrder(file)
    : fr.errors.badShotOrder(file, problem.where)
}

/**
 * Lit et vérifie un découpage : forme des champs, puis cohérence (identifiants uniques, numéros
 * de scène uniques, numéros de plan uniques et dans l'ordre). Sert aussi à valider les données reçues de l'interface avant écriture.
 */
export function parseDecoupage(raw: unknown): Decoupage {
  const check = createChecker(PROJECT_FILES.decoupage)
  const data = withDefaults(check.root(raw), READ_DEFAULTS.decoupage)
  const formatVersion = check.formatVersion(data)
  const scenes = check.array(data['scenes'], 'scenes')
  const decoupage: Decoupage = {
    formatVersion,
    numbersLocked: check.boolean(data['numbersLocked'], 'numbersLocked'),
    scriptLinked: check.boolean(data['scriptLinked'], 'scriptLinked'),
    scenes: scenes.map((scene, index) => parseScene(check, scene, `scenes[${index}]`))
  }
  const problem = findDecoupageProblem(decoupage)
  if (problem) throw new ProjectError(describeProblem(problem))
  return decoupage
}

function parseTemplateFolder(check: Checker, raw: unknown, path: string): TemplateFolder {
  const folder: JsonObject = check.object(raw, path)
  const name = check.string(folder['name'], `${path}.name`)
  if (!isSimpleFolderName(name)) check.fail(`${path}.name`)
  const subfolders = check.stringArray(folder['subfolders'], `${path}.subfolders`)
  // Sous-dossiers relatifs uniquement, séparés par « / », sans remontée.
  if (!subfolders.every((sub) => sub.split('/').every(isSimpleFolderName))) {
    check.fail(`${path}.subfolders`)
  }
  const defaultFor = check.array(folder['defaultFor'], `${path}.defaultFor`)
  return {
    name,
    description: check.string(folder['description'], `${path}.description`),
    subfolders,
    defaultFor: defaultFor.map((kind) =>
      check.oneOf(kind, ['film', 'animation'] as const, `${path}.defaultFor`)
    )
  }
}

export function parseFolderTemplate(raw: unknown, fileName: string): FolderTemplate {
  const check = createChecker(fileName)
  const data = check.root(raw)
  const formatVersion = check.formatVersion(data)
  const folders = check.array(data['folders'], 'folders')
  return {
    formatVersion,
    id: check.string(data['id'], 'id'),
    name: check.string(data['name'], 'name'),
    folders: folders.map((folder, index) => parseTemplateFolder(check, folder, `folders[${index}]`))
  }
}
