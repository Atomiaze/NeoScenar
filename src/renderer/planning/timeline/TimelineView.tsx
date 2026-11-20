import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  clampPixelsPerDay,
  dayLabels,
  dayNumber,
  dayToX,
  dayUnderPointer,
  initialScrollLeft,
  monthSegments,
  rangeDays,
  scrollLeftForAnchor,
  timelineRange,
  timelineTicks,
  wheelZoomFactor,
  yearSegments,
  type DayRange,
  type Segment,
  type TimelineZoom
} from '../../../shared/planning/timeline'
import type { Planning, Task } from '../../../shared/planning/types'
import { fr } from '../../i18n/fr'
import { setCustomZoom } from '../planningStore'
import { TimelineRow, DAY_ROW_H, HEADER_H, LABEL_W, SEGMENT_ROW_H } from './TimelineRow'
import { ShootingTimelineRow } from './ShootingTimelineRow'
import { readShooting } from '../../../shared/planning/shootingData'
import { shootingRowAfter } from '../../../shared/planning/shootingLayout'

const t = fr.planning

/** Largeur de l'étiquette « Aujourd'hui » (fond opaque, elle recouvre la graduation des jours). */
const TODAY_BADGE_W = 72

interface TimelineViewProps {
  planning: Planning
  /** Tâches à montrer par phase (déjà filtrées). */
  tasksByPhase: Map<string, Task[]>
  zoom: TimelineZoom
  pixelsPerDay: number
  today: string
}

/**
 * Ligne du temps : une rangée par phase, graduation, trait « Aujourd'hui ». L'étendue ne rétrécit
 * jamais pendant qu'on travaille (sinon les barres bougeraient sous la souris) : elle ne fait que
 * s'agrandir, le défilement compensant un agrandissement à gauche.
 *
 * Gestes de vue (ils ne modifient jamais une tâche) : molette ou pincement = zoom centré sur le
 * pointeur ; Maj + molette et glisser à deux doigts (horizontal) = défilement ; clic molette
 * glissé = déplacement dans les deux sens, comme dans Blender.
 */
export function TimelineView({
  planning,
  tasksByPhase,
  zoom,
  pixelsPerDay,
  today
}: TimelineViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [viewWidth, setViewWidth] = useState(900)
  const [panning, setPanning] = useState(false)

  // Étendue : calculée sur toutes les dates du planning (pas seulement celles des filtres).
  // Elle repart de zéro quand l'échelle change, et ne fait que grandir ensuite.
  const scaleKey = `${zoom}:${pixelsPerDay}`
  const [kept, setKept] = useState<{ key: string; range: DayRange } | null>(null)
  const previousStart = useRef<number | null>(null)
  const shootingDays = readShooting(planning).jours
  const dates = useMemo(
    () => [
      ...planning.taches.flatMap((task) =>
        [task.debut, task.echeance].filter((date): date is string => date !== null)
      ),
      ...shootingDays.flatMap((day) => (day.date === null ? [] : [day.date]))
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [planning.taches, planning.tournage]
  )
  const wanted = timelineRange(zoom, dates, today, viewWidth, pixelsPerDay)
  const range: DayRange =
    kept?.key === scaleKey
      ? {
          start: Math.min(kept.range.start, wanted.start),
          end: Math.max(kept.range.end, wanted.end)
        }
      : wanted
  if (kept?.key !== scaleKey || kept.range.start !== range.start || kept.range.end !== range.end)
    setKept({ key: scaleKey, range })

  // Valeurs courantes pour les gestes (molette) qui arrivent entre deux affichages.
  const latest = useRef({ range, pixelsPerDay })
  // Jour à garder sous le pointeur au prochain changement d'échelle (zoom à la molette).
  const anchor = useRef<{ day: number; pointerX: number } | null>(null)
  useLayoutEffect(() => {
    latest.current = { range, pixelsPerDay }
  })

  // Étendue agrandie à gauche : le contenu visible ne doit pas glisser.
  useLayoutEffect(() => {
    const element = scrollRef.current
    if (element && previousStart.current !== null && previousStart.current !== range.start)
      element.scrollLeft += (previousStart.current - range.start) * pixelsPerDay
    previousStart.current = range.start
  })

  // Changement d'échelle : zoom libre = le jour sous le pointeur ne bouge pas ; préréglage (et
  // ouverture) = « Aujourd'hui » au quart de la largeur.
  useLayoutEffect(() => {
    const element = scrollRef.current
    if (!element) return
    if (anchor.current) {
      element.scrollLeft = scrollLeftForAnchor(
        anchor.current.day,
        anchor.current.pointerX,
        range,
        pixelsPerDay,
        LABEL_W
      )
      previousStart.current = range.start
      anchor.current = null
      return
    }
    const width = Math.max(element.clientWidth - LABEL_W, 300)
    const fresh = timelineRange(zoom, dates, today, width, pixelsPerDay)
    setViewWidth(width)
    setKept({ key: scaleKey, range: fresh })
    previousStart.current = fresh.start
    element.scrollLeft = initialScrollLeft(fresh, pixelsPerDay, today, width)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scaleKey])

  // Molette : écouteur natif (un écouteur React est passif et ne peut pas retenir le défilement).
  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const onWheel = (event: WheelEvent): void => {
      const { deltaX, deltaY } = event
      // Maj + molette, ou glissé horizontal à deux doigts : défilement horizontal.
      if (!event.ctrlKey && (event.shiftKey || Math.abs(deltaX) > Math.abs(deltaY))) {
        event.preventDefault()
        element.scrollLeft += event.shiftKey ? deltaX || deltaY : deltaX
        return
      }
      // Molette seule ou pincement (Ctrl + molette) : zoom centré sur le pointeur.
      event.preventDefault()
      const pointerX = event.clientX - element.getBoundingClientRect().left
      const current = latest.current
      const next = clampPixelsPerDay(current.pixelsPerDay * wheelZoomFactor(deltaY, event.ctrlKey))
      if (next === current.pixelsPerDay) return
      const pending = anchor.current
      anchor.current = {
        day:
          pending?.day ??
          dayUnderPointer(
            element.scrollLeft,
            pointerX,
            current.range,
            current.pixelsPerDay,
            LABEL_W
          ),
        pointerX
      }
      // Plusieurs crans avant le prochain affichage : ils s'additionnent.
      latest.current = { ...current, pixelsPerDay: next }
      setCustomZoom(next)
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [])

  // Clic molette glissé : déplacement dans les deux sens.
  const pan = useRef<{ x: number; y: number; left: number; top: number } | null>(null)

  const ticks = timelineTicks(range, pixelsPerDay)
  const canvasWidth = rangeDays(range) * pixelsPerDay
  const todayX = dayToX(dayNumber(today), range, pixelsPerDay) + pixelsPerDay / 2
  // Rangée « Jours de tournage » : sous la phase « Tournage » si elle existe, sinon en bas.
  const shootingAfter = shootingRowAfter(planning.phases)
  const shootingRow = (
    <ShootingTimelineRow
      days={shootingDays}
      color={planning.phases[shootingAfter]?.couleur ?? null}
      range={range}
      pixelsPerDay={pixelsPerDay}
      ticks={ticks}
      todayX={todayX}
      canvasWidth={canvasWidth}
    />
  )
  const undated = [...tasksByPhase.values()]
    .flat()
    .filter((task) => task.debut === null && task.echeance === null).length

  return (
    <div className="timeline-wrap" data-planning="timeline">
      <p className="muted timeline-hint">{t.timelineHint}</p>
      <div
        className={`timeline${panning ? ' panning' : ''}`}
        ref={scrollRef}
        data-pixels-per-day={pixelsPerDay}
        onMouseDown={(event) => {
          // Évite le défilement automatique du clic molette.
          if (event.button === 1) event.preventDefault()
        }}
        onPointerDown={(event) => {
          if (event.button !== 1 || !scrollRef.current) return
          event.preventDefault()
          pan.current = {
            x: event.clientX,
            y: event.clientY,
            left: scrollRef.current.scrollLeft,
            top: scrollRef.current.scrollTop
          }
          event.currentTarget.setPointerCapture(event.pointerId)
          setPanning(true)
        }}
        onPointerMove={(event) => {
          if (!pan.current || !scrollRef.current) return
          scrollRef.current.scrollLeft = pan.current.left - (event.clientX - pan.current.x)
          scrollRef.current.scrollTop = pan.current.top - (event.clientY - pan.current.y)
        }}
        onPointerUp={() => {
          pan.current = null
          setPanning(false)
        }}
        onPointerCancel={() => {
          pan.current = null
          setPanning(false)
        }}
      >
        <div className="timeline-inner" style={{ width: LABEL_W + canvasWidth }}>
          <div className="timeline-header" style={{ height: HEADER_H }}>
            <div className="timeline-label timeline-corner" style={{ width: LABEL_W }} />
            <div className="timeline-head-columns" style={{ width: canvasWidth }}>
              {/* Année, mois, jour : les années et les mois restent lisibles à tout zoom. */}
              <SegmentRow
                className="timeline-years"
                segments={yearSegments(range)}
                range={range}
                pixelsPerDay={pixelsPerDay}
              />
              <SegmentRow
                className="timeline-months"
                segments={monthSegments(range)}
                range={range}
                pixelsPerDay={pixelsPerDay}
              />
              <svg width={canvasWidth} height={DAY_ROW_H} aria-hidden="true">
                {dayLabels(range, pixelsPerDay).map((tick) => {
                  const x = dayToX(tick.day, range, pixelsPerDay)
                  const everyDay = pixelsPerDay >= 22
                  // Un numéro que l'étiquette « Aujourd'hui » recouvrirait (même en partie) n'est
                  // pas dessiné : on ne laisse pas de chiffres coupés dépasser de chaque côté.
                  const center = everyDay
                    ? x + pixelsPerDay / 2
                    : x + 5 + (tick.label.length * 6) / 2
                  if (
                    Math.abs(center - todayX) <
                    TODAY_BADGE_W / 2 + (tick.label.length * 6) / 2 + 3
                  )
                    return null
                  return (
                    <g key={tick.day}>
                      <line className="timeline-major" x1={x} x2={x} y1={0} y2={DAY_ROW_H} />
                      <text
                        x={everyDay ? x + pixelsPerDay / 2 : x + 5}
                        y={14}
                        textAnchor={everyDay ? 'middle' : 'start'}
                        className="timeline-tick timeline-day"
                      >
                        {tick.label}
                      </text>
                    </g>
                  )
                })}
                <g className="timeline-today-badge" data-today>
                  <line x1={todayX} x2={todayX} y1={0} y2={DAY_ROW_H} />
                  <rect
                    x={todayX - TODAY_BADGE_W / 2}
                    y={3}
                    width={TODAY_BADGE_W}
                    height={15}
                    rx={7}
                  />
                  <text x={todayX} y={14} textAnchor="middle">
                    {t.today}
                  </text>
                </g>
              </svg>
            </div>
          </div>
          {planning.phases.map((phase, index) => (
            <Fragment key={phase.id}>
              <TimelineRow
                phase={phase}
                tasks={tasksByPhase.get(phase.id) ?? []}
                range={range}
                pixelsPerDay={pixelsPerDay}
                ticks={ticks}
                todayX={todayX}
                today={today}
                canvasWidth={canvasWidth}
              />
              {index === shootingAfter && shootingRow}
            </Fragment>
          ))}
          {shootingAfter === -1 && shootingRow}
        </div>
      </div>
      {undated > 0 && <p className="muted timeline-hint">{t.timelineNoDates(undated)}</p>}
    </div>
  )
}

/**
 * Une ligne de l'en-tête (années ou mois) : chaque segment porte son nom, qui reste collé au bord
 * gauche de la zone visible tant que le segment est à l'écran (« sticky »).
 */
function SegmentRow({
  className,
  segments,
  range,
  pixelsPerDay
}: {
  className: string
  segments: Segment[]
  range: DayRange
  pixelsPerDay: number
}) {
  return (
    <div className={`timeline-segments ${className}`} style={{ height: SEGMENT_ROW_H }}>
      {segments.map((segment) => (
        <div
          key={segment.start}
          className="timeline-segment"
          style={{
            left: dayToX(segment.start, range, pixelsPerDay),
            width: (segment.end - segment.start + 1) * pixelsPerDay
          }}
        >
          <span className="timeline-segment-label" style={{ left: LABEL_W + 4 }}>
            {segment.label}
          </span>
        </div>
      ))}
    </div>
  )
}
