// Thèmes de l'application : couleurs de l'INTERFACE seulement. Le contenu de l'élève (cartes,
// dessin, vignettes, logos) et tous les exports (PDF, PNG, Blender) n'en dépendent jamais.
// Un seul endroit pour les couleurs : le reste de l'interface utilise les variables CSS.

export const THEMES = ['defaut', 'cobalt', 'or', 'matrix', 'pinklady', 'forest', 'aqua'] as const

export type ThemeChoice = (typeof THEMES)[number]

export const DEFAULT_THEME: ThemeChoice = 'defaut'

/**
 * Jeu de couleurs réellement appliqué. « Par défaut » en a deux (il suit le Mac) ; les clés
 * `defaut-clair` et `defaut-sombre` serviront aux couleurs du scénario réglables (étape 14B).
 */
export const PALETTE_IDS = [
  'defaut-clair',
  'defaut-sombre',
  'cobalt',
  'or',
  'matrix',
  'pinklady',
  'forest',
  'aqua'
] as const

export type PaletteId = (typeof PALETTE_IDS)[number]

export type Tone = 'clair' | 'sombre'

/** Une couleur par clé ; chaque clé devient une variable CSS (voir CSS_VARIABLES). */
export interface ThemeColors {
  // Interface
  background: string
  surface: string
  border: string
  text: string
  muted: string
  accent: string
  accentText: string
  danger: string
  hover: string
  warning: string
  // Page du scénario (à l'écran seulement)
  desk: string
  page: string
  pageText: string
  pageMuted: string
  pageShadow: string
  note: string
  noteMark: string
  searchMatch: string
  searchMatchOutline: string
  searchMatchSelected: string
  // Comparaison de versions
  diffAdded: string
  diffRemoved: string
  // Marques de révision : mêmes noms dans tous les thèmes, teintes adaptées, non réglables
  revJaune: string
  revVert: string
  revRose: string
  revBleu: string
  revSolidJaune: string
  revSolidVert: string
  revSolidRose: string
  revSolidBleu: string
  revBadgeText: string
  // Statistiques : jour / nuit / autre
  statDay: string
  statNight: string
  statOther: string
  // Tâche validée : liseret et coche de la ligne du temps
  validee: string
}

export interface Palette {
  tone: Tone
  colors: ThemeColors
}

/** Nom de la variable CSS de chaque couleur. */
export const CSS_VARIABLES: Record<keyof ThemeColors, string> = {
  background: '--background',
  surface: '--surface',
  border: '--border',
  text: '--text',
  muted: '--muted',
  accent: '--accent',
  accentText: '--accent-text',
  danger: '--danger',
  hover: '--hover',
  warning: '--warning',
  desk: '--desk',
  page: '--page',
  pageText: '--page-text',
  pageMuted: '--page-muted',
  pageShadow: '--page-shadow',
  note: '--note',
  noteMark: '--note-mark',
  searchMatch: '--search-match',
  searchMatchOutline: '--search-match-outline',
  searchMatchSelected: '--search-match-selected',
  diffAdded: '--diff-added',
  diffRemoved: '--diff-removed',
  revJaune: '--rev-jaune',
  revVert: '--rev-vert',
  revRose: '--rev-rose',
  revBleu: '--rev-bleu',
  revSolidJaune: '--rev-solid-jaune',
  revSolidVert: '--rev-solid-vert',
  revSolidRose: '--rev-solid-rose',
  revSolidBleu: '--rev-solid-bleu',
  revBadgeText: '--rev-badge-text',
  statDay: '--stat-day',
  statNight: '--stat-night',
  statOther: '--stat-other',
  validee: '--validee'
}

// Marques de révision : même teinte de base, un peu plus dense sur fond sombre.
const REVISION_LIGHT = {
  revJaune: 'rgba(255, 210, 0, 0.42)',
  revVert: 'rgba(70, 190, 80, 0.32)',
  revRose: 'rgba(255, 90, 150, 0.3)',
  revBleu: 'rgba(60, 140, 255, 0.3)',
  revSolidJaune: '#f2c400',
  revSolidVert: '#4caf50',
  revSolidRose: '#ec5d97',
  revSolidBleu: '#4a8df0',
  revBadgeText: '#4a3b00'
}

const REVISION_DARK = {
  revJaune: 'rgba(255, 210, 0, 0.34)',
  revVert: 'rgba(70, 200, 90, 0.34)',
  revRose: 'rgba(255, 90, 150, 0.4)',
  revBleu: 'rgba(60, 140, 255, 0.45)',
  revSolidJaune: '#f2c400',
  revSolidVert: '#4caf50',
  revSolidRose: '#ec5d97',
  revSolidBleu: '#4a8df0',
  revBadgeText: '#4a3b00'
}

const SEARCH_LIGHT = {
  searchMatch: 'rgba(255, 200, 0, 0.35)',
  searchMatchOutline: 'rgba(255, 170, 0, 0.6)',
  searchMatchSelected: 'rgba(255, 140, 0, 0.6)'
}

const SEARCH_DARK = {
  searchMatch: 'rgba(255, 200, 0, 0.3)',
  searchMatchOutline: 'rgba(255, 170, 0, 0.7)',
  searchMatchSelected: 'rgba(255, 140, 0, 0.55)'
}

const STATS_LIGHT = { statDay: '#cf9a12', statNight: '#27346b', statOther: '#b4764a' }
const STATS_DARK = { statDay: '#f2c94c', statNight: '#5c70d6', statOther: '#c98a5b' }

// Tâche validée (ligne du temps) : cyan vif sur fond sombre, turquoise foncé sur fond clair
// (au moins 3:1 sur le fond de la ligne du temps, vérifié dans themes.test.ts).
const VALIDEE_DARK = { validee: '#00ffff' }
const VALIDEE_LIGHT = { validee: '#00757f' }

export const PALETTES: Record<PaletteId, Palette> = {
  // L'aspect actuel de l'application, clair et sombre.
  'defaut-clair': {
    tone: 'clair',
    colors: {
      background: '#f6f5f2',
      surface: '#ffffff',
      border: '#dcd9d2',
      text: '#1f2328',
      muted: '#646971',
      accent: '#2f5d8a',
      accentText: '#ffffff',
      danger: '#b3261e',
      hover: '#eeece7',
      warning: '#e8890c',
      desk: '#e4e2dd',
      page: '#ffffff',
      pageText: '#1f2328',
      pageMuted: '#646971',
      pageShadow: 'rgba(0, 0, 0, 0.18)',
      note: '#2e7d32',
      noteMark: '#d32f2f',
      ...SEARCH_LIGHT,
      diffAdded: '#1b7a32',
      diffRemoved: '#b3261e',
      ...REVISION_LIGHT,
      ...STATS_LIGHT,
      ...VALIDEE_LIGHT
    }
  },
  'defaut-sombre': {
    tone: 'sombre',
    colors: {
      background: '#1d1f23',
      surface: '#272a30',
      border: '#3a3e46',
      text: '#e8e6e1',
      muted: '#9aa0a8',
      accent: '#7fb0e0',
      accentText: '#11161c',
      danger: '#f2b8b5',
      hover: '#30343b',
      warning: '#e8890c',
      desk: '#18191c',
      page: '#2b2d31',
      pageText: '#e8e6e1',
      pageMuted: '#9aa0a8',
      pageShadow: 'rgba(0, 0, 0, 0.5)',
      note: '#81c784',
      noteMark: '#ef5350',
      ...SEARCH_DARK,
      diffAdded: '#7fd48f',
      diffRemoved: '#f2a19b',
      ...REVISION_DARK,
      ...STATS_DARK,
      ...VALIDEE_DARK
    }
  },
  cobalt: {
    tone: 'sombre',
    colors: {
      background: '#0f1b33',
      surface: '#16264a',
      border: '#2c4070',
      text: '#eaf0ff',
      muted: '#a3b3d6',
      accent: '#ffd23f',
      accentText: '#10192e',
      danger: '#ffa39d',
      hover: '#1d3158',
      warning: '#ffb020',
      desk: '#0a1426',
      page: '#13213f',
      pageText: '#eef3ff',
      pageMuted: '#a9b8d9',
      pageShadow: 'rgba(0, 0, 0, 0.5)',
      note: '#7ee0a0',
      noteMark: '#ff6b6b',
      ...SEARCH_DARK,
      diffAdded: '#8fe0a2',
      diffRemoved: '#ff9f98',
      ...REVISION_DARK,
      ...STATS_DARK,
      ...VALIDEE_DARK
    }
  },
  or: {
    tone: 'sombre',
    colors: {
      background: '#17130c',
      surface: '#221c10',
      border: '#4a3d20',
      text: '#f2e8d0',
      muted: '#b8a880',
      accent: '#e0b040',
      accentText: '#1a1405',
      danger: '#f4a99f',
      hover: '#2d2514',
      warning: '#e8890c',
      desk: '#100d07',
      page: '#1f1a0f',
      pageText: '#f5ecd5',
      pageMuted: '#bcad86',
      pageShadow: 'rgba(0, 0, 0, 0.55)',
      note: '#a5d68a',
      noteMark: '#ef5350',
      ...SEARCH_DARK,
      diffAdded: '#a5d68a',
      diffRemoved: '#f4a99f',
      ...REVISION_DARK,
      ...STATS_DARK,
      ...VALIDEE_DARK
    }
  },
  matrix: {
    tone: 'sombre',
    colors: {
      background: '#000000',
      surface: '#08130a',
      border: '#1b4a22',
      text: '#4dff7a',
      muted: '#2fc45f',
      accent: '#00ff41',
      accentText: '#001a06',
      danger: '#ff7a7a',
      hover: '#0f2412',
      warning: '#e8a30c',
      desk: '#000000',
      page: '#030d05',
      pageText: '#4dff7a',
      pageMuted: '#2fc45f',
      pageShadow: 'rgba(0, 255, 65, 0.12)',
      note: '#7dffd0',
      noteMark: '#ff5252',
      ...SEARCH_DARK,
      diffAdded: '#4dff7a',
      diffRemoved: '#ff7a7a',
      ...REVISION_DARK,
      ...STATS_DARK,
      ...VALIDEE_DARK
    }
  },
  pinklady: {
    tone: 'clair',
    colors: {
      background: '#fdf1f5',
      surface: '#fff8fa',
      border: '#efc9d6',
      text: '#3a1f2b',
      muted: '#7d4f63',
      accent: '#b0194f',
      accentText: '#ffffff',
      danger: '#a4141a',
      hover: '#f8dfe8',
      warning: '#e8890c',
      desk: '#f3dde5',
      page: '#fffafc',
      pageText: '#3a1f2b',
      pageMuted: '#7d4f63',
      pageShadow: 'rgba(90, 20, 50, 0.18)',
      note: '#1f7a3d',
      noteMark: '#d32f2f',
      ...SEARCH_LIGHT,
      diffAdded: '#1b7a32',
      diffRemoved: '#a4141a',
      ...REVISION_LIGHT,
      ...STATS_LIGHT,
      ...VALIDEE_LIGHT
    }
  },
  forest: {
    tone: 'sombre',
    colors: {
      background: '#12201a',
      surface: '#1a2d24',
      border: '#2f4d3f',
      text: '#e6f0e8',
      muted: '#a3bbaa',
      accent: '#9ccc65',
      accentText: '#10200f',
      danger: '#f2b0aa',
      hover: '#223a2e',
      warning: '#e8890c',
      desk: '#0d1712',
      page: '#172920',
      pageText: '#eaf3ec',
      pageMuted: '#a7bfae',
      pageShadow: 'rgba(0, 0, 0, 0.5)',
      note: '#d4e157',
      noteMark: '#ff7043',
      ...SEARCH_DARK,
      diffAdded: '#a5d6a7',
      diffRemoved: '#f2a19b',
      ...REVISION_DARK,
      ...STATS_DARK,
      ...VALIDEE_DARK
    }
  },
  aqua: {
    tone: 'clair',
    colors: {
      background: '#f0f8fa',
      surface: '#ffffff',
      border: '#c5e0e6',
      text: '#12313a',
      muted: '#4a6f79',
      accent: '#00778b',
      accentText: '#ffffff',
      danger: '#b3261e',
      hover: '#e0f0f4',
      warning: '#e8890c',
      desk: '#dcecf0',
      page: '#ffffff',
      pageText: '#12313a',
      pageMuted: '#4a6f79',
      pageShadow: 'rgba(0, 50, 70, 0.18)',
      note: '#2e7d32',
      noteMark: '#d32f2f',
      ...SEARCH_LIGHT,
      diffAdded: '#1b7a32',
      diffRemoved: '#b3261e',
      ...REVISION_LIGHT,
      ...STATS_LIGHT,
      ...VALIDEE_LIGHT
    }
  }
}

/**
 * Valeur lue dans les préférences. Les anciens réglages « Automatique », « Clair » et « Sombre »
 * (avant l'étape 14) et toute valeur inconnue donnent « Par défaut », qui suit le Mac.
 */
export function parseTheme(value: unknown): ThemeChoice {
  return THEMES.includes(value as ThemeChoice) ? (value as ThemeChoice) : DEFAULT_THEME
}

/** Jeu de couleurs d'un thème ; « Par défaut » dépend de l'aspect du système. */
export function paletteId(theme: ThemeChoice, systemIsDark: boolean): PaletteId {
  if (theme === 'defaut') return systemIsDark ? 'defaut-sombre' : 'defaut-clair'
  return theme
}

export function resolvePalette(theme: ThemeChoice, systemIsDark: boolean): Palette {
  return PALETTES[paletteId(theme, systemIsDark)]
}

/**
 * Valeur de nativeTheme.themeSource d'Electron (barres de défilement, fenêtres du système) :
 * « Par défaut » suit le Mac, les autres thèmes imposent leur ton.
 */
export function themeSource(theme: ThemeChoice): 'system' | 'light' | 'dark' {
  if (theme === 'defaut') return 'system'
  return PALETTES[theme].tone === 'sombre' ? 'dark' : 'light'
}

/** Variables CSS d'un jeu de couleurs, prêtes à être posées sur <html>. */
export function cssVariables(palette: Palette): Record<string, string> {
  const result: Record<string, string> = {}
  for (const key of Object.keys(CSS_VARIABLES) as (keyof ThemeColors)[]) {
    result[CSS_VARIABLES[key]] = palette.colors[key]
  }
  return result
}
