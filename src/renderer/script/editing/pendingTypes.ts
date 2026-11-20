// Type voulu d'une ligne, retenu par l'éditeur tant que Fountain ne peut pas encore le reconnaître :
// une ligne vide créée par Entrée ou Tab, un nom de personnage dont la réplique n'est pas encore écrite…
// Dès que Fountain lit la ligne avec ce type, il n'est plus retenu. Quand le curseur quitte une ligne
// qui ne serait pas relue avec son type, le texte est ajusté (convertLine) : le fichier et l'affichage
// disent toujours la même chose.

import {
  EditorState,
  MapMode,
  StateEffect,
  StateField,
  type ChangeSpec,
  type Transaction,
  type TransactionSpec
} from '@codemirror/state'
import type { ElementType } from '@neoscenar/fountain'
import { analysisField } from '../editor/analysis'
import { minimalTextChange } from '../../../shared/scriptLink/textChanges'
import { normalizeCharacterLine } from './characterExtensions'
import { convertLine, uppercaseOutsideParentheses } from './convert'

export interface PendingType {
  /** Début de la ligne. */
  pos: number
  type: ElementType
}

export const setPendingType = StateEffect.define<PendingType>({
  map: (value, mapping) => ({ pos: mapping.mapPos(value.pos, -1), type: value.type })
})
export const clearPendingType = StateEffect.define<number>({
  map: (pos, mapping) => mapping.mapPos(pos, -1)
})

export const pendingTypes = StateField.define<readonly PendingType[]>({
  create: () => [],
  update(entries, tr) {
    // Après Annuler ou Rétablir, le texte fait foi.
    if (tr.isUserEvent('undo') || tr.isUserEvent('redo')) return []
    let next = entries
    if (tr.docChanged) {
      next = entries.flatMap((entry) => {
        // La ligne disparaît si sa fin de ligne précédente est supprimée (deux lignes fusionnées).
        const pos = tr.changes.mapPos(entry.pos, -1, MapMode.TrackBefore)
        return pos === null ? [] : [{ pos: tr.newDoc.lineAt(pos).from, type: entry.type }]
      })
    }
    for (const effect of tr.effects) {
      if (effect.is(setPendingType)) {
        const pos = tr.newDoc.lineAt(effect.value.pos).from
        next = [...next.filter((entry) => entry.pos !== pos), { pos, type: effect.value.type }]
      } else if (effect.is(clearPendingType)) {
        const pos = tr.newDoc.lineAt(effect.value).from
        next = next.filter((entry) => entry.pos !== pos)
      }
    }
    return next
  }
})

/**
 * Début de la ligne du curseur si elle vient d'être modifiée, sinon null. Seule une ligne modifiée par
 * l'élève est remise en majuscules quand il la quitte : traverser un scénario importé ne change rien.
 */
export const editedLine = StateField.define<number | null>({
  create: () => null,
  update(value, tr) {
    const head = tr.newSelection.main.head
    const cursorLine = tr.newDoc.lineAt(head)
    if (tr.docChanged) {
      let touched = false
      tr.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
        if (fromB <= cursorLine.to && toB >= cursorLine.from) touched = true
      })
      if (touched) return cursorLine.from
      const mapped = value === null ? null : tr.changes.mapPos(value, -1, MapMode.TrackBefore)
      return mapped !== null && tr.newDoc.lineAt(mapped).from === cursorLine.from
        ? cursorLine.from
        : null
    }
    return value !== null && value === cursorLine.from ? value : null
  }
})

const UPPERCASE: ReadonlySet<ElementType> = new Set(['scene_heading', 'character', 'transition'])

function pendingAt(state: EditorState, lineNumber: number): PendingType | undefined {
  const from = state.doc.line(lineNumber).from
  return state.field(pendingTypes).find((entry) => entry.pos === from)
}

/** Type affiché d'une ligne : celui retenu par l'éditeur, sinon celui que lit Fountain (null : ligne vide). */
export function effectiveType(state: EditorState, lineNumber: number): ElementType | null {
  return (
    pendingAt(state, lineNumber)?.type ?? state.field(analysisField).lineTypes[lineNumber] ?? null
  )
}

/** Type de l'élément écrit au-dessus de la ligne (en sautant les lignes vides sans type). */
export function previousType(state: EditorState, lineNumber: number): ElementType | null {
  for (let n = lineNumber - 1; n >= 1; n--) {
    const type = effectiveType(state, n)
    if (type !== null) return type
  }
  return null
}

/** Plus petite modification qui transforme `before` en `after`. */
export function minimalChange(before: string, after: string): ChangeSpec {
  return minimalTextChange(before, after)
}

export interface LineConversion {
  changes: ChangeSpec
  /** Début et fin de la ligne convertie, dans le nouveau texte. */
  lineFrom: number
  lineTo: number
}

/** Réécrit la ligne `lineNumber` avec le type `to` (voir convertLine). */
export function convertLineInState(
  state: EditorState,
  lineNumber: number,
  to: ElementType
): LineConversion {
  const before = state.doc.toString()
  const result = convertLine(before, lineNumber - 1, {
    from: effectiveType(state, lineNumber) ?? 'action',
    to,
    previous: previousType(state, lineNumber)
  })
  const lines = result.text.split('\n')
  let lineFrom = 0
  for (let i = 0; i < result.line; i++) lineFrom += lines[i].length + 1
  return {
    changes: minimalChange(before, result.text),
    lineFrom,
    lineTo: lineFrom + lines[result.line].length
  }
}

/**
 * Majuscules pendant la frappe dans un en-tête, un personnage (sauf ses extensions entre parenthèses)
 * ou une transition. La saisie d'accents composés (^ puis e) n'est pas touchée : la ligne est mise en
 * majuscules quand le curseur la quitte.
 */
export const uppercaseWhileTyping = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged || !tr.isUserEvent('input.type') || tr.isUserEvent('input.type.compose')) {
    return tr
  }
  const { startState } = tr
  let changed = false
  const changes: ChangeSpec[] = []
  tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    const text = inserted.toString()
    const line = startState.doc.lineAt(fromA)
    const type = effectiveType(startState, line.number)
    let result = text
    if (type === 'scene_heading' || type === 'transition') result = text.toUpperCase()
    else if (type === 'character') {
      const before = startState.doc.sliceString(line.from, fromA)
      result = uppercaseOutsideParentheses(before + text).slice(before.length)
    }
    if (result !== text) changed = true
    changes.push({ from: fromA, to: toA, insert: result })
  })
  if (!changed) return tr
  return {
    changes,
    selection: tr.selection,
    effects: tr.effects,
    userEvent: 'input.type',
    scrollIntoView: tr.scrollIntoView
  }
})

function cursorLineNumbers(state: EditorState): Set<number> {
  const lines = new Set<number>()
  for (const range of state.selection.ranges) {
    const first = state.doc.lineAt(range.from).number
    const last = state.doc.lineAt(range.to).number
    for (let n = first; n <= last; n++) lines.add(n)
  }
  return lines
}

/** Texte d'une ligne quittée : majuscules (et extensions connues d'un personnage). */
function settledCase(text: string, type: ElementType): string {
  return type === 'character' ? normalizeCharacterLine(text) : text.toUpperCase()
}

/** Ce qu'il faut faire des lignes que le curseur a quittées (ou des types retenus devenus inutiles). */
function settleLines(tr: Transaction): TransactionSpec | null {
  const { state } = tr
  const pending = state.field(pendingTypes)
  const cursor = cursorLineNumbers(state)
  const lineTypes = state.field(analysisField).lineTypes
  const effects: StateEffect<unknown>[] = []
  let changes: ChangeSpec | null = null

  for (const entry of pending) {
    const line = state.doc.lineAt(entry.pos)
    const read = lineTypes[line.number]
    if (read === entry.type && line.text.trim() !== '') {
      effects.push(clearPendingType.of(entry.pos))
      continue
    }
    if (cursor.has(line.number)) continue
    if (line.text.trim() === '') {
      effects.push(clearPendingType.of(entry.pos))
      continue
    }
    // Un personnage dont la réplique est en train d'être écrite juste en dessous attend.
    const below = line.number < state.doc.lines ? pendingAt(state, line.number + 1) : undefined
    if (
      entry.type === 'character' &&
      (below?.type === 'dialogue' || below?.type === 'parenthetical')
    ) {
      continue
    }
    effects.push(clearPendingType.of(entry.pos))
    if (changes === null) changes = convertLineInState(state, line.number, entry.type).changes
  }

  // La ligne qu'on vient de modifier et de quitter, si elle doit être en majuscules (accents
  // composés, texte collé…).
  const edited = tr.startState.field(editedLine)
  const editedPos = edited === null ? null : tr.changes.mapPos(edited, -1, MapMode.TrackBefore)
  if (changes === null && editedPos !== null) {
    const left = state.doc.lineAt(editedPos)
    const type = effectiveType(state, left.number)
    if (!cursor.has(left.number) && type && UPPERCASE.has(type)) {
      const settled = settledCase(left.text, type)
      if (settled !== left.text) changes = { from: left.from, to: left.to, insert: settled }
    }
  }

  if (effects.length === 0 && changes === null) return null
  return { effects, changes: changes ?? [], sequential: true }
}

/** Ajuste les lignes quittées par le curseur, dans la même étape d'annulation que le déplacement. */
export const settleLeftLines = EditorState.transactionFilter.of((tr) => {
  if (tr.isUserEvent('undo') || tr.isUserEvent('redo')) return tr
  if (!tr.docChanged && !tr.selection && tr.effects.length === 0) return tr
  if (tr.state.field(pendingTypes).length === 0 && tr.startState.field(editedLine) === null) {
    return tr
  }
  const extra = settleLines(tr)
  return extra ? [tr, extra] : tr
})
