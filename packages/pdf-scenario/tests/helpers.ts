import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import {
  paginate,
  parse,
  resolveLayout,
  type LayoutProfile,
  type PaginationOptions
} from '@neoscenar/fountain'
import { exportScenarioPdf, planPages, type PdfInput, type PdfOptions } from '../src/index.ts'

const ROOT = join(import.meta.dirname, '..', '..', '..')

export function readFountainExample(name: string): string {
  return readFileSync(join(ROOT, 'packages', 'fountain', 'tests', 'exemples', name), 'utf8')
}

const profile: LayoutProfile = JSON.parse(
  readFileSync(join(ROOT, 'resources', 'mise-en-page', 'final-draft-a4.json'), 'utf8')
)
export const layout = resolveLayout(profile)

const font = (name: string): Uint8Array =>
  new Uint8Array(
    readFileSync(join(ROOT, 'resources', 'polices', 'courier-prime', `CourierPrime-${name}.ttf`))
  )
const fonts = {
  regular: font('Regular'),
  bold: font('Bold'),
  italic: font('Italic'),
  boldItalic: font('BoldItalic')
}

export const DEFAULT_OPTIONS: PdfOptions = {
  pageDeTitre: true,
  numerotation: 'fountain',
  scenario: true
}

export function inputFor(
  text: string,
  options: Partial<PdfOptions> = {},
  pagination: PaginationOptions = {}
): PdfInput {
  const document = parse(text)
  return {
    document,
    pagination: paginate(document, layout, pagination),
    layout,
    fonts,
    options: { ...DEFAULT_OPTIONS, ...options }
  }
}

export function plan(text: string, options: Partial<PdfOptions> = {}) {
  return planPages(inputFor(text, options))
}

export function exportPdf(
  text: string,
  options: Partial<PdfOptions> = {},
  pagination: PaginationOptions = {}
): Promise<Uint8Array> {
  return exportScenarioPdf(inputFor(text, options, pagination))
}

/** Ligne relue dans le PDF : texte de la zone de texte et numéro dans la marge gauche (s'il y en a un). */
export interface ReadLine {
  baseline: number
  margin: string
  text: string
}

export interface ReadPdf {
  pages: ReadLine[][]
  /** Polices utilisées sur chaque page. */
  fonts: Set<string>[]
  info: Record<string, unknown>
}

/** Relit le PDF avec pdf.js (le lecteur de Firefox) : texte de chaque page, ligne par ligne, de haut en bas. */
export async function readPdf(bytes: Uint8Array): Promise<ReadPdf> {
  const doc = await getDocument({ data: bytes.slice(), verbosity: 0 }).promise
  const pages: ReadLine[][] = []
  const fonts: Set<string>[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    const height = page.view[3]
    const content = await page.getTextContent()
    fonts.push(new Set())
    const rows = new Map<number, { x: number; str: string }[]>()
    for (const item of content.items) {
      if (!('str' in item) || item.str === '') continue
      fonts[n - 1].add(item.fontName)
      const baseline = Math.round((height - item.transform[5]) * 10) / 10
      const row = rows.get(baseline) ?? []
      row.push({ x: item.transform[4], str: item.str })
      rows.set(baseline, row)
    }
    pages.push(
      [...rows.entries()]
        .sort(([a], [b]) => a - b)
        .map(([baseline, items]) => {
          items.sort((a, b) => a.x - b.x)
          const margin = items.filter((item) => item.x < profile.text.leftPt - 1)
          const body = items.filter((item) => item.x >= profile.text.leftPt - 1)
          return {
            baseline,
            margin: margin.map((item) => item.str).join(''),
            text: joinByPosition(body)
          }
        })
    )
  }
  const { info } = await doc.getMetadata()
  return { pages, fonts, info: info as Record<string, unknown> }
}

/** Recolle les morceaux d'une ligne en remettant les espaces d'après leur position (chasse fixe). */
function joinByPosition(items: { x: number; str: string }[]): string {
  let text = ''
  let end: number | null = null
  for (const item of items) {
    if (end !== null)
      text += ' '.repeat(Math.max(0, Math.round((item.x - end) / profile.font.charWidthPt)))
    text += item.str
    end = item.x + item.str.length * profile.font.charWidthPt
  }
  return text.trim()
}
