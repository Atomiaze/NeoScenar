import { useRef, useState, type PointerEvent } from 'react'
import { taskState } from '../../../shared/planning/planningState'
import {
  applyDrag,
  assignLanes,
  datesFromRowDrag,
  dayToX,
  snapDelta,
  taskMark,
  xToDay,
  type DayRange,
  type DragMode,
  type DragResult,
  type Ticks
} from '../../../shared/planning/timeline'
import type { Phase, Task } from '../../../shared/planning/types'
import { fr } from '../../i18n/fr'
import { formatDate } from '../dates'
import { openNewTask, openTaskPanel, saveTaskFields } from '../planningStore'

const t = fr.planning

export const LABEL_W = 150
/** En-tête : année, mois, jour. */
export const SEGMENT_ROW_H = 18
export const DAY_ROW_H = 22
export const HEADER_H = SEGMENT_ROW_H * 2 + DAY_ROW_H
const LANE_H = 28
const ROW_PAD = 8
const MARK_H = 18
const HANDLE_W = 7
const DIAMOND = 9
/** Largeur approchée d'un caractère d'étiquette, pour ne pas poser deux étiquettes l'une sur l'autre. */
const CHAR_W = 6.6
/** Déplacement minimal (pixels) pour que ce soit un glissement et non un clic. */
const DRAG_THRESHOLD = 4

type Drag =
  | { kind: 'mark'; taskId: string; mode: DragMode; startX: number; delta: number; moved: boolean }
  | { kind: 'create'; startX: number; fromDay: number; toDay: number; moved: boolean }

interface TimelineRowProps {
  phase: Phase
  tasks: Task[]
  range: DayRange
  pixelsPerDay: number
  ticks: Ticks
  todayX: number
  today: string
  canvasWidth: number
}

function titleOf(task: Task): string {
  return task.titre.trim() === '' ? t.untitled : task.titre
}

/** Intervalle de dates en clair pour l'info-bulle. */
function describeDates(result: DragResult): string {
  if (result.debut !== null && result.echeance !== null && result.debut !== result.echeance)
    return t.dragRange(formatDate(result.debut), formatDate(result.echeance))
  return formatDate((result.echeance ?? result.debut) as string)
}

export function TimelineRow({
  phase,
  tasks,
  range,
  pixelsPerDay,
  ticks,
  todayX,
  today,
  canvasWidth
}: TimelineRowProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null)

  /** Dates d'une tâche, avec le geste en cours s'il la concerne (aperçu). */
  const datesOf = (task: Task): DragResult => {
    if (drag?.kind === 'mark' && drag.taskId === task.id) {
      return (
        applyDrag(task, drag.mode, drag.delta) ?? { debut: task.debut, echeance: task.echeance }
      )
    }
    return { debut: task.debut, echeance: task.echeance }
  }

  const items = tasks.flatMap((task) => {
    const mark = taskMark(datesOf(task))
    if (!mark) return []
    const labelDays = Math.ceil((titleOf(task).length * CHAR_W + 16) / pixelsPerDay)
    return [{ task, mark, id: task.id, start: mark.start, end: mark.end + labelDays }]
  })
  const { lanes, count } = assignLanes(items)
  const height = count * LANE_H + ROW_PAD * 2

  const pointerX = (event: PointerEvent): number =>
    event.clientX - (svgRef.current?.getBoundingClientRect().left ?? 0)

  const onPointerDown = (event: PointerEvent<SVGSVGElement>): void => {
    if (event.button !== 0) return
    const x = pointerX(event)
    const target = (event.target as Element).closest<SVGElement>('[data-mode]')
    if (target) {
      const taskId = target.dataset.taskId as string
      setDrag({
        kind: 'mark',
        taskId,
        mode: target.dataset.mode as DragMode,
        startX: x,
        delta: 0,
        moved: false
      })
    } else {
      const day = xToDay(x, range, pixelsPerDay)
      setDrag({ kind: 'create', startX: x, fromDay: day, toDay: day, moved: false })
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent<SVGSVGElement>): void => {
    if (!drag) return
    const x = pointerX(event)
    const moved = drag.moved || Math.abs(x - drag.startX) >= DRAG_THRESHOLD
    if (drag.kind === 'mark') {
      const delta = moved ? snapDelta(x - drag.startX, pixelsPerDay) : 0
      setDrag({ ...drag, delta, moved })
      const task = tasks.find((item) => item.id === drag.taskId)
      const result = task && moved ? applyDrag(task, drag.mode, delta) : null
      setTip(result ? { x: event.clientX, y: event.clientY, text: describeDates(result) } : null)
    } else {
      const toDay = xToDay(x, range, pixelsPerDay)
      setDrag({ ...drag, toDay, moved })
      setTip(
        moved
          ? {
              x: event.clientX,
              y: event.clientY,
              text: describeDates(datesFromRowDrag(drag.fromDay, toDay))
            }
          : null
      )
    }
  }

  const onPointerUp = (): void => {
    const current = drag
    setDrag(null)
    setTip(null)
    if (!current) return
    if (current.kind === 'create') {
      if (current.moved) openNewTask(phase.id, datesFromRowDrag(current.fromDay, current.toDay))
      return
    }
    const task = tasks.find((item) => item.id === current.taskId)
    if (!task) return
    if (!current.moved) {
      openTaskPanel(task.id)
      return
    }
    const result = applyDrag(task, current.mode, current.delta)
    if (result) saveTaskFields(task.id, result)
  }

  /** Double-clic : le panneau s'ouvre et le premier champ de date prend le curseur. */
  const editDates = (taskId: string): void => {
    openTaskPanel(taskId)
    requestAnimationFrame(() =>
      document.querySelector<HTMLInputElement>('.planning-dates input')?.focus()
    )
  }

  return (
    <div className="timeline-row" data-phase={phase.nom}>
      <div className="timeline-label" style={{ width: LABEL_W }}>
        <span className="planning-phase-dot" style={{ background: phase.couleur }} />
        <span className="timeline-phase-name">{phase.nom}</span>
      </div>
      <svg
        ref={svgRef}
        width={canvasWidth}
        height={height}
        className={drag?.kind === 'mark' && drag.moved ? 'dragging' : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          setDrag(null)
          setTip(null)
        }}
      >
        <title>{t.timelineEmptyRow}</title>
        <rect className="timeline-bg" x={0} y={0} width={canvasWidth} height={height} />
        {ticks.minor.map((tick) => (
          <line
            key={`m${tick.day}`}
            className="timeline-minor"
            x1={dayToX(tick.day, range, pixelsPerDay)}
            x2={dayToX(tick.day, range, pixelsPerDay)}
            y1={0}
            y2={height}
          />
        ))}
        {ticks.major.map((tick) => (
          <line
            key={`M${tick.day}`}
            className="timeline-major"
            x1={dayToX(tick.day, range, pixelsPerDay)}
            x2={dayToX(tick.day, range, pixelsPerDay)}
            y1={0}
            y2={height}
          />
        ))}
        <line className="timeline-today" x1={todayX} x2={todayX} y1={0} y2={height} />

        {drag?.kind === 'create' && drag.moved && (
          <rect
            className="timeline-create"
            x={dayToX(Math.min(drag.fromDay, drag.toDay), range, pixelsPerDay)}
            y={ROW_PAD}
            width={(Math.abs(drag.toDay - drag.fromDay) + 1) * pixelsPerDay}
            height={MARK_H}
            rx={4}
            fill={phase.couleur}
          />
        )}

        {items.map(({ task, mark }) => {
          const lane = lanes.get(task.id) ?? 0
          const top = ROW_PAD + lane * LANE_H + (LANE_H - MARK_H) / 2 - 2
          const state = taskState(task, today)
          const className = `timeline-task state-${state}${task.validee ? ' validated' : ''}`
          const title = titleOf(task)
          const x1 = dayToX(mark.start, range, pixelsPerDay)
          const x2 = dayToX(mark.end + 1, range, pixelsPerDay)
          const mid = top + MARK_H / 2
          const cx = x1 + pixelsPerDay / 2
          const labelX = (mark.kind === 'diamond' ? cx + DIAMOND : x2) + 6
          const range_ = datesOf(task)
          return (
            <g
              key={task.id}
              className={className}
              data-task={title}
              data-kind={mark.kind}
              data-state={state}
              onDoubleClick={() => editDates(task.id)}
            >
              {mark.kind === 'bar' ? (
                <>
                  <rect
                    className="timeline-mark"
                    x={x1}
                    y={top}
                    width={Math.max(x2 - x1, 6)}
                    height={MARK_H}
                    rx={4}
                    fill={phase.couleur}
                    data-mode="move"
                    data-task-id={task.id}
                  />
                  <rect
                    className="timeline-handle"
                    x={x1}
                    y={top}
                    width={HANDLE_W}
                    height={MARK_H}
                    data-mode="resize-start"
                    data-task-id={task.id}
                  >
                    <title>{t.timelineResizeStart}</title>
                  </rect>
                  <rect
                    className="timeline-handle"
                    x={Math.max(x2, x1 + 6) - HANDLE_W}
                    y={top}
                    width={HANDLE_W}
                    height={MARK_H}
                    data-mode="resize-end"
                    data-task-id={task.id}
                  >
                    <title>{t.timelineResizeEnd}</title>
                  </rect>
                </>
              ) : (
                <>
                  <polygon
                    className="timeline-mark"
                    points={`${cx},${mid - DIAMOND} ${cx + DIAMOND},${mid} ${cx},${mid + DIAMOND} ${cx - DIAMOND},${mid}`}
                    fill={phase.couleur}
                    data-mode="move"
                    data-task-id={task.id}
                  />
                  <rect
                    className="timeline-handle diamond-handle"
                    x={cx - DIAMOND - HANDLE_W - 1}
                    y={mid - 7}
                    width={HANDLE_W + 2}
                    height={14}
                    rx={3}
                    data-mode="diamond-to-bar"
                    data-task-id={task.id}
                  >
                    <title>{t.timelineAddStart}</title>
                  </rect>
                </>
              )}
              <text
                className="timeline-title"
                x={labelX}
                y={mid + 4}
                data-dates={describeDates(range_)}
              >
                {task.validee && <tspan className="timeline-check">✓ </tspan>}
                {title}
              </text>
            </g>
          )
        })}
      </svg>
      {tip && (
        <div className="timeline-tip" style={{ left: tip.x + 12, top: tip.y - 30 }} role="status">
          {tip.text}
        </div>
      )}
    </div>
  )
}
