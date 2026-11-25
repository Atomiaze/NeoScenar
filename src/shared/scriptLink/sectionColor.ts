// Couleur d'une section (18C-14) : une note [[COULEUR #2463EB]] seule sur sa ligne, juste sous la ligne
// de section. Elle reste dans le Fountain (lisible ailleurs, suit la section quand on la déplace), mais
// elle n'est pas affichée dans l'éditeur quand elle est à sa place ; comme toute note, elle ne prend aucune ligne
// de page et n'est pas imprimée.

import { parse, type FountainDocument, type FountainElement } from '@neoscenar/fountain'
import { minimalTextChange, type TextChange } from './textChanges'

const COLOR_NOTE = /^\s*COULEUR\s*:?\s*#([0-9a-f]{3}|[0-9a-f]{6})\s*$/i

/** Couleur « #RRGGBB » (majuscules) lue dans une note [[COULEUR …]] seule sur sa ligne, sinon null. */
export function readColorNote(element: FountainElement): string | null {
  if (element.type !== 'note' || element.notes.length !== 1) return null
  const match = COLOR_NOTE.exec(element.text)
  if (!match) return null
  const digits = match[1].length === 3 ? [...match[1]].flatMap((c) => [c, c]).join('') : match[1]
  return `#${digits.toUpperCase()}`
}

/** Note de couleur de la section `index` : parmi les notes et le synopsis qui la suivent directement. */
function colorNotesOf(doc: FountainDocument, index: number): FountainElement[] {
  const notes: FountainElement[] = []
  for (let i = index + 1; i < doc.elements.length; i++) {
    const element = doc.elements[i]
    if (element.type !== 'note' && element.type !== 'synopsis') break
    if (readColorNote(element)) notes.push(element)
  }
  return notes
}

/** Couleur choisie de chaque section (par index d'élément) ; absente = automatique. */
export function chosenSectionColors(doc: FountainDocument): Map<number, string> {
  const colors = new Map<number, string>()
  doc.elements.forEach((element, index) => {
    if (element.type !== 'section') return
    const note = colorNotesOf(doc, index)[0]
    if (note) colors.set(index, readColorNote(note)!)
  })
  return colors
}

/** Notes de couleur à leur place (sous une section) : masquées dans l'éditeur. */
export function sectionColorNotes(doc: FountainDocument): Set<FountainElement> {
  const result = new Set<FountainElement>()
  doc.elements.forEach((element, index) => {
    if (element.type === 'section') for (const note of colorNotesOf(doc, index)) result.add(note)
  })
  return result
}

/** Plages (début, fin de ligne comprise) des notes de couleur à leur place, dans l'ordre du texte. */
export function sectionColorRanges(
  doc: FountainDocument,
  text: string
): { from: number; to: number }[] {
  const ranges: { from: number; to: number }[] = []
  for (const note of sectionColorNotes(doc)) {
    const position = note.position
    if (!position) continue
    // `endOffset` est déjà après la fin de ligne.
    ranges.push({ from: position.startOffset, to: Math.min(position.endOffset, text.length) })
  }
  return ranges.sort((a, b) => a.from - b.from)
}

/**
 * Choisit la couleur de la section dont la ligne commence à `from` (null = automatique : la note est
 * retirée). La note s'écrit toujours juste sous la ligne de section, hex en majuscules. Null si rien
 * ne change.
 */
export function setSectionColor(text: string, from: number, hex: string | null): TextChange | null {
  const doc = parse(text, { titlePage: false })
  const index = doc.elements.findIndex(
    (element) => element.type === 'section' && element.position?.startOffset === from
  )
  if (index < 0) return null
  const lines = text.split('\n')
  // De la dernière à la première, pour que les numéros de ligne restent justes.
  for (const note of [...colorNotesOf(doc, index)].reverse()) {
    lines.splice(
      note.position!.startLine - 1,
      note.position!.endLine - note.position!.startLine + 1
    )
  }
  if (hex !== null) {
    lines.splice(doc.elements[index].position!.endLine, 0, `[[COULEUR ${hex.toUpperCase()}]]`)
  }
  const result = lines.join('\n')
  return result === text ? null : minimalTextChange(text, result)
}
