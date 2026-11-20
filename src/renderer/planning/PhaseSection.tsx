import { useState } from 'react'
import { phaseProgress } from '../../shared/planning/planningState'
import type { CrewMember, Phase, Planning, Task } from '../../shared/planning/types'
import { Icon } from '../components/Icon'
import { fr } from '../i18n/fr'
import { TaskRow } from './TaskRow'
import {
  deletePhase,
  moveTaskToPhase,
  openDialog,
  openNewTask,
  renamePlanningPhase,
  toggleCollapsed
} from './planningStore'

const t = fr.planning

/** Type du glisser-déposer d'une tâche. */
export const TASK_DRAG_TYPE = 'application/x-neoscenar-task'

interface PhaseSectionProps {
  phase: Phase
  planning: Planning
  /** Tâches à montrer (déjà filtrées et triées). */
  tasks: Task[]
  filtered: boolean
  planningEmpty: boolean
  collapsed: boolean
  today: string
  crew: readonly CrewMember[]
}

export function PhaseSection({
  phase,
  planning,
  tasks,
  filtered,
  planningEmpty,
  collapsed,
  today,
  crew
}: PhaseSectionProps) {
  const [renaming, setRenaming] = useState(false)
  const [dropTarget, setDropTarget] = useState(false)
  const progress = phaseProgress(planning, phase.id, today)

  const finishRename = (value: string, confirm: boolean): void => {
    setRenaming(false)
    if (confirm && value.trim() !== '' && value.trim() !== phase.nom)
      renamePlanningPhase(phase.id, value)
  }

  const askRemove = (): void => {
    // Sans tâche, rien n'est perdu : la phase est retirée sans question (Cmd + Z la ramène).
    if (progress.total === 0) deletePhase(phase.id)
    else openDialog({ kind: 'deletePhase', phaseId: phase.id })
  }

  return (
    <section
      className={`planning-phase${dropTarget ? ' drop-target' : ''}`}
      data-phase={phase.nom}
      aria-label={phase.nom}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(TASK_DRAG_TYPE)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        setDropTarget(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(false)
      }}
      onDrop={(event) => {
        setDropTarget(false)
        const id = event.dataTransfer.getData(TASK_DRAG_TYPE)
        if (id) {
          event.preventDefault()
          moveTaskToPhase(id, phase.id)
        }
      }}
    >
      <header className="planning-phase-header">
        <button
          className="icon-button"
          aria-label={collapsed ? t.expand(phase.nom) : t.collapse(phase.nom)}
          aria-expanded={!collapsed}
          onClick={() => toggleCollapsed(phase.id)}
        >
          <Icon name={collapsed ? 'chevronRight' : 'chevronDown'} size={16} />
        </button>
        <span
          className="planning-phase-dot"
          style={{ background: phase.couleur }}
          aria-hidden="true"
        />
        {renaming ? (
          <input
            className="planning-phase-input"
            type="text"
            autoFocus
            aria-label={t.phaseName}
            defaultValue={phase.nom}
            onBlur={(event) => finishRename(event.target.value, true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') finishRename(event.currentTarget.value, true)
              else if (event.key === 'Escape') finishRename(event.currentTarget.value, false)
            }}
          />
        ) : (
          <h2
            className="planning-phase-name"
            onDoubleClick={() => setRenaming(true)}
            title={t.renamePhase}
          >
            {phase.nom}
          </h2>
        )}
        <span className="planning-progress" data-progress={phase.nom}>
          <span className="planning-bar" aria-hidden="true">
            <span
              style={{ width: `${Math.round(progress.ratio * 100)}%`, background: phase.couleur }}
            />
          </span>
          <span className="muted">{t.progress(progress.done, progress.total)}</span>
          {progress.late > 0 && (
            <span className="planning-late-count">{t.lateCount(progress.late)}</span>
          )}
        </span>
        <span className="planning-phase-actions">
          <button
            className="icon-button"
            title={t.newTaskIn(phase.nom)}
            aria-label={t.newTaskIn(phase.nom)}
            onClick={() => openNewTask(phase.id)}
          >
            <Icon name="plus" size={16} />
          </button>
          <button
            className="icon-button"
            title={t.renamePhase}
            aria-label={t.renamePhase}
            onClick={() => setRenaming(true)}
          >
            <Icon name="brush" size={16} />
          </button>
          <button
            className="icon-button"
            title={t.removePhase}
            aria-label={t.removePhase}
            onClick={askRemove}
          >
            <Icon name="eraser" size={16} />
          </button>
        </span>
      </header>
      {!collapsed && (
        <ul className="planning-tasks">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} today={today} crew={crew} />
          ))}
          {tasks.length === 0 && !planningEmpty && (
            <li className="planning-phase-empty muted">
              {filtered && progress.total > 0 ? t.phaseAllHidden : t.phaseEmpty}
            </li>
          )}
        </ul>
      )}
    </section>
  )
}
