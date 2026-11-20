import { randomBytes } from 'node:crypto'
import { mkdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { displayPathInFilm } from '../portablePath'
import { exportStoryboardPdf, type StoryboardShot } from '@neoscenar/pdf-storyboard'
import { fr } from '../../renderer/i18n/fr'
import type { PdfSavedFile } from '../../shared/pdfExport'
import { formatSceneNumber, formatShotNumber } from '../../shared/numbering'
import { PROJECT_FILES, type Scene } from '../../shared/projectTypes'
import type {
  StoryboardExportInfo,
  StoryboardExportOptions,
  StoryboardPreview,
  StoryboardSceneInfo
} from '../../shared/storyboardExport'
import { writeFileSafely, writeJsonSafely } from '../fs/safeWrite'
import { resolveDataPath } from '../images/thumbnailFiles'
import { describeWriteError, ProjectError } from '../project/errors'
import type { LoadedProject } from '../project/readProject'
import { pdfFileName } from '../pdfExport/pdfFileName'
import { createChecker } from '../project/jsonChecker'
import { parseStoryboardOptions } from '../project/validators'

export interface StoryboardExporterDeps {
  current(): LoadedProject
  /** Écrit d'abord ce que les Cartes n'ont pas encore enregistré. */
  flush(): Promise<void>
  /** Dossier des polices Inter. */
  fontsDir: string
  now?(): Date
}

const MAX_SCENE_NUMBERS = 5000

/** Vérifie les options reçues de l'interface (rien n'est écrit sans cela). */
export function parseStoryboardRequest(raw: unknown): StoryboardExportOptions {
  try {
    const options = parseStoryboardOptions(createChecker('exportStoryboard'), raw)
    if (options.sceneNumbers.length > MAX_SCENE_NUMBERS) throw new Error('trop de scènes')
    return options
  } catch {
    throw new ProjectError(fr.storyboardExport.invalidRequest)
  }
}

/** Scènes proposées : ni orphelines, ni sans plan (elles ne donneraient aucune page). */
export function exportableScenes(scenes: readonly Scene[]): Scene[] {
  return scenes.filter((scene) => !scene.orphan && scene.shots.length > 0)
}

export function sceneNumberOf(scene: Scene): string {
  return formatSceneNumber(scene.number, scene.letter)
}

/** Scènes à imprimer, dans l'ordre du film. Un numéro qui n'existe plus est ignoré. */
export function selectScenes(scenes: readonly Scene[], options: StoryboardExportOptions): Scene[] {
  const available = exportableScenes(scenes)
  if (options.scope === 'all') return available
  const chosen = new Set(options.sceneNumbers)
  return available.filter((scene) => chosen.has(sceneNumberOf(scene)))
}

function toShots(scenes: readonly Scene[]): StoryboardShot[] {
  return scenes.flatMap((scene) =>
    scene.shots.map((shot) => ({
      shotId: shot.id,
      sceneId: scene.id,
      sceneLabel: sceneNumberOf(scene),
      shotLabel: formatShotNumber(shot.number, shot.letter),
      name: shot.name,
      sceneHeading: scene.heading,
      duration: shot.duration,
      cameraMovement: shot.cameraMovement ?? '',
      music: shot.music,
      shotSize: shot.shotSize ?? '',
      sound: shot.sound,
      cameraAngle: shot.cameraAngle ?? '',
      description: shot.description
    }))
  )
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** « 20261119-153012-a3f9 » : pas d'accent ni d'espace, unique à chaque impression. */
export function newPrintId(date: Date): string {
  const day = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `${day}-${time}-${randomBytes(2).toString('hex')}`
}

interface Built extends StoryboardPreview {
  printRecord: unknown
  printId: string
}

/** Export PDF du storyboard : les plans du découpage, dessinés par pdf-storyboard. */
export class StoryboardExporter {
  private fonts: { regular: Uint8Array; bold: Uint8Array } | null = null

  constructor(private readonly deps: StoryboardExporterDeps) {}

  private async loadFonts(): Promise<{ regular: Uint8Array; bold: Uint8Array }> {
    if (this.fonts) return this.fonts
    const font = async (name: string): Promise<Uint8Array> =>
      new Uint8Array(await readFile(join(this.deps.fontsDir, `Inter-${name}.ttf`)))
    this.fonts = { regular: await font('Regular'), bold: await font('Bold') }
    return this.fonts
  }

  /** Options mémorisées (sans les scènes disparues) et scènes du film. */
  async info(): Promise<StoryboardExportInfo> {
    await this.deps.flush()
    const { project, decoupage } = this.deps.current()
    const scenes: StoryboardSceneInfo[] = exportableScenes(decoupage.scenes).map((scene) => ({
      number: sceneNumberOf(scene),
      heading: scene.heading,
      name: scene.name,
      shotCount: scene.shots.length
    }))
    const existing = new Set(scenes.map((scene) => scene.number))
    const saved = project.exportStoryboard
    return {
      options: { ...saved, sceneNumbers: saved.sceneNumbers.filter((n) => existing.has(n)) },
      scenes
    }
  }

  private async build(options: StoryboardExportOptions): Promise<Built> {
    await this.deps.flush()
    const { project, decoupage, dataDir } = this.deps.current()
    const scenes = selectScenes(decoupage.scenes, options)
    const shots = toShots(scenes)
    const now = this.deps.now?.() ?? new Date()
    const printId = newPrintId(now)
    if (shots.length === 0) {
      return {
        bytes: null,
        pageCount: 0,
        shotCount: 0,
        thumbnailCount: 0,
        unreadable: [],
        printRecord: null,
        printId
      }
    }

    // Les vignettes ne servent qu'au storyboard ; une vignette introuvable est signalée comme illisible.
    const thumbnails = new Map<string, Uint8Array>()
    const unreadable: string[] = []
    const labels = new Map(
      shots.map((shot) => [shot.shotId, `${shot.sceneLabel} · ${shot.shotLabel}`])
    )
    if (options.kind === 'storyboard') {
      for (const scene of scenes) {
        for (const shot of scene.shots) {
          if (shot.thumbnail === null) continue
          try {
            thumbnails.set(
              shot.id,
              new Uint8Array(await readFile(resolveDataPath(dataDir, shot.thumbnail)))
            )
          } catch {
            unreadable.push(labels.get(shot.id) ?? shot.id)
          }
        }
      }
    }

    const result = await exportStoryboardPdf({
      kind: options.kind,
      title: project.title,
      format: project.settings.resolution,
      shots,
      options: { newPagePerScene: options.newPagePerScene },
      projectId: project.id,
      printId,
      createdAt: now.toISOString(),
      fonts: await this.loadFonts(),
      thumbnails
    })
    // Une vignette que le moteur n'a pas su lire (fichier abîmé) s'ajoute aux introuvables.
    for (const id of result.unreadableThumbnails) unreadable.push(labels.get(id) ?? id)
    const thumbnailCount = thumbnails.size - result.unreadableThumbnails.length
    return {
      bytes: result.pdf,
      pageCount: result.printRecord.pages.length,
      shotCount: shots.length,
      thumbnailCount,
      unreadable,
      printRecord: result.printRecord,
      printId
    }
  }

  async preview(options: StoryboardExportOptions): Promise<StoryboardPreview> {
    const { bytes, pageCount, shotCount, thumbnailCount, unreadable } = await this.build(options)
    return { bytes, pageCount, shotCount, thumbnailCount, unreadable }
  }

  /** Mémorise les options si elles ont changé. */
  async rememberOptions(options: StoryboardExportOptions): Promise<void> {
    const current = this.deps.current()
    const saved = current.project.exportStoryboard
    if (JSON.stringify(saved) === JSON.stringify(options)) return
    const project = {
      ...current.project,
      exportStoryboard: options,
      modifiedAt: new Date().toISOString()
    }
    await writeJsonSafely(join(current.dataDir, PROJECT_FILES.project), project)
    current.project = project
  }

  /** Emplacement proposé : exports/ du projet. Un fichier du même nom est remplacé. */
  defaultPath(options: StoryboardExportOptions): string {
    const { dataDir, project } = this.deps.current()
    return join(
      dataDir,
      'exports',
      pdfFileName(project.title, this.deps.now?.() ?? new Date(), options.kind)
    )
  }

  /** Écrit le PDF et le fichier d'impression (storyboard/impressions/<id>.json). */
  async save(options: StoryboardExportOptions, targetPath: string | null): Promise<PdfSavedFile> {
    const path = targetPath ?? this.defaultPath(options)
    if (!path.toLowerCase().endsWith('.pdf')) throw new ProjectError(fr.pdfExport.notPdf)
    const built = await this.build(options)
    if (built.bytes === null) throw new ProjectError(fr.storyboardExport.noShots)
    const { dataDir, rootDir } = this.deps.current()
    try {
      await mkdir(dirname(path), { recursive: true })
      await writeFileSafely(path, built.bytes)
      const recordPath = join(dataDir, 'storyboard', 'impressions', `${built.printId}.json`)
      await mkdir(dirname(recordPath), { recursive: true })
      await writeJsonSafely(recordPath, built.printRecord)
    } catch (error) {
      throw new ProjectError(describeWriteError(error))
    }
    await this.rememberOptions(options)
    return { path, relativePath: displayPathInFilm(rootDir, path) }
  }
}
