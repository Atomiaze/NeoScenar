// Dessin du PDF avec pdf-lib : police Inter incorporée (seulement les caractères utilisés),
// vignettes posées exactement dans leur case, marques d'angle et QR code de chaque page.

import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib'
import { CELL_FRAME, CONTENT, HEADER, MARK, PAGE, RULE_THICKNESS } from './geometry.ts'
import { LABELS } from './labels.ts'
import { qrMatrix } from './qr.ts'
import { qrPayload } from './printRecord.ts'
import type {
  FontFace,
  InkColor,
  Measure,
  PageItem,
  StoryboardInput,
  StoryboardLayout
} from './types.ts'

const COLORS: Record<InkColor, ReturnType<typeof rgb>> = {
  label: rgb(0, 0, 0),
  // Valeurs saisies dans NeoScenar : bleu foncé, comme une écriture à l'encre, lisible en noir et blanc.
  ink: rgb(0.08, 0.17, 0.45),
  muted: rgb(0.45, 0.45, 0.45)
}
const BLACK = rgb(0, 0, 0)
const RULE_COLOR = rgb(0.6, 0.6, 0.6)

export interface EmbeddedFonts {
  regular: PDFFont
  bold: PDFFont
}

export async function createDocument(input: StoryboardInput): Promise<{
  pdf: PDFDocument
  fonts: EmbeddedFonts
  measure: Measure
}> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const [regular, bold] = await Promise.all([
    pdf.embedFont(input.fonts.regular, { subset: true }),
    pdf.embedFont(input.fonts.bold, { subset: true })
  ])
  const fonts = { regular, bold }
  const measure: Measure = (text, face: FontFace, size) => fonts[face].widthOfTextAtSize(text, size)
  return { pdf, fonts, measure }
}

/** Vignette PNG (ou JPEG) ; null si le fichier est illisible : la case reste alors vide. */
async function embedThumbnail(pdf: PDFDocument, bytes: Uint8Array): Promise<PDFImage | null> {
  try {
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8
    return isJpeg ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes)
  } catch {
    return null
  }
}

function drawItem(
  page: PDFPage,
  item: PageItem,
  fonts: EmbeddedFonts,
  images: ReadonlyMap<string, PDFImage>
): void {
  const flip = (y: number): number => PAGE.height - y
  switch (item.type) {
    case 'text':
      page.drawText(item.text, {
        x: item.x,
        y: flip(item.baseline),
        size: item.size,
        font: fonts[item.face],
        color: COLORS[item.color]
      })
      return
    case 'rule':
      page.drawLine({
        start: { x: item.x1, y: flip(item.y) },
        end: { x: item.x2, y: flip(item.y) },
        thickness: RULE_THICKNESS,
        color: RULE_COLOR
      })
      return
    case 'frame':
      page.drawRectangle({
        x: item.x,
        y: flip(item.y + item.height),
        width: item.width,
        height: item.height,
        borderWidth: item.thickness,
        borderColor: BLACK
      })
      return
    case 'cell': {
      const image = images.get(item.shotId)
      const box = {
        x: item.x,
        y: flip(item.y + item.height),
        width: item.width,
        height: item.height
      }
      if (image) page.drawImage(image, box)
      page.drawRectangle({ ...box, borderWidth: CELL_FRAME, borderColor: BLACK })
      return
    }
  }
}

function drawMarks(page: PDFPage): void {
  const near = MARK.inset
  const far = { x: PAGE.width - MARK.inset - MARK.size, y: PAGE.height - MARK.inset - MARK.size }
  for (const x of [near, far.x]) {
    for (const y of [near, far.y]) {
      page.drawRectangle({
        x,
        y: PAGE.height - y - MARK.size,
        width: MARK.size,
        height: MARK.size,
        color: BLACK
      })
    }
  }
}

/** QR code à droite du cadre d'en-tête ; les cases noires voisines d'une ligne sont regroupées. */
function drawQr(page: PDFPage, payload: string): void {
  const matrix = qrMatrix(payload)
  const cell = HEADER.qrSize / matrix.length
  const left = CONTENT.right - HEADER.qrSize
  matrix.forEach((row, r) => {
    let c = 0
    while (c < row.length) {
      if (!row[c]) {
        c++
        continue
      }
      const start = c
      while (c < row.length && row[c]) c++
      page.drawRectangle({
        x: left + start * cell,
        y: PAGE.height - HEADER.top - (r + 1) * cell,
        width: (c - start) * cell,
        height: cell,
        color: BLACK
      })
    }
  })
}

export async function renderStoryboard(
  input: StoryboardInput,
  layout: StoryboardLayout,
  pdf: PDFDocument,
  fonts: EmbeddedFonts
): Promise<{ bytes: Uint8Array; unreadableThumbnails: string[] }> {
  const images = new Map<string, PDFImage>()
  const unreadableThumbnails: string[] = []
  if (input.kind === 'storyboard') {
    for (const shot of input.shots) {
      const bytes = input.thumbnails.get(shot.shotId)
      if (!bytes) continue
      const image = await embedThumbnail(pdf, bytes)
      if (image) images.set(shot.shotId, image)
      else unreadableThumbnails.push(shot.shotId)
    }
  }

  const title = input.title.trim()
  pdf.setTitle(title ? `${title} — ${LABELS.pdfTitle[input.kind]}` : LABELS.pdfTitle[input.kind])
  pdf.setCreator('NeoScenar')
  pdf.setProducer('NeoScenar')
  pdf.setLanguage('fr')

  for (const plan of layout.pages) {
    const page = pdf.addPage([PAGE.width, PAGE.height])
    for (const item of plan.items) drawItem(page, item, fonts, images)
    drawMarks(page)
    drawQr(page, qrPayload(input.projectId, input.printId, plan.number))
  }
  return { bytes: await pdf.save(), unreadableThumbnails }
}
