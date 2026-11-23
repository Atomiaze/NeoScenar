// Scènes brouillon dans l'éditeur (18C-13) : elles restent dans le texte, mais n'apparaissent pas.
// Chaque bloc est remplacé par une plage invisible et atomique : le curseur la saute, et ni la frappe,
// ni l'effacement, ni une sélection qui la recouvre ne peuvent l'entamer. Seules les actions du
// programme (Cartes, fiches, navigateur, fenêtre du brouillon, annuler) la modifient.

import {
  EditorSelection,
  EditorState,
  Prec,
  RangeSet,
  StateField,
  type Extension,
  type Transaction
} from '@codemirror/state'
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view'
import { draftBlocks } from '../../../shared/scriptLink/draftScene'
import type { TextRange } from '../../../shared/scriptLink'
import { analysisField } from './analysis'

/** Blocs des scènes brouillon, dans l'ordre du texte, et leur habillage (masqué). */
interface DraftState {
  blocks: TextRange[]
  hidden: DecorationSet
}

const hide = Decoration.replace({ block: true })

function draftState(state: EditorState): DraftState {
  const length = state.doc.length
  const blocks = draftBlocks(state.field(analysisField).doc, length)
  // Lignes entières, de l'en-tête à la ligne vide qui précède le bloc suivant (sa fin de ligne reste
  // visible) : la place de la scène ne laisse aucun vide à l'écran.
  const hidden = RangeSet.of(
    blocks.map((block) => hide.range(block.from, block.to === length ? length : block.to - 1))
  )
  return { blocks, hidden }
}

export const draftField = StateField.define<DraftState>({
  create: draftState,
  update: (value, tr) => (tr.docChanged ? draftState(tr.state) : value),
  provide: (field) => [
    EditorView.decorations.from(field, (value) => value.hidden),
    EditorView.atomicRanges.of((view) => view.state.field(field).hidden)
  ]
})

/** Blocs des scènes brouillon du texte actuel de l'éditeur. */
export function draftBlocksOf(state: EditorState): readonly TextRange[] {
  return state.field(draftField, false)?.blocks ?? []
}

/** Modifications faites par l'élève dans l'éditeur (pas par le programme ni par Annuler). */
function typedByStudent(tr: Transaction): boolean {
  if (tr.isUserEvent('input.replace') || tr.isUserEvent('input.drop')) return false
  if (tr.isUserEvent('input.synopsis')) return false
  return tr.isUserEvent('input') || tr.isUserEvent('delete') || tr.isUserEvent('move')
}

/** L'intérieur des blocs est intouchable ; écrire juste avant ou juste après reste possible. */
const protectBlocks = EditorState.changeFilter.of((tr) => {
  if (!typedByStudent(tr)) return true
  const blocks = draftBlocksOf(tr.startState)
  return blocks.length === 0 ? true : blocks.flatMap((block) => [block.from, block.to])
})

/** Une ligne vide précède l'en-tête qui commence à `pos` (ou il ouvre le texte). */
function blankBefore(text: string, pos: number): boolean {
  if (pos === 0) return true
  return text[pos - 1] === '\n' && (pos === 1 || text[pos - 2] === '\n')
}

/**
 * Un en-tête n'en est un qu'après une ligne vide. Taper sur la ligne vide qui précède un brouillon
 * (seule ligne visible entre la scène d'avant et celle d'après) le ferait apparaître comme du texte
 * d'action : la ligne vide est remise sous ce qui vient d'être tapé. Un texte qui devient brouillon
 * pendant la frappe (« [[BROUILLON]] » tapé sous un en-tête) ne garde pas le curseur à l'intérieur.
 */
const keepBlocksApart = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged || !typedByStudent(tr)) return tr
  const text = tr.newDoc.toString()
  const repairs = draftBlocksOf(tr.startState).flatMap((block) => {
    const heading = tr.changes.mapPos(block.from, 1)
    if (blankBefore(text, heading)) return []
    return [{ from: heading, insert: text[heading - 1] === '\n' ? '\n' : '\n\n' }]
  })
  if (repairs.length > 0) {
    const selection = tr.newSelection.map(tr.state.changes(repairs), -1)
    return [tr, { changes: repairs, sequential: true, selection }]
  }
  const head = tr.newSelection.main.head
  const inside = draftBlocksOf(tr.state).find((block) => head > block.from && head < block.to)
  if (!inside) return tr
  return [tr, { selection: EditorSelection.cursor(Math.max(0, inside.from - 1)) }]
})

export function draftScenes(): Extension {
  // Au plus bas : la réparation passe avant le rapprochement (lui aussi au plus bas, inscrit avant).
  return [draftField, protectBlocks, Prec.lowest(keepBlocksApart)]
}
