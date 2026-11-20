// Ligne du temps du PDF « Planning » : une bande par phase (et la rangée des jours de tournage),
// en-tête années / mois, trait « Aujourd'hui ». Les tâches qui se recouvriraient (étiquette
// comprise) passent sur une rangée de plus ; une phase qui ne tient plus continue page suivante.

import { dayNumber, monthSpans } from './dates.ts'
import { BODY, CONTENT, INK } from './geometry.ts'
import { LABELS, monthName } from './labels.ts'
import { PageStack, hline, text } from './pages.ts'
import { truncate, wrapText } from './wrap.ts'
import type { Color, Measure, PageItem, PdfTask, PlanningPdfInput } from './types.ts'

export const TIMELINE = {
  labelColumn: 128,
  yearRow: 12,
  monthRow: 14,
  lane: 14,
  bar: 7,
  diamond: 4,
  labelSize: 6.5,
  labelGap: 3,
  checkSize: 6,
  groupPadding: 4,
  nameSize: 8,
  nameLine: 10,
  legendSize: 6.5,
  /** Place réservée en bas de chaque page : étiquette « Aujourd'hui » et légende. */
  footer: 26
}

const PLOT_LEFT = CONTENT.left + TIMELINE.labelColumn
const PLOT_RIGHT = CONTENT.right

interface Scale {
  start: number
  end: number
  perDay: number
  x: (day: number) => number
}

function scaleOf(input: PlanningPdfInput): Scale {
  const start = dayNumber(input.range.start)
  const end = Math.max(start, dayNumber(input.range.end))
  const perDay = (PLOT_RIGHT - PLOT_LEFT) / (end - start + 1)
  return { start, end, perDay, x: (day) => PLOT_LEFT + (day - start) * perDay }
}

/** Couleur mélangée au blanc (tâche faite : pâle). */
export function lighten(color: Color, amount: number): Color {
  const match = /^#?([0-9a-f]{6})$/i.exec(color)
  if (!match) return color
  const value = parseInt(match[1], 16)
  const channel = (shift: number): string => {
    const c = (value >> shift) & 0xff
    return Math.round(c + (255 - c) * amount)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${channel(16)}${channel(8)}${channel(0)}`
}

// ---------------------------------------------------------------------------------------------
// Marques

interface Mark {
  /** Ce que la marque occupe sur sa rangée, étiquette comprise. */
  from: number
  to: number
  draw: (centerY: number) => PageItem[]
}

function taskMark(task: PdfTask, color: Color, scale: Scale, measure: Measure): Mark | null {
  const due = task.due === null ? null : dayNumber(task.due)
  const start = task.start === null ? null : dayNumber(task.start)
  if (due === null && start === null) return null
  const isBar = start !== null
  const first = Math.max(scale.start, Math.min(start ?? due ?? 0, due ?? start ?? 0))
  const last = Math.min(scale.end, due ?? start ?? 0)
  const fill =
    task.state === 'late' ? INK.late : task.state === 'done' ? lighten(color, 0.6) : color
  const stroke = task.validated ? INK.validated : null
  const left = isBar ? scale.x(first) : scale.x(last) + scale.perDay / 2 - TIMELINE.diamond
  const right = isBar
    ? Math.max(scale.x(last + 1), left + 2)
    : scale.x(last) + scale.perDay / 2 + TIMELINE.diamond

  const checkWidth = task.validated ? TIMELINE.checkSize + 2 : 0
  const room = (from: number, to: number): number => to - from - checkWidth
  const wanted = measure(task.title, 'regular', TIMELINE.labelSize)
  let labelX: number
  let label = task.title
  if (right + TIMELINE.labelGap + wanted + checkWidth <= PLOT_RIGHT) {
    labelX = right + TIMELINE.labelGap
  } else if (left - TIMELINE.labelGap - wanted - checkWidth >= PLOT_LEFT) {
    labelX = left - TIMELINE.labelGap - wanted - checkWidth
  } else {
    labelX = right + TIMELINE.labelGap
    label = truncate(task.title, room(labelX, PLOT_RIGHT), (t) =>
      measure(t, 'regular', TIMELINE.labelSize)
    )
  }
  const labelWidth = measure(label, 'regular', TIMELINE.labelSize)
  const labelColor = task.state === 'late' ? INK.late : task.state === 'done' ? INK.muted : INK.text

  return {
    from: Math.min(left, labelX),
    to: Math.max(right, labelX + labelWidth + checkWidth),
    draw: (cy) => {
      const items: PageItem[] = isBar
        ? [
            {
              type: 'rect',
              x: left,
              y: cy - TIMELINE.bar / 2,
              width: right - left,
              height: TIMELINE.bar,
              fill,
              stroke,
              strokeWidth: 1.2
            }
          ]
        : [{ type: 'diamond', cx: (left + right) / 2, cy, radius: TIMELINE.diamond, fill, stroke }]
      if (label !== '')
        items.push(
          text(
            label,
            labelX,
            cy + TIMELINE.labelSize * 0.35,
            TIMELINE.labelSize,
            'regular',
            labelColor
          )
        )
      if (task.validated)
        items.push({
          type: 'check',
          x: labelX + labelWidth + 2,
          y: cy - TIMELINE.checkSize / 2,
          size: TIMELINE.checkSize,
          color: INK.validated
        })
      return items
    }
  }
}

function shootingMark(date: string, scale: Scale): Mark | null {
  const day = dayNumber(date)
  if (day < scale.start || day > scale.end) return null
  const width = Math.max(scale.perDay, 3)
  const x = scale.x(day) + scale.perDay / 2 - width / 2
  return {
    from: x,
    to: x + width,
    draw: (cy) => [
      {
        type: 'rect',
        x,
        y: cy - 4,
        width,
        height: 8,
        fill: INK.shooting,
        stroke: null,
        strokeWidth: 0
      }
    ]
  }
}

/** Rangées : une marque va sur la première rangée où elle ne recouvre rien (1 pt d'écart). */
function lanesOf(marks: Mark[]): Mark[][] {
  const lanes: { end: number; marks: Mark[] }[] = []
  for (const mark of [...marks].sort((a, b) => a.from - b.from)) {
    const lane = lanes.find((l) => l.end + 1 < mark.from)
    if (lane) {
      lane.marks.push(mark)
      lane.end = mark.to
    } else lanes.push({ end: mark.to, marks: [mark] })
  }
  return lanes.map((lane) => lane.marks)
}

// ---------------------------------------------------------------------------------------------
// Bandes

interface Band {
  name: string
  color: Color | null
  /** Ligne grise sous le nom (« 2 tâches sans date »). */
  info: string
  lanes: Mark[][]
}

function bandsOf(input: PlanningPdfInput, scale: Scale, measure: Measure): Band[] {
  const bands: Band[] = input.phases.map((phase) => {
    const marks = phase.tasks
      .map((task) => taskMark(task, phase.color, scale, measure))
      .filter((mark): mark is Mark => mark !== null)
    const undated = phase.tasks.filter((t) => t.start === null && t.due === null).length
    return {
      name: phase.name,
      color: phase.color,
      info: undated > 0 ? LABELS.undated(undated) : phase.tasks.length === 0 ? LABELS.noTask : '',
      lanes: lanesOf(marks)
    }
  })
  const shooting = input.shootingDays
    .map((date) => shootingMark(date, scale))
    .filter((mark): mark is Mark => mark !== null)
  if (shooting.length > 0) {
    // Les jours (sans étiquette) restent sur une seule rangée, même collés les uns aux autres.
    const band: Band = {
      name: LABELS.shootingRow,
      color: INK.shooting,
      info: '',
      lanes: [shooting]
    }
    const at =
      input.shootingRowAfter < 0 ? bands.length : Math.min(input.shootingRowAfter + 1, bands.length)
    bands.splice(at, 0, band)
  }
  return bands
}

function nameLines(band: Band, measure: Measure): string[] {
  return wrapText(band.name, TIMELINE.labelColumn - 16, (t) =>
    measure(t, 'bold', TIMELINE.nameSize)
  )
}

function bandHeight(band: Band, lanes: number, measure: Measure): number {
  const nameHeight =
    nameLines(band, measure).length * TIMELINE.nameLine + (band.info ? TIMELINE.nameLine : 0)
  return Math.max(Math.max(lanes, 1) * TIMELINE.lane, nameHeight) + 2 * TIMELINE.groupPadding
}

function drawBand(
  band: Band,
  lanes: Mark[][],
  top: number,
  height: number,
  suffix: string,
  measure: Measure
): PageItem[] {
  const items: PageItem[] = []
  const x = CONTENT.left
  let baseline = top + TIMELINE.groupPadding + TIMELINE.nameSize
  if (band.color)
    items.push({
      type: 'rect',
      x,
      y: baseline - 6.5,
      width: 7,
      height: 7,
      fill: band.color,
      stroke: null,
      strokeWidth: 0
    })
  const lines = nameLines({ ...band, name: band.name + suffix }, measure)
  for (const line of lines) {
    items.push(text(line, x + 11, baseline, TIMELINE.nameSize, 'bold'))
    baseline += TIMELINE.nameLine
  }
  if (band.info)
    items.push(text(band.info, x + 11, baseline, TIMELINE.labelSize, 'regular', INK.muted))
  lanes.forEach((lane, index) => {
    const cy = top + TIMELINE.groupPadding + index * TIMELINE.lane + TIMELINE.lane / 2
    for (const mark of lane) items.push(...mark.draw(cy))
  })
  items.push(hline(CONTENT.left, CONTENT.right, top + height))
  return items
}

// ---------------------------------------------------------------------------------------------
// Axe, grille, trait du jour

function drawAxis(scale: Scale, top: number, measure: Measure): PageItem[] {
  const items: PageItem[] = []
  const spans = monthSpans(scale.start, scale.end)
  let year = -1
  for (const span of spans) {
    const x = scale.x(span.start)
    const width = scale.x(span.end + 1) - x
    if (span.year !== year) {
      year = span.year
      items.push(text(String(year), x + 2, top + 9, 7.5, 'bold'))
      if (span.start > scale.start)
        items.push({
          type: 'line',
          x1: x,
          y1: top,
          x2: x,
          y2: top + TIMELINE.yearRow,
          color: INK.rule,
          width: 0.5
        })
    }
    const full = monthName(span.month, false)
    const short = monthName(span.month, true)
    const size = 7
    const label =
      measure(full, 'regular', size) <= width - 4
        ? full
        : measure(short, 'regular', size) <= width - 4
          ? short
          : ''
    if (label)
      items.push(text(label, x + 2, top + TIMELINE.yearRow + 10, size, 'regular', INK.muted))
  }
  items.push(hline(PLOT_LEFT, PLOT_RIGHT, top + TIMELINE.yearRow + TIMELINE.monthRow))
  return items
}

function drawGrid(scale: Scale, top: number, bottom: number): PageItem[] {
  const items: PageItem[] = []
  // Lundis : petits traits très clairs quand les semaines sont assez larges.
  if (scale.perDay * 7 >= 6) {
    for (let day = scale.start; day <= scale.end; day++) {
      if ((new Date(day * 86_400_000).getUTCDay() + 6) % 7 !== 0) continue
      const x = scale.x(day)
      items.push({ type: 'line', x1: x, y1: top, x2: x, y2: bottom, color: '#f1f1f1', width: 0.4 })
    }
  }
  for (const span of monthSpans(scale.start, scale.end)) {
    const x = scale.x(span.start)
    items.push({
      type: 'line',
      x1: x,
      y1: top - TIMELINE.monthRow,
      x2: x,
      y2: bottom,
      color: INK.grid,
      width: 0.6
    })
  }
  items.push({
    type: 'line',
    x1: PLOT_RIGHT,
    y1: top - TIMELINE.monthRow,
    x2: PLOT_RIGHT,
    y2: bottom,
    color: INK.grid,
    width: 0.6
  })
  return items
}

function drawToday(
  input: PlanningPdfInput,
  scale: Scale,
  top: number,
  bottom: number,
  measure: Measure
): PageItem[] {
  const day = dayNumber(input.exportDate)
  if (day < scale.start || day > scale.end) return []
  const x = scale.x(day) + scale.perDay / 2
  const width = measure(LABELS.today, 'bold', TIMELINE.labelSize)
  const labelX = Math.min(Math.max(x - width / 2, PLOT_LEFT), PLOT_RIGHT - width)
  return [
    { type: 'line', x1: x, y1: top, x2: x, y2: bottom, color: INK.late, width: 0.9 },
    text(LABELS.today, labelX, bottom + 8, TIMELINE.labelSize, 'bold', INK.late)
  ]
}

// ---------------------------------------------------------------------------------------------

/** Pose la ligne du temps sur une ou plusieurs pages de `stack` (à partir de la page courante). */
export function layoutTimeline(input: PlanningPdfInput, stack: PageStack, measure: Measure): void {
  const scale = scaleOf(input)
  const bands = bandsOf(input, scale, measure)
  const axisHeight = TIMELINE.yearRow + TIMELINE.monthRow
  const limit = (): number => BODY.bottom - TIMELINE.footer

  let rowsTop = 0
  let rowItems: PageItem[] = []
  const openPage = (): void => {
    if (!stack.isFresh()) stack.newPage()
    stack.add(...drawAxis(scale, stack.y, measure))
    stack.y += axisHeight
    rowsTop = stack.y
    rowItems = []
  }
  const closePage = (): void => {
    stack.add(
      ...drawGrid(scale, rowsTop, stack.y),
      ...rowItems,
      ...drawToday(input, scale, rowsTop, stack.y, measure)
    )
    stack.add(
      text(LABELS.legend, CONTENT.left, BODY.bottom - 2, TIMELINE.legendSize, 'regular', INK.muted)
    )
    stack.y = BODY.bottom
  }

  openPage()
  for (const band of bands) {
    let lanes = band.lanes
    let suffix = ''
    for (;;) {
      const fitting = Math.floor((limit() - stack.y - 2 * TIMELINE.groupPadding) / TIMELINE.lane)
      const full = bandHeight(band, lanes.length, measure)
      if (stack.y + full <= limit()) {
        rowItems.push(...drawBand(band, lanes, stack.y, full, suffix, measure))
        stack.y += full
        break
      }
      // La bande ne tient pas : page suivante, ou coupée si elle dépasse une page entière.
      const pageFull = stack.y === rowsTop
      if (!pageFull && fitting < Math.min(lanes.length, 2)) {
        closePage()
        openPage()
        continue
      }
      const part = lanes.slice(0, Math.max(fitting, 1))
      const height = bandHeight(band, part.length, measure)
      rowItems.push(...drawBand(band, part, stack.y, height, suffix, measure))
      stack.y += height
      lanes = lanes.slice(part.length)
      if (lanes.length === 0) break
      suffix = ` ${LABELS.continued}`
      closePage()
      openPage()
    }
  }
  closePage()
}
