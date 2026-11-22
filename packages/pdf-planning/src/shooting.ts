// PDF « Plan de tournage » : un tableau par jour (scène, lieu, INT/EXT, J/N, pages, interprètes),
// puis le total, les lieux, les convoqués et la note du jour. Un jour n'est jamais coupé, sauf s'il
// dépasse une page entière : il continue alors sous « Jour N — … (suite) ».

import { CONTENT, INK } from './geometry.ts'
import { LABELS, formatEighths, formatLongDate } from './labels.ts'
import {
  PAGE_BODY_HEIGHT,
  PageStack,
  cellLines,
  headerRow,
  hline,
  placeRow,
  rowHeight,
  text,
  type Cell,
  type Column,
  type Line
} from './pages.ts'
import { wrapText } from './wrap.ts'
import type { Measure, PdfShootingDay, PdfShootingScene, ShootingPdfInput } from './types.ts'

const COLUMNS: Column[] = [
  { x: 0, width: 58 },
  { x: 62, width: 250 },
  { x: 316, width: 56 },
  { x: 376, width: 50 },
  { x: 430, width: 50 },
  { x: 484, width: CONTENT.width - 484 }
]
const FULL: Column[] = [{ x: 0, width: CONTENT.width }]
const PAD = 4
const width = (index: number): number => COLUMNS[index].width - PAD

const CELL = { size: 8.5, height: 12 }
const SMALL = { size: 7.5, height: 10 }
const HEADING = { size: 11, height: 16 }
const SUMMARY = { size: 8.5, height: 13 }
const HEADER_HEIGHT = 15
const DAY_GAP = 16

const COLUMN_LABELS = [
  LABELS.shootingColumns.scene,
  LABELS.shootingColumns.location,
  LABELS.shootingColumns.intExt,
  LABELS.shootingColumns.dayNight,
  LABELS.shootingColumns.pages,
  LABELS.shootingColumns.people
]

function sceneRow(scene: PdfShootingScene, measure: Measure): Cell[] {
  const lines = (value: string, column: number, style = CELL, color: string = INK.text): Line[] =>
    cellLines(value, width(column), { ...style, color }, measure, wrapText)
  const muted = scene.status !== 'ok'
  const ink = muted ? INK.muted : INK.text
  const location =
    scene.status === 'to-write'
      ? lines(LABELS.sceneToWrite, 1, CELL, ink)
      : scene.status === 'missing'
        ? [...lines(scene.location, 1, CELL, ink), ...lines(LABELS.missing, 1, SMALL, INK.late)]
        : lines(scene.location, 1)
  const pages =
    scene.status === 'to-write'
      ? LABELS.toWrite
      : scene.eighths === null || scene.status === 'missing'
        ? LABELS.noDate
        : formatEighths(scene.eighths)
  return [
    { lines: lines(scene.label, 0, CELL, ink).map((l) => ({ ...l, face: 'bold' as const })) },
    { lines: location },
    { lines: lines(LABELS.intExt[scene.intExt], 2, CELL, ink) },
    { lines: lines(LABELS.dayNight[scene.dayNight], 3, CELL, ink) },
    { lines: lines(pages, 4, CELL, ink) },
    { lines: scene.people.flatMap((person) => lines(person, 5, CELL, ink)) }
  ]
}

function headingText(day: PdfShootingDay, index: number): string {
  const date = day.date === null ? LABELS.dateToFix : formatLongDate(day.date)
  const title = day.title.trim()
  return `${LABELS.day(index + 1)} — ${date}${title ? ` · ${title}` : ''}`
}

/** Lignes sous le tableau : lieux, convoqués, sans interprète, note. */
function detailRow(day: PdfShootingDay, measure: Measure): Cell[] | null {
  const parts: [string, string, string][] = []
  if (day.locations.length > 0) parts.push([LABELS.locations, day.locations.join(', '), INK.text])
  if (day.called.length > 0) parts.push([LABELS.called, day.called.join(', '), INK.text])
  if (day.withoutInterpreter.length > 0)
    parts.push([LABELS.withoutInterpreter, day.withoutInterpreter.join(', '), INK.late])
  if (day.presents.length > 0) parts.push([LABELS.presents, day.presents.join(', '), INK.text])
  if (day.note.trim()) parts.push([LABELS.note, day.note.trim(), INK.text])
  if (parts.length === 0) return null
  const lines = parts.flatMap(([label, value, color]) =>
    cellLines(`${label}${value}`, CONTENT.width, { ...CELL, color }, measure, wrapText)
  )
  return [{ lines }]
}

interface DayBlock {
  heading: string
  summary: string
  rows: Cell[][]
  detail: Cell[] | null
}

function headHeight(block: DayBlock, measure: Measure): number {
  const headingLines = wrapText(block.heading, CONTENT.width, (t) =>
    measure(t, 'bold', HEADING.size)
  )
  return (
    headingLines.length * HEADING.height +
    SUMMARY.height +
    (block.rows.length > 0 ? HEADER_HEIGHT : 0)
  )
}

function blockHeight(block: DayBlock, measure: Measure): number {
  return (
    headHeight(block, measure) +
    block.rows.reduce((sum, row) => sum + rowHeight(row), 0) +
    (block.detail ? rowHeight(block.detail) : 0)
  )
}

function openDay(stack: PageStack, block: DayBlock, suffix: string, measure: Measure): void {
  const heading = block.heading + suffix
  for (const line of wrapText(heading, CONTENT.width, (t) => measure(t, 'bold', HEADING.size))) {
    stack.add(text(line, CONTENT.left, stack.y + 12, HEADING.size, 'bold'))
    stack.y += HEADING.height
  }
  stack.add(text(block.summary, CONTENT.left, stack.y + 9, SUMMARY.size, 'regular', INK.muted))
  stack.y += SUMMARY.height
  if (block.rows.length === 0) return
  const header = headerRow(COLUMN_LABELS, COLUMNS, stack.y)
  stack.add(...header.items)
  stack.y += header.height
}

/** Pose une rangée ; ce qui ne tient pas continue sur une nouvelle page, sous le titre du jour. */
function placeAll(
  stack: PageStack,
  block: DayBlock,
  row: Cell[],
  columns: readonly Column[],
  rule: boolean,
  measure: Measure
): void {
  let rest: Cell[] | null = row
  while (rest) {
    const needed = rowHeight(rest)
    if (needed > stack.remaining() && needed <= PAGE_BODY_HEIGHT - headHeight(block, measure)) {
      stack.newPage()
      openDay(stack, block, ` ${LABELS.continued}`, measure)
    }
    const placed = placeRow(rest, columns, stack.y, stack.remaining())
    stack.add(...placed.items)
    stack.y += placed.height
    rest = placed.rest
    if (rest) {
      stack.newPage()
      openDay(stack, block, ` ${LABELS.continued}`, measure)
    } else if (rule) stack.add(hline(CONTENT.left, CONTENT.right, stack.y, INK.grid))
  }
}

export function layoutShooting(input: ShootingPdfInput, stack: PageStack, measure: Measure): void {
  const overview = [LABELS.days(input.days.length), LABELS.unplanned(input.unplanned)].join(' · ')
  stack.add(text(overview, CONTENT.left, stack.y + 10, 9, 'regular', INK.muted))
  stack.y += 18
  if (input.days.length === 0) {
    stack.add(text(LABELS.noDay, CONTENT.left, stack.y + 12, 10))
    return
  }
  input.days.forEach((day, index) => {
    const block: DayBlock = {
      heading: headingText(day, index),
      summary: LABELS.total(day.eighths, day.scenes.length),
      rows: day.scenes.map((scene) => sceneRow(scene, measure)),
      detail: detailRow(day, measure)
    }
    if (index > 0) stack.y += DAY_GAP
    const height = blockHeight(block, measure)
    const firstRow = block.rows.length > 0 ? rowHeight(block.rows[0]) : 0
    // Jour entier sur la page suivante s'il y tient ; sinon il commence ici dès que sa tête et sa
    // première scène tiennent.
    const fitsFresh = height <= PAGE_BODY_HEIGHT
    if (
      !stack.isFresh() &&
      (fitsFresh
        ? height > stack.remaining()
        : headHeight(block, measure) + firstRow > stack.remaining())
    )
      stack.newPage()
    openDay(stack, block, '', measure)
    for (const row of block.rows) placeAll(stack, block, row, COLUMNS, true, measure)
    if (block.detail) placeAll(stack, block, block.detail, FULL, false, measure)
  })
}
