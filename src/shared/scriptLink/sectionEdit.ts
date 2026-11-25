// Sections depuis le navigateur (18C-15) : ajouter, renommer, supprimer, imbriquer, désimbriquer.
// Chaque fonction rend une seule modification du texte (une étape d'annulation dans l'éditeur) et ne
// touche qu'aux lignes de section, à leur note de couleur et à leur synopsis : aucun numéro de scène.

import { parse, type FountainDocument } from '@neoscenar/fountain'
import { colorNotesOf } from './sectionColor'
import { readSynopsis } from './synopsis'
import { minimalTextChange, type TextChange } from './textChanges'

/** Profondeur maximale des sections : `###`. */
export const MAX_SECTION_LEVEL = 3

/** Pourquoi on ne peut pas imbriquer ou désimbriquer une section ; null = permis. */
export type ShiftRefusal = 'noSibling' | 'tooDeep' | 'topLevel' | null

const parseBody = (text: string): FountainDocument => parse(text, { titlePage: false })
const isBlank = (line: string | undefined): boolean => line !== undefined && line.trim() === ''
const HASHES = /^(\s*)(#+)/
const NOTES = /\[\[[\s\S]*?\]\]/g

const levelOf = (doc: FountainDocument, index: number): number =>
  doc.elements[index].section?.level ?? 1

/** Index de l'élément (en-tête ou section) dont la ligne commence à `from` ; -1 sinon. */
function elementAt(doc: FountainDocument, from: number, sectionOnly = false): number {
  return doc.elements.findIndex(
    (element) =>
      element.position?.startOffset === from &&
      (element.type === 'section' || (!sectionOnly && element.type === 'scene_heading'))
  )
}

/** Titre d'une seule ligne, sans espaces inutiles. */
const cleanTitle = (title: string): string => title.replace(/\s+/g, ' ').trim()

function changeOf(text: string, lines: string[]): TextChange | null {
  const result = lines.join('\n')
  return result === text ? null : minimalTextChange(text, result)
}

/**
 * Niveau d'une section insérée juste au-dessus de l'élément `index` : celui de cette section si c'en
 * est une, sinon celui de la section qui contient l'endroit (la dernière au-dessus), sinon 1.
 */
export function insertedLevel(doc: FountainDocument, index: number): number {
  for (let i = index; i >= 0; i--) {
    if (doc.elements[i].type === 'section') return levelOf(doc, i)
  }
  return 1
}

/** Insère `lines` avant la ligne `at` (index), entourées d'une ligne vide de chaque côté. */
function insertBlock(lines: string[], at: number, block: string[]): void {
  const before = at > 0 && !isBlank(lines[at - 1]) ? [''] : []
  const after = at < lines.length && !isBlank(lines[at]) ? [''] : []
  lines.splice(at, 0, ...before, ...block, ...after)
}

/** Insère une section au-dessus de la scène ou de la section dont la ligne commence à `from`. */
export function insertSectionAbove(text: string, from: number, title: string): TextChange | null {
  const clean = cleanTitle(title)
  if (clean === '') return null
  const doc = parseBody(text)
  const index = elementAt(doc, from)
  if (index < 0) return null
  const lines = text.split('\n')
  const level = insertedLevel(doc, index)
  insertBlock(lines, doc.elements[index].position!.startLine - 1, [`${'#'.repeat(level)} ${clean}`])
  return changeOf(text, lines)
}

/** Ajoute une section de niveau 1 à la fin du scénario (bouton « + Section »). */
export function appendSection(text: string, title: string): TextChange | null {
  const clean = cleanTitle(title)
  if (clean === '') return null
  const body = text.replace(/\s+$/, '')
  const line = `# ${clean}`
  // La fin de ligne finale du texte est gardée ; une ligne vide sépare la section de ce qui précède.
  const result = body === '' ? `${line}\n` : `${body}\n\n${line}\n`
  return minimalTextChange(text, result)
}

/** Renomme la section : les `#` et les notes écrites sur sa ligne sont gardés. */
export function renameSection(text: string, from: number, title: string): TextChange | null {
  const clean = cleanTitle(title)
  if (clean === '') return null
  const doc = parseBody(text)
  const index = elementAt(doc, from, true)
  if (index < 0) return null
  const lines = text.split('\n')
  const at = doc.elements[index].position!.startLine - 1
  const hashes = HASHES.exec(lines[at])?.[0] ?? '#'
  const notes = lines[at].slice(hashes.length).match(NOTES) ?? []
  lines[at] = [`${hashes} ${clean}`, ...notes].join(' ')
  return changeOf(text, lines)
}

/** La section a-t-elle un synopsis (suppression à confirmer) ? */
export function sectionHasSynopsis(text: string, from: number): boolean {
  const doc = parseBody(text)
  const index = elementAt(doc, from, true)
  return index >= 0 && readSynopsis(doc, index).lines.length > 0
}

/**
 * Supprime la section : sa ligne, sa note de couleur et son synopsis. Ses scènes restent (elles
 * remontent dans la section précédente) ; ses sous-sections gardent leur niveau. Les lignes vides en
 * trop sont retirées.
 */
export function deleteSection(text: string, from: number): TextChange | null {
  const doc = parseBody(text)
  const index = elementAt(doc, from, true)
  if (index < 0) return null
  const removed = new Set<number>()
  for (const element of [
    doc.elements[index],
    ...colorNotesOf(doc, index),
    ...readSynopsis(doc, index).elements
  ]) {
    const { startLine, endLine } = element.position!
    for (let line = startLine; line <= endLine; line++) removed.add(line - 1)
  }
  let first = Math.min(...removed)
  const lines = text.split('\n').filter((_, line) => !removed.has(line))
  // Les lignes vides qui se suivent à cet endroit (ou en tête du texte) n'en font plus qu'une.
  const finalNewline = text.endsWith('\n') ? 1 : 0
  while (
    first < lines.length - finalNewline &&
    isBlank(lines[first]) &&
    (first === 0 || isBlank(lines[first - 1]))
  ) {
    lines.splice(first, 1)
  }
  // Section en fin de texte : les lignes vides qui la précédaient partent aussi.
  if (first === lines.length - finalNewline) {
    while (first > 0 && isBlank(lines[first - 1])) lines.splice(--first, 1)
  }
  return changeOf(text, lines)
}

/** Index de la section et de ses sous-sections (celles qui la suivent, plus profondes). */
function withSubsections(doc: FountainDocument, index: number): number[] {
  const level = levelOf(doc, index)
  const result = [index]
  for (let i = index + 1; i < doc.elements.length; i++) {
    if (doc.elements[i].type !== 'section') continue
    if (levelOf(doc, i) <= level) break
    result.push(i)
  }
  return result
}

/**
 * Imbriquer (+1) : il faut une section sœur juste avant (la section précédente de même niveau ou
 * plus haut est de même niveau), et la section ou ses sous-sections ne dépassent pas 3 niveaux.
 * Désimbriquer (−1) : refusé au niveau 1.
 */
export function shiftRefusal(doc: FountainDocument, index: number, delta: 1 | -1): ShiftRefusal {
  const level = levelOf(doc, index)
  if (delta === -1) return level <= 1 ? 'topLevel' : null
  let previous = -1
  for (let i = index - 1; i >= 0; i--) {
    if (doc.elements[i].type === 'section' && levelOf(doc, i) <= level) {
      previous = i
      break
    }
  }
  if (previous < 0 || levelOf(doc, previous) !== level) return 'noSibling'
  const deepest = Math.max(...withSubsections(doc, index).map((i) => levelOf(doc, i)))
  return deepest + 1 > MAX_SECTION_LEVEL ? 'tooDeep' : null
}

/** Imbrique (+1) ou désimbrique (−1) la section ; ses sous-sections suivent. Null si refusé. */
export function shiftSection(text: string, from: number, delta: 1 | -1): TextChange | null {
  const doc = parseBody(text)
  const index = elementAt(doc, from, true)
  if (index < 0 || shiftRefusal(doc, index, delta) !== null) return null
  const lines = text.split('\n')
  for (const i of withSubsections(doc, index)) {
    const at = doc.elements[i].position!.startLine - 1
    const level = levelOf(doc, i) + delta
    lines[at] = lines[at].replace(HASHES, (_, space: string) => space + '#'.repeat(level))
  }
  return changeOf(text, lines)
}
