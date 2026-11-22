// Noms des fichiers de fiches et d'images, comparaison des noms, tri et couleurs proposées.

import { avoidReservedName } from '../fileNameRules'
import { CHARACTER_ROLES, type Sheet } from './types'

export const SHEET_EXTENSION = '.md'

/** Longueur maximale d'un nom de fiche (les systèmes limitent les noms de fichiers). */
export const MAX_SHEET_NAME_LENGTH = 120

/** Nom propre : espaces superflus retirés, pas de retour à la ligne. */
export function cleanSheetName(name: string): string {
  return name.replace(/\s+/g, ' ').trim()
}

/**
 * Nom de fichier ou de dossier sûr : caractères interdits par Windows, macOS ou Linux remplacés
 * par « _ », nom réservé par Windows complété (« CON » → « CON_ »). Accents et espaces conservés.
 */
export function safeFileStem(name: string): string {
  const safe = cleanSheetName(name)
    .replace(/[/\\:*?"<>|]/g, '_')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f]/g, '_')
    // Un nom qui commence par un point serait caché ; Windows refuse un point ou un espace final.
    .replace(/^\./, '_')
    .replace(/[. ]+$/, '')
    .slice(0, MAX_SHEET_NAME_LENGTH)
  return safe === '' ? '_' : avoidReservedName(safe)
}

/** Nom du fichier d'une fiche : le nom tel qu'écrit dans le scénario (« MARIE.md »). */
export function sheetFileName(name: string): string {
  return `${safeFileStem(name)}${SHEET_EXTENSION}`
}

/**
 * Nom de fiche sans tenir compte de la casse (MARIE = Marie) ni de la forme Unicode : macOS écrit
 * parfois « É » en deux caractères (NFD), Windows en un seul (NFC).
 */
export function nameKey(name: string): string {
  return cleanSheetName(name.normalize('NFC')).toLocaleUpperCase('fr')
}

/** Vrai si ce nom de fichier est déjà pris (le Mac et Windows ignorent la casse). */
export function fileNameTaken(fileName: string, existing: readonly string[]): boolean {
  const key = fileName.normalize('NFC').toLocaleLowerCase('fr')
  return existing.some((name) => name.normalize('NFC').toLocaleLowerCase('fr') === key)
}

/**
 * Nom libre pour une image copiée : nom d'origine, puis « -2 », « -3 »… avant l'extension.
 * `taken` compare sans tenir compte de la casse.
 */
export function uniqueFileName(original: string, taken: readonly string[]): string {
  const dot = original.lastIndexOf('.')
  const base = dot > 0 ? original.slice(0, dot) : original
  const extension = dot > 0 ? original.slice(dot) : ''
  for (let attempt = 1; ; attempt++) {
    const candidate = attempt === 1 ? original : `${base}-${attempt}${extension}`
    if (!fileNameTaken(candidate, taken)) return candidate
  }
}

/** Couleurs proposées aux nouveaux personnages : bien distinctes, lisibles en clair et en sombre. */
export const SHEET_COLORS = [
  '#E07A5F',
  '#3D85C6',
  '#81B29A',
  '#F2CC8F',
  '#9C6ADE',
  '#E8A0BF',
  '#2A9D8F',
  '#F4A261',
  '#6D9DC5',
  '#B5838D',
  '#8AB17D',
  '#D62828'
] as const

/** Première couleur de la palette que personne n'utilise encore (sinon, on recommence). */
export function proposeColor(used: readonly string[]): string {
  const taken = new Set(used.map((color) => color.toUpperCase()))
  const free = SHEET_COLORS.find((color) => !taken.has(color))
  return free ?? SHEET_COLORS[used.length % SHEET_COLORS.length]
}

/** Vrai pour une couleur « #rrggbb ». */
export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value.trim())
}

function roleRank(role: string): number {
  const index = (CHARACTER_ROLES as readonly string[]).indexOf(role.trim().toLowerCase())
  return index >= 0 ? index : CHARACTER_ROLES.length
}

/** Personnages triés par rôle (principal, secondaire, figurant, autre), puis par nom. */
export function sortCharacters(sheets: readonly Sheet[]): Sheet[] {
  return [...sheets].sort(
    (a, b) =>
      roleRank(a.props.role ?? '') - roleRank(b.props.role ?? '') ||
      a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })
  )
}

/** Lieux triés par nom. */
export function sortPlaces(sheets: readonly Sheet[]): Sheet[] {
  return [...sheets].sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }))
}
