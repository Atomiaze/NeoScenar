// Découpe d'une ligne en morceaux de même mise en forme.

import type { InlineRange } from '@neoscenar/fountain'
import type { TextRun } from './types.ts'

interface Style {
  bold: boolean
  italic: boolean
  underline: boolean
}

/**
 * Morceaux d'une ligne commençant en `x` : `marks` (positions dans `text`) donnent le gras,
 * l'italique et le souligné ; `base` s'applique à toute la ligne (paroles en italique, titre souligné).
 */
export function lineRuns(
  text: string,
  x: number,
  baseline: number,
  charWidth: number,
  marks: readonly InlineRange[] = [],
  base: Partial<Style> = {}
): TextRun[] {
  const runs: TextRun[] = []
  const styleAt = (i: number): Style => {
    const mark = marks.find((range) => range.from <= i && i < range.to)
    return {
      bold: (base.bold ?? false) || (mark?.bold ?? false),
      italic: (base.italic ?? false) || (mark?.italic ?? false),
      underline: (base.underline ?? false) || (mark?.underline ?? false)
    }
  }
  let start = 0
  for (let i = 1; i <= text.length; i++) {
    if (i < text.length && sameStyle(styleAt(i), styleAt(start))) continue
    const piece = text.slice(start, i)
    if (piece.trim() !== '' || styleAt(start).underline)
      runs.push({ text: piece, x: x + start * charWidth, baseline, ...styleAt(start) })
    start = i
  }
  return runs
}

function sameStyle(a: Style, b: Style): boolean {
  return a.bold === b.bold && a.italic === b.italic && a.underline === b.underline
}
