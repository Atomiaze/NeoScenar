import { phaseTaskCount } from '../../shared/planning/planningEdit'
import { Dialog } from '../components/Dialog'
import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'
import { deletePhase, deleteTask, openDialog, planningStore } from './planningStore'
import { readShooting } from '../../shared/planning/shootingData'
import { sortedDays } from '../../shared/planning/shootingView'
import { formatDate } from './dates'
import { deleteShootingDay } from './shootingStore'

const t = fr.planning

/** Confirmations de suppression (tâche, phase qui contient des tâches). */
export function PlanningDialogs() {
  const dialog = useStore(planningStore, (state) => state.dialog)
  const planning = useStore(planningStore, (state) => state.planning)
  if (!dialog || !planning) return null
  const close = (): void => openDialog(null)

  if (dialog.kind === 'deleteTask') {
    const task = planning.taches.find((item) => item.id === dialog.taskId)
    if (!task) return null
    return (
      <Dialog
        title={t.deleteTaskTitle}
        role="alertdialog"
        onClose={close}
        actions={
          <>
            <button onClick={close}>{t.cancel}</button>
            <button className="danger" autoFocus onClick={() => deleteTask(task.id)}>
              {t.delete}
            </button>
          </>
        }
      >
        <p>{t.deleteTaskText(task.titre.trim() === '' ? t.untitled : task.titre)}</p>
      </Dialog>
    )
  }

  if (dialog.kind === 'deleteShootingDay') {
    const days = sortedDays(readShooting(planning).jours)
    const index = days.findIndex((item) => item.id === dialog.dayId)
    const day = days[index]
    if (!day) return null
    const name =
      day.titre !== ''
        ? day.titre
        : day.date
          ? formatDate(day.date)
          : fr.shooting.dayDefaultName(index + 1)
    return (
      <Dialog
        title={fr.shooting.deleteDayTitle}
        role="alertdialog"
        onClose={close}
        actions={
          <>
            <button onClick={close}>{t.cancel}</button>
            <button className="danger" autoFocus onClick={() => deleteShootingDay(day.id)}>
              {t.delete}
            </button>
          </>
        }
      >
        <p>{fr.shooting.deleteDayText(name, day.scenes.length)}</p>
      </Dialog>
    )
  }

  const phase = planning.phases.find((item) => item.id === dialog.phaseId)
  if (!phase) return null
  return (
    <Dialog
      title={t.deletePhaseTitle}
      role="alertdialog"
      onClose={close}
      actions={
        <>
          <button onClick={close}>{t.cancel}</button>
          <button className="danger" autoFocus onClick={() => deletePhase(phase.id)}>
            {t.delete}
          </button>
        </>
      }
    >
      <p>{t.deletePhaseText(phase.nom, phaseTaskCount(planning, phase.id))}</p>
    </Dialog>
  )
}
