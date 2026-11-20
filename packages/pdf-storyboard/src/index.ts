// Planches et PDF du storyboard de NeoScenar. Règle : aucune dépendance à Electron, au DOM ni à
// Node ; le module reçoit les plans, le format, les polices et les vignettes, et rend les octets du
// PDF avec le contenu du fichier d'impression.

import { layoutStoryboard } from './layout.ts'
import { buildPrintRecord } from './printRecord.ts'
import { createDocument, renderStoryboard } from './render.ts'
import type { StoryboardInput, StoryboardResult } from './types.ts'

export type * from './types.ts'
export { layoutStoryboard } from './layout.ts'
export { buildPrintRecord, qrPayload } from './printRecord.ts'

export async function exportStoryboardPdf(
  input: StoryboardInput
): Promise<StoryboardResult & { unreadableThumbnails: string[] }> {
  const { pdf, fonts, measure } = await createDocument(input)
  const layout = layoutStoryboard(input, measure)
  const { bytes, unreadableThumbnails } = await renderStoryboard(input, layout, pdf, fonts)
  return { pdf: bytes, printRecord: buildPrintRecord(input, layout), unreadableThumbnails }
}
