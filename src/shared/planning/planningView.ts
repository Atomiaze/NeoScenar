// Ce que la liste affiche : filtres par personne et tâches faites, et historique d'annulation du
// module. Fonctions pures, testées sans interface.

import { personKey } from './crew'
import { sortTasks } from './planningState'
import type { Planning, Task } from './types'

export type ValidatedFilter = 'all' | 'hide' | 'only'

export interface TaskFilter {
  /** Nom d'une personne du générique, ou null pour tout le monde. */
  person: string | null
  hideDone: boolean
  /** Toutes les tâches, sans les validées, ou seulement les validées. */
  validated: ValidatedFilter
}

export const NO_FILTER: TaskFilter = { person: null, hideDone: false, validated: 'all' }

/** Tâches d'une phase à afficher : filtrées, puis triées par échéance. */
export function visibleTasks(planning: Planning, phaseId: string, filter: TaskFilter): Task[] {
  const key = filter.person === null ? null : personKey(filter.person)
  const kept = planning.taches.filter(
    (task) =>
      task.phase === phaseId &&
      !(filter.hideDone && task.faite) &&
      !(filter.validated === 'hide' && task.validee) &&
      !(filter.validated === 'only' && !task.validee) &&
      (key === null || task.personnes.some((name) => personKey(name) === key))
  )
  return sortTasks(kept)
}

/**
 * Noms proposés dans « Tâches de : » : l'équipe du générique, puis les noms encore portés par des
 * tâches mais disparus du générique (sans quoi ces tâches ne seraient plus retrouvables).
 */
export function filterablePeople(planning: Planning, crew: readonly { nom: string }[]): string[] {
  const seen = new Set<string>()
  const names: string[] = []
  const add = (nom: string): void => {
    const key = personKey(nom)
    if (key === '' || seen.has(key)) return
    seen.add(key)
    names.push(nom)
  }
  crew.forEach((member) => add(member.nom))
  planning.taches.forEach((task) => task.personnes.forEach(add))
  return names
}

// ---------------------------------------------------------------------------------------------
// Historique d'annulation

/** Nombre maximal d'états gardés pour annuler. */
export const MAX_PLANNING_HISTORY = 100

export interface PlanningHistory {
  past: Planning[]
  future: Planning[]
}

export const EMPTY_HISTORY: PlanningHistory = { past: [], future: [] }

/** Après une modification : l'état d'avant est gardé, ce qui était à rétablir est perdu. */
export function recordChange(history: PlanningHistory, before: Planning): PlanningHistory {
  return { past: [...history.past, before].slice(-MAX_PLANNING_HISTORY), future: [] }
}

export function canUndo(history: PlanningHistory): boolean {
  return history.past.length > 0
}

export function canRedo(history: PlanningHistory): boolean {
  return history.future.length > 0
}

export function undoStep(
  history: PlanningHistory,
  present: Planning
): { history: PlanningHistory; planning: Planning } | null {
  const previous = history.past[history.past.length - 1]
  if (!previous) return null
  return {
    planning: previous,
    history: { past: history.past.slice(0, -1), future: [present, ...history.future] }
  }
}

export function redoStep(
  history: PlanningHistory,
  present: Planning
): { history: PlanningHistory; planning: Planning } | null {
  const next = history.future[0]
  if (!next) return null
  return {
    planning: next,
    history: {
      past: [...history.past, present].slice(-MAX_PLANNING_HISTORY),
      future: history.future.slice(1)
    }
  }
}

/** Date du jour au format AAAA-MM-JJ, à l'heure de l'ordinateur (pas en UTC). */
export function localIsoDate(now: Date): string {
  const two = (value: number): string => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`
}

/** Tâche créée par « Nouvelle tâche » et restée telle quelle : rien n'a été rempli. */
export function isUntouchedTask(task: Task, untitled: string): boolean {
  return (
    task.titre === untitled &&
    task.debut === null &&
    task.echeance === null &&
    !task.faite &&
    !task.validee &&
    task.personnes.length === 0 &&
    task.note === ''
  )
}
