// Plan des pages du scénario : chaque ligne de la pagination devient des morceaux de texte placés en points.
// Aucun calcul de lignes ni de pages ici : tout vient de la pagination partagée avec l'éditeur.

import {
  getScenes,
  type FountainDocument,
  type Pagination,
  type ResolvedLayout
} from '@neoscenar/fountain'
import { capHeight, columnX, rowBaseline, textWidth } from './metrics.ts'
import { lineRuns } from './runs.ts'
import type { PagePlan, PdfOptions, TextRun } from './types.ts'

/**
 * Numéro imprimé devant chaque en-tête de scène (clé : index de l'élément). « fountain » : le numéro
 * écrit (#30#), ou la place dans le texte s'il n'y en a pas ; « continue » : 1, 2, 3 dans l'ordre du texte.
 */
export function sceneNumbers(
  doc: FountainDocument,
  numbering: PdfOptions['numerotation']
): Map<number, string> {
  return new Map(
    getScenes(doc).map((scene) => [
      scene.index,
      numbering === 'fountain' ? (scene.info.number ?? String(scene.order)) : String(scene.order)
    ])
  )
}

export function scriptPagePlans(
  doc: FountainDocument,
  pagination: Pagination,
  layout: ResolvedLayout,
  numbering: PdfOptions['numerotation']
): PagePlan[] {
  const numbers = sceneNumbers(doc, numbering)
  const { profile } = layout
  const charWidth = profile.font.charWidthPt

  return pagination.pages.map((page) => {
    const runs: TextRun[] = []
    for (const fragment of page.fragments) {
      // Rang donné par la pagination : la colonne de droite d'un dialogue simultané remonte.
      let row = fragment.row
      const element = pagination.layouts[fragment.elementIndex]
      const style = layout.styles[element.type as keyof typeof layout.styles]
      const lines = element.lines.slice(fragment.firstLine, fragment.firstLine + fragment.lineCount)
      lines.forEach((line, i) => {
        const baseline = rowBaseline(layout, row)
        runs.push(
          ...lineRuns(line.text, columnX(layout, line.column), baseline, charWidth, line.marks, {
            italic: style?.italic ?? false
          })
        )
        const number = fragment.firstLine + i === 0 ? numbers.get(fragment.elementIndex) : undefined
        if (number !== undefined)
          runs.push(rightAligned(`${number}.`, profile.sceneNumber.rightPt, baseline))
        row++
      })
    }
    // Numéro de page à partir de la deuxième page du scénario (la première porte le 1, non affiché).
    if (page.number > 1) {
      const baseline = profile.pageNumber.topPt + capHeight(layout)
      runs.push(rightAligned(`${page.number}.`, profile.pageNumber.rightPt, baseline))
    }
    return { runs }
  })

  function rightAligned(text: string, right: number, baseline: number): TextRun {
    return {
      text,
      x: right - textWidth(layout, text),
      baseline,
      bold: false,
      italic: false,
      underline: false
    }
  }
}
