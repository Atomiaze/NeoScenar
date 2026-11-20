import { useEffect, useMemo, useState } from 'react'
import type { TimelineZoom } from '../../shared/planning/timeline'
import {
  filterablePeople,
  localIsoDate,
  visibleTasks,
  type ValidatedFilter
} from '../../shared/planning/planningView'
import { fr } from '../i18n/fr'
import { Icon } from '../components/Icon'
import { useStore } from '../state/createStore'
import { PhaseSection } from './PhaseSection'
import { PlanningDialogs } from './PlanningDialogs'
import { TaskPanel } from './TaskPanel'
import { TimelineView } from './timeline/TimelineView'
import { ShootingView } from './shooting/ShootingView'
import { closeScenePanel, createShootingDay, syncShootingWithCards } from './shootingStore'
import { cardsStore } from '../cards/cardsStore'
import { readShooting } from '../../shared/planning/shootingData'
import {
  closePanel,
  createPhase,
  dismissPlanningMessages,
  loadPlanning,
  openNewTask,
  planningStore,
  setFilter,
  setPlanningActive,
  setView,
  setZoom,
  undoShootingRemoval
} from './planningStore'
import { openPlanningExport } from '../planningExport/planningExportStore'
import './planning.css'

const t = fr.planning

/** Module Planification : la liste des phases et des tâches (étape 15B). */
export function PlanningModule() {
  const planning = useStore(planningStore, (state) => state.planning)
  const crew = useStore(planningStore, (state) => state.crew)
  const filter = useStore(planningStore, (state) => state.filter)
  const collapsed = useStore(planningStore, (state) => state.collapsed)
  const panel = useStore(planningStore, (state) => state.panel)
  const view = useStore(planningStore, (state) => state.view)
  const zoom = useStore(planningStore, (state) => state.zoom)
  const pixelsPerDay = useStore(planningStore, (state) => state.pixelsPerDay)
  const notice = useStore(planningStore, (state) => state.notice)
  const error = useStore(planningStore, (state) => state.error)
  const revision = useStore(planningStore, (state) => state.revision)
  const removal = useStore(planningStore, (state) => state.removal)
  const cards = useStore(cardsStore, (state) => state.history?.present.scenes ?? null)
  const [today, setToday] = useState(() => localIsoDate(new Date()))

  // Le planning et l'équipe du générique sont relus à l'ouverture et à chaque retour dans NeoScenar
  // (le fichier a pu être modifié à la main, le générique a pu changer).
  useEffect(() => {
    setPlanningActive(true)
    const refresh = (): void => {
      setToday(localIsoDate(new Date()))
      void loadPlanning()
    }
    refresh()
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      // Changer de module enregistre le champ en cours, et retire une tâche restée vide.
      closePanel()
      closeScenePanel()
      setPlanningActive(false)
    }
  }, [])

  // Plan de tournage : scènes dont la carte n'existe plus retirées, repères à jour (étape 15D-3). À
  // l'ouverture du module, quand les cartes changent et quand le planning est relu sur le disque.
  useEffect(() => {
    if (cards !== null && revision > 0) syncShootingWithCards(cards)
  }, [cards, revision])

  const people = useMemo(() => (planning ? filterablePeople(planning, crew) : []), [planning, crew])
  // Un filtre sur un nom qui n'existe plus nulle part ne doit pas cacher toutes les tâches.
  const activeFilter = useMemo(
    () =>
      filter.person !== null && !people.includes(filter.person)
        ? { ...filter, person: null }
        : filter,
    [filter, people]
  )

  if (planning === null) {
    return (
      <div className="planning-module">
        {error ? (
          <p className="banner error">{error}</p>
        ) : (
          <p className="cards-message muted">{t.loading}</p>
        )}
      </div>
    )
  }

  const noTask = planning.taches.length === 0
  const shooting = view === 'shooting'
  // La ligne du temps s'affiche dès qu'il y a une tâche ou un jour de tournage daté.
  const hasDatedDay = readShooting(planning).jours.some((day) => day.date !== null)
  const showTimeline = view === 'timeline' && (!noTask || hasDatedDay)

  return (
    <div className="planning-module">
      <div className="planning-main">
        <header className="planning-header">
          <h1>{t.title}</h1>
          <div className="planning-toolbar">
            {shooting ? (
              <button className="primary" data-new-day onClick={() => createShootingDay(today)}>
                <Icon name="plus" size={16} /> {fr.shooting.newDay}
              </button>
            ) : (
              <button
                className="primary"
                onClick={() => openNewTask()}
                disabled={planning.phases.length === 0}
              >
                <Icon name="plus" size={16} /> {t.newTask}
              </button>
            )}
            <label className="planning-filter" hidden={shooting}>
              <span>{t.filterPerson}</span>
              <select
                value={activeFilter.person ?? ''}
                onChange={(event) =>
                  setFilter({ person: event.target.value === '' ? null : event.target.value })
                }
              >
                <option value="">{t.everyone}</option>
                {people.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <button data-export-planning title={t.exportTitle} onClick={openPlanningExport}>
              {t.exportButton}
            </button>
            <div className="planning-switch" role="group" aria-label={t.viewLabel}>
              {(['list', 'timeline', 'shooting'] as const).map((choice) => (
                <button
                  key={choice}
                  className={view === choice ? 'active' : undefined}
                  aria-pressed={view === choice}
                  data-view={choice}
                  onClick={() => setView(choice)}
                >
                  {choice === 'list'
                    ? t.viewList
                    : choice === 'timeline'
                      ? t.viewTimeline
                      : fr.shooting.view}
                </button>
              ))}
            </div>
            {view === 'timeline' && (
              <label className="planning-filter">
                <span>{t.zoomLabel}</span>
                <select
                  value={zoom}
                  data-zoom
                  onChange={(event) =>
                    setZoom(event.target.value as Exclude<TimelineZoom, 'custom'>)
                  }
                >
                  <option value="week">{t.zoomWeek}</option>
                  <option value="month">{t.zoomMonth}</option>
                  <option value="year">{t.zoomYear}</option>
                  <option value="civil">{t.zoomCivil}</option>
                  {zoom === 'custom' && <option value="custom">{t.zoomCustom}</option>}
                </select>
              </label>
            )}
            <label className="planning-filter" hidden={shooting}>
              <span>{t.filterValidated}</span>
              <select
                value={filter.validated}
                data-validated-filter
                onChange={(event) =>
                  setFilter({ validated: event.target.value as ValidatedFilter })
                }
              >
                <option value="all">{t.validatedAll}</option>
                <option value="hide">{t.validatedHide}</option>
                <option value="only">{t.validatedOnly}</option>
              </select>
            </label>
            <label className="planning-hide-done" hidden={shooting}>
              <input
                type="checkbox"
                checked={filter.hideDone}
                onChange={(event) => setFilter({ hideDone: event.target.checked })}
              />
              <span>{t.hideDone}</span>
            </label>
          </div>
        </header>

        {notice && (
          <p className="banner" role="status">
            <span>{notice}</span>
            <button onClick={dismissPlanningMessages}>{t.close}</button>
          </p>
        )}
        {removal && (
          <p className="banner" role="status" data-shooting-removal>
            <span>
              {fr.shooting.removedNotice(
                removal.scenes.map((scene) =>
                  scene.mark
                    ? `${scene.mark.numero} ${scene.mark.entete}`.trim()
                    : fr.shooting.missingNoCard
                )
              )}
            </span>
            <button onClick={undoShootingRemoval}>{fr.shooting.removedUndo}</button>
            <button onClick={dismissPlanningMessages}>{t.close}</button>
          </p>
        )}
        {error && (
          <p className="banner error" role="alert">
            <span>{error}</span>
            <button onClick={dismissPlanningMessages}>{t.close}</button>
          </p>
        )}

        {shooting && <ShootingView planning={planning} />}
        {showTimeline && (
          <TimelineView
            planning={planning}
            tasksByPhase={
              new Map(
                planning.phases.map((phase) => [
                  phase.id,
                  visibleTasks(planning, phase.id, activeFilter)
                ])
              )
            }
            zoom={zoom}
            pixelsPerDay={pixelsPerDay}
            today={today}
          />
        )}
        <div className="planning-scroll" hidden={showTimeline || shooting}>
          {noTask && (
            <div className="planning-empty" data-planning="empty">
              <h2>{t.emptyTitle}</h2>
              <p className="muted">{t.emptyText}</p>
              <button
                className="primary"
                onClick={() => openNewTask()}
                disabled={planning.phases.length === 0}
              >
                {t.newTask}
              </button>
            </div>
          )}
          {planning.phases.map((phase) => (
            <PhaseSection
              key={phase.id}
              phase={phase}
              planning={planning}
              tasks={visibleTasks(planning, phase.id, activeFilter)}
              filtered={
                activeFilter.person !== null ||
                activeFilter.hideDone ||
                activeFilter.validated !== 'all'
              }
              planningEmpty={noTask}
              collapsed={collapsed.includes(phase.id)}
              today={today}
              crew={crew}
            />
          ))}
          <AddPhase onAdd={createPhase} />
        </div>
      </div>
      {panel && !shooting && <TaskPanel />}
      <PlanningDialogs />
    </div>
  )
}

function AddPhase({ onAdd }: { onAdd(name: string): void }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  if (!adding)
    return (
      <button className="planning-add-phase" onClick={() => setAdding(true)}>
        <Icon name="plus" size={16} /> {t.addPhase}
      </button>
    )
  const finish = (confirm: boolean): void => {
    if (confirm && name.trim() !== '') onAdd(name)
    setAdding(false)
    setName('')
  }
  return (
    <input
      className="planning-phase-input"
      type="text"
      autoFocus
      aria-label={t.phaseName}
      placeholder={t.newPhaseName}
      value={name}
      onChange={(event) => setName(event.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') finish(true)
        else if (event.key === 'Escape') finish(false)
      }}
    />
  )
}
