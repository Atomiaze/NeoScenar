import { describe, expect, it } from 'vitest'
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { exportStoryboardPdf, layoutStoryboard, qrPayload } from '../src/index.ts'
import { markCenters, MM, PAGE } from '../src/geometry.ts'
import { qrMatrix } from '../src/qr.ts'
import { exampleInput, SHOTS_WITH_THUMBNAIL } from './fixtures.ts'
import { interMeasure } from './helpers.ts'

interface ReadPage {
  text: string
  /** Rectangles des images [x, y depuis le haut, largeur, hauteur], en points. */
  images: number[][]
}

/** Produit de deux matrices PDF [a b c d e f] : `m` appliquée avant `n`. */
function multiply(m: number[], n: number[]): number[] {
  const [a, b, c, d, e, f] = m
  const [a2, b2, c2, d2, e2, f2] = n
  return [
    a * a2 + b * c2,
    a * b2 + b * d2,
    c * a2 + d * c2,
    c * b2 + d * d2,
    e * a2 + f * c2 + e2,
    e * b2 + f * d2 + f2
  ]
}

/** Relit le PDF avec pdf.js : texte et position des images de chaque page. */
async function readPdf(bytes: Uint8Array): Promise<ReadPage[]> {
  const doc = await getDocument({ data: bytes.slice(), verbosity: 0 }).promise
  const pages: ReadPage[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    const content = await page.getTextContent()
    const text = content.items.map((item) => ('str' in item ? item.str : '')).join(' ')
    const ops = await page.getOperatorList()
    const images: number[][] = []
    // Matrice courante depuis le dernier « q » : pdf-lib y compose translation, rotation et échelle.
    let matrix = [1, 0, 0, 1, 0, 0]
    ops.fnArray.forEach((fn, index) => {
      if (fn === OPS.save) matrix = [1, 0, 0, 1, 0, 0]
      if (fn === OPS.transform) matrix = multiply(ops.argsArray[index] as number[], matrix)
      if (fn !== OPS.paintImageXObject) return
      const [w, , , h, x, y] = matrix
      images.push([x, PAGE.height - y - h, w, h])
    })
    pages.push({ text, images })
  }
  return pages
}

describe('PDF du storyboard', async () => {
  const storyboard = await exportStoryboardPdf(exampleInput('16-9', 'storyboard'))
  const pages = await readPdf(storyboard.pdf)
  const layout = layoutStoryboard(exampleInput('16-9', 'storyboard'), await interMeasure())

  it('a autant de pages que la mise en page', () => {
    expect(pages).toHaveLength(layout.pages.length)
    expect(storyboard.printRecord.pages).toHaveLength(layout.pages.length)
  })

  it('écrit les numéros, les champs et le numéro de page', () => {
    expect(pages[0].text).toContain('S_0010')
    expect(pages[0].text).toContain('P_0010')
    expect(pages[0].text).toContain('Échelle de plan :')
    expect(pages[0].text).toContain(`N° de page : 1 / ${pages.length}`)
  })

  it('pose chaque vignette exactement dans sa case', () => {
    const expected = layout.pages.map((page) =>
      page.cells
        .filter((cell) => SHOTS_WITH_THUMBNAIL.includes(cell.shotId))
        .map(({ rect }) => [rect.x, rect.y, rect.width, rect.height])
    )
    expect(pages.map((page) => page.images.length)).toEqual(expected.map((page) => page.length))
    pages.forEach((page, p) =>
      page.images.forEach((image, i) =>
        image.forEach((value, k) => expect(value).toBeCloseTo(expected[p][i][k], 3))
      )
    )
  })

  it('laisse vides les cases des planches à dessiner, à la même mise en page', async () => {
    const planches = await exportStoryboardPdf(exampleInput('16-9', 'planches'))
    const read = await readPdf(planches.pdf)
    expect(read.flatMap((page) => page.images)).toHaveLength(0)
    expect(planches.printRecord.pages).toEqual(storyboard.printRecord.pages)
    expect(planches.printRecord.kind).toBe('planches')
  })

  it('laisse vide la case d’une vignette illisible et la signale', async () => {
    const input = exampleInput('16-9', 'storyboard')
    const thumbnails = new Map(input.thumbnails)
    thumbnails.set('S_0010_P_0010', new Uint8Array([1, 2, 3]))
    const result = await exportStoryboardPdf({ ...input, thumbnails })
    expect(result.unreadableThumbnails).toEqual(['S_0010_P_0010'])
    const read = await readPdf(result.pdf)
    expect(read.flatMap((page) => page.images)).toHaveLength(SHOTS_WITH_THUMBNAIL.length - 1)
  })
})

describe('fichier d’impression', async () => {
  const input = exampleInput('2-39', 'planches')
  const { printRecord } = await exportStoryboardPdf(input)
  const layout = layoutStoryboard(input, await interMeasure())

  it('reprend les identifiants et le format', () => {
    expect(printRecord).toMatchObject({
      formatVersion: 1,
      printId: input.printId,
      projectId: input.projectId,
      kind: 'planches',
      format: { width: 1920, height: 804 },
      paper: { widthMm: 210, heightMm: 297 }
    })
  })

  it('place les marques à 6 mm des bords', () => {
    const { topLeft, bottomRight } = printRecord.marks.centersMm
    expect(topLeft.x).toBeCloseTo(6 + printRecord.marks.sizeMm / 2, 1)
    expect(bottomRight.y).toBeCloseTo(297 - 6 - printRecord.marks.sizeMm / 2, 1)
  })

  it('donne, pour chaque page, les cases dessinées en mm depuis la marque en haut à gauche', () => {
    const origin = markCenters()[0]
    printRecord.pages.forEach((page, p) => {
      const cells = layout.pages[p].cells
      expect(page.shots.map((s) => s.shotId)).toEqual(cells.map((c) => c.shotId))
      page.shots.forEach((recorded, i) => {
        const { rect } = cells[i]
        expect(recorded.cellMm.x).toBeCloseTo((rect.x - origin.x) / MM, 1)
        expect(recorded.cellMm.y).toBeCloseTo((rect.y - origin.y) / MM, 1)
        expect(recorded.cellMm.width / recorded.cellMm.height).toBeCloseTo(1920 / 804, 1)
      })
    })
    expect(printRecord.pages[0].shots[0]).toMatchObject({
      shotId: 'S_0010_P_0010',
      sceneId: 'S_0010',
      label: 'S_0010 · P_0010'
    })
  })

  it('rend un JSON sans perte', () => {
    expect(JSON.parse(JSON.stringify(printRecord))).toEqual(printRecord)
  })
})

describe('QR code', () => {
  it('contient le projet, l’impression et la page, dans un petit code (version 5 au plus)', () => {
    const payload = qrPayload('0b3c5a1e-1234-4abc-9def-0123456789ab', '20261119-153012-a3f9', 12)
    expect(payload).toBe('NEOSCENAR/1/0b3c5a1e-1234-4abc-9def-0123456789ab/20261119-153012-a3f9/12')
    expect(qrMatrix(payload).length).toBeLessThanOrEqual(37)
  })
})
