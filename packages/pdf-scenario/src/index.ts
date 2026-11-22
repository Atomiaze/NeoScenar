// Export PDF du scénario de NeoScenar. Règle : aucune dépendance à Electron, au DOM ni à Node ;
// le module reçoit la pagination, le profil, les polices et les options, et rend les octets du PDF.

import { documentInfo, titlePagePlan } from './titlePage.ts'
import { documentPagePlans } from './documents.ts'
import { scriptPagePlans } from './plan.ts'
import { renderPdf } from './render.ts'
import type { PagePlan, PdfInput } from './types.ts'

export type * from './types.ts'
export { sceneNumbers } from './plan.ts'

/**
 * Plan de toutes les pages : page de titre (si demandée et non vide), documents (synopsis, pitch,
 * note d'intention), puis le scénario (si demandé). La pagination du scénario n'est pas touchée.
 */
export function planPages(input: PdfInput): PagePlan[] {
  const { document, pagination, layout, options } = input
  const title = options.pageDeTitre ? titlePagePlan(document, layout, input.titleExtras) : null
  const documents = (input.documents ?? []).flatMap((doc) => documentPagePlans(doc, layout))
  const script = options.scenario
    ? scriptPagePlans(document, pagination, layout, options.numerotation)
    : []
  return [...(title ? [title] : []), ...documents, ...script]
}

/** La page de titre aurait-elle quelque chose à imprimer (champs du Fountain, log line, tag line) ? */
export function hasTitlePage(
  input: Pick<PdfInput, 'document' | 'layout' | 'titleExtras'>
): boolean {
  return titlePagePlan(input.document, input.layout, input.titleExtras) !== null
}

export async function exportScenarioPdf(input: PdfInput): Promise<Uint8Array> {
  return renderPdf(planPages(input), input.layout, input.fonts, documentInfo(input.document))
}
