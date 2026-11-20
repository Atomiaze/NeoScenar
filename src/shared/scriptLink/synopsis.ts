// Description d'une scène ou d'un acte : son synopsis Fountain, les lignes « = » qui suivent
// directement l'en-tête (ou la ligne de section), avant tout autre élément.

import { parse, type FountainDocument, type FountainElement } from '@neoscenar/fountain'
import { minimalTextChange, type TextChange } from './textChanges'

/** Lignes du synopsis de l'élément `index` ; les notes intercalées sont ignorées. */
export function readSynopsis(
  doc: FountainDocument,
  index: number
): { lines: string[]; elements: FountainElement[] } {
  const elements: FountainElement[] = []
  for (let i = index + 1; i < doc.elements.length; i++) {
    const element = doc.elements[i]
    if (element.type === 'note') continue
    if (element.type !== 'synopsis') break
    elements.push(element)
  }
  return { lines: elements.map((element) => element.text), elements }
}

const isBlank = (line: string | undefined): boolean => line !== undefined && line.trim() === ''

/**
 * Remplace le synopsis de l'en-tête (ou de la section) qui commence à `from` par `description`
 * (une ligne « = » par ligne non vide). Sans synopsis, les lignes sont insérées sous l'en-tête, entre
 * deux lignes vides ; une description vide le supprime et le texte revient à son état sans synopsis.
 * Renvoie null si rien ne change.
 */
export function setSynopsis(text: string, from: number, description: string): TextChange | null {
  const doc = parse(text, { titlePage: false })
  const index = doc.elements.findIndex(
    (element) =>
      element.position?.startOffset === from &&
      (element.type === 'scene_heading' || element.type === 'section')
  )
  if (index < 0) return null
  const wanted = description
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => `= ${line}`)
  const lines = text.split('\n')
  const existing = readSynopsis(doc, index).elements.map(
    (element) => element.position!.startLine - 1
  )

  if (existing.length === 0) {
    if (wanted.length === 0) return null
    const after = doc.elements[index].position!.endLine
    const followed = after < lines.length && !isBlank(lines[after])
    lines.splice(after, 0, '', ...wanted, ...(followed ? [''] : []))
  } else {
    const first = existing[0]
    for (const line of [...existing].reverse()) lines.splice(line, 1)
    if (wanted.length > 0) lines.splice(first, 0, ...wanted)
    else if (isBlank(lines[first - 1])) {
      // Retire la ligne vide en trop, pour revenir exactement au texte sans synopsis. La fin de
      // ligne finale du texte, elle, est gardée.
      let end = text.endsWith('\n') ? lines.length - 1 : lines.length
      while (first < end && isBlank(lines[first])) {
        lines.splice(first, 1)
        end--
      }
      if (first >= end) lines.splice(first - 1, 1)
    }
  }
  const result = lines.join('\n')
  return result === text ? null : minimalTextChange(text, result)
}
