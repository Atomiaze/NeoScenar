import { describe, expect, it } from 'vitest'
import { createScriptState } from './createScriptState'
import { computePageLayout, pageAt, pageLayoutField, setPageLayout } from './pageLayout'

/** Une page pleine d'actions d'une ligne, puis un long paragraphe coupé entre la page 1 et la page 2. */
const actions = Array.from({ length: 20 }, (_, i) => `Action ${i + 1}.`).join('\n\n')
const paragraph = Array.from({ length: 40 }, (_, i) => `Ligne ${i + 1}`).join('\n')
const TEXT = `${actions}\n\n${paragraph}\n`

describe('page du curseur', () => {
  const layout = computePageLayout(createScriptState(TEXT))
  const start = layout.starts[0]

  it('la page 2 commence au milieu du paragraphe', () => {
    expect(layout.starts).toHaveLength(1)
    // 20 actions occupent 39 lignes, la ligne vide une de plus : 18 lignes du paragraphe en page 1.
    expect(TEXT.slice(start, start + 8)).toBe('Ligne 19')
  })

  it('avant le trait : page 1 ; à partir du premier caractère de la page : page 2', () => {
    expect(pageAt(layout.starts, 0)).toBe(1)
    expect(pageAt(layout.starts, start - 1)).toBe(1)
    expect(pageAt(layout.starts, start)).toBe(2)
    expect(pageAt(layout.starts, TEXT.length)).toBe(2)
  })

  it('entre deux calculs, les débuts de page suivent le texte modifié', () => {
    let state = createScriptState(TEXT)
    state = state.update({ effects: setPageLayout.of(computePageLayout(state)) }).state
    state = state.update({ changes: { from: 0, insert: 'Nouveau. ' } }).state
    const moved = state.field(pageLayoutField)!.starts[0]
    expect(state.doc.sliceString(moved, moved + 8)).toBe('Ligne 19')
  })
})
