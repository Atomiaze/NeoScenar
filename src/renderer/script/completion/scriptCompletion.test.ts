import { describe, expect, it } from 'vitest'
import { createScriptState } from '../editor/createScriptState'
import { setElementType, tabCommand } from '../editing/commands'
import type { EditorState, StateCommand } from '@codemirror/state'
import { proposalsAt, type NameSource } from './scriptCompletion'

const TIMES: NameSource = () => ({ times: ['JOUR', 'NUIT'] })
const SCRIPT = 'INT. MAISON - CUISINE - JOUR\n\nCHLOÉ\nBonjour.\n\nEXT. RUE - NUIT\n\nAction.'

function stateAtEnd(text: string): EditorState {
  const state = createScriptState(text, undefined, [TIMES])
  return state.update({ selection: { anchor: text.length } }).state
}

function run(state: EditorState, command: StateCommand): EditorState {
  let next = state
  command({ state, dispatch: (tr) => (next = tr.state) })
  return next
}

function typeText(state: EditorState, text: string): EditorState {
  let next = state
  for (const char of text) {
    const head = next.selection.main.head
    next = next.update({
      changes: { from: head, insert: char },
      selection: { anchor: head + 1 },
      userEvent: 'input.type'
    }).state
  }
  return next
}

const labels = (state: EditorState): string[] =>
  proposalsAt(state, state.selection.main.head).map((proposal) => proposal.label)

describe('autocomplétion dans l’éditeur', () => {
  it('nouvel en-tête : préfixes, puis lieux du scénario, puis moments du vocabulaire', () => {
    let state = run(stateAtEnd(`${SCRIPT}\n\n`), setElementType('scene_heading'))
    state = typeText(state, 'i')
    expect(labels(state)).toEqual(['INT.', 'INT./EXT.'])
    state = typeText(state, 'nt. ')
    expect(labels(state)).toEqual(['MAISON - CUISINE', 'RUE'])
    state = typeText(state, 'rue - ')
    expect(labels(state)).toEqual(['JOUR', 'NUIT'])
  })

  it('nouveau personnage : les personnages déjà présents', () => {
    let state = run(stateAtEnd(SCRIPT), tabCommand)
    state = typeText(state, 'c')
    expect(labels(state)).toEqual(['CHLOÉ', 'C'])
  })

  it('les noms des fiches s’ajoutent à ceux du scénario, sans doublon', () => {
    const sheets: NameSource = () => ({ characters: ['Chloé', 'CHARLES'], locations: ['CAVE'] })
    const start = createScriptState(SCRIPT, undefined, [TIMES, sheets])
    let state = run(start.update({ selection: { anchor: SCRIPT.length } }).state, tabCommand)
    state = typeText(state, 'c')
    expect(labels(state)).toEqual(['CHLOÉ', 'CHARLES', 'C'])
  })

  it('aucune proposition dans une action', () => {
    expect(labels(typeText(stateAtEnd(SCRIPT), ' i'))).toEqual([])
  })
})
