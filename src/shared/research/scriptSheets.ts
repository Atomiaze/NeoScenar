// Liens entre le scénario et les fiches (étape 10C) : quels personnages et quels lieux le scénario
// nomme, quelles fiches créer, quels noms ressemblent trop à une fiche existante, et l'état de chaque
// fiche par rapport au scénario. Logique pure : le texte vient de `packages/fountain`.

import {
  getCharacters,
  getLocations,
  type FountainDocument,
  type FountainElement
} from '@neoscenar/fountain'
import { PLACEHOLDER_HEADING } from '../scriptLink/scriptScenes'
import { nameKey } from './sheetNames'
import type { Sheet, SheetKind } from './types'

/** Nom trouvé dans le scénario, avec son nombre d'apparitions (répliques ou scènes). */
export interface ScriptName {
  name: string
  count: number
}

export type ScriptNames = Record<SheetKind, ScriptName[]>

function coversLine(element: FountainElement, line: number): boolean {
  const position = element.position
  return position !== undefined && position.startLine <= line && line <= position.endLine
}

/**
 * Personnages (éléments Personnage, sans extensions, « ^ » ni « @ ») et lieux (en-têtes de scène,
 * sans le moment) du scénario. `editingLine` : ligne en cours de frappe, ignorée (un enregistrement
 * automatique en pleine frappe ne doit pas créer la fiche « MAR »).
 */
export function scriptNames(doc: FountainDocument, editingLine: number | null = null): ScriptNames {
  const elements =
    editingLine === null
      ? doc.elements
      : doc.elements.filter((element) => !coversLine(element, editingLine))
  const kept = { ...doc, elements }
  return {
    personnages: getCharacters(kept).map(({ name, lines }) => ({ name, count: lines })),
    lieux: getLocations(kept)
      // L'en-tête provisoire des cartes (« .SCÈNE À ÉCRIRE ») n'est pas un lieu.
      .filter(({ name }) => nameKey(name) !== nameKey(PLACEHOLDER_HEADING))
      .map(({ name, scenes }) => ({ name, count: scenes }))
  }
}

/** En dessous de cette longueur, deux noms proches sont souvent deux personnages (LÉA, LÉO). */
const MIN_SIMILAR_LENGTH = 4

/** Vrai si une seule lettre change, s'ajoute ou disparaît entre les deux textes. */
function oneLetterApart(a: string[], b: string[]): boolean {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  const tail = (x: string[], from: number): string => x.slice(from).join('')
  if (a.length === b.length) return tail(a, i + 1) === tail(b, i + 1)
  return a.length > b.length ? tail(a, i + 1) === tail(b, i) : tail(a, i) === tail(b, i + 1)
}

/**
 * Deux noms différents qui se ressemblent fort : une lettre de différence (MARI / MARIE), ou, pour
 * les personnages seulement, l'un contient l'autre (MARIE / MARIE-ANNE). Pour les lieux, MAISON et
 * MAISON - CUISINE sont voulus. Seulement à partir de 4 lettres (ni LÉA / LÉO, ni A / C).
 */
export function namesLookAlike(kind: SheetKind, first: string, second: string): boolean {
  const a = nameKey(first)
  const b = nameKey(second)
  if (a === b) return false
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a]
  const short = [...shorter]
  if (short.length < MIN_SIMILAR_LENGTH) return false
  if (kind === 'personnages' && longer.includes(shorter)) return true
  return oneLetterApart(short, [...longer])
}

/** Nom du scénario sans fiche, qui ressemble trop à une fiche (existante ou créée en même temps). */
export interface Resemblance {
  kind: SheetKind
  name: string
  /** Nom de la fiche qui lui ressemble. */
  sheet: string
}

export interface SheetPlan {
  /** Noms qui recevront une fiche vide (« auto »). */
  create: string[]
  resemblances: Resemblance[]
}

/**
 * Fiches à créer pour un type. Les noms les plus fréquents passent d'abord : entre MARIE
 * (12 répliques) et MARI (1 réplique), toutes deux nouvelles, c'est MARIE qui reçoit sa fiche.
 * `signaled` : clés (nameKey) des ressemblances déjà signalées, qui ne sont ni créées ni répétées.
 */
export function planSheets(
  kind: SheetKind,
  names: readonly ScriptName[],
  existing: readonly string[],
  signaled: ReadonlySet<string> = new Set()
): SheetPlan {
  const known = new Map(existing.map((name) => [nameKey(name), name]))
  const ordered = names
    .map((entry, index) => ({ ...entry, index }))
    .sort((a, b) => b.count - a.count || a.index - b.index)
  const plan: SheetPlan = { create: [], resemblances: [] }
  for (const { name } of ordered) {
    const key = nameKey(name)
    if (known.has(key)) continue
    const similar = [...known.values()].find((other) => namesLookAlike(kind, name, other))
    if (similar !== undefined) {
      if (!signaled.has(key)) plan.resemblances.push({ kind, name, sheet: similar })
      continue
    }
    plan.create.push(name)
    known.set(key, name)
  }
  return plan
}

/** Propriétés qui ne comptent pas comme du contenu (la couleur est proposée à la création). */
const NOT_CONTENT = new Set(['couleur'])

/** Fiche sans rien d'écrit par l'élève (une fiche illisible est considérée comme remplie). */
export function isEmptySheet(sheet: Sheet): boolean {
  if (sheet.unreadable || sheet.images.length > 0) return false
  const props = Object.entries(sheet.props).filter(([key]) => !NOT_CONTENT.has(key))
  return [...props.map(([, value]) => value), ...Object.values(sheet.sections)].every(
    (value) => value.trim() === ''
  )
}

/**
 * « used » : nommée dans le scénario. « unused » : créée automatiquement, restée vide et absente du
 * scénario (on peut la supprimer). « absent » : a du contenu mais n'est plus dans le scénario.
 */
export type SheetUsage = 'used' | 'unused' | 'absent'

export function sheetUsage(sheet: Sheet, present: ReadonlySet<string>): SheetUsage {
  if (present.has(nameKey(sheet.nom))) return 'used'
  return sheet.auto && isEmptySheet(sheet) ? 'unused' : 'absent'
}

/** Clés des noms présents dans le scénario, pour `sheetUsage`. */
export function presentKeys(names: readonly ScriptName[]): Set<string> {
  return new Set(names.map(({ name }) => nameKey(name)))
}

/** Nom de personnage ou lieu d'en-tête écrit sur cette ligne (Cmd + clic), ou null. */
export function sheetNameAtLine(
  doc: FountainDocument,
  line: number
): { kind: SheetKind; name: string } | null {
  const element = doc.elements.find((candidate) => coversLine(candidate, line))
  if (!element || element.position?.startLine !== line) return null
  if (element.type === 'character' && element.character?.name) {
    return { kind: 'personnages', name: element.character.name }
  }
  if (element.type === 'scene_heading' && element.scene?.location) {
    const name = element.scene.location
    return nameKey(name) === nameKey(PLACEHOLDER_HEADING) ? null : { kind: 'lieux', name }
  }
  return null
}
