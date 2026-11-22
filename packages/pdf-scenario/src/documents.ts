// Pages des documents (synopsis, pitch, note d'intention) : Courier 12 sur la grille du scénario,
// mêmes marges, texte coupé à la largeur du texte. Pages non numérotées.

import { wrapLine, type InlineRange, type ResolvedLayout } from '@neoscenar/fountain'
import { capHeight, columnX, rowBaseline } from './metrics.ts'
import { lineRuns } from './runs.ts'
import type { DocumentLine, DocumentMark, PagePlan, PdfTextDocument } from './types.ts'

/** Mise en forme de toute la ligne, selon le niveau de titre. */
const HEADING_STYLE = {
  1: { bold: true, italic: false },
  2: { bold: true, italic: false },
  3: { bold: true, italic: true }
} as const

/** Majuscules caractère par caractère : la longueur ne change pas (positions de la mise en forme). */
function upperSameLength(text: string): string {
  return Array.from(text, (char) =>
    char.toUpperCase().length === 1 ? char.toUpperCase() : char
  ).join('')
}

interface PrintedLine {
  text: string
  marks: InlineRange[]
}

/** Coupe une ligne à `width` caractères en gardant la mise en forme de chaque morceau. */
export function wrapStyled(
  text: string,
  marks: readonly DocumentMark[],
  width: number
): PrintedLine[] {
  const lead = text.length - text.trimStart().length
  const trimmed = text.trim()
  const lines: PrintedLine[] = []
  let from = 0
  for (const segment of wrapLine(trimmed, width)) {
    const at = trimmed.indexOf(segment, from)
    from = at + segment.length
    const shifted = marks
      .map((mark) => ({
        from: Math.max(mark.from - lead - at, 0),
        to: Math.min(mark.to - lead - at, segment.length),
        bold: mark.bold,
        italic: mark.italic,
        underline: false
      }))
      .filter((mark) => mark.from < mark.to)
    lines.push({ text: segment, marks: shifted })
  }
  return lines
}

/** Plans des pages d'un document ; il commence toujours sur une nouvelle page, par son titre. */
export function documentPagePlans(doc: PdfTextDocument, layout: ResolvedLayout): PagePlan[] {
  const width = layout.textWidthCh
  const charWidth = layout.profile.font.charWidthPt
  const pages: PagePlan[] = []
  let page: PagePlan = { runs: [], rules: [] }
  let row = 0
  // La ligne précédente est vide (ou on est en haut de page) : pas de seconde ligne vide.
  let afterBlank = true

  const newPage = (): void => {
    pages.push(page)
    page = { runs: [], rules: [] }
    row = 0
    afterBlank = true
  }
  const ensureRoom = (rows: number): void => {
    if (row > 0 && row + rows > layout.linesPerPage) newPage()
  }
  const blank = (): void => {
    if (afterBlank) return
    row++
    afterBlank = true
    if (row >= layout.linesPerPage) newPage()
  }
  const print = (line: PrintedLine, base: { bold: boolean; italic: boolean }): void => {
    ensureRoom(1)
    page.runs.push(
      ...lineRuns(
        line.text,
        columnX(layout, 0),
        rowBaseline(layout, row),
        charWidth,
        line.marks,
        base
      )
    )
    row++
    afterBlank = false
  }

  const lines: DocumentLine[] = [
    { kind: 'heading', level: 1, text: doc.title, marks: [] },
    { kind: 'blank' },
    ...doc.lines
  ]
  lines.forEach((line, index) => {
    if (line.kind === 'blank') return blank()
    if (line.kind === 'rule') {
      ensureRoom(1)
      // Trait fin au milieu de la hauteur des majuscules de la ligne.
      const y = rowBaseline(layout, row) - capHeight(layout) / 2
      page.rules?.push({ x1: columnX(layout, 0), x2: columnX(layout, width), y })
      row++
      afterBlank = false
      return
    }
    if (line.kind === 'text') {
      if (line.text.trim() === '') return blank()
      for (const printed of wrapStyled(line.text, line.marks, width))
        print(printed, { bold: false, italic: false })
      return
    }
    // Titre : précédé d'une ligne vide, et jamais laissé seul en bas de page.
    const text = line.level === 1 ? upperSameLength(line.text) : line.text
    const wrapped = wrapStyled(text, line.marks, width)
    blank()
    const followed = lines.slice(index + 1).some((next) => next.kind !== 'blank')
    ensureRoom(wrapped.length + (followed ? 2 : 0))
    for (const printed of wrapped) print(printed, HEADING_STYLE[line.level])
  })
  if (page.runs.length > 0 || (page.rules?.length ?? 0) > 0) pages.push(page)
  return pages
}
