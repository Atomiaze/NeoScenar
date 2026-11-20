// Commandes clavier de l'éditeur de scénario (Entrée, Tab, raccourcis de KIT Scenarist).
// Ce sont des commandes « d'état » : elles fonctionnent sans affichage, ce qui permet de les tester.

import {
  EditorSelection,
  type EditorState,
  type StateCommand,
  type TransactionSpec
} from '@codemirror/state'
import type { ElementType } from '@neoscenar/fountain'
import { blankLinesBetween, keyFlow } from './flow'
import { convertLineInState, effectiveType, setPendingType } from './pendingTypes'

function currentLine(state: EditorState) {
  return state.doc.lineAt(state.selection.main.head)
}

function isEmptyLine(text: string): boolean {
  return text.trim() === ''
}

function typeOfLine(state: EditorState, lineNumber: number): ElementType {
  return effectiveType(state, lineNumber) ?? 'action'
}

/** Nouvelle ligne de type `next` après la ligne `lineNumber`, avec les lignes vides qu'il faut. */
function insertElementAfter(
  state: EditorState,
  lineNumber: number,
  next: ElementType
): TransactionSpec {
  const line = state.doc.line(lineNumber)
  const separator = '\n'.repeat(1 + blankLinesBetween(typeOfLine(state, lineNumber), next))
  const start = line.to + separator.length
  return {
    changes: { from: line.to, insert: separator },
    selection: { anchor: start },
    effects: setPendingType.of({ pos: start, type: next }),
    scrollIntoView: true,
    userEvent: 'input'
  }
}

/** Donne le type `to` à la ligne `lineNumber` (voir convertLine) ; le curseur va en fin de ligne. */
export function setLineTypeSpec(
  state: EditorState,
  lineNumber: number,
  to: ElementType
): TransactionSpec {
  const conversion = convertLineInState(state, lineNumber, to)
  return {
    changes: conversion.changes,
    selection: { anchor: conversion.lineTo },
    effects: setPendingType.of({ pos: conversion.lineFrom, type: to }),
    scrollIntoView: true,
    userEvent: 'input'
  }
}

/** Raccourcis de KIT (Cmd + J, Cmd + U…) et sélecteur d'élément : change le type de la ligne. */
export function setElementType(to: ElementType): StateCommand {
  return ({ state, dispatch }) => {
    dispatch(state.update(setLineTypeSpec(state, currentLine(state).number, to)))
    return true
  }
}

/**
 * Entrée : en fin de ligne, passe à l'élément suivant (table de flow.ts) ; au milieu d'une ligne, la
 * coupe en deux éléments du même type ; sur une ligne vide, la transforme en action.
 */
export const enterCommand: StateCommand = ({ state, dispatch }) => {
  const range = state.selection.main
  if (!range.empty) return false
  const line = currentLine(state)
  const type = typeOfLine(state, line.number)
  if (isEmptyLine(line.text)) {
    if (type !== 'action') dispatch(state.update(setLineTypeSpec(state, line.number, 'action')))
    return true
  }
  if (line.text.slice(range.head - line.from).trim() === '') {
    dispatch(state.update(insertElementAfter(state, line.number, keyFlow(type).enter)))
    return true
  }
  const separator = '\n'.repeat(1 + blankLinesBetween(type, type))
  const start = range.head + separator.length
  // Les espaces à l'endroit de la coupure disparaissent.
  const spaces = /^[ \t]*/.exec(line.text.slice(range.head - line.from))?.[0].length ?? 0
  dispatch(
    state.update({
      changes: { from: range.head, to: range.head + spaces, insert: separator },
      selection: { anchor: start },
      effects: setPendingType.of({ pos: start, type }),
      scrollIntoView: true,
      userEvent: 'input'
    })
  )
  return true
}

/** Maj + Entrée : simple retour à la ligne dans le même élément (réplique sur plusieurs lignes). */
export const lineBreakCommand: StateCommand = ({ state, dispatch }) => {
  const line = currentLine(state)
  const type = typeOfLine(state, line.number)
  const changes = state.changeByRange((range) => ({
    changes: { from: range.from, to: range.to, insert: '\n' },
    range: EditorSelection.cursor(range.from + 1)
  }))
  const start = changes.selection.main.head
  dispatch(
    state.update({
      ...changes,
      effects: setPendingType.of({ pos: start, type }),
      scrollIntoView: true,
      userEvent: 'input'
    })
  )
  return true
}

/** Tab : sur une ligne vide, change son type ; sur une ligne écrite, crée l'élément suivant. */
export const tabCommand: StateCommand = ({ state, dispatch }) => {
  const line = currentLine(state)
  const flow = keyFlow(typeOfLine(state, line.number))
  if (isEmptyLine(line.text)) {
    if (flow.tabOnEmpty)
      dispatch(state.update(setLineTypeSpec(state, line.number, flow.tabOnEmpty)))
  } else if (flow.tabOnFilled) {
    dispatch(state.update(insertElementAfter(state, line.number, flow.tabOnFilled)))
  }
  // Tab ne quitte jamais l'éditeur (ce n'est pas un champ de formulaire).
  return true
}

/**
 * Retour arrière au début d'une ligne vide : la supprime avec les lignes vides qui la séparent de
 * l'élément précédent, et revient à la fin de celui-ci (annule un Entrée de trop).
 */
export const backspaceCommand: StateCommand = ({ state, dispatch }) => {
  const range = state.selection.main
  const line = currentLine(state)
  if (!range.empty || line.length > 0 || line.number === 1) return false
  let previous = line.number - 1
  while (previous > 1 && isEmptyLine(state.doc.line(previous).text)) previous--
  const target = state.doc.line(previous)
  dispatch(
    state.update({
      changes: { from: target.to, to: line.from },
      // Le type retenu de la ligne supprimée disparaît avec elle (voir pendingTypes).
      selection: { anchor: target.to },
      scrollIntoView: true,
      userEvent: 'delete'
    })
  )
  return true
}

/** Morceau visé par une commande : la sélection, sinon le mot sous le curseur. */
function targetRange(state: EditorState): { from: number; to: number } | null {
  const range = state.selection.main
  if (!range.empty) return range
  return state.wordAt(range.head)
}

/** Cmd + ↑ / Cmd + ↓ : majuscules ou minuscules sur la sélection ou le mot. */
export function changeCase(upper: boolean): StateCommand {
  return ({ state, dispatch }) => {
    const target = targetRange(state)
    if (!target) return true
    const text = state.sliceDoc(target.from, target.to)
    dispatch(
      state.update({
        changes: { ...target, insert: upper ? text.toUpperCase() : text.toLowerCase() },
        selection: { anchor: target.from, head: target.to },
        userEvent: 'input'
      })
    )
    return true
  }
}

/**
 * Cmd + B / Cmd + I / Cmd + Maj + U : met en gras (**), en italique (*) ou souligne (_) la sélection ou
 * le mot ; recommencer retire la mise en forme.
 */
export function toggleFormat(marker: '**' | '*' | '_'): StateCommand {
  return ({ state, dispatch }) => {
    const target = targetRange(state)
    const size = marker.length
    if (!target) {
      const head = state.selection.main.head
      dispatch(
        state.update({
          changes: { from: head, insert: marker + marker },
          selection: { anchor: head + size },
          userEvent: 'input'
        })
      )
      return true
    }
    const before = state.sliceDoc(target.from - size - 1, target.from)
    const after = state.sliceDoc(target.to, target.to + size + 1)
    // « *mot* » est en italique, mais pas « **mot** » (gras) : on regarde le caractère voisin.
    const wrapped =
      before.endsWith(marker) &&
      after.startsWith(marker) &&
      (marker !== '*' || (!before.endsWith('**') && !after.startsWith('**')))
    const spec: TransactionSpec = wrapped
      ? {
          changes: [
            { from: target.from - size, to: target.from },
            { from: target.to, to: target.to + size }
          ],
          selection: { anchor: target.from - size, head: target.to - size }
        }
      : {
          changes: [
            { from: target.from, insert: marker },
            { from: target.to, insert: marker }
          ],
          selection: { anchor: target.from + size, head: target.to + size }
        }
    dispatch(state.update({ ...spec, userEvent: 'input' }))
    return true
  }
}
