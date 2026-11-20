/** Extensions de personnage connues : mises en majuscules et proposées après « ( ». */
export const CHARACTER_EXTENSIONS: readonly string[] = [
  'V.O.',
  'O.S.',
  'O.C.',
  'SOUS-TITRE',
  'SUITE'
]

const KNOWN = new Set(CHARACTER_EXTENSIONS)

/**
 * Ligne de personnage telle qu'elle doit être écrite : nom en majuscules, extensions connues en
 * majuscules même tapées en minuscules (« (v.o.) » → « (V.O.) ») ; les autres textes entre
 * parenthèses restent tels quels (« (au téléphone) »).
 */
export function normalizeCharacterLine(text: string): string {
  let depth = 0
  let name = ''
  for (const char of text) {
    if (char === '(') depth++
    name += depth > 0 ? char : char.toUpperCase()
    if (char === ')' && depth > 0) depth--
  }
  return name.replace(/\(([^()]*)\)/g, (whole, inner: string) =>
    KNOWN.has(inner.trim().toUpperCase()) ? `(${inner.toUpperCase()})` : whole
  )
}
