import type { ProjectSettings } from './projectTypes'

// Format de l'image du film : préréglages, proportions, définition de travail des vignettes.

export interface Size {
  width: number
  height: number
}

/** Préréglage proposé à la création du projet (« Paysage Full HD », 1920 × 1080). */
export interface FormatPreset extends Size {
  id: string
  name: string
}

/** Contenu du fichier resources/formats/formats.json livré avec l'application. */
export interface FormatCatalog {
  formatVersion: number
  presets: FormatPreset[]
  defaultPresetId: string
  /** Cadences proposées, en images par seconde. */
  frameRates: number[]
  defaultFrameRate: number
}

/** Dimensions acceptées pour un format personnalisé (les formats vidéo exigent des nombres pairs). */
export const DIMENSION_MIN = 16
export const DIMENSION_MAX = 8192

/** Côté le plus long des vignettes enregistrées. */
export const WORKING_LONG_SIDE = 1920

/** Deux proportions sont considérées comme identiques à 1 % près. */
export const ASPECT_TOLERANCE = 0.01

export type DimensionProblem = 'not-integer' | 'odd' | 'too-small' | 'too-large'

/** Vérifie une largeur ou une hauteur saisie ; null si elle convient. */
export function checkDimension(value: number): DimensionProblem | null {
  if (!Number.isInteger(value)) return 'not-integer'
  if (value < DIMENSION_MIN) return 'too-small'
  if (value > DIMENSION_MAX) return 'too-large'
  if (value % 2 !== 0) return 'odd'
  return null
}

export function isValidSize(size: Size): boolean {
  return checkDimension(size.width) === null && checkDimension(size.height) === null
}

/** Préréglage de même définition, ou null (« Personnalisé »). */
export function findPreset(presets: readonly FormatPreset[], size: Size): FormatPreset | null {
  return (
    presets.find((preset) => preset.width === size.width && preset.height === size.height) ?? null
  )
}

export function aspectRatio(size: Size): number {
  return size.width / size.height
}

/** Vrai si les deux proportions sont identiques, à 1 % près. */
export function sameAspect(a: Size, b: Size): boolean {
  return Math.abs(aspectRatio(a) / aspectRatio(b) - 1) <= ASPECT_TOLERANCE
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

/** Au-delà, une fraction comme 160:67 ne parle à personne : on écrit « 2,39:1 ». */
const MAX_SIMPLE_TERM = 32

/** Proportions lisibles : « 16:9 », « 9:16 », « 1:1 », sinon « 1,85:1 ». */
export function formatAspect(size: Size): string {
  const divisor = gcd(size.width, size.height)
  const width = size.width / divisor
  const height = size.height / divisor
  if (Number.isInteger(width) && width <= MAX_SIMPLE_TERM && height <= MAX_SIMPLE_TERM) {
    return `${width}:${height}`
  }
  const ratio = (Math.round(aspectRatio(size) * 100) / 100).toString().replace('.', ',')
  return `${ratio}:1`
}

/** Définition des vignettes : 1920 pixels sur le côté le plus long, l'autre selon les proportions. */
export function workingSize(size: Size): Size {
  const scale = WORKING_LONG_SIDE / Math.max(size.width, size.height)
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale))
  }
}

/** Réglages d'un nouveau projet : préréglage et cadence par défaut. */
export function defaultSettings(catalog: FormatCatalog): ProjectSettings {
  const preset =
    catalog.presets.find((item) => item.id === catalog.defaultPresetId) ?? catalog.presets[0]
  return {
    fps: catalog.defaultFrameRate,
    resolution: { width: preset.width, height: preset.height }
  }
}

/** Réglages acceptables : dimensions valides et cadence proposée. */
export function isValidSettings(catalog: FormatCatalog, settings: ProjectSettings): boolean {
  return isValidSize(settings.resolution) && catalog.frameRates.includes(settings.fps)
}
