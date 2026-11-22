// Page de titre, disposée comme dans KIT (« Scénario Final Draft (A4) ») sur la grille de 58 lignes :
// titre ligne 17, genre ligne 21, auteur ligne 23, mention ligne 25, contact ligne 40 (à gauche),
// date sur la dernière ligne. Titre, genre, auteur, mention et date sont centrés sur la page.

import {
  parseInline,
  wrapLine,
  type FountainDocument,
  type ResolvedLayout
} from '@neoscenar/fountain'
import { columnX, rowBaseline, textWidth } from './metrics.ts'
import { lineRuns } from './runs.ts'
import type { DocumentInfo, PagePlan, TextRun, TitleExtras } from './types.ts'

type Field = 'title' | 'credit' | 'author' | 'source' | 'contact' | 'date'

/** Clés Fountain de chaque champ (sans tenir compte des majuscules). */
const KEYS: Record<Field, string[]> = {
  title: ['title'],
  credit: ['credit'],
  author: ['author', 'authors'],
  source: ['source'],
  contact: ['contact'],
  date: ['draft date', 'date']
}

/** Ligne (à partir de 1) où commence chaque bloc ; la date finit sur la dernière ligne. */
const ROWS: Record<Exclude<Field, 'date'>, number> = {
  title: 17,
  credit: 21,
  author: 23,
  source: 25,
  contact: 40
}

/** Valeurs de la page de titre (première clé de chaque champ), telles qu'écrites. */
export function titlePageValues(doc: FountainDocument): Partial<Record<Field, string>> {
  const values: Partial<Record<Field, string>> = {}
  for (const entry of doc.titlePage?.entries ?? []) {
    const key = entry.key.trim().toLowerCase().replace(/\s+/g, ' ')
    const field = (Object.keys(KEYS) as Field[]).find((name) => KEYS[name].includes(key))
    if (field && values[field] === undefined) values[field] = entry.value
  }
  return values
}

interface StyledLine {
  text: string
  marks: { from: number; to: number; bold: boolean; italic: boolean; underline: boolean }[]
}

/** Lignes imprimées d'une valeur : sans notes ni marqueurs, coupées à la largeur du texte. */
function valueLines(value: string, width: number, uppercase: boolean): StyledLine[] {
  const lines: StyledLine[] = []
  for (const sourceLine of value.split('\n')) {
    let text = ''
    const styles: StyledLine['marks'] = []
    for (const span of parseInline(sourceLine)) {
      if (span.type !== 'text') continue
      const from = text.length
      text += span.text
      if (span.bold || span.italic || span.underline)
        styles.push({
          from,
          to: text.length,
          bold: span.bold,
          italic: span.italic,
          underline: span.underline
        })
    }
    const lead = text.length - text.trimStart().length
    const trimmed = text.trim()
    if (trimmed === '') continue
    // Majuscules caractère par caractère : la longueur ne change pas (positions de la mise en forme).
    const shown = uppercase
      ? Array.from(trimmed, (char) =>
          char.toUpperCase().length === 1 ? char.toUpperCase() : char
        ).join('')
      : trimmed
    let from = 0
    for (const segment of wrapLine(shown, width)) {
      const at = shown.indexOf(segment, from)
      from = at + segment.length
      const marks = styles
        .map((mark) => ({
          ...mark,
          from: Math.max(mark.from - lead - at, 0),
          to: Math.min(mark.to - lead - at, segment.length)
        }))
        .filter((mark) => mark.from < mark.to)
      lines.push({ text: segment, marks })
    }
  }
  return lines
}

/** Lignes d'un texte simple (log line, tag line) : sans mise en forme, coupées à la largeur du texte. */
function plainLines(value: string | null | undefined, width: number): StyledLine[] {
  return (value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .flatMap((line) => wrapLine(line, width).map((text) => ({ text, marks: [] })))
}

/**
 * Page de titre, ou null si rien n'est à y imprimer. La tag line (en italique) puis la log line
 * retenues sont centrées sous le titre et l'auteur ; elles ne viennent jamais du Fountain.
 */
export function titlePagePlan(
  doc: FountainDocument,
  layout: ResolvedLayout,
  extras?: TitleExtras
): PagePlan | null {
  const values = titlePageValues(doc)
  const width = layout.textWidthCh
  const charWidth = layout.profile.font.charWidthPt
  const pageCenter = layout.profile.page.widthPt / 2
  const lines = (field: Field): StyledLine[] =>
    valueLines(values[field] ?? '', width, field === 'title')
  const runs: TextRun[] = []

  const placeBlock = (
    block: StyledLine[],
    firstRow: number,
    centered: boolean,
    base: { underline?: boolean; italic?: boolean }
  ): number => {
    block.forEach((line, i) => {
      const x = centered ? pageCenter - textWidth(layout, line.text) / 2 : columnX(layout, 0)
      const baseline = rowBaseline(layout, firstRow - 1 + i)
      runs.push(...lineRuns(line.text, x, baseline, charWidth, line.marks, base))
    })
    return firstRow + block.length
  }
  const place = (field: Field, firstRow: number, centered: boolean): number =>
    placeBlock(lines(field), firstRow, centered, { underline: field === 'title' })

  // Un bloc sur plusieurs lignes repousse les suivants, en gardant une ligne vide entre eux.
  let next = 1
  for (const field of ['title', 'credit', 'author', 'source'] as const) {
    if (lines(field).length === 0) continue
    next = place(field, Math.max(ROWS[field], next), true) + 1
  }
  // Sous le dernier bloc centré, après une ligne vide ; au plus tôt à la place de la mention.
  const tagLine = plainLines(extras?.tagLine, width)
  const logLine = plainLines(extras?.logLine, width)
  if (tagLine.length + logLine.length > 0) next = Math.max(next + 1, ROWS.source + 2)
  if (tagLine.length > 0) next = placeBlock(tagLine, next, true, { italic: true }) + 1
  if (logLine.length > 0) next = placeBlock(logLine, next, true, {}) + 1
  if (lines('contact').length > 0) next = place('contact', Math.max(ROWS.contact, next), false) + 1
  const date = lines('date')
  if (date.length > 0) place('date', Math.max(layout.linesPerPage - date.length + 1, next), true)

  return runs.length > 0 ? { runs } : null
}

/** Titre et auteur pour les propriétés du fichier PDF ; un auteur par ligne, séparés par une virgule. */
export function documentInfo(doc: FountainDocument): DocumentInfo {
  const values = titlePageValues(doc)
  const plain = (value: string | undefined, separator: string): string =>
    valueLines(value ?? '', Number.MAX_SAFE_INTEGER, false)
      .map((line) => line.text.trim())
      .filter((text) => text !== '')
      .join(separator)
  return { title: plain(values.title, ' '), author: plain(values.author, ', ') }
}
