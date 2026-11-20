import fontkit from '@pdf-lib/fontkit'
import { PDFDocument } from 'pdf-lib'
import type { Measure, PageItem } from '../src/index.ts'
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

export function texts(items: PageItem[]): TextItem[] {
  return items.filter((item): item is TextItem => item.type === 'text')
}

export interface Box {
  left: number
  right: number
  top: number
  bottom: number
}

/** Boîte occupée par un texte (des majuscules accentuées aux jambages). */
export function textBox(item: TextItem, measure: Measure): Box {
  return {
    left: item.x,
    right: item.x + measure(item.text, item.face, item.size),
    top: item.baseline - item.size * 0.8,
    bottom: item.baseline + item.size * 0.22
  }
}

export function intersects(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
}

/** Mots d'un texte, pour vérifier qu'aucun n'est perdu. */
export function words(text: string): string[] {
  return text.split(/\s+/).filter((word) => word !== '')
}
