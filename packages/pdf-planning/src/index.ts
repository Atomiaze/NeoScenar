// PDF du planning et du plan de tournage de NeoScenar. Règle : aucune dépendance à Electron, au DOM
// ni à Node ; le module reçoit des données déjà choisies et les polices, et rend les octets du PDF.
// Les couleurs sont fixes (ou celles des phases) : le thème de l'interface n'y touche jamais.

import { PDFDocument } from 'pdf-lib'
import { LABELS } from './labels.ts'
import { PageStack, frame } from './pages.ts'
import { createDocument, renderPages } from './render.ts'
import { layoutShooting } from './shooting.ts'
import { layoutTaskList } from './taskList.ts'
import { layoutTimeline } from './timeline.ts'
import type { Measure, PageLayout, PlanningPdfInput, ShootingPdfInput } from './types.ts'

export type * from './types.ts'
export { formatEighths } from './labels.ts'

function pdfTitle(title: string, kind: string): string {
  return title.trim() ? `${title.trim()} — ${kind}` : kind
}

/** Pages du PDF « Planning » : ligne du temps, puis liste par phase. */
export function layoutPlanning(input: PlanningPdfInput, measure: Measure): PageLayout[] {
  const stack = new PageStack()
  layoutTimeline(input, stack, measure)
  layoutTaskList(input.phases, stack, measure)
  frame(
    stack.pages,
    LABELS.planning,
    {
      title: input.title,
      exportDate: input.exportDate,
      extra: input.person === null ? null : LABELS.person(input.person)
    },
    measure
  )
  return stack.pages
}

/** Pages du PDF « Plan de tournage ». */
export function layoutShootingPlan(input: ShootingPdfInput, measure: Measure): PageLayout[] {
  const stack = new PageStack()
  layoutShooting(input, stack, measure)
  frame(
    stack.pages,
    LABELS.shooting,
    { title: input.title, exportDate: input.exportDate, extra: null },
    measure
  )
  return stack.pages
}

export async function exportPlanningPdf(input: PlanningPdfInput): Promise<Uint8Array> {
  const { pdf, fonts, measure } = await createDocument(input.fonts)
  return renderPages(
    pdf,
    fonts,
    layoutPlanning(input, measure),
    pdfTitle(input.title, LABELS.planning)
  )
}

export async function exportShootingPdf(input: ShootingPdfInput): Promise<Uint8Array> {
  const { pdf, fonts, measure } = await createDocument(input.fonts)
  return renderPages(
    pdf,
    fonts,
    layoutShootingPlan(input, measure),
    pdfTitle(input.title, LABELS.shooting)
  )
}

/** Nombre de pages d'un PDF produit par ce module (pour l'aperçu). */
export async function countPdfPages(bytes: Uint8Array): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount()
}
