import { formatFullShotId, formatSceneNumber, formatShotNumber } from '../numbering'
import type { Decoupage, ProjectData, Scene, Shot } from '../projectTypes'

// Paquet d'échange NeoScenar → Blender (Documentation/specs/format-echange-blender.md).
// Toute modification de ce format doit d'abord être faite dans ce document.

export const EXCHANGE_FORMAT = 'neoscenar-blender'
export const EXCHANGE_FORMAT_VERSION = 1

/** Noms dans le paquet : neoscenar/blender/export/decoupage.json et vignettes/. */
export const EXCHANGE_FILE_NAME = 'decoupage.json'
export const EXCHANGE_THUMBNAILS_FOLDER = 'vignettes'

export interface ExchangeShot {
  id: string
  label: string
  fullLabel: string
  number: number
  letter: string
  name: string
  durationSeconds: number | null
  durationFrames: number | null
  scale: string
  movement: string
  angle: string
  sounds: string
  music: string
  description: string
  color: string | null
  /** Relatif à decoupage.json (« vignettes/S_0010_P_0010.png »), ou null. */
  thumbnail: string | null
}

export interface ExchangeScene {
  id: string
  label: string
  number: number
  letter: string
  name: string
  heading: string
  color: string | null
  shots: ExchangeShot[]
}

export interface ExchangeFile {
  format: typeof EXCHANGE_FORMAT
  formatVersion: number
  exportedAt: string
  neoscenarVersion: string
  project: { id: string; title: string; folderName: string }
  settings: { width: number; height: number; fps: number }
  numbersLocked: boolean
  /** Fichier .blend à créer, relatif à decoupage.json. */
  targetBlend: string
  scenes: ExchangeScene[]
}

/** Vignette à copier : chemin relatif au dossier neoscenar/ → chemin dans le paquet. */
export interface ThumbnailCopy {
  source: string
  target: string
}

export interface ExchangeInput {
  project: Pick<ProjectData, 'id' | 'title' | 'folderName' | 'settings'>
  decoupage: Decoupage
  /** Déjà relatif à decoupage.json, avec « / ». */
  targetBlend: string
  exportedAt: Date
  neoscenarVersion: string
  /** Vrai si le fichier de vignette existe vraiment (une vignette disparue est ignorée). */
  hasThumbnailFile(path: string): boolean
}

/** 3,5 s à 25 i/s → 88 images ; jamais moins d'une image ; pas de durée → null. */
export function durationToFrames(seconds: number | null, fps: number): number | null {
  if (seconds === null) return null
  return Math.max(1, Math.round(seconds * fps))
}

/** Couleur « #rrggbb » → « #RRGGBB » ; toute autre valeur → null. */
export function exchangeColor(color: string | null): string | null {
  return color !== null && /^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : null
}

/** Date ISO sans les millisecondes : « 2026-11-18T10:00:00Z ». */
export function exchangeDate(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function exchangeShot(
  scene: Scene,
  shot: Shot,
  fps: number,
  thumbnail: string | null
): ExchangeShot {
  return {
    id: shot.id,
    label: formatShotNumber(shot.number, shot.letter),
    fullLabel: formatFullShotId(scene, shot),
    number: shot.number,
    letter: shot.letter,
    name: shot.name,
    durationSeconds: shot.duration,
    durationFrames: durationToFrames(shot.duration, fps),
    scale: shot.shotSize ?? '',
    movement: shot.cameraMovement ?? '',
    angle: shot.cameraAngle ?? '',
    sounds: shot.sound,
    music: shot.music,
    description: shot.description,
    color: exchangeColor(shot.color),
    thumbnail
  }
}

/** Contenu de decoupage.json et liste des vignettes à copier, dans l'ordre du film. */
export function buildExchange(input: ExchangeInput): {
  file: ExchangeFile
  thumbnails: ThumbnailCopy[]
} {
  const { project, decoupage } = input
  const { fps, resolution } = project.settings
  const thumbnails: ThumbnailCopy[] = []

  const scenes = decoupage.scenes.map((scene): ExchangeScene => {
    const shots = scene.shots.map((shot) => {
      let thumbnail: string | null = null
      if (shot.thumbnail !== null && input.hasThumbnailFile(shot.thumbnail)) {
        thumbnail = `${EXCHANGE_THUMBNAILS_FOLDER}/${formatFullShotId(scene, shot)}.png`
        thumbnails.push({ source: shot.thumbnail, target: thumbnail })
      }
      return exchangeShot(scene, shot, fps, thumbnail)
    })
    return {
      id: scene.id,
      label: formatSceneNumber(scene.number, scene.letter),
      number: scene.number,
      letter: scene.letter,
      name: scene.name,
      heading: scene.heading,
      color: exchangeColor(scene.color),
      shots
    }
  })

  return {
    file: {
      format: EXCHANGE_FORMAT,
      formatVersion: EXCHANGE_FORMAT_VERSION,
      exportedAt: exchangeDate(input.exportedAt),
      neoscenarVersion: input.neoscenarVersion,
      project: { id: project.id, title: project.title, folderName: project.folderName },
      settings: { width: resolution.width, height: resolution.height, fps },
      numbersLocked: decoupage.numbersLocked,
      targetBlend: input.targetBlend,
      scenes
    },
    thumbnails
  }
}

export interface ExportSummary {
  scenes: number
  shots: number
  thumbnails: number
  shotsWithoutDuration: number
  /** Scènes absentes du scénario (cartes orphelines) : exportées quand même, mais signalées. */
  orphans: string[]
}

/** Chiffres affichés dans la fenêtre d'export. */
export function exportSummary(decoupage: Decoupage): ExportSummary {
  const shots = decoupage.scenes.flatMap((scene) => scene.shots)
  return {
    scenes: decoupage.scenes.length,
    shots: shots.length,
    thumbnails: shots.filter((shot) => shot.thumbnail !== null).length,
    shotsWithoutDuration: shots.filter((shot) => shot.duration === null).length,
    orphans: decoupage.scenes
      .filter((scene) => scene.orphan)
      .map((scene) => formatSceneNumber(scene.number, scene.letter))
  }
}
