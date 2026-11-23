// Scène « brouillon » (18C-13) : une note [[BROUILLON]] seule sur sa ligne, sous l'en-tête. La scène
// reste dans le Fountain, mais elle n'est ni affichée dans l'éditeur, ni imprimée, ni comptée.

import { parse, type FountainDocument, type FountainElement } from '@neoscenar/fountain'
import { readScriptScenes, type TextRange } from './scriptScenes'
import { numberKey } from '../decoupage/order'
import { applyTextChanges, minimalTextChange, type TextChange } from './textChanges'

export const DRAFT_NOTE = '[[BROUILLON]]'

/** Note [[BROUILLON]] seule sur sa ligne (sans tenir compte de la casse ni des espaces). */
export function isDraftNote(element: FountainElement): boolean {
  return (
    element.type === 'note' &&
    element.notes.length === 1 &&
    element.text.trim().toUpperCase() === 'BROUILLON'
  )
}

const endsBlock = (element: FountainElement): boolean =>
  element.type === 'scene_heading' || element.type === 'section'

/**
 * Notes [[BROUILLON]] de l'en-tête `index` : parmi les notes et le synopsis qui le suivent directement
 * (une description ajoutée depuis les Cartes s'écrit aussi juste sous l'en-tête).
 */
function draftNotesOf(doc: FountainDocument, index: number): FountainElement[] {
  const notes: FountainElement[] = []
  for (let i = index + 1; i < doc.elements.length; i++) {
    const element = doc.elements[i]
    if (element.type !== 'note' && element.type !== 'synopsis') break
    if (isDraftNote(element)) notes.push(element)
  }
  return notes
}

/** Index des en-têtes des scènes brouillon. */
export function draftHeadings(doc: FountainDocument): Set<number> {
  const result = new Set<number>()
  doc.elements.forEach((element, index) => {
    if (element.type === 'scene_heading' && draftNotesOf(doc, index).length > 0) result.add(index)
  })
  return result
}

/** Éléments des scènes brouillon : en-tête et tout ce qui suit, jusqu'au prochain en-tête ou acte. */
export function draftElements(doc: FountainDocument): Set<FountainElement> {
  const result = new Set<FountainElement>()
  for (const index of draftHeadings(doc)) {
    result.add(doc.elements[index])
    for (let i = index + 1; i < doc.elements.length && !endsBlock(doc.elements[i]); i++) {
      result.add(doc.elements[i])
    }
  }
  return result
}

/**
 * Document sans les scènes brouillon : ce qui est paginé, imprimé et compté. Les éléments gardés sont
 * les mêmes objets (leurs positions dans le texte ne changent pas). Sans brouillon, le document
 * lui-même est renvoyé.
 */
export function withoutDrafts(doc: FountainDocument): FountainDocument {
  const drafts = draftElements(doc)
  if (drafts.size === 0) return doc
  return { ...doc, elements: doc.elements.filter((element) => !drafts.has(element)) }
}

/**
 * Bloc de chaque scène brouillon dans le texte : de son en-tête jusqu'au prochain en-tête ou acte
 * (exclus), sinon jusqu'à la fin du texte ; même règle que le déplacement d'une scène.
 */
export function draftBlocks(doc: FountainDocument, textLength: number): TextRange[] {
  const blocks: TextRange[] = []
  for (const index of draftHeadings(doc)) {
    const from = doc.elements[index].position?.startOffset
    if (from === undefined) continue
    let to = textLength
    for (let i = index + 1; i < doc.elements.length; i++) {
      const position = doc.elements[i].position
      if (position && endsBlock(doc.elements[i])) {
        to = position.startOffset
        break
      }
    }
    blocks.push({ from, to })
  }
  return blocks.sort((a, b) => a.from - b.from)
}

/** La scène dont l'en-tête commence à `from` est-elle un brouillon ? */
export function isDraftScene(text: string, from: number): boolean {
  const doc = parse(text, { titlePage: false })
  const index = doc.elements.findIndex(
    (element) => element.type === 'scene_heading' && element.position?.startOffset === from
  )
  return index >= 0 && draftNotesOf(doc, index).length > 0
}

/**
 * Marque (ou démarque) comme brouillon la scène dont l'en-tête commence à `from`. La note s'écrit
 * seule sur la ligne juste sous l'en-tête ; la retirer rend le texte d'avant. Null si rien ne change.
 */
export function setDraft(text: string, from: number, draft: boolean): TextChange | null {
  const doc = parse(text, { titlePage: false })
  const index = doc.elements.findIndex(
    (element) => element.type === 'scene_heading' && element.position?.startOffset === from
  )
  if (index < 0) return null
  const notes = draftNotesOf(doc, index)
  if (draft) {
    if (notes.length > 0) return null
    const end = text.indexOf('\n', from)
    return end < 0
      ? { from: text.length, to: text.length, insert: `\n${DRAFT_NOTE}` }
      : { from: end + 1, to: end + 1, insert: `${DRAFT_NOTE}\n` }
  }
  if (notes.length === 0) return null
  const lines = text.split('\n')
  const blank = (n: number): boolean => lines[n] !== undefined && lines[n].trim() === ''
  // De la dernière à la première, pour que les numéros de ligne restent justes.
  for (const note of [...notes].reverse()) {
    const first = note.position!.startLine - 1
    let count = note.position!.endLine - note.position!.startLine + 1
    // Note écrite ailleurs entre deux lignes vides : une seule des deux est gardée.
    if (first > 0 && blank(first - 1) && blank(first + count) && first + count < lines.length - 1)
      count++
    lines.splice(first, count)
  }
  const result = lines.join('\n')
  return minimalTextChange(text, result)
}

/** Numéros (clés « 30 », « 30A ») des scènes brouillon du texte : pour les Cartes et le storyboard. */
export function draftNumberKeys(text: string): Set<string> {
  const doc = parse(text, { titlePage: false })
  const drafts = new Set(
    [...draftHeadings(doc)].map((index) => doc.elements[index].position?.startOffset)
  )
  return new Set(
    readScriptScenes(text, doc).flatMap((scene) =>
      scene.number && drafts.has(scene.line.from) ? [numberKey(scene.number)] : []
    )
  )
}

/**
 * Texte de la scène brouillon proposé dans sa fenêtre : son bloc sans la note [[BROUILLON]] ni les
 * lignes vides finales.
 */
export function draftEditableText(blockText: string): string {
  const change = setDraft(blockText, 0, false)
  const text = change ? applyTextChanges(blockText, [change]) : blockText
  return text.trimEnd()
}

/**
 * Nouveau bloc après la fenêtre d'édition : la note remise sous l'en-tête, et les lignes vides
 * finales d'origine (au moins une ligne vide avant la scène suivante). Null si la première ligne
 * n'est plus un en-tête de scène.
 */
export function rebuiltDraftBlock(
  edited: string,
  originalBlock: string,
  atTextEnd: boolean
): string | null {
  const body = edited.trimEnd()
  const change = setDraft(body, 0, true)
  if (!change) return null
  let trailing = originalBlock.slice(originalBlock.trimEnd().length)
  if (!atTextEnd && !trailing.endsWith('\n\n')) trailing = '\n\n'
  return applyTextChanges(body, [change]) + trailing
}
