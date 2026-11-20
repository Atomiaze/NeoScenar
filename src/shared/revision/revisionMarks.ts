// Mode révision (étape 13E) : l'élève surligne ce qu'il doit reprendre, avec un commentaire facultatif.
// Les marques sont des notes Fountain : [[R:jaune|Revoir ce dialogue]]texte[[/R]]. Elles ne sont donc
// jamais imprimées, et tout ce qui ignore déjà les notes (pagination, PDF, statistiques, fiches,
// rapprochement) les ignore aussi. Calcul pur : l'éditeur applique les modifications proposées ici.

import { parse, type FountainDocument, type FountainElement } from '@neoscenar/fountain'
import { removeRanges, type Range } from '../noteRemoval'
import { applyTextChanges, minimalTextChange, type TextChange } from '../scriptLink/textChanges'

export const REVISION_COLORS = ['jaune', 'vert', 'rose', 'bleu'] as const
export type RevisionColor = (typeof REVISION_COLORS)[number]

/** Seuls ces paragraphes reçoivent une marque : Action, Dialogue, Didascalie (décidé le 19 nov.). */
export const REVISION_TYPES: ReadonlySet<string> = new Set(['action', 'dialogue', 'parenthetical'])

export interface RevisionMark {
  color: RevisionColor
  comment: string
  /** Note d'ouverture [[R:…]] et note de fermeture [[/R]] (décalages absolus dans le texte). */
  open: Range
  close: Range
  /** Index de l'élément (paragraphe) qui contient la marque. */
  element: number
}

const OPENING = /^R:(jaune|vert|rose|bleu)(?:\|([\s\S]*))?$/
const CLOSING = '/R'

/**
 * Marques bien formées d'un paragraphe : une ouverture suivie d'une fermeture dans le même élément.
 * Une ouverture sans fermeture, une fermeture seule ou une couleur inconnue restent des notes
 * ordinaires. Une note ordinaire peut se trouver entre les deux.
 */
export function elementRevisionMarks(element: FountainElement, index: number): RevisionMark[] {
  const marks: RevisionMark[] = []
  let opening: { range: Range; color: RevisionColor; comment: string } | null = null
  for (const note of element.notes) {
    const match = OPENING.exec(note.text)
    if (match) {
      opening = {
        range: { from: note.start, to: note.end },
        color: match[1] as RevisionColor,
        comment: match[2] ?? ''
      }
    } else if (note.text === CLOSING && opening) {
      marks.push({
        color: opening.color,
        comment: opening.comment,
        open: opening.range,
        close: { from: note.start, to: note.end },
        element: index
      })
      opening = null
    }
  }
  return marks
}

/** Toutes les marques du document, dans l'ordre du texte. */
export function findRevisionMarks(doc: FountainDocument): RevisionMark[] {
  return doc.elements.flatMap((element, index) => elementRevisionMarks(element, index))
}

/** Débuts des notes qui servent de marqueurs de révision (pour les distinguer des vraies notes). */
export function revisionMarkerStarts(marks: readonly RevisionMark[]): Set<number> {
  return new Set(marks.flatMap((mark) => [mark.open.from, mark.close.from]))
}

/** Marque où se trouve la position (marqueurs compris), ou null. */
export function markAt(marks: readonly RevisionMark[], position: number): RevisionMark | null {
  return marks.find((mark) => mark.open.from <= position && position <= mark.close.to) ?? null
}

/**
 * Commentaire tel qu'il est écrit : sur une ligne, sans crochets (ils fermeraient la note : « [ » et
 * « ] » deviennent des parenthèses).
 */
export function cleanComment(comment: string): string {
  return comment.replace(/\[/g, '(').replace(/\]/g, ')').replace(/\s+/g, ' ').trim()
}

export function openingMarker(color: RevisionColor, comment: string): string {
  const clean = cleanComment(comment)
  return `[[R:${color}${clean ? `|${clean}` : ''}]]`
}

export const CLOSING_MARKER = '[[/R]]'

export type HighlightPlan =
  { changes: TextChange[] } | { error: 'emptySelection' | 'noAllowedParagraph' }

/** Fin du contenu d'un élément, sans les lignes vides ni les espaces qui le suivent. */
function contentEnd(text: string, element: FountainElement): number {
  const start = element.position?.startOffset ?? 0
  let end = element.position?.endOffset ?? start
  while (end > start && /\s/.test(text[end - 1])) end--
  return end
}

/** Une limite tombée au milieu d'une note ou d'un texte mis de côté est repoussée à l'extérieur. */
function outsideMarkedText(element: FountainElement, from: number, to: number): Range {
  for (const marked of [...element.notes, ...element.boneyards]) {
    if (marked.start < from && from < marked.end) from = marked.start
    if (marked.start < to && to < marked.end) to = marked.end
  }
  return { from, to }
}

/** Retire les espaces au bord : une marque ne commence ni ne finit par un espace (retour exact). */
function trimRange(text: string, { from, to }: Range): Range {
  while (from < to && /\s/.test(text[from])) from++
  while (to > from && /\s/.test(text[to - 1])) to--
  return { from, to }
}

/** Texte sans les marqueurs donnés, retirés tels quels (ils ont été posés sans espace autour). */
function withoutMarkers(text: string, offset: number, markers: readonly Range[]): string {
  let result = ''
  let cursor = 0
  for (const marker of [...markers].sort((a, b) => a.from - b.from)) {
    result += text.slice(cursor, marker.from - offset)
    cursor = marker.to - offset
  }
  return result + text.slice(cursor)
}

/** Marque une portion d'un seul paragraphe, en tenant compte des marques qu'elle touche. */
function highlightIn(
  text: string,
  range: Range,
  touched: readonly RevisionMark[],
  color: RevisionColor
): TextChange | null {
  if (touched.length === 0) {
    return {
      from: range.from,
      to: range.to,
      insert: openingMarker(color, '') + text.slice(range.from, range.to) + CLOSING_MARKER
    }
  }
  const [first] = touched
  const last = touched[touched.length - 1]
  // Sélection entièrement dans une marque : seule sa couleur change (le commentaire reste).
  if (touched.length === 1 && range.from >= first.open.to && range.to <= first.close.from) {
    if (first.color === color) return null
    return { from: first.open.from, to: first.open.to, insert: openingMarker(color, first.comment) }
  }
  // Sinon, les marques touchées fusionnent avec la sélection ; le premier commentaire est gardé.
  const from = Math.min(range.from, first.open.from)
  const to = Math.max(range.to, last.close.to)
  const markers = touched.flatMap((mark) => [mark.open, mark.close])
  const inner = withoutMarkers(text.slice(from, to), from, markers)
  const comment = touched.find((mark) => mark.comment !== '')?.comment ?? ''
  return { from, to, insert: openingMarker(color, comment) + inner + CLOSING_MARKER }
}

/**
 * Surligne la sélection `[from, to)` dans la couleur donnée : une marque par paragraphe autorisé
 * (Action, Dialogue, Didascalie) ; les autres paragraphes sont sautés en silence. Une sélection vide
 * dans une marque en change la couleur.
 */
export function planHighlight(
  text: string,
  doc: FountainDocument,
  selection: Range,
  color: RevisionColor
): HighlightPlan {
  const marks = findRevisionMarks(doc)
  if (selection.from === selection.to) {
    const mark = markAt(marks, selection.from)
    if (!mark) return { error: 'emptySelection' }
    const change = highlightIn(text, { from: mark.open.to, to: mark.close.from }, [mark], color)
    return { changes: change ? [change] : [] }
  }
  const changes: TextChange[] = []
  let allowedFound = false
  doc.elements.forEach((element, index) => {
    const position = element.position
    if (!position || !REVISION_TYPES.has(element.type)) return
    const start = position.startOffset
    const end = contentEnd(text, element)
    const from = Math.max(selection.from, start)
    const to = Math.min(selection.to, end)
    if (from >= to) return
    allowedFound = true
    const range = trimRange(text, outsideMarkedText(element, from, to))
    if (range.from >= range.to) return
    const touched = marks.filter(
      (mark) => mark.element === index && mark.open.from < range.to && mark.close.to > range.from
    )
    const change = highlightIn(text, range, touched, color)
    if (change) changes.push(change)
  })
  if (!allowedFound) return { error: 'noAllowedParagraph' }
  return { changes }
}

/** Ajoute, modifie ou retire (texte vide) le commentaire d'une marque. */
export function planComment(mark: RevisionMark, comment: string): TextChange {
  return { from: mark.open.from, to: mark.open.to, insert: openingMarker(mark.color, comment) }
}

/**
 * Retire les marques données (seulement leurs notes), paragraphe par paragraphe, avec la règle des
 * espaces de l'étape 13A : le texte marqué reste identique au caractère près.
 */
export function planRemoveMarks(
  text: string,
  doc: FountainDocument,
  marks: readonly RevisionMark[]
): TextChange[] {
  const byElement = new Map<number, RevisionMark[]>()
  for (const mark of marks)
    byElement.set(mark.element, [...(byElement.get(mark.element) ?? []), mark])
  const changes: TextChange[] = []
  for (const [index, group] of byElement) {
    const position = doc.elements[index].position
    if (!position) continue
    // Les limites d'un élément sont des débuts de ligne : la règle des espaces, qui ne regarde que la
    // ligne, donne le même résultat sur le paragraphe seul que sur tout le texte.
    const start = position.startOffset
    const before = text.slice(start, position.endOffset)
    const ranges = group.flatMap((mark) => [mark.open, mark.close])
    const after = removeRanges(
      before,
      ranges.map((range) => ({ from: range.from - start, to: range.to - start }))
    )
    if (after === before) continue
    const change = minimalTextChange(before, after)
    changes.push({ from: change.from + start, to: change.to + start, insert: change.insert })
  }
  return changes
}

/** Texte complet d'un fichier Fountain sans aucune marque de révision (page de titre comprise). */
export function removeAllRevisionMarks(text: string): string {
  const doc = parse(text)
  const marks = findRevisionMarks(doc)
  if (marks.length === 0) return text
  return applyTextChanges(text, planRemoveMarks(text, doc, marks))
}
