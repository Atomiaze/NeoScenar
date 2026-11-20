// Petits outils de texte du générique : nom des personnages, listes de noms, textes du modèle.

/** Petits mots laissés en minuscules au milieu d'un nom (le « de » de « Homme de Main »). */
const SMALL_WORDS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'à', 'au', 'aux', 'en'])

/**
 * Nom du personnage en casse de titre : MARIE → Marie, JEAN-PIERRE → Jean-Pierre,
 * L'INFIRMIÈRE → L'Infirmière, HOMME DE MAIN → Homme de Main.
 */
export function titleCaseName(name: string): string {
  const lower = name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr')
  return lower
    .split(' ')
    .map((word, index) =>
      index > 0 && SMALL_WORDS.has(word)
        ? word
        : // Majuscule au début du mot et après un trait d'union ou une apostrophe.
          word.replace(
            /(^|[-'’])(\p{L})/gu,
            (_match, before: string, letter: string) => `${before}${letter.toLocaleUpperCase('fr')}`
          )
    )
    .join(' ')
}

/** Noms reliés pour une phrase : « Léa », « Léa et Tom », « Léa, Tom et Zoé ». */
export function joinNames(names: readonly string[], and: string): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} ${and} ${names[names.length - 1]}`
}

/** Remplace les « {clé} » d'un texte du modèle ; espaces superflus retirés. */
export function fillText(template: string, values: Record<string, string>): string {
  return template
    .replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match)
    .replace(/\s+/g, ' ')
    .trim()
}

/** Année scolaire d'une date (« 2026-2027 ») : elle commence en septembre. */
export function schoolYear(date: Date): string {
  const year = date.getFullYear()
  const start = date.getMonth() >= 8 ? year : year - 1
  return `${start}-${start + 1}`
}

/** Liste de noms nettoyée : espaces de bord retirés, lignes vides et doublons exacts retirés. */
export function cleanNames(names: readonly string[]): string[] {
  const kept: string[] = []
  for (const raw of names) {
    const name = raw.replace(/\s+/g, ' ').trim()
    if (name !== '' && !kept.includes(name)) kept.push(name)
  }
  return kept
}
