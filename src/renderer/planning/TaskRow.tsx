import { taskPeople } from '../../shared/planning/crew'
import { taskState } from '../../shared/planning/planningState'
import type { CrewMember, Task } from '../../shared/planning/types'
import { fr } from '../i18n/fr'
import { formatDate } from './dates'
import { TASK_DRAG_TYPE } from './PhaseSection'
import { openTaskPanel, toggleTaskDone } from './planningStore'

const t = fr.planning

interface TaskRowProps {
  task: Task
  today: string
  crew: readonly CrewMember[]
}

/** Une tâche de la liste : case « faite », titre, échéance, personnes, coche « validée »). */
export function TaskRow({ task, today, crew }: TaskRowProps) {
  const state = taskState(task, today)
  const title = task.titre.trim() === '' ? t.untitled : task.titre
  return (
    <li
      className={`planning-task state-${state}${task.validee ? ' validated' : ''}`}
      data-task={title}
      data-state={state}
      draggable
      title={t.dragHint}
      onDragStart={(event) => {
        event.dataTransfer.setData(TASK_DRAG_TYPE, task.id)
        event.dataTransfer.effectAllowed = 'move'
      }}
    >
      <input
        type="checkbox"
        checked={task.faite}
        aria-label={t.markDone(title)}
        onChange={() => toggleTaskDone(task.id)}
      />
      <button className="planning-task-title" onClick={() => openTaskPanel(task.id)}>
        {title}
      </button>
      {task.validee && (
        <span className="planning-validated" title={t.validated} aria-label={t.validated}>
          ✓
        </span>
      )}
      <span className="planning-people">
        {taskPeople(task.personnes, crew).map((person) => (
          <span
            key={person.nom}
            className={`planning-pill${person.auGenerique ? '' : ' gone'}`}
            title={person.auGenerique ? undefined : t.noLongerCredited}
          >
            {person.nom}
          </span>
        ))}
      </span>
      <span className="planning-due" data-due>
        {task.echeance === null ? '' : formatDate(task.echeance)}
        {state === 'en-retard' && <span className="sr-only"> — {t.late}</span>}
      </span>
    </li>
  )
}
