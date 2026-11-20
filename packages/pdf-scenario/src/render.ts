// Dessin du PDF avec pdf-lib : polices Courier Prime incorporées (seulement les caractères utilisés).

import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, rgb, type PDFFont } from 'pdf-lib'
import type { ResolvedLayout } from '@neoscenar/fountain'
import type { DocumentInfo, PagePlan, PdfFonts } from './types.ts'

/** Épaisseur et position du soulignement de Courier Prime (130 et −185 sur 2048). */
const UNDERLINE_THICKNESS = 130 / 2048
const UNDERLINE_POSITION = 185 / 2048

export async function renderPdf(
  pages: PagePlan[],
  layout: ResolvedLayout,
  fonts: PdfFonts,
  info: DocumentInfo
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const embed = (bytes: Uint8Array): Promise<PDFFont> => pdf.embedFont(bytes, { subset: true })
  const [regular, bold, italic, boldItalic] = await Promise.all([
    embed(fonts.regular),
    embed(fonts.bold),
    embed(fonts.italic),
    embed(fonts.boldItalic)
  ])

  if (info.title) pdf.setTitle(info.title)
  if (info.author) pdf.setAuthor(info.author)
  pdf.setCreator('NeoScenar')
  pdf.setProducer('NeoScenar')
  pdf.setLanguage('fr')

  const { page: size, font } = layout.profile
  const black = rgb(0, 0, 0)
  for (const plan of pages) {
    const page = pdf.addPage([size.widthPt, size.heightPt])
    for (const run of plan.runs) {
      const face = run.bold ? (run.italic ? boldItalic : bold) : run.italic ? italic : regular
      const y = size.heightPt - run.baseline
      page.drawText(run.text, { x: run.x, y, size: font.sizePt, font: face, color: black })
      if (run.underline) {
        const lineY = y - UNDERLINE_POSITION * font.sizePt
        page.drawLine({
          start: { x: run.x, y: lineY },
          end: { x: run.x + run.text.length * font.charWidthPt, y: lineY },
          thickness: UNDERLINE_THICKNESS * font.sizePt,
          color: black
        })
      }
    }
  }
  return pdf.save()
}
