import fontkit from '@pdf-lib/fontkit'
import { PDFDocument } from 'pdf-lib'
import type { Measure, PageItem, PageLayout } from '../src/index.ts'
import { FONTS } from './fixtures.ts'

/** Mesure réelle avec la police Inter, comme au rendu. */
export async function interMeasure(): Promise<Measure> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const fonts = {
    regular: await pdf.embedFont(FONTS.regular, { subset: true }),
    bold: await pdf.embedFont(FONTS.bold, { subset: true })
  }
  return (text, face, size) => fonts[face].widthOfTextAtSize(text, size)
}

export type TextItem = Extract<PageItem, { type: 'text' }>

export function texts(page: PageLayout): TextItem[] {
  return page.items.filter((item): item is TextItem => item.type === 'text' && item.text !== '')
}

export function allText(pages: readonly PageLayout[]): string {
  return pages
    .map((page) =>
      texts(page)
        .map((t) => t.text)
        .join(' ')
    )
    .join(' ')
}

export interface Box {
  left: number
  right: number
  top: number
  bottom: number
}

export function textBox(item: TextItem, measure: Measure): Box {
  return {
    left: item.x,
    right: item.x + measure(item.text, item.face, item.size),
    top: item.baseline - item.size * 0.8,
    bottom: item.baseline + item.size * 0.22
  }
}

export function intersects(a: Box, b: Box): boolean {
  return (
    a.left < b.right - 0.01 &&
    b.left < a.right - 0.01 &&
    a.top < b.bottom - 0.01 &&
    b.top < a.bottom - 0.01
  )
}

export function words(text: string): string[] {
  return text.split(/\s+/).filter((word) => word !== '')
}
