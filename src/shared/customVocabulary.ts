// Entrées personnelles des menus de plan (étape 17E). Gardées dans les préférences de l'application,
// pour tous les projets ; la carte d'un plan garde seulement le libellé.
import type { Vocabulary, VocabularyTerm } from './vocabulary'

export const CUSTOM_LISTS = ['shotSizes', 'cameraMovements', 'cameraAngles'] as const
export type CustomList = (typeof CUSTOM_LISTS)[number]
export type CustomVocabulary = Record<CustomList, VocabularyTerm[]>

export function emptyCustomVocabulary(): CustomVocabulary {
  return { shotSizes: [], cameraMovements: [], cameraAngles: [] }
}

/** Comparaison sans majuscules ni accents : « Plongee » et « plongée » sont le même libellé. */
export function simplifyLabel(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

export type TermProblem = 'empty' | 'duplicate'

/** Vérifie un libellé face aux entrées du cours et aux entrées personnelles (hors `ignoreIndex`). */
export function checkLabel(
  label: string,
  course: readonly VocabularyTerm[],
  custom: readonly VocabularyTerm[],
  ignoreIndex: number | null = null
): TermProblem | null {
  const wanted = simplifyLabel(label)
  if (wanted === '') return 'empty'
  const taken = [...course, ...custom.filter((_, index) => index !== ignoreIndex)]
  return taken.some((term) => simplifyLabel(term.label) === wanted) ? 'duplicate' : null
}

export type EditResult = { ok: true; value: CustomVocabulary } | { ok: false; problem: TermProblem }

function replaceList(
  all: CustomVocabulary,
  list: CustomList,
  terms: VocabularyTerm[]
): CustomVocabulary {
  return { ...all, [list]: terms }
}

export function addTerm(
  all: CustomVocabulary,
  course: Vocabulary,
  list: CustomList,
  label: string,
  definition: string
): EditResult {
  const problem = checkLabel(label, course[list], all[list])
  if (problem) return { ok: false, problem }
  const term = { label: label.trim(), definition: definition.trim() }
  return { ok: true, value: replaceList(all, list, [...all[list], term]) }
}

export function renameTerm(
  all: CustomVocabulary,
  course: Vocabulary,
  list: CustomList,
  index: number,
  label: string,
  definition: string
): EditResult {
  const problem = checkLabel(label, course[list], all[list], index)
  if (problem) return { ok: false, problem }
  const term = { label: label.trim(), definition: definition.trim() }
  return {
    ok: true,
    value: replaceList(
      all,
      list,
      all[list].map((old, i) => (i === index ? term : old))
    )
  }
}

export function removeTerm(
  all: CustomVocabulary,
  list: CustomList,
  index: number
): CustomVocabulary {
  return replaceList(
    all,
    list,
    all[list].filter((_, i) => i !== index)
  )
}

/** Entrées du cours d'abord, puis les personnelles (sans doublon avec celles du cours). */
export function mergedTerms(
  course: readonly VocabularyTerm[],
  custom: readonly VocabularyTerm[]
): VocabularyTerm[] {
  const seen = new Set(course.map((term) => simplifyLabel(term.label)))
  return [...course, ...custom.filter((term) => !seen.has(simplifyLabel(term.label)))]
}

/** Lecture prudente : ignore tout ce qui n'a pas la bonne forme et les doublons. */
export function parseCustomVocabulary(raw: unknown): CustomVocabulary {
  const result = emptyCustomVocabulary()
  if (typeof raw !== 'object' || raw === null) return result
  for (const list of CUSTOM_LISTS) {
    const items = (raw as Record<string, unknown>)[list]
    if (!Array.isArray(items)) continue
    const seen = new Set<string>()
    for (const item of items) {
      if (typeof item !== 'object' || item === null) continue
      const { label, definition } = item as Record<string, unknown>
      if (typeof label !== 'string' || simplifyLabel(label) === '') continue
      if (seen.has(simplifyLabel(label))) continue
      seen.add(simplifyLabel(label))
      result[list].push({
        label: label.trim(),
        definition: typeof definition === 'string' ? definition.trim() : ''
      })
    }
  }
  return result
}
