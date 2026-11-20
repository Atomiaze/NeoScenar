import { describe, expect, it } from 'vitest'
import { cards, labels } from '../scriptLink/testHelpers'
import { allocateNumbers } from './allocate'
import { duplicateItems } from './duplicate'
import { findDecoupageProblem } from './invariants'
import { insertScenes } from './structure'
import { counterIds } from './testFixtures'

// Étape 8 : les scènes suivent l'ordre du scénario. Avec les numéros verrouillés, une scène déplacée
// dans le texte garde son numéro : les numéros de scène sont uniques, mais pas forcément croissants.

const n = (number: number, letter = ''): { number: number; letter: string } => ({ number, letter })

describe('numéros déjà pris', () => {
  it('entre deux voisins : jamais un numéro pris', () => {
    const result = allocateNumbers(n(20), n(40), 1, false, new Set(['30']))
    expect(result).toEqual({ ok: true, numbers: [n(29)] })
  })

  it('sans numéro pris, les règles habituelles ne changent pas', () => {
    expect(allocateNumbers(n(10), n(20), 3, false, new Set())).toEqual({
      ok: true,
      numbers: [n(12), n(15), n(17)]
    })
  })

  it('à la fin : le multiple de 10 suivant qui est libre', () => {
    expect(allocateNumbers(n(20), undefined, 2, false, new Set(['30']))).toEqual({
      ok: true,
      numbers: [n(40), n(50)]
    })
  })

  it('lettres : la première lettre libre', () => {
    expect(allocateNumbers(n(20), n(21), 1, true, new Set(['20A']))).toEqual({
      ok: true,
      numbers: [n(20, 'B')]
    })
  })
})

describe('scènes hors de l’ordre des numéros', () => {
  it('un découpage aux numéros de scène non croissants est valide ; un doublon ne l’est pas', () => {
    expect(findDecoupageProblem(cards(['10', '50', '20'], { locked: true }))).toBeNull()
    expect(findDecoupageProblem(cards(['10', '20', '10A']))).toBeNull()
    const twice = cards(['10', '20'])
    twice.scenes[1] = { ...twice.scenes[1], number: 10 }
    expect(findDecoupageProblem(twice)).toEqual({ kind: 'bad-order', where: 'scenes' })
  })

  it('ajouter une scène depuis les cartes ne choisit jamais un numéro déjà pris (orphelines comprises)', () => {
    // 50A existe déjà plus loin : l'insertion entre S_0050 et S_0020 prend 50B.
    const decoupage = cards(['10', '50', '20', '50A'], { locked: true })
    const result = insertScenes(decoupage, 2, 1, counterIds())
    expect(result.ok && labels(result.decoupage)).toEqual([
      'S_0010',
      'S_0050',
      'S_0050B',
      'S_0020',
      'S_0050A'
    ])
  })

  it('à la fin, après un numéro plus petit qu’un autre : numéro libre', () => {
    const decoupage = cards(['10', '30', '20'], { locked: true })
    const result = insertScenes(decoupage, 3, 1, counterIds())
    expect(result.ok && labels(result.decoupage)).toEqual(['S_0010', 'S_0030', 'S_0020', 'S_0040'])
  })

  it('dupliquer une scène : la copie évite les numéros déjà pris', () => {
    const decoupage = cards(['10', '50', '20', '50A'], { locked: true })
    const result = duplicateItems(decoupage, ['S50'], counterIds())
    expect(result.ok && labels(result.decoupage)).toEqual([
      'S_0010',
      'S_0050',
      'S_0050B',
      'S_0020',
      'S_0050A'
    ])
  })
})
