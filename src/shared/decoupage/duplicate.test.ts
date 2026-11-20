import { describe, expect, it } from 'vitest'
import type { Decoupage } from '../projectTypes'
import { duplicateItems } from './duplicate'
import { commit, createHistory, redo, undo, undoLabel } from './history'
import { findDecoupageProblem } from './invariants'
import type { EditResult } from './result'
import { allIds, counterIds, makeDecoupage, sceneNumbers, shotNumbers } from './testFixtures'

function expectOk(result: EditResult): Decoupage {
  if (!result.ok) throw new Error(`Opération refusée : ${result.problem}`)
  expect(findDecoupageProblem(result.decoupage)).toBeNull()
  return result.decoupage
}

function withDetails(decoupage: Decoupage): Decoupage {
  const scene = decoupage.scenes[0]
  return {
    ...decoupage,
    scenes: [
      {
        ...scene,
        name: 'Cuisine',
        heading: 'INT. CUISINE - JOUR',
        color: '#ffd6d6',
        shots: scene.shots.map((shot, i) =>
          i === 0
            ? {
                ...shot,
                name: 'Champ',
                color: '#2f6fd6',
                duration: 3.5,
                shotSize: 'Gros plan',
                cameraMovement: 'Fixe',
                cameraAngle: 'Plongée',
                sound: 'Pluie',
                music: 'Thème',
                description: 'Marie lève les yeux.'
              }
            : shot
        )
      },
      ...decoupage.scenes.slice(1)
    ]
  }
}

describe('dupliquer un plan', () => {
  it('au milieu : numéro intermédiaire, contenu identique juste après', () => {
    const start = withDetails(makeDecoupage({ '10': ['10', '20'] }))
    const after = expectOk(duplicateItems(start, ['S10-P10'], counterIds()))
    expect(shotNumbers(after)).toEqual(['P_0010', 'P_0015', 'P_0020'])
    const [original, copy] = after.scenes[0].shots
    expect(copy).toEqual({ ...original, id: 'id-1', number: 15 })
  })

  it('en fin de scène', () => {
    const start = makeDecoupage({ '10': ['10', '20'] })
    const result = duplicateItems(start, ['S10-P20'], counterIds())
    expect(shotNumbers(expectOk(result))).toEqual(['P_0010', 'P_0020', 'P_0030'])
    expect(result.ok && result.createdIds).toEqual(['id-1'])
  })

  it('plus de numéro libre : renumérotation demandée, puis faite avec accord', () => {
    const start = makeDecoupage({ '10': ['10', '11'] })
    expect(duplicateItems(start, ['S10-P10'], counterIds())).toEqual({
      ok: false,
      problem: 'needs-renumber'
    })
    const after = expectOk(duplicateItems(start, ['S10-P10'], counterIds(), { renumber: true }))
    expect(shotNumbers(after)).toEqual(['P_0010', 'P_0020', 'P_0030'])
    expect(after.scenes[0].shots.map((shot) => shot.id)).toEqual(['S10-P10', 'id-1', 'S10-P11'])
  })

  it('numéros verrouillés : la copie reçoit une lettre', () => {
    const start = makeDecoupage({ '10': ['10', '11'] }, true)
    const after = expectOk(duplicateItems(start, ['S10-P10'], counterIds()))
    expect(shotNumbers(after)).toEqual(['P_0010', 'P_0010A', 'P_0011'])
  })

  it('verrouillés et plus aucune lettre : refus', () => {
    const start = makeDecoupage({ '10': ['10', '10Z', '11'] }, true)
    expect(duplicateItems(start, ['S10-P10Z'], counterIds())).toEqual({
      ok: false,
      problem: 'no-room'
    })
  })
})

describe('dupliquer plusieurs plans', () => {
  it('d’une même scène : copies ensemble, dans l’ordre, après le dernier sélectionné', () => {
    const start = makeDecoupage({ '10': ['10', '20', '30', '40'] })
    const result = duplicateItems(start, ['S10-P30', 'S10-P10'], counterIds())
    const after = expectOk(result)
    expect(shotNumbers(after)).toEqual(['P_0010', 'P_0020', 'P_0030', 'P_0033', 'P_0036', 'P_0040'])
    expect(after.scenes[0].shots.map((shot) => shot.id)).toEqual([
      'S10-P10',
      'S10-P20',
      'S10-P30',
      'id-1',
      'id-2',
      'S10-P40'
    ])
    expect(result.ok && result.createdIds).toEqual(['id-1', 'id-2'])
  })

  it('de scènes différentes : chaque scène reçoit ses copies', () => {
    const start = makeDecoupage({ '10': ['10', '20'], '20': ['10'] })
    const after = expectOk(duplicateItems(start, ['S20-P10', 'S10-P10'], counterIds()))
    expect(shotNumbers(after, 0)).toEqual(['P_0010', 'P_0015', 'P_0020'])
    expect(shotNumbers(after, 1)).toEqual(['P_0010', 'P_0020'])
  })
})

describe('dupliquer une scène', () => {
  it('copie ses plans avec de nouveaux identifiants et les mêmes numéros', () => {
    const start = withDetails(makeDecoupage({ '10': ['10', '20', '20A'], '20': ['10'] }))
    const after = expectOk(duplicateItems(start, ['S10'], counterIds()))
    // Numéro qui suit (S_0011), pas le milieu : on peut faire neuf copies avant de manquer de place.
    expect(sceneNumbers(after)).toEqual(['S_0010', 'S_0011', 'S_0020'])
    const [original, copy] = after.scenes
    expect(shotNumbers(after, 1)).toEqual(['P_0010', 'P_0020', 'P_0020A'])
    expect(copy.shots.map((shot) => shot.id)).toEqual(['id-2', 'id-3', 'id-4'])
    expect({ ...copy, id: original.id, number: original.number }).toEqual({
      ...original,
      shots: original.shots.map((shot, i) => ({ ...shot, id: copy.shots[i].id }))
    })
  })

  it('plusieurs scènes : copies après la dernière sélectionnée', () => {
    const start = makeDecoupage({ '10': ['10'], '20': ['10'], '30': ['10'] })
    const after = expectOk(duplicateItems(start, ['S10', 'S20'], counterIds()))
    expect(sceneNumbers(after)).toEqual(['S_0010', 'S_0020', 'S_0021', 'S_0022', 'S_0030'])
  })

  it('une scène et un de ses plans : le plan n’est copié qu’avec sa scène', () => {
    const start = makeDecoupage({ '10': ['10', '20'] })
    const result = duplicateItems(start, ['S10', 'S10-P10'], counterIds())
    const after = expectOk(result)
    expect(shotNumbers(after, 0)).toEqual(['P_0010', 'P_0020'])
    expect(sceneNumbers(after)).toEqual(['S_0010', 'S_0011'])
    expect(result.ok && result.createdIds).toEqual(['id-1'])
  })
})

describe('dupliquer plusieurs fois la même scène (Cmd + D répété)', () => {
  /** Duplique `times` fois, en sélectionnant à chaque fois l'original ou la dernière copie. */
  function repeat(start: Decoupage, times: number, select: 'original' | 'copy'): EditResult[] {
    const copiedFrom = new Map<string, string>()
    const ids = counterIds('c')
    let decoupage = start
    let selected = 'S20'
    const results: EditResult[] = []
    for (let i = 0; i < times; i++) {
      const result = duplicateItems(decoupage, [selected], ids, { copiedFrom })
      results.push(result)
      if (!result.ok) continue
      decoupage = result.decoupage
      Object.entries(result.copiedFrom ?? {}).forEach(([copy, from]) => copiedFrom.set(copy, from))
      if (select === 'copy') selected = result.createdIds[0]
    }
    return results
  }

  const lastNumbers = (results: EditResult[]): string[] => {
    const last = results.filter((result) => result.ok).pop()
    return last?.ok ? sceneNumbers(last.decoupage) : []
  }

  it.each(['original', 'copy'] as const)(
    'en sélectionnant %s : chaque copie après les précédentes, S_0021 à S_0029, puis plus de place',
    (select) => {
      const start = makeDecoupage({ '10': ['10'], '20': ['10'], '30': ['10'] })
      const results = repeat(start, 10, select)
      expect(lastNumbers(results)).toEqual([
        'S_0010',
        'S_0020',
        ...[21, 22, 23, 24, 25, 26, 27, 28, 29].map((n) => `S_00${n}`),
        'S_0030'
      ])
      // La dixième : plus de numéro libre, l'interface propose de renuméroter.
      expect(results[9]).toEqual({ ok: false, problem: 'needs-renumber' })
    }
  )

  it('numéros verrouillés : lettres qui se suivent après la dernière copie', () => {
    const start = makeDecoupage({ '10': ['10'], '20': ['10'], '21': ['10'] }, true)
    const results = repeat(start, 3, 'original')
    expect(lastNumbers(results)).toEqual([
      'S_0010',
      'S_0020',
      'S_0020A',
      'S_0020B',
      'S_0020C',
      'S_0021'
    ])
  })

  it('renvoie l’origine de chaque copie ; copier une copie revient à copier l’original', () => {
    const start = makeDecoupage({ '10': ['10'], '20': ['10'] })
    const [first, second] = repeat(start, 2, 'copy')
    expect(first.ok && first.copiedFrom).toEqual({ 'c-1': 'S20' })
    expect(second.ok && second.copiedFrom).toEqual({ 'c-3': 'S20' })
  })
})

describe('identifiants et original', () => {
  it('identifiants des copies tous nouveaux et uniques ; original intact', () => {
    const start = makeDecoupage({ '10': ['10', '20'], '20': ['10', '20'] })
    const frozen = structuredClone(start)
    const ids = counterIds()
    const after = expectOk(duplicateItems(start, ['S10', 'S20-P20', 'S20-P10'], ids))
    const all = allIds(after)
    expect(new Set(all).size).toBe(all.length)
    expect(all.filter((id) => !allIds(start).includes(id)).sort()).toEqual([...ids.issued].sort())
    expect(start).toEqual(frozen)
  })

  it('rien de connu à dupliquer : refus', () => {
    const start = makeDecoupage({ '10': ['10'] })
    expect(duplicateItems(start, ['inconnu'], counterIds())).toEqual({
      ok: false,
      problem: 'not-found'
    })
  })
})

describe('annulation', () => {
  it('une duplication de plusieurs éléments s’annule et se rétablit en une étape', () => {
    const start = makeDecoupage({ '10': ['10', '20'], '20': ['10'] })
    const after = expectOk(duplicateItems(start, ['S10-P10', 'S10-P20', 'S20'], counterIds()))
    const history = commit(createHistory(start), after, { label: 'duplicate' })
    expect(undoLabel(history)).toBe('duplicate')
    const undone = undo(history)
    expect(undone.present).toBe(start)
    expect(redo(undone).present).toBe(after)
  })
})
