// Règles de reconnaissance partagées par l'analyseur et la réécriture.

const LETTER = /\p{L}/u
const LOWERCASE = /\p{Ll}/u

/** Début d'en-tête de scène : INT, EXT, EST, INT./EXT, INT/EXT, I/E suivi d'un point ou d'une espace. */
export const SCENE_HEADING_START = /^(?:int\.?\/ext|int|ext|est|i\/e)[.\s]/i
/** Un seul point suivi d'une lettre ou d'un chiffre force un en-tête de scène (« ... » n'en est pas un). */
export const FORCED_SCENE_HEADING = /^\.(?=[\p{L}\p{N}])/u
export const PAGE_BREAK = /^={3,}$/

/** Retire les notes et textes mis de côté refermés (pour analyser le texte « visible »). */
export function removeMarkedText(text: string): string {
  return text.replace(/\[\[[\s\S]*?\]\]|\/\*[\s\S]*?\*\//g, '')
}

/** Contient au moins une lettre et aucune minuscule (gère les accents : ÉLODIE, FRANÇOIS). */
export function isUppercase(text: string): boolean {
  return LETTER.test(text) && !LOWERCASE.test(text)
}

export function isTransitionText(text: string): boolean {
  return text.endsWith('TO:') && isUppercase(text)
}

export function isParentheticalText(text: string): boolean {
  return text.startsWith('(') && text.endsWith(')')
}

/** Ligne de personnage possible : en majuscules, hors extensions entre parenthèses ; « ^ » final permis. */
export function isCharacterText(text: string): boolean {
  let line = text.trim()
  if (line.endsWith('^')) line = line.slice(0, -1).trimEnd()
  const parenthesis = line.indexOf('(')
  const name = parenthesis < 0 ? line : line.slice(0, parenthesis)
  if (!LETTER.test(name)) return false
  return !LOWERCASE.test(line.replace(/\([^)]*\)/g, ''))
}
