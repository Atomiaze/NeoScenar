// États calculés du planning : purs, la date du jour est toujours passée en paramètre (AAAA-MM-JJ)
// pour que les tests ne dépendent pas de l'horloge.

import type { PhaseProgress, Planning, Task, TaskState } from './types'

/** À faire, en retard (échéance passée et non faite) ou faite. Une tâche sans échéance n'est jamais en retard. */
export function taskState(task: Task, today: string): TaskState {
  if (task.faite || task.validee) return 'faite'
  return task.echeance !== null && task.echeance < today ? 'en-retard' : 'a-faire'
}

export function phaseProgress(planning: Planning, phaseId: string, today: string): PhaseProgress {
  const tasks = planning.taches.filter((task) => task.phase === phaseId)
  const done = tasks.filter((task) => task.faite || task.validee).length
  const late = tasks.filter((task) => taskState(task, today) === 'en-retard').length
  return {
    total: tasks.length,
    done,
    late,
    ratio: tasks.length === 0 ? 0 : done / tasks.length
  }
}

/** Tri d'affichage : par échéance (les tâches sans échéance à la fin), puis par début, puis par titre. */
export function sortTasks(tasks: readonly Task[]): Task[] {
  const key = (date: string | null): string => date ?? '9999-99-99'
  return [...tasks].sort(
    (a, b) =>
      key(a.echeance).localeCompare(key(b.echeance)) ||
      key(a.debut).localeCompare(key(b.debut)) ||
      a.titre.localeCompare(b.titre, 'fr')
  )
}
