import {
  checkDimension,
  findPreset,
  type DimensionProblem,
  type FormatCatalog,
  type Size
} from '../../shared/imageFormat'
import type { ProjectSettings } from '../../shared/projectTypes'

// Réglages de format en cours de saisie (fenêtres de création et de réglages du projet).

/** Valeur de la liste pour « Personnalisé… ». */
export const CUSTOM_FORMAT = 'custom'

export interface FormatDraft {
  /** Identifiant du préréglage, ou CUSTOM_FORMAT. */
  choice: string
  /** Texte tapé dans les champs largeur et hauteur. */
  width: string
  height: string
  fps: number
}

export function draftFromSettings(catalog: FormatCatalog, settings: ProjectSettings): FormatDraft {
  const preset = findPreset(catalog.presets, settings.resolution)
  return {
    choice: preset?.id ?? CUSTOM_FORMAT,
    width: String(settings.resolution.width),
    height: String(settings.resolution.height),
    fps: settings.fps
  }
}

/** Choix dans la liste : un préréglage remplit les champs ; « Personnalisé » les garde. */
export function chooseFormat(
  catalog: FormatCatalog,
  draft: FormatDraft,
  choice: string
): FormatDraft {
  const preset = catalog.presets.find((item) => item.id === choice)
  return preset
    ? { ...draft, choice, width: String(preset.width), height: String(preset.height) }
    : { ...draft, choice: CUSTOM_FORMAT }
}

function parseDimension(text: string): { value: number; problem: DimensionProblem | null } {
  const trimmed = text.trim()
  if (!/^\d+$/.test(trimmed)) return { value: NaN, problem: 'not-integer' }
  const value = Number(trimmed)
  return { value, problem: checkDimension(value) }
}

export interface DraftCheck {
  widthProblem: DimensionProblem | null
  heightProblem: DimensionProblem | null
  /** Taille valide (pour l'aperçu et les proportions), sinon null. */
  size: Size | null
  /** Réglages à enregistrer si tout est valide, sinon null. */
  settings: ProjectSettings | null
}

export function checkDraft(draft: FormatDraft): DraftCheck {
  const width = parseDimension(draft.width)
  const height = parseDimension(draft.height)
  const size =
    width.problem === null && height.problem === null
      ? { width: width.value, height: height.value }
      : null
  return {
    widthProblem: width.problem,
    heightProblem: height.problem,
    size,
    settings: size ? { fps: draft.fps, resolution: size } : null
  }
}

/** Cadences de la liste, plus celle du projet si elle n'y figure pas (projet modifié à la main). */
export function frameRateChoices(catalog: FormatCatalog, current: number): number[] {
  return catalog.frameRates.includes(current)
    ? catalog.frameRates
    : [...catalog.frameRates, current].sort((a, b) => a - b)
}
