// Suite de pages et tableaux : chaque page a son en-tête (titre du film, type de document, date) et
// son pied (« Page n / N ») ; une rangée de tableau trop haute pour la place restante continue sur
// la page suivante, sans jamais réduire ni perdre de texte.

import { BODY, CONTENT, FOOTER, HEADER, INK } from './geometry.ts'
import { LABELS, formatDate } from './labels.ts'
import type { Color, FontFace, IsoDate, Measure, PageItem, PageLayout } from './types.ts'

export class PageStack {
  readonly pages: PageLayout[] = []
  /** Haut de la place libre sur la page courante. */
  y = BODY.top

  constructor() {
    this.newPage()
  }

  get items(): PageItem[] {
    return this.pages[this.pages.length - 1].items
  }

  newPage(): void {
    this.pages.push({ items: [] })
    this.y = BODY.top
  }

  remaining(): number {
    return BODY.bottom - this.y
  }

  /** Vrai si la page courante n'a encore rien reçu. */
  isFresh(): boolean {
    return this.y === BODY.top
  }

  add(...items: PageItem[]): void {
    this.items.push(...items)
  }
}

/** Hauteur disponible sur une page vide. */
export const PAGE_BODY_HEIGHT = BODY.bottom - BODY.top

export function text(
  value: string,
  x: number,
  baseline: number,
  size: number,
  face: FontFace = 'regular',
  color: Color = INK.text
): PageItem {
  return { type: 'text', text: value, x, baseline, size, face, color }
}

export function hline(
  x1: number,
  x2: number,
  y: number,
  color: Color = INK.rule,
  width = 0.5
): PageItem {
  return { type: 'line', x1, y1: y, x2, y2: y, color, width }
}

/** En-tête et pied posés sur toutes les pages, une fois leur nombre connu. */
export function frame(
  pages: PageLayout[],
  kind: string,
  common: { title: string; exportDate: IsoDate; extra: string | null },
  measure: Measure
): void {
  const title = common.title.trim()
  const info = [LABELS.exported(formatDate(common.exportDate)), common.extra]
    .filter((part): part is string => part !== null && part !== '')
    .join(' · ')
  pages.forEach((page, index) => {
    const kindWidth = measure(kind, 'bold', HEADER.titleSize)
    page.items.unshift(
      text(title, CONTENT.left, HEADER.titleBaseline, HEADER.titleSize, 'bold'),
      text(kind, CONTENT.right - kindWidth, HEADER.titleBaseline, HEADER.titleSize, 'bold'),
      text(info, CONTENT.left, HEADER.infoBaseline, HEADER.infoSize, 'regular', INK.muted),
      hline(CONTENT.left, CONTENT.right, HEADER.rule, INK.rule, 0.8)
    )
    const pageLabel = LABELS.page(index + 1, pages.length)
    page.items.push(
      text(
        pageLabel,
        CONTENT.right - measure(pageLabel, 'regular', FOOTER.size),
        FOOTER.baseline,
        FOOTER.size,
        'regular',
        INK.muted
      )
    )
  })
}

// ---------------------------------------------------------------------------------------------
// Tableaux

export interface Line {
  text: string
  size: number
  face: FontFace
  color: Color
  /** Hauteur occupée par la ligne. */
  height: number
}

export interface Cell {
  lines: Line[]
  /** Dessin en plus du texte (case à cocher…), posé seulement avec la première ligne. */
  decorate?: (x: number, top: number) => PageItem[]
}

export interface Column {
  /** Décalage depuis le bord gauche du contenu. */
  x: number
  width: number
}

export const ROW_PADDING = 3.5

export function cellLines(
  value: string,
  width: number,
  style: { size: number; face?: FontFace; color?: Color; height: number },
  measure: Measure,
  wrap: (text: string, width: number, measure: (text: string) => number) => string[]
): Line[] {
  const face = style.face ?? 'regular'
  return wrap(value, width, (t) => measure(t, face, style.size)).map((line) => ({
    text: line,
    size: style.size,
    face,
    color: style.color ?? INK.text,
    height: style.height
  }))
}

function cellHeight(cell: Cell): number {
  return cell.lines.reduce((sum, line) => sum + line.height, 0)
}

export function rowHeight(row: Cell[]): number {
  return Math.max(...row.map(cellHeight), 0) + 2 * ROW_PADDING
}

/**
 * Pose une rangée à partir de `top`, dans au plus `available` points. Rend ce qui n'a pas tenu (null
 * si tout est posé). Chaque cellule pose ses lignes tant qu'elles tiennent.
 */
export function placeRow(
  row: Cell[],
  columns: readonly Column[],
  top: number,
  available: number
): { items: PageItem[]; height: number; rest: Cell[] | null } {
  const room = available - 2 * ROW_PADDING
  const items: PageItem[] = []
  let used = 0
  let restNeeded = false
  const rest: Cell[] = row.map((cell, index) => {
    const x = CONTENT.left + columns[index].x
    let y = top + ROW_PADDING
    let placed = 0
    for (const line of cell.lines) {
      if (y + line.height - (top + ROW_PADDING) > room + 0.01) break
      // Texte centré dans sa ligne (les majuscules montent à environ 0,75 de la taille).
      const baseline = y + (line.height - line.size) / 2 + line.size * 0.8
      items.push(text(line.text, x, baseline, line.size, line.face, line.color))
      y += line.height
      placed++
    }
    if (placed > 0 && cell.decorate) items.push(...cell.decorate(x, top + ROW_PADDING))
    used = Math.max(used, y - top - ROW_PADDING)
    if (placed < cell.lines.length) restNeeded = true
    return { lines: cell.lines.slice(placed), decorate: placed === 0 ? cell.decorate : undefined }
  })
  return { items, height: used + 2 * ROW_PADDING, rest: restNeeded ? rest : null }
}

/** Rangée des intitulés de colonnes (fond gris clair). */
export function headerRow(
  labels: readonly string[],
  columns: readonly Column[],
  top: number
): { items: PageItem[]; height: number } {
  const height = 15
  const items: PageItem[] = [
    {
      type: 'rect',
      x: CONTENT.left,
      y: top,
      width: CONTENT.width,
      height,
      fill: INK.headerFill,
      stroke: null,
      strokeWidth: 0
    }
  ]
  labels.forEach((label, index) =>
    items.push(text(label, CONTENT.left + columns[index].x, top + 10.5, 7.5, 'bold', INK.muted))
  )
  return { items, height }
}
