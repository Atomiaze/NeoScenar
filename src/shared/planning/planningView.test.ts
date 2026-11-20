import { describe, expect, it } from 'vitest'
import { addPhase, addTask, removePhase, updateTask } from './planningEdit'
import { defaultPlanning } from './planningData'
import {
  EMPTY_HISTORY,
  MAX_PLANNING_HISTORY,
  canRedo,
  canUndo,
  filterablePeople,
  isUntouchedTask,
  localIsoDate,
  recordChange,
  redoStep,
  undoStep,
  visibleTasks
} from './planningView'
import type { Planning } from './types'

let counter = 0
const ids = { newId: (): string => `id-${++counter}` }

function sample(): Planning {
  let planning = defaultPlanning(ids)
  const [writing, shooting] = planning.phases
  const add = (phase: string, fields: Parameters<typeof addTask>[2]): void => {
    const result = addTask(planning, phase, fields, ids)
    if (!result.ok) throw new Error(result.problem)
    planning = result.planning
  }
  add(writing.id, {
    titre: 'Scénario',
    echeance: '2026-12-01',
    personnes: ['Léa Martin'],
    faite: true
  })
  add(writing.id, {
    titre: 'Note d’intention',
    echeance: '2026-11-20',
    personnes: ['LÉA MARTIN', 'Omar']
  })
  add(writing.id, { titre: 'Sans date' })
  add(shooting.id, { titre: 'Repérages', echeance: '2026-11-10', personnes: ['Omar'] })
  return planning
}

describe('visibleTasks', () => {
  const planning = sample()
  const writing = planning.phases[0].id

  it('trie par échéance, sans échéance à la fin', () => {
    const titles = visibleTasks(planning, writing, {
      person: null,
      hideDone: false,
      validated: 'all'
    }).map((t) => t.titre)
    expect(titles).toEqual(['Note d’intention', 'Scénario', 'Sans date'])
  })

  it('masque les tâches faites', () => {
    const titles = visibleTasks(planning, writing, {
      person: null,
      hideDone: true,
      validated: 'all'
    }).map((t) => t.titre)
    expect(titles).toEqual(['Note d’intention', 'Sans date'])
  })

  it('filtre par personne sans tenir compte de la casse', () => {
    const titles = visibleTasks(planning, writing, {
      person: 'léa martin',
      hideDone: false,
      validated: 'all'
    }).map((t) => t.titre)
    expect(titles).toEqual(['Note d’intention', 'Scénario'])
  })

  it('ne montre que la phase demandée', () => {
    const shooting = planning.phases[1].id
    expect(
      visibleTasks(planning, shooting, { person: null, hideDone: false, validated: 'all' })
    ).toHaveLength(1)
  })
})

describe('filterablePeople', () => {
  it('ajoute les noms de tâches disparus du générique, sans doublon', () => {
    const crew = [{ nom: 'Léa Martin', rubriques: ['Montage'] }]
    expect(filterablePeople(sample(), crew)).toEqual(['Léa Martin', 'Omar'])
  })
  it('accepte un générique vide', () => {
    expect(filterablePeople(sample(), [])).toEqual(['Léa Martin', 'Omar'])
  })
})

describe('historique', () => {
  it('annule puis rétablit une suppression de phase avec ses tâches', () => {
    const before = sample()
    const writing = before.phases[0].id
    const removed = removePhase(before, writing)
    if (!removed.ok) throw new Error('échec')
    expect(removed.planning.taches).toHaveLength(1)

    const history = recordChange(EMPTY_HISTORY, before)
    expect(canUndo(history)).toBe(true)
    const undone = undoStep(history, removed.planning)
    expect(undone?.planning).toBe(before)
    expect(undone?.planning.taches).toHaveLength(4)
    expect(canRedo(undone!.history)).toBe(true)
    const redone = redoStep(undone!.history, undone!.planning)
    expect(redone?.planning).toBe(removed.planning)
  })

  it('une nouvelle modification efface ce qui était à rétablir', () => {
    const base = sample()
    const one = addPhase(base, 'Bonus', undefined, ids)
    if (!one.ok) throw new Error('échec')
    const afterUndo = undoStep(recordChange(EMPTY_HISTORY, base), one.planning)!
    expect(afterUndo.history.future).toHaveLength(1)
    expect(recordChange(afterUndo.history, base).future).toHaveLength(0)
  })

  it('rien à annuler sur un historique vide', () => {
    expect(undoStep(EMPTY_HISTORY, sample())).toBeNull()
    expect(redoStep(EMPTY_HISTORY, sample())).toBeNull()
  })

  it('garde un nombre borné d’états', () => {
    let history = EMPTY_HISTORY
    const planning = sample()
    for (let i = 0; i < MAX_PLANNING_HISTORY + 20; i++) history = recordChange(history, planning)
    expect(history.past).toHaveLength(MAX_PLANNING_HISTORY)
  })

  it('un changement de phase par glisser-déposer s’annule', () => {
    const before = sample()
    const task = before.taches[0]
    const moved = updateTask(before, task.id, { phase: before.phases[2].id })
    if (!moved.ok) throw new Error('échec')
    const undone = undoStep(recordChange(EMPTY_HISTORY, before), moved.planning)
    expect(undone?.planning.taches[0].phase).toBe(before.phases[0].id)
  })
})

describe('localIsoDate', () => {
  it('écrit la date locale avec des zéros', () => {
    expect(localIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})

describe('isUntouchedTask', () => {
  const base = sample().taches[2] // « Sans date » : titre seul
  const fresh = { ...base, titre: 'Sans titre' }
  it('reconnaît une tâche « Sans titre » restée vide', () => {
    expect(isUntouchedTask(fresh, 'Sans titre')).toBe(true)
  })
  it('une tâche qui a reçu quelque chose est gardée', () => {
    for (const change of [
      { titre: 'Repérages' },
      { echeance: '2026-12-01' },
      { debut: '2026-12-01' },
      { faite: true },
      { validee: true },
      { personnes: ['Léa'] },
      { note: 'x' }
    ])
      expect(isUntouchedTask({ ...fresh, ...change }, 'Sans titre')).toBe(false)
  })
})

describe('filtre des tâches validées', () => {
  it('toutes, sans les validées, seulement les validées', () => {
    const base = defaultPlanning({
      newId: (() => {
        let n = 0
        return () => `v-${++n}`
      })()
    })
    const phase = base.phases[0].id
    const mk = (titre: string, validee: boolean) => ({
      id: titre,
      phase,
      titre,
      debut: null,
      echeance: null,
      faite: validee,
      personnes: [],
      validee,
      note: ''
    })
    const planning = { ...base, taches: [mk('A', true), mk('B', false)] }
    const titles = (validated: 'all' | 'hide' | 'only') =>
      visibleTasks(planning, phase, { person: null, hideDone: false, validated }).map(
        (t) => t.titre
      )
    expect(titles('all')).toEqual(['A', 'B'])
    expect(titles('hide')).toEqual(['B'])
    expect(titles('only')).toEqual(['A'])
  })
})
