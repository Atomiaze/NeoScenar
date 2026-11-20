// Export PDF du scénario de NeoScenar. Règle : aucune dépendance à Electron, au DOM ni à Node ;
// le module reçoit la pagination, le profil, les polices et les options, et rend les octets du PDF.

import { documentInfo, titlePagePlan } from './titlePage.ts'
import { scriptPagePlans } from './plan.ts'
import { renderPdf } from './render.ts'
import type { PagePlan, PdfInput } from './types.ts'

export type * from './types.ts'
export { sceneNumbers } from './plan.ts'

/** Plan de toutes les pages : page de titre (si demandée et non vide), puis le scénario. */
export function planPages(input: PdfInput): PagePlan[] {
  const { document, pagination, layout, options } = input
  const title = options.pageDeTitre ? titlePagePlan(document, layout) : null
  const script = scriptPagePlans(document, pagination, layout, options.numerotation)
  return title ? [title, ...script] : script
}

export async function exportScenarioPdf(input: PdfInput): Promise<Uint8Array> {
  return renderPdf(planPages(input), input.layout, input.fonts, documentInfo(input.document))
}
