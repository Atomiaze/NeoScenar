// Propositions de l'assistant d'en-tête de scène et de l'autocomplétion des personnages.
// Logique pure : à partir du texte de la ligne avant le curseur et des listes de noms connus.

import { getCharacters, getLocations, type FountainDocument } from '@neoscenar/fountain'
import { PLACEHOLDER_HEADING } from '../../../shared/scriptLink/scriptScenes'
import { CHARACTER_EXTENSIONS } from '../editing/characterExtensions'

/** Noms connus, réunis depuis plusieurs sources (le scénario ; les fiches à l'étape 10). */
export interface NameLists {
  locations: readonly string[]
  characters: readonly string[]
  /** Moments de la journée (vocabulaire du cours). */
  times: readonly string[]
}

/** « keep » : ligne discrète « Échap : garder « LÉA » » (le texte tapé est gardé tel quel). */
export type ProposalKind = 'prefix' | 'location' | 'time' | 'character' | 'extension' | 'keep'

export interface Proposal {
  label: string
  kind: ProposalKind
  /** Colonne (dans la ligne) où commence le texte remplacé ; il va jusqu'au curseur. */
  from: number
  /** Texte inséré à la place. */
  insert: string
}

export const HEADING_PREFIXES: readonly string[] = ['INT.', 'EXT.', 'INT./EXT.']

const PREFIX = /^(?:int\.?\/ext\.?|int\.?|ext\.?|est\.?|i\/e\.?|\.(?=\S))\s*/i
const SEPARATOR = /\s+[-–—]\s+/g

/** Comparaison sans casse ni accents : « e » trouve « ÉLODIE ». */
function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase()
}

interface Matches {
  /** Proposition identique à ce qui est tapé (casse et accents ignorés), ou null. */
  exact: string | null
  /** Propositions plus longues qui commencent par ce qui est tapé. */
  longer: string[]
}

function matching(names: readonly string[], typed: string): Matches {
  const start = fold(typed.trim())
  let exact: string | null = null
  const longer: string[] = []
  for (const name of names) {
    const folded = fold(name)
    if (folded === start) exact ??= name
    else if (folded.startsWith(start)) longer.push(name)
  }
  return { exact, longer }
}

/**
 * Liste affichée : rien si aucune proposition plus longue (Entrée garde alors ce qui est tapé et passe
 * à l'élément suivant) ; la proposition identique en tête, choisie d'office ; sinon, en bas, la ligne
 * « garder » ce qui est tapé.
 */
function arrange(
  groups: { matches: Matches; make(name: string): Proposal }[],
  keep: Proposal
): Proposal[] {
  if (groups.every((group) => group.matches.longer.length === 0)) return []
  const exact = groups.flatMap((group) =>
    group.matches.exact ? [group.make(group.matches.exact)] : []
  )
  const longer = groups.flatMap((group) => group.matches.longer.map(group.make))
  if (exact.length > 0) return [...exact, ...longer]
  return keep.label === '' ? longer : [...longer, keep]
}

function keepTyped(typed: string, from: number): Proposal {
  return { label: typed.trim(), kind: 'keep', from, insert: typed }
}

/** Un lieu terminé par un tiret (« MAISON - ») n'est jamais proposé : c'est un en-tête inachevé. */
const DANGLING_DASH = /[\s\-–—]$/u

function unique(names: readonly string[]): string[] {
  const seen = new Set<string>()
  return names.filter((name) => {
    if (DANGLING_DASH.test(name)) return false
    const key = fold(name)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * En-tête de scène, en trois temps : le préfixe (INT., EXT., INT./EXT.) dès la première lettre,
 * puis les lieux déjà utilisés, puis après « - » les moments, puis les lieux composés (« MAISON - CUISINE »).
 */
export function headingProposals(before: string, lists: NameLists): Proposal[] {
  const indent = before.length - before.trimStart().length
  const text = before.slice(indent)
  if (text === '') return []
  if (!/\s/.test(text) && !text.startsWith('.')) {
    return HEADING_PREFIXES.filter((prefix) => fold(prefix).startsWith(fold(text))).map(
      (prefix) => ({ label: prefix, kind: 'prefix', from: indent, insert: `${prefix} ` })
    )
  }
  const prefix = PREFIX.exec(text)
  if (!prefix) return []
  const restFrom = indent + prefix[0].length
  const rest = before.slice(restFrom)
  let separatorEnd = -1
  for (const match of rest.matchAll(SEPARATOR)) separatorEnd = (match.index ?? 0) + match[0].length
  const locations = {
    matches: matching(unique(lists.locations), rest),
    make: (name: string): Proposal => ({
      label: name,
      kind: 'location',
      from: restFrom,
      insert: name
    })
  }
  if (separatorEnd < 0) return arrange([locations], keepTyped(rest, restFrom))
  // Le moment commence après le dernier « espace-tiret-espace » : « SAINT-LUC » n'est pas coupé.
  const fragmentFrom = restFrom + separatorEnd
  const fragment = rest.slice(separatorEnd)
  const times = {
    matches: matching(unique(lists.times), fragment),
    make: (time: string): Proposal => ({
      label: time,
      kind: 'time',
      from: fragmentFrom,
      insert: time
    })
  }
  return arrange([times, locations], keepTyped(fragment, fragmentFrom))
}

/** Personnage : les noms déjà présents ; après « ( », les extensions (V.O., O.S.…). */
export function characterProposals(before: string, lists: NameLists): Proposal[] {
  const open = before.lastIndexOf('(')
  if (open > before.lastIndexOf(')')) {
    const { exact, longer } = matching(CHARACTER_EXTENSIONS, before.slice(open + 1))
    return [...(exact ? [exact] : []), ...longer].map((extension) => ({
      label: extension,
      kind: 'extension',
      from: open + 1,
      insert: `${extension})`
    }))
  }
  if (open >= 0) return []
  const start = /^\s*@?/.exec(before)?.[0].length ?? 0
  const typed = before.slice(start)
  if (typed.trim() === '') return []
  const characters = {
    matches: matching(unique(lists.characters), typed),
    make: (name: string): Proposal => ({
      label: name,
      kind: 'character',
      from: start,
      insert: name
    })
  }
  return arrange([characters], keepTyped(typed, start))
}

/**
 * Lieux et personnages déjà présents dans le scénario, sans la ligne en cours d'écriture (sinon le
 * début tapé serait lui-même proposé).
 */
export function namesInScript(
  doc: FountainDocument,
  currentLine: number
): Pick<NameLists, 'locations' | 'characters'> {
  const others = {
    ...doc,
    elements: doc.elements.filter((element) => element.position?.startLine !== currentLine)
  }
  return {
    // L'en-tête provisoire des cartes (`.SCÈNE À ÉCRIRE`) n'est pas un lieu.
    locations: getLocations(others)
      .map((location) => location.name)
      .filter((name) => name !== PLACEHOLDER_HEADING),
    characters: getCharacters(others).map((character) => character.name)
  }
}
