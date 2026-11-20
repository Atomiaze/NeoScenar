import { describe, expect, it } from 'vitest'
import { findDecoupageProblem } from './invariants'
import { deleteItems, insertScenes, insertShots, moveScene, moveShots } from './structure'
import type { EditResult } from './result'
import type { Decoupage } from '../projectTypes'
import { allIds, counterIds, makeDecoupage, sceneNumbers, shotNumbers } from './testFixtures'

function expectOk(result: EditResult): Decoupage {
  if (!result.ok) throw new Error(`Opération refusée : ${result.problem}`)
  expect(findDecoupageProblem(result.decoupage)).toBeNull()
  return result.decoupage
}

function shotIds(decoupage: Decoupage, sceneIndex: number): string[] {
  return decoupage.scenes[sceneIndex].shots.map((shot) => shot.id)
}

describe('ajouter et insérer des plans', () => {
  it('à la fin d’une scène', () => {
    const start = makeDecoupage({ '10': ['10', '20'] })
    const result = insertShots(start, { sceneId: 'S10', index: 2 }, 1, counterIds())
    expect(shotNumbers(expectOk(result))).toEqual(['P_0010', 'P_0020', 'P_0030'])
  })

  it('entre deux plans', () => {
    const start = makeDecoupage({ '10': ['10', '20'] })
    const result = insertShots(start, { sceneId: 'S10', index: 1 }, 1, counterIds())
    expect(shotNumbers(expectOk(result))).toEqual(['P_0010', 'P_0015', 'P_0020'])
  })

  it('25 plans d’un coup à la fin', () => {
    const start = makeDecoupage({ '10': ['10'] })
    const result = expectOk(insertShots(start, { sceneId: 'S10', index: 1 }, 25, counterIds()))
    expect(shotNumbers(result)).toHaveLength(26)
    expect(shotNumbers(result).slice(-2)).toEqual(['P_0250', 'P_0260'])
  })

  it('renvoie les identifiants créés et ne modifie pas l’original', () => {
    const start = makeDecoupage({ '10': ['10', '20'] })
    const copy = structuredClone(start)
    const result = insertShots(start, { sceneId: 'S10', index: 1 }, 2, counterIds())
    expect(result.ok && result.createdIds).toEqual(['id-1', 'id-2'])
    expect(start).toEqual(copy)
  })

  it('plus de numéro libre, non verrouillé : renumérotation demandée', () => {
    const start = makeDecoupage({ '10': ['10', '11'] })
    const result = insertShots(start, { sceneId: 'S10', index: 1 }, 1, counterIds())
    expect(result).toEqual({ ok: false, problem: 'needs-renumber' })
  })

  it('plus de numéro libre, accord pour renuméroter : la scène est renumérotée', () => {
    const start = makeDecoupage({ '10': ['10', '11', '30'] })
    const result = insertShots(start, { sceneId: 'S10', index: 1 }, 1, counterIds(), {
      renumber: true
    })
    const after = expectOk(result)
    expect(shotNumbers(after)).toEqual(['P_0010', 'P_0020', 'P_0030', 'P_0040'])
    expect(shotIds(after, 0)).toEqual(['S10-P10', 'id-1', 'S10-P11', 'S10-P30'])
  })

  it('verrouillé : lettres A, B…', () => {
    let decoupage = makeDecoupage({ '10': ['10', '11'] }, true)
    decoupage = expectOk(insertShots(decoupage, { sceneId: 'S10', index: 1 }, 1, counterIds('a')))
    decoupage = expectOk(insertShots(decoupage, { sceneId: 'S10', index: 2 }, 1, counterIds('b')))
    expect(shotNumbers(decoupage)).toEqual(['P_0010', 'P_0010A', 'P_0010B', 'P_0011'])
  })

  it('verrouillé : accord pour renuméroter ignoré, lettres utilisées', () => {
    const start = makeDecoupage({ '10': ['10', '11'] }, true)
    const result = insertShots(start, { sceneId: 'S10', index: 1 }, 1, counterIds(), {
      renumber: true
    })
    expect(shotNumbers(expectOk(result))).toEqual(['P_0010', 'P_0010A', 'P_0011'])
  })

  it('verrouillé, plus aucune place : insertion impossible', () => {
    const start = makeDecoupage({ '10': ['10', '10A'] }, true)
    const result = insertShots(start, { sceneId: 'S10', index: 1 }, 1, counterIds())
    expect(result).toEqual({ ok: false, problem: 'no-room' })
  })

  it('refuse un nombre hors de 1 à 200 et une scène inconnue', () => {
    const start = makeDecoupage({ '10': ['10'] })
    expect(insertShots(start, { sceneId: 'S10', index: 1 }, 0, counterIds()).ok).toBe(false)
    expect(insertShots(start, { sceneId: 'S10', index: 1 }, 201, counterIds()).ok).toBe(false)
    expect(insertShots(start, { sceneId: 'S99', index: 0 }, 1, counterIds())).toEqual({
      ok: false,
      problem: 'not-found'
    })
  })
})

describe('ajouter des scènes', () => {
  it('une nouvelle scène contient un plan P_0010', () => {
    const start = makeDecoupage({ '10': ['10'] })
    const after = expectOk(insertScenes(start, 1, 1, counterIds()))
    expect(sceneNumbers(after)).toEqual(['S_0010', 'S_0020'])
    expect(shotNumbers(after, 1)).toEqual(['P_0010'])
    expect(after.scenes[1].heading).toBe('')
  })

  it('3 scènes d’un coup entre deux scènes', () => {
    const start = makeDecoupage({ '10': ['10'], '20': ['10'] })
    const after = expectOk(insertScenes(start, 1, 3, counterIds()))
    expect(sceneNumbers(after)).toEqual(['S_0010', 'S_0012', 'S_0015', 'S_0017', 'S_0020'])
    expect(after.scenes.every((scene) => scene.shots.length === 1)).toBe(true)
  })

  it('dans un projet vide : S_0010', () => {
    const after = expectOk(insertScenes(makeDecoupage({}), 0, 1, counterIds()))
    expect(sceneNumbers(after)).toEqual(['S_0010'])
  })

  it('plus de numéro de scène libre : renumérotation des scènes', () => {
    const start = makeDecoupage({ '10': ['10'], '11': ['10', '20'] })
    expect(insertScenes(start, 1, 1, counterIds())).toEqual({
      ok: false,
      problem: 'needs-renumber'
    })
    const after = expectOk(insertScenes(start, 1, 1, counterIds(), { renumber: true }))
    expect(sceneNumbers(after)).toEqual(['S_0010', 'S_0020', 'S_0030'])
    // Les plans ne sont pas renumérotés.
    expect(shotNumbers(after, 2)).toEqual(['P_0010', 'P_0020'])
  })
})

describe('supprimer', () => {
  it('un plan, sans renuméroter les autres', () => {
    const start = makeDecoupage({ '10': ['10', '20', '30'] })
    const after = expectOk(deleteItems(start, { sceneIds: [], shotIds: ['S10-P20'] }))
    expect(shotNumbers(after)).toEqual(['P_0010', 'P_0030'])
  })

  it('une scène avec ses plans', () => {
    const start = makeDecoupage({ '10': ['10'], '20': ['10', '20'], '30': ['10'] })
    const after = expectOk(deleteItems(start, { sceneIds: ['S20'], shotIds: [] }))
    expect(sceneNumbers(after)).toEqual(['S_0010', 'S_0030'])
  })

  it('toutes les scènes', () => {
    const start = makeDecoupage({ '10': ['10'], '20': ['10'] })
    const after = expectOk(deleteItems(start, { sceneIds: ['S10', 'S20'], shotIds: [] }))
    expect(after.scenes).toEqual([])
  })

  it('les identifiants des éléments supprimés ne sont jamais réutilisés', () => {
    const ids = counterIds()
    let decoupage = expectOk(
      insertShots(makeDecoupage({ '10': [] }), { sceneId: 'S10', index: 0 }, 3, ids)
    )
    decoupage = expectOk(deleteItems(decoupage, { sceneIds: [], shotIds: ['id-2', 'id-3'] }))
    decoupage = expectOk(insertShots(decoupage, { sceneId: 'S10', index: 1 }, 2, ids))
    expect(shotIds(decoupage, 0)).toEqual(['id-1', 'id-4', 'id-5'])
  })
})

describe('déplacer des plans', () => {
  it('dans sa scène : seul le plan déplacé change de numéro', () => {
    const start = makeDecoupage({ '10': ['10', '20', '30', '40'] })
    // P_0040 placé entre P_0010 et P_0020.
    const after = expectOk(moveShots(start, ['S10-P40'], { sceneId: 'S10', index: 1 }))
    expect(shotIds(after, 0)).toEqual(['S10-P10', 'S10-P40', 'S10-P20', 'S10-P30'])
    expect(shotNumbers(after)).toEqual(['P_0010', 'P_0015', 'P_0020', 'P_0030'])
  })

  it('vers une autre scène : nouveau numéro dans la scène d’arrivée', () => {
    const start = makeDecoupage({ '10': ['10', '20'], '20': ['10', '20'] })
    const after = expectOk(moveShots(start, ['S10-P20'], { sceneId: 'S20', index: 2 }))
    expect(shotNumbers(after, 0)).toEqual(['P_0010'])
    expect(shotNumbers(after, 1)).toEqual(['P_0010', 'P_0020', 'P_0030'])
    expect(after.scenes[1].shots[2].id).toBe('S10-P20')
  })

  it('plusieurs plans ensemble, dans leur ordre', () => {
    const start = makeDecoupage({ '10': ['10', '20', '30'], '20': ['10', '20'] })
    // Sélection donnée dans le désordre : l'ordre du découpage est conservé.
    const after = expectOk(
      moveShots(start, ['S20-P10', 'S10-P30', 'S10-P10'], { sceneId: 'S20', index: 1 })
    )
    expect(shotIds(after, 0)).toEqual(['S10-P20'])
    expect(shotIds(after, 1)).toEqual(['S20-P20', 'S10-P10', 'S10-P30', 'S20-P10'])
    expect(shotNumbers(after, 1)).toEqual(['P_0020', 'P_0030', 'P_0040', 'P_0050'])
  })

  it('remis à la même place : rien ne change', () => {
    const start = makeDecoupage({ '10': ['10', '20', '30'] })
    const result = moveShots(start, ['S10-P20'], { sceneId: 'S10', index: 1 })
    expect(result.ok && result.decoupage).toBe(start)
  })

  it('plus de numéro libre : renumérotation de la scène d’arrivée si accord', () => {
    const start = makeDecoupage({ '10': ['10', '11', '20'] })
    expect(moveShots(start, ['S10-P20'], { sceneId: 'S10', index: 1 })).toEqual({
      ok: false,
      problem: 'needs-renumber'
    })
    const after = expectOk(
      moveShots(start, ['S10-P20'], { sceneId: 'S10', index: 1 }, { renumber: true })
    )
    expect(shotIds(after, 0)).toEqual(['S10-P10', 'S10-P20', 'S10-P11'])
    expect(shotNumbers(after)).toEqual(['P_0010', 'P_0020', 'P_0030'])
  })

  it('refusé quand les numéros sont verrouillés', () => {
    const start = makeDecoupage({ '10': ['10', '20'] }, true)
    expect(moveShots(start, ['S10-P20'], { sceneId: 'S10', index: 0 })).toEqual({
      ok: false,
      problem: 'locked'
    })
  })
})

describe('déplacer une scène', () => {
  it('la scène entière avec ses plans', () => {
    const start = makeDecoupage({ '10': ['10'], '20': ['10', '20'], '30': ['10'] })
    const after = expectOk(moveScene(start, 'S30', 0))
    expect(after.scenes.map((scene) => scene.id)).toEqual(['S30', 'S10', 'S20'])
    expect(sceneNumbers(after)).toEqual(['S_0005', 'S_0010', 'S_0020'])
    expect(shotNumbers(after, 0)).toEqual(['P_0010'])
  })

  it('refusé quand les numéros sont verrouillés', () => {
    const start = makeDecoupage({ '10': ['10'], '20': ['10'] }, true)
    expect(moveScene(start, 'S20', 0)).toEqual({ ok: false, problem: 'locked' })
  })

  it('les identifiants internes ne changent jamais', () => {
    const start = makeDecoupage({ '10': ['10'], '20': ['10', '20'] })
    const after = expectOk(moveScene(start, 'S10', 1))
    expect(allIds(after).sort()).toEqual(allIds(start).sort())
  })
})
