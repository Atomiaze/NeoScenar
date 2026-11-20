// Dessin avec pdf-lib : police Inter incorporée (seulement les caractères utilisés).

import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { PAGE } from './geometry.ts'
import type { Color, FontFace, Measure, PageItem, PageLayout, PdfFonts } from './types.ts'

export interface EmbeddedFonts {
  regular: PDFFont
  bold: PDFFont
}

export async function createDocument(fontFiles: PdfFonts): Promise<{
  pdf: PDFDocument
  fonts: EmbeddedFonts
  measure: Measure
}> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const [regular, bold] = await Promise.all([
    pdf.embedFont(fontFiles.regular, { subset: true }),
    pdf.embedFont(fontFiles.bold, { subset: true })
  ])
  const fonts = { regular, bold }
  const measure: Measure = (text, face: FontFace, size) => fonts[face].widthOfTextAtSize(text, size)
  return { pdf, fonts, measure }
}

function color(value: Color): ReturnType<typeof rgb> {
  const match = /^#?([0-9a-f]{6})$/i.exec(value)
  const n = match ? parseInt(match[1], 16) : 0
  return rgb(((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255)
}

function drawItem(page: PDFPage, item: PageItem, fonts: EmbeddedFonts): void {
  const flip = (y: number): number => PAGE.height - y
  switch (item.type) {
    case 'text':
      if (item.text === '') return
      page.drawText(item.text, {
        x: item.x,
        y: flip(item.baseline),
        size: item.size,
        font: fonts[item.face],
        color: color(item.color)
      })
      return
    case 'line':
      page.drawLine({
        start: { x: item.x1, y: flip(item.y1) },
        end: { x: item.x2, y: flip(item.y2) },
        thickness: item.width,
        color: color(item.color)
      })
      return
    case 'rect':
      page.drawRectangle({
        x: item.x,
        y: flip(item.y + item.height),
        width: item.width,
        height: item.height,
        ...(item.fill ? { color: color(item.fill) } : {}),
        ...(item.stroke ? { borderColor: color(item.stroke), borderWidth: item.strokeWidth } : {})
      })
      return
    case 'diamond': {
      const r = item.radius
      // drawSvgPath : origine au point donné, axe des y vers le bas (comme nos positions).
      page.drawSvgPath(`M 0 ${-r} L ${r} 0 L 0 ${r} L ${-r} 0 Z`, {
        x: item.cx,
        y: flip(item.cy),
        color: color(item.fill),
        ...(item.stroke ? { borderColor: color(item.stroke), borderWidth: 1.2 } : {})
      })
      return
    }
    case 'check': {
      const s = item.size
      page.drawSvgPath(
        `M ${s * 0.08} ${s * 0.55} L ${s * 0.4} ${s * 0.85} L ${s * 0.95} ${s * 0.15}`,
        {
          x: item.x,
          y: flip(item.y),
          borderColor: color(item.color),
          borderWidth: Math.max(0.8, s * 0.16)
        }
      )
      return
    }
  }
}

export async function renderPages(
  pdf: PDFDocument,
  fonts: EmbeddedFonts,
  pages: readonly PageLayout[],
  title: string
): Promise<Uint8Array> {
  pdf.setTitle(title)
  pdf.setCreator('NeoScenar')
  pdf.setProducer('NeoScenar')
  pdf.setLanguage('fr')
  for (const layout of pages) {
    const page = pdf.addPage([PAGE.width, PAGE.height])
    for (const item of layout.items) drawItem(page, item, fonts)
  }
  return pdf.save()
}
