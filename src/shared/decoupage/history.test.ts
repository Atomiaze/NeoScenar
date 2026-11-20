import { describe, expect, it } from 'vitest'
import type { Decoupage } from '../projectTypes'
import { updateScene } from './fields'
import {
  breakMerge,
  commit,
  createHistory,
  HISTORY_LIMIT,
  redo,
  replacePresent,
  redoLabel,
  undo,
  undoLabel,
  undoEffect,
  redoEffect,
  type History
} from './history'
import type { EditResult } from './result'
import { deleteItems, insertShots, moveShots } from './structure'
import { counterIds, makeDecoupage, shotNumbers } from './testFixtures'

function apply(history: History<Decoupage>, result: EditResult, label: string, mergeKey?: string) {
  if (!result.ok) throw new Error(result.problem)
  return commit(history, result.decoupage, { label, mergeKey })
}

describe('annuler et rétablir', () => {
  it('sur une suite d’opérations', () => {
    const ids = counterIds()
    const start = makeDecoupage({ '10': ['10', '20'], '20': ['10', '20', '30', '40'] })
    let h = createHistory(start)
    h = apply(h, insertShots(h.present, { sceneId: 'S10', index: 2 }, 1, ids), 'addShot')
    h = apply(h, moveShots(h.present, ['S10-P10'], { sceneId: 'S10', index: 2 }), 'move')
    const beforeDelete = h.present
    h = apply(h, deleteItems(h.present, { sceneIds: ['S20'], shotIds: [] }), 'delete')
    expect(h.present.scenes).toHaveLength(1)

    // La scène supprimée revient avec ses numéros et ses identifiants.
    h = undo(h)
    expect(h.present).toBe(beforeDelete)
    expect(shotNumbers(h.present, 1)).toEqual(['P_0010', 'P_0020', 'P_0030', 'P_0040'])
    expect(undoLabel(h)).toBe('move')
    expect(redoLabel(h)).toBe('delete')

    h = undo(undo(h))
    expect(h.present).toBe(start)
    expect(undoLabel(h)).toBeNull()
    expect(undo(h)).toBe(h)

    h = redo(redo(redo(h)))
    expect(h.present.scenes).toHaveLength(1)
    expect(redoLabel(h)).toBeNull()
  })

  it('une nouvelle modification efface ce qui pouvait être rétabli', () => {
    let h = createHistory(makeDecoupage({ '10': ['10'] }))
    h = apply(h, updateScene(h.present, 'S10', { name: 'A' }), 'edit')
    h = undo(h)
    h = apply(h, updateScene(h.present, 'S10', { name: 'B' }), 'edit')
    expect(h.future).toEqual([])
  })

  it('une saisie continue dans un champ compte pour une seule étape', () => {
    const start = makeDecoupage({ '10': ['10'] })
    let h = createHistory(start)
    for (const name of ['R', 'Ré', 'Rév', 'Réveil']) {
      h = apply(h, updateScene(h.present, 'S10', { name }), 'edit', 'S10:name')
    }
    expect(h.past).toHaveLength(1)
    expect(h.present.scenes[0].name).toBe('Réveil')

    // Après avoir quitté le champ, la frappe suivante est une nouvelle étape.
    h = breakMerge(h)
    h = apply(h, updateScene(h.present, 'S10', { name: 'Réveil !' }), 'edit', 'S10:name')
    expect(h.past).toHaveLength(2)
    expect(undo(undo(h)).present).toBe(start)
  })

  it('une modification sans effet ne crée pas d’étape', () => {
    const h = createHistory(makeDecoupage({ '10': ['10'] }))
    expect(apply(h, updateScene(h.present, 'S10', { name: '' }), 'edit')).toBe(h)
  })

  it(`garde au moins 100 étapes (ici ${HISTORY_LIMIT})`, () => {
    let h = createHistory(makeDecoupage({ '10': ['10'] }))
    for (let i = 0; i < HISTORY_LIMIT + 50; i++) {
      h = apply(h, updateScene(h.present, 'S10', { name: String(i) }), 'edit')
    }
    expect(h.past).toHaveLength(HISTORY_LIMIT)
    for (let i = 0; i < HISTORY_LIMIT; i++) h = undo(h)
    expect(h.present.scenes[0].name).toBe('49')
  })
})

describe('remplacer l’état présent', () => {
  it('sans créer d’étape d’annulation', () => {
    const history = commit(createHistory('a'), 'b', { label: 'x' })
    const replaced = replacePresent(history, 'c')
    expect(replaced.present).toBe('c')
    expect(replaced.past).toEqual(history.past)
    expect(undo(replaced).present).toBe('a')
    expect(replacePresent(replaced, 'c')).toBe(replaced)
  })
})

describe('effet joint à chaque étape (texte du scénario, étape 8)', () => {
  it('Annuler donne l’effet de l’étape ; Rétablir celui fourni en annulant', () => {
    let history = createHistory<string, string>('a')
    history = commit(history, 'b', { label: 'x', effect: 'défaire b' })
    expect(undoEffect(history)).toBe('défaire b')
    history = undo(history, 'refaire b')
    expect(redoEffect(history)).toBe('refaire b')
    history = redo(history, 'défaire b encore')
    expect(undoEffect(history)).toBe('défaire b encore')
  })

  it('une saisie regroupée garde l’effet de son début', () => {
    let history = createHistory<string, string>('a')
    history = commit(history, 'ab', { label: 'x', mergeKey: 'champ', effect: 'revenir à a' })
    history = commit(history, 'abc', { label: 'x', mergeKey: 'champ', effect: 'revenir à ab' })
    expect(history.past).toHaveLength(1)
    expect(undoEffect(history)).toBe('revenir à a')
  })
})
