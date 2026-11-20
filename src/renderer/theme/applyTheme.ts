import {
  paletteId,
  resolvePalette,
  cssVariables,
  type PaletteId,
  type ThemeChoice
} from '../../shared/themes/themes'
import {
  resolveScriptColors,
  scriptCssVariables,
  SCRIPT_CSS_VARIABLES,
  type ScriptColors
} from '../../shared/themes/scriptColors'

const DARK_QUERY = '(prefers-color-scheme: dark)'

let currentTheme: ThemeChoice = 'defaut'
let scriptColors: ScriptColors = {}

/** Jeu de couleurs affiché en ce moment (« Par défaut » dépend du Mac). */
export function currentPaletteId(): PaletteId {
  return paletteId(currentTheme, window.matchMedia(DARK_QUERY).matches)
}

export function currentScriptColors(): ScriptColors {
  return scriptColors
}

/** Pose les couleurs du thème, puis celles du scénario par-dessus, sur <html>. */
function paint(): void {
  const dark = window.matchMedia(DARK_QUERY).matches
  const palette = resolvePalette(currentTheme, dark)
  const root = document.documentElement
  for (const [name, value] of Object.entries(cssVariables(palette))) {
    root.style.setProperty(name, value)
  }
  // Variables du scénario : toutes retirées d'abord (les bandeaux d'actes « automatiques » n'en ont pas).
  for (const name of Object.values(SCRIPT_CSS_VARIABLES)) root.style.removeProperty(name)
  const resolved = resolveScriptColors(paletteId(currentTheme, dark), scriptColors)
  for (const [name, value] of Object.entries(scriptCssVariables(resolved))) {
    root.style.setProperty(name, value)
  }
  root.style.colorScheme = palette.tone === 'sombre' ? 'dark' : 'light'
  root.dataset.theme = currentTheme
}

/** Pose les couleurs du thème sur <html> : toute l'interface les lit par variables CSS. */
export function applyTheme(theme: ThemeChoice): void {
  currentTheme = theme
  paint()
}

export function applyScriptColors(colors: ScriptColors): void {
  scriptColors = colors
  paint()
}

const SAVE_DELAY_MS = 150
let saveTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Changement venu des Réglages : appliqué tout de suite, enregistré peu après (le sélecteur de
 * couleur envoie un événement à chaque déplacement). Pendant ce temps, l'écho du processus
 * principal est ignoré : il ramènerait une valeur plus ancienne.
 */
export function changeScriptColors(colors: ScriptColors): void {
  applyScriptColors(colors)
  if (saveTimer !== null) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    void window.neoscenar.setScriptColors(scriptColors)
  }, SAVE_DELAY_MS)
}

/**
 * À appeler une fois au démarrage : « Par défaut » tout de suite (pas de page sans couleurs), puis
 * le thème enregistré, puis chaque changement (réglages) et chaque passage du Mac clair ↔ sombre.
 */
export function startTheme(): void {
  applyTheme('defaut')
  void window.neoscenar.getTheme().then(applyTheme)
  void window.neoscenar.getScriptColors().then((colors) => {
    if (saveTimer === null) applyScriptColors(colors)
  })
  window.neoscenar.onThemeChanged(applyTheme)
  window.neoscenar.onScriptColorsChanged((colors) => {
    if (saveTimer === null) applyScriptColors(colors)
  })
  window.matchMedia(DARK_QUERY).addEventListener('change', paint)
}
