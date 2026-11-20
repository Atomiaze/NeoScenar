// Liste par phase du PDF « Planning » : un tableau par phase (case faite, tâche et note, dates,
// personnes, état). Le titre d'une phase reste avec sa première tâche ; une phase qui continue sur
// la page suivante y reprend son titre suivi de « (suite) » et les intitulés des colonnes.

import { INK, CONTENT } from './geometry.ts'
import { LABELS, formatDate } from './labels.ts'
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
  type Column
} from './pages.ts'
import { wrapText } from './wrap.ts'
import type { Measure, PageItem, PdfPhase, PdfTask } from './types.ts'

const COLUMNS: Column[] = [
  { x: 0, width: 12 },
  { x: 16, width: 272 },
  { x: 292, width: 98 },
  { x: 394, width: 98 },
  { x: 496, width: 186 },
  { x: 686, width: CONTENT.width - 686 }
]
const PAD = 4
const width = (index: number): number => COLUMNS[index].width - PAD

const TITLE = { size: 9, height: 12 }
const NOTE = { size: 7.5, height: 10, color: INK.muted }
const SMALL = { size: 8.5, height: 12 }
const PHASE = { size: 11, height: 24 }
const BOX = 8

function checkbox(done: boolean): (x: number, top: number) => PageItem[] {
  return (x, top) => {
    const y = top + (TITLE.height - BOX) / 2
    const items: PageItem[] = [
      {
        type: 'rect',
        x,
        y,
        width: BOX,
        height: BOX,
        fill: null,
        stroke: INK.muted,
        strokeWidth: 0.7
      }
    ]
    if (done) items.push({ type: 'check', x: x + 1, y: y + 1, size: BOX - 2, color: INK.text })
    return items
  }
}

function stateCell(task: PdfTask, measure: Measure): Cell {
  const label = task.validated ? LABELS.validated : LABELS.state[task.state]
  const color = task.validated ? INK.validated : task.state === 'late' ? INK.late : INK.text
  const face = task.state === 'late' && !task.validated ? 'bold' : 'regular'
  const lines = cellLines(label, width(5), { ...SMALL, face, color }, measure, wrapText)
  if (!task.validated) return { lines }
  // Coche turquoise après « Validée ».
  const textWidth = measure(label, 'regular', SMALL.size)
  return {
    lines,
    decorate: (x, top) => [
      { type: 'check', x: x + textWidth + 3, y: top + 3, size: 7, color: INK.validated }
    ]
  }
}

function taskRow(task: PdfTask, measure: Measure): Cell[] {
  const titleColor = task.state === 'late' ? INK.late : INK.text
  const title = cellLines(task.title, width(1), { ...TITLE, color: titleColor }, measure, wrapText)
  const note = task.note.trim()
    ? cellLines(task.note.trim(), width(1), NOTE, measure, wrapText)
    : []
  const date = (iso: string | null, color: string = INK.text): Cell => ({
    lines: cellLines(
      iso === null ? LABELS.noDate : formatDate(iso),
      width(2),
      { ...SMALL, color },
      measure,
      wrapText
    )
  })
  const box: Cell = {
    lines: [{ text: '', size: TITLE.size, face: 'regular', color: INK.text, height: TITLE.height }],
    decorate: checkbox(task.state === 'done')
  }
  return [
    box,
    { lines: [...title, ...note] },
    date(task.start),
    date(task.due, task.state === 'late' ? INK.late : INK.text),
    { lines: cellLines(task.people.join(', '), width(4), SMALL, measure, wrapText) },
    stateCell(task, measure)
  ]
}

function phaseTitle(phase: PdfPhase, suffix: string, top: number, measure: Measure): PageItem[] {
  const baseline = top + 16
  const done = phase.tasks.filter((t) => t.state === 'done').length
  const late = phase.tasks.filter((t) => t.state === 'late').length
  const name = phase.name + suffix
  const nameWidth = measure(name, 'bold', PHASE.size)
  const progress = [
    phase.tasks.length > 0 ? LABELS.progress(done, phase.tasks.length) : LABELS.noTask,
    late > 0 ? LABELS.late(late) : ''
  ]
    .filter(Boolean)
    .join(' · ')
  return [
    {
      type: 'rect',
      x: CONTENT.left,
      y: baseline - 8.5,
      width: 9,
      height: 9,
      fill: phase.color,
      stroke: null,
      strokeWidth: 0
    },
    text(name, CONTENT.left + 14, baseline, PHASE.size, 'bold'),
    text(
      progress,
      CONTENT.left + 14 + nameWidth + 10,
      baseline,
      8.5,
      'regular',
      late > 0 ? INK.late : INK.muted
    )
  ]
}

const COLUMN_LABELS = [
  '',
  LABELS.columns.task,
  LABELS.columns.start,
  LABELS.columns.due,
  LABELS.columns.people,
  LABELS.columns.state
]

/** Titre de phase (+ « (suite) ») et intitulés des colonnes en haut de la place libre. */
function openTable(stack: PageStack, phase: PdfPhase, suffix: string, measure: Measure): void {
  stack.add(...phaseTitle(phase, suffix, stack.y, measure))
  stack.y += PHASE.height
  if (phase.tasks.length === 0) return
  const header = headerRow(COLUMN_LABELS, COLUMNS, stack.y)
  stack.add(...header.items)
  stack.y += header.height
}

export function layoutTaskList(
  phases: readonly PdfPhase[],
  stack: PageStack,
  measure: Measure
): void {
  if (!stack.isFresh()) stack.newPage()
  const tableHead = PHASE.height + 15
  phases.forEach((phase, index) => {
    if (index > 0) stack.y += 10
    const rows = phase.tasks.map((task) => taskRow(task, measure))
    const firstHeight =
      rows.length > 0 ? Math.min(rowHeight(rows[0]), PAGE_BODY_HEIGHT - tableHead) : 0
    if (!stack.isFresh() && stack.remaining() < tableHead + firstHeight) stack.newPage()
    openTable(stack, phase, '', measure)
    for (const row of rows) {
      let rest: Cell[] | null = row
      while (rest) {
        // Une rangée qui ne tient pas entière part sur la page suivante, sauf si elle dépasse une page.
        const needed = rowHeight(rest)
        if (needed > stack.remaining() && needed <= PAGE_BODY_HEIGHT - tableHead) {
          stack.newPage()
          openTable(stack, phase, ` ${LABELS.continued}`, measure)
        }
        const placed = placeRow(rest, COLUMNS, stack.y, stack.remaining())
        stack.add(...placed.items)
        stack.y += placed.height
        rest = placed.rest
        if (rest) {
          stack.newPage()
          openTable(stack, phase, ` ${LABELS.continued}`, measure)
        } else stack.add(hline(CONTENT.left, CONTENT.right, stack.y, INK.grid))
      }
    }
  })
}
