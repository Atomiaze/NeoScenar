import { useRef, useState, type PointerEvent } from 'react'
import type { ShootingDay } from '../../../shared/planning/shootingTypes'
import {
  assignLanes,
  dayNumber,
  dayToX,
  isoFromDay,
  snapDelta,
  type DayRange,
  type Ticks
} from '../../../shared/planning/timeline'
import { fr } from '../../i18n/fr'
import { formatDate } from '../dates'
import { saveShootingDay, showShootingDay } from '../shootingStore'
import { LABEL_W } from './TimelineRow'

const t = fr.shooting

const LANE_H = 28
const ROW_PAD = 8
const MARK_H = 18
const CHAR_W = 6.6
const DRAG_THRESHOLD = 4

interface ShootingTimelineRowProps {
  days: readonly ShootingDay[]
  /** Couleur de la phase « Tournage » si elle existe (sinon la couleur d'accent du thème). */
  color: string | null
  range: DayRange
  pixelsPerDay: number
  ticks: Ticks
  todayX: number
  canvasWidth: number
}

interface Drag {
  dayId: string
  startX: number
  delta: number
  moved: boolean
}

function labelOf(day: ShootingDay): string {
  return day.titre !== '' ? day.titre : t.ganttDayScenes(day.scenes.length)
}

/**
 * Rangée « Jours de tournage » de la ligne du temps (décidé le 20 nov. : toujours une rangée à part,
 * sous la phase « Tournage » si elle existe). Glisser un jour change sa date (une étape d'annulation) ;
 * un clic l'ouvre dans la vue Tournage. Les jours sans date n'y figurent pas.
 */
export function ShootingTimelineRow({
  days,
  color,
  range,
  pixelsPerDay,
  ticks,
  todayX,
  canvasWidth
}: ShootingTimelineRowProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null)

  const dayOf = (day: ShootingDay): number =>
    dayNumber(day.date as string) + (drag?.dayId === day.id ? drag.delta : 0)

  const items = days
    .filter((day) => day.date !== null)
    .map((day) => {
      const start = dayOf(day)
      const labelDays = Math.ceil((labelOf(day).length * CHAR_W + 14) / pixelsPerDay)
      return { day, id: day.id, start, end: start + labelDays }
    })
  const { lanes, count } = assignLanes(items)
  const height = count * LANE_H + ROW_PAD * 2

  const pointerX = (event: PointerEvent): number =>
    event.clientX - (svgRef.current?.getBoundingClientRect().left ?? 0)

  const onPointerDown = (event: PointerEvent<SVGSVGElement>): void => {
    if (event.button !== 0) return
    const target = (event.target as Element).closest<SVGElement>('[data-shooting-day-id]')
    if (!target) return
    setDrag({
      dayId: target.dataset.shootingDayId as string,
      startX: pointerX(event),
      delta: 0,
      moved: false
    })
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent<SVGSVGElement>): void => {
    if (!drag) return
    const x = pointerX(event)
    const moved = drag.moved || Math.abs(x - drag.startX) >= DRAG_THRESHOLD
    const delta = moved ? snapDelta(x - drag.startX, pixelsPerDay) : 0
    setDrag({ ...drag, delta, moved })
    const day = days.find((item) => item.id === drag.dayId)
    setTip(
      moved && day?.date
        ? {
            x: event.clientX,
            y: event.clientY,
            text: formatDate(isoFromDay(dayNumber(day.date) + delta))
          }
        : null
    )
  }

  const onPointerUp = (): void => {
    const current = drag
    setDrag(null)
    setTip(null)
    if (!current) return
    const day = days.find((item) => item.id === current.dayId)
    if (!day?.date) return
    if (!current.moved) {
      showShootingDay(day.id)
      return
    }
    if (current.delta !== 0)
      saveShootingDay(day.id, { date: isoFromDay(dayNumber(day.date) + current.delta) })
  }

  return (
    <div className="timeline-row timeline-shooting-row" data-shooting-row>
      <div className="timeline-label" style={{ width: LABEL_W }}>
        <span
          className="planning-phase-dot shooting-dot"
          style={color ? { background: color } : undefined}
        />
        <span className="timeline-phase-name">{t.ganttRow}</span>
      </div>
      <svg
        ref={svgRef}
        width={canvasWidth}
        height={height}
        className={drag?.moved ? 'dragging' : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          setDrag(null)
          setTip(null)
        }}
      >
        <title>{t.ganttHint}</title>
        <rect className="timeline-shooting-bg" x={0} y={0} width={canvasWidth} height={height} />
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

        {items.map(({ day, start }) => {
          const lane = lanes.get(day.id) ?? 0
          const top = ROW_PAD + lane * LANE_H + (LANE_H - MARK_H) / 2 - 2
          const x = dayToX(start, range, pixelsPerDay)
          const width = Math.max(pixelsPerDay, 8)
          // Très petit zoom : le carré reste visible et centré sur son jour.
          const left = x + pixelsPerDay / 2 - width / 2
          return (
            <g
              key={day.id}
              className="timeline-shooting-day"
              data-gantt-day={day.date ?? ''}
              data-label={labelOf(day)}
            >
              <rect
                className="timeline-mark timeline-shooting-mark"
                x={left}
                y={top}
                width={width}
                height={MARK_H}
                rx={3}
                style={color ? { fill: color } : undefined}
                data-shooting-day-id={day.id}
              >
                <title>
                  {formatDate(day.date as string)} — {labelOf(day)}
                </title>
              </rect>
              <text className="timeline-title" x={left + width + 6} y={top + MARK_H / 2 + 4}>
                {labelOf(day)}
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
