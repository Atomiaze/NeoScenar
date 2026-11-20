// Couleurs des éléments du scénario, à l'écran seulement (étape 14B). Chaque jeu de couleurs
// (`PaletteId`) fournit les siennes ; l'élève ne garde que les différences, jeu par jeu.
// Les exports (PDF…) ne lisent jamais ce module.

import { cardTextColor } from '../palette'
import { blend, contrastOf, parseColor, type Rgba } from './contrast'
import { PALETTE_IDS, PALETTES, type PaletteId, type ThemeColors } from './themes'

export const SCRIPT_ELEMENTS = [
  'sceneHeading',
  'character',
  'dialogue',
  'parenthetical',
  'transition',
  'note',
  'actBackground',
  'actText',
  'sceneNumber',
  'pageNumber',
  'pageBreak',
  'activeLine',
  'selection'
] as const

export type ScriptElement = (typeof SCRIPT_ELEMENTS)[number]

/** Réglages de l'élève : seulement les couleurs qui diffèrent du jeu de couleurs. */
export type ScriptColorOverrides = Partial<Record<ScriptElement, string>>
export type ScriptColors = Partial<Record<PaletteId, ScriptColorOverrides>>

/** Couleur appliquée ; null = « automatique » (bandeaux d'actes : palette des cartes). */
export type ResolvedScriptColors = Record<ScriptElement, string | null>

export const SCRIPT_CSS_VARIABLES: Record<ScriptElement, string> = {
  sceneHeading: '--script-scene-heading',
  character: '--script-character',
  dialogue: '--script-dialogue',
  parenthetical: '--script-parenthetical',
  transition: '--script-transition',
  note: '--script-note',
  actBackground: '--script-act-background',
  actText: '--script-act-text',
  sceneNumber: '--script-scene-number',
  pageNumber: '--script-page-number',
  pageBreak: '--script-page-break',
  activeLine: '--script-active-line',
  selection: '--script-selection'
}

const HEX = /^#[0-9a-f]{6}$/

function toHex({ r, g, b }: Rgba): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

/** Mélange `top` (à `alpha`) sur `bottom`, rendu en « #rrggbb ». */
function mix(top: string, bottom: string, alpha: number): string {
  const t = parseColor(top)
  const b = parseColor(bottom)
  if (!t || !b) return bottom
  return toHex(blend({ ...t, a: alpha }, b))
}

/**
 * Couleurs d'origine d'un jeu : l'aspect actuel de l'éditeur. Les bandeaux d'actes n'en ont pas
 * (null) : ils gardent la palette automatique des cartes tant que l'élève ne choisit rien.
 */
export function defaultScriptColors(colors: ThemeColors): ResolvedScriptColors {
  return {
    sceneHeading: colors.pageText,
    character: colors.pageText,
    dialogue: colors.pageText,
    parenthetical: colors.pageText,
    transition: colors.pageText,
    note: colors.note,
    actBackground: null,
    actText: null,
    sceneNumber: colors.pageText,
    pageNumber: colors.pageMuted,
    pageBreak: colors.pageMuted,
    activeLine: mix(colors.pageText, colors.page, 0.06),
    selection: mix(colors.accent, colors.page, 0.35)
  }
}

/** Valeur lue dans les préférences : jeux et éléments inconnus, couleurs mal écrites ignorés. */
export function parseScriptColors(raw: unknown): ScriptColors {
  const result: ScriptColors = {}
  if (typeof raw !== 'object' || raw === null) return result
  for (const id of PALETTE_IDS) {
    const source = (raw as Record<string, unknown>)[id]
    if (typeof source !== 'object' || source === null) continue
    const overrides: ScriptColorOverrides = {}
    for (const element of SCRIPT_ELEMENTS) {
      const value = (source as Record<string, unknown>)[element]
      if (typeof value === 'string' && HEX.test(value.toLowerCase())) {
        overrides[element] = value.toLowerCase()
      }
    }
    if (Object.keys(overrides).length > 0) result[id] = overrides
  }
  return result
}

/** Couleurs d'origine du jeu, puis les réglages de l'élève par-dessus. */
export function resolveScriptColors(id: PaletteId, all: ScriptColors): ResolvedScriptColors {
  return { ...defaultScriptColors(PALETTES[id].colors), ...(all[id] ?? {}) }
}

/**
 * Enregistre une couleur pour un jeu. Une couleur identique à celle d'origine n'est pas écrite ;
 * `null` retire le réglage. Les autres jeux ne sont jamais touchés.
 */
export function withScriptColor(
  all: ScriptColors,
  id: PaletteId,
  element: ScriptElement,
  value: string | null
): ScriptColors {
  const overrides = { ...(all[id] ?? {}) }
  const original = defaultScriptColors(PALETTES[id].colors)[element]
  const hex = value?.toLowerCase() ?? null
  if (hex === null || !HEX.test(hex) || hex === original) delete overrides[element]
  else overrides[element] = hex
  const next = { ...all }
  if (Object.keys(overrides).length > 0) next[id] = overrides
  else delete next[id]
  return next
}

/** « Couleurs d'origine du thème » : efface les réglages de ce jeu seulement. */
export function withoutScriptColors(all: ScriptColors, id: PaletteId): ScriptColors {
  const next = { ...all }
  delete next[id]
  return next
}

/** Vrai s'il y a au moins un réglage pour ce jeu. */
export function hasScriptColors(all: ScriptColors, id: PaletteId): boolean {
  return Object.keys(all[id] ?? {}).length > 0
}

/**
 * Variables CSS à poser sur <html>. Les bandeaux d'actes automatiques n'en posent pas (la palette
 * des cartes reste en place). Si seul le fond est choisi, le texte devient le plus lisible dessus.
 */
export function scriptCssVariables(resolved: ResolvedScriptColors): Record<string, string> {
  const variables: Record<string, string> = {}
  for (const element of SCRIPT_ELEMENTS) {
    const value = resolved[element]
    if (value !== null) variables[SCRIPT_CSS_VARIABLES[element]] = value
  }
  const background = resolved.actBackground
  if (background !== null && resolved.actText === null) {
    variables[SCRIPT_CSS_VARIABLES.actText] = cardTextColor(background)
  }
  return variables
}

/** Seuil d'avertissement (WCAG, texte normal). */
export const SCRIPT_MIN_CONTRAST = 4.5

/**
 * Contraste de l'élément sur ce qu'il touche, ou null s'il n'y a rien à mesurer.
 * Texte et numéros : sur le fond de la page. Ligne du curseur et sélection : texte de la page sur
 * ce fond. Bandeaux d'actes : texte sur fond du bandeau (mesuré seulement s'ils sont réglés).
 */
export function scriptContrast(
  element: ScriptElement,
  resolved: ResolvedScriptColors,
  colors: ThemeColors
): number | null {
  const value = resolved[element]
  switch (element) {
    case 'activeLine':
    case 'selection':
      return value === null ? null : contrastOf(colors.pageText, value)
    case 'actBackground':
    case 'actText': {
      if (resolved.actBackground === null) return null
      const text = resolved.actText ?? cardTextColor(resolved.actBackground)
      return contrastOf(text, resolved.actBackground)
    }
    default:
      return value === null ? null : contrastOf(value, colors.page)
  }
}

export function lowContrast(
  element: ScriptElement,
  resolved: ResolvedScriptColors,
  colors: ThemeColors
): boolean {
  const ratio = scriptContrast(element, resolved, colors)
  return ratio !== null && ratio < SCRIPT_MIN_CONTRAST
}
