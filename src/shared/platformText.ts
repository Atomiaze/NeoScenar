// Textes qui dépendent du système : les textes de `fr` sont écrits pour le Mac (« Cmd + Z »,
// « ⌘J », « Finder ») et cette fonction unique les adapte à Windows et à Linux.
// Ce fichier ne dépend de rien : il sert au processus principal comme à l'interface.

export type TextPlatform = 'mac' | 'windows' | 'linux'

/** Système des textes, d'après `process.platform` (« darwin », « win32 », « linux »…). */
export function textPlatform(nodePlatform: string): TextPlatform {
  if (nodePlatform === 'darwin') return 'mac'
  if (nodePlatform === 'win32') return 'windows'
  return 'linux'
}

/** « le Finder », « du Finder », « au Finder » et « Finder » seul, selon le système. */
const FILE_MANAGER: Record<Exclude<TextPlatform, 'mac'>, Record<string, string>> = {
  windows: {
    le: 'l’Explorateur de fichiers',
    du: 'de l’Explorateur de fichiers',
    au: 'à l’Explorateur de fichiers',
    '': 'Explorateur de fichiers'
  },
  linux: {
    le: 'le gestionnaire de fichiers',
    du: 'du gestionnaire de fichiers',
    au: 'au gestionnaire de fichiers',
    '': 'gestionnaire de fichiers'
  }
}

/** Un texte écrit pour le Mac, adapté au système (inchangé sur Mac). */
export function adaptText(text: string, platform: TextPlatform): string {
  if (platform === 'mac') return text
  return (
    text
      // Raccourcis courts de la barre des éléments : « ⌘↩ », « ⌘J ».
      .replace(/⌘↩/g, 'Ctrl+↵')
      .replace(/⌘/g, 'Ctrl+')
      .replace(/⌥/g, 'Alt+')
      .replace(/\bCmd\b/g, 'Ctrl')
      .replace(/\bOption\b(?= \+)/g, 'Alt')
      .replace(
        /\b(?:(le|du|au) )?Finder\b/g,
        (_match, article: string | undefined) => FILE_MANAGER[platform][article ?? '']
      )
  )
}

/**
 * Copie de tous les textes, adaptés au système. Les textes calculés (fonctions) sont adaptés à
 * chaque appel ; les nombres et autres valeurs restent tels quels.
 */
export function adaptTexts<T>(texts: T, platform: TextPlatform): T {
  if (platform === 'mac') return texts
  return adaptValue(texts, platform) as T
}

function adaptValue(value: unknown, platform: TextPlatform): unknown {
  if (typeof value === 'string') return adaptText(value, platform)
  if (typeof value === 'function') {
    return (...args: unknown[]): unknown =>
      adaptValue((value as (...a: unknown[]) => unknown)(...args), platform)
  }
  if (Array.isArray(value)) return value.map((item) => adaptValue(item, platform))
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, adaptValue(item, platform)])
    )
  }
  return value
}

/**
 * Système de l'application en cours : processus principal d'Electron, ou interface (le preload
 * donne `window.neoscenar.platform`). Hors d'Electron (tests), les textes du Mac.
 */
export function currentTextPlatform(): TextPlatform {
  // Lu par globalThis : ce fichier est aussi compilé pour l'interface, qui n'a pas `process`.
  const scope = globalThis as {
    process?: { platform: string; versions?: { electron?: string } }
    neoscenar?: { platform?: unknown }
  }
  if (scope.process?.versions?.electron) return textPlatform(scope.process.platform)
  const fromPreload = scope.neoscenar?.platform
  return typeof fromPreload === 'string' ? textPlatform(fromPreload) : 'mac'
}
