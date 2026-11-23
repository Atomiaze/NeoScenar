import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { createScriptState } from './createScriptState'
import { draftBlocksOf, onDraftSearchHit } from './drafts'
import { computePageLayout } from './pageLayout'

const SCRIPT = [
  'INT. A - JOUR #10#',
  '',
  'Action A.',
  '',
  'INT. B - JOUR #20#',
  '[[BROUILLON]]',
  '',
  'Action B.',
  '',
  'INT. C - JOUR #30#',
  '',
  'Action C.',
  ''
].join('\n')

const B = SCRIPT.indexOf('INT. B')
const C = SCRIPT.indexOf('INT. C')

function typed(
  state: EditorState,
  from: number,
  to: number,
  insert: string,
  userEvent = 'input.type'
): EditorState {
  return state.update({
    changes: { from, to, insert },
    selection: { anchor: from + insert.length },
    userEvent
  }).state
}

describe('scènes brouillon dans l’éditeur', () => {
  it('le bloc masqué va de l’en-tête jusqu’à la scène suivante', () => {
    const state = createScriptState(SCRIPT)
    expect(draftBlocksOf(state)).toEqual([{ from: B, to: C }])
  })

  it('la frappe ne peut pas entrer dans le bloc', () => {
    const state = createScriptState(SCRIPT)
    expect(typed(state, B + 3, B + 3, 'x').doc.toString()).toBe(SCRIPT)
    // Effacer en arrière au début de la scène suivante : la ligne vide du bloc reste.
    expect(typed(state, C - 1, C, '', 'delete.backward').doc.toString()).toBe(SCRIPT)
  })

  it('tout sélectionner puis effacer garde le brouillon entier', () => {
    const state = createScriptState(SCRIPT)
    const after = typed(state, 0, SCRIPT.length, '', 'delete.selection').doc.toString()
    expect(after).toBe(SCRIPT.slice(B, C))
  })

  it('taper sur la ligne vide qui précède un brouillon le garde intact', () => {
    const state = createScriptState(SCRIPT)
    const after = typed(state, B - 1, B - 1, 'x')
    expect(after.doc.toString()).toBe(SCRIPT.replace('\nINT. B', 'x\n\nINT. B'))
    expect(after.selection.main.head).toBe(B)
    expect(draftBlocksOf(after)).toHaveLength(1)
  })

  it('une modification du programme passe (fiches, Cartes, fenêtre du brouillon)', () => {
    const state = createScriptState(SCRIPT)
    const after = typed(state, B + 3, B + 3, 'x', 'input.replace')
    expect(after.doc.toString()).toBe(`${SCRIPT.slice(0, B + 3)}x${SCRIPT.slice(B + 3)}`)
  })

  it('le curseur ne reste pas dans une scène qui devient brouillon pendant la frappe', () => {
    const text = SCRIPT.replace('[[BROUILLON]]', '[[BROUILLON]')
    const state = createScriptState(text)
    const at = text.indexOf('[[BROUILLON]') + '[[BROUILLON]'.length
    const after = typed(state, at, at, ']')
    expect(draftBlocksOf(after)).toHaveLength(1)
    const head = after.selection.main.head
    expect(head).toBeLessThan(draftBlocksOf(after)[0].from)
  })

  it('la scène brouillon n’est pas paginée', () => {
    const layout = computePageLayout(createScriptState(SCRIPT))
    const printed = layout.printed.elements.map((element) => element.text)
    expect(printed).toEqual(['INT. A - JOUR', 'Action A.', 'INT. C - JOUR', 'Action C.'])
    expect(layout.doc.elements.length).toBeGreaterThan(printed.length)
  })

  it('la recherche tombée dans un brouillon met le curseur juste après et le signale', async () => {
    const hits: (number | null)[] = []
    onDraftSearchHit((from) => hits.push(from))
    const state = createScriptState(SCRIPT)
    const found = SCRIPT.indexOf('Action B.')
    const after = state.update({
      selection: { anchor: found, head: found + 6 },
      userEvent: 'select.search'
    }).state
    expect(after.selection.main.head).toBe(C)
    await Promise.resolve()
    expect(hits).toEqual([B])
  })
})
