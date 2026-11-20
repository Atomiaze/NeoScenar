// Un scénario retouché dans le Bloc-notes de Windows (fins de ligne CRLF, marque BOM) donne
// exactement la même pagination, les mêmes statistiques et le même PDF (étape 16A).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { paginate, parse, resolveLayout, type LayoutProfile } from '@neoscenar/fountain'
import { exportScenarioPdf } from '@neoscenar/pdf-scenario'
import { computeStats } from '../../shared/stats/computeStats'
import { joinScenario, splitScenario } from './scenarioText'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const EXAMPLE = join(ROOT, 'packages', 'fountain', 'tests', 'exemples', 'le-dernier-bus.fountain')

const layout = resolveLayout(
  JSON.parse(
    readFileSync(join(ROOT, 'resources', 'mise-en-page', 'final-draft-a4.json'), 'utf8')
  ) as LayoutProfile
)
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

async function pdfOf(text: string): Promise<Buffer> {
  const document = parse(text)
  const bytes = await exportScenarioPdf({
    document,
    pagination: paginate(document, layout, { continued: true }),
    layout,
    fonts,
    options: { pageDeTitre: true, numerotation: 'fountain' }
  })
  return Buffer.from(bytes)
}

/** Ce que l'écran et le PDF montrent : pages, fragments et lignes mises en page. */
function shownPages(text: string): unknown {
  const pagination = paginate(parse(text), layout, { continued: true })
  return {
    pages: pagination.pages,
    lines: pagination.layouts.map((element) => element.lines.map((line) => line.text))
  }
}

describe('scénario avec les fins de ligne de Windows', () => {
  const lf = readFileSync(EXAMPLE, 'utf8').replace(/\r\n?/g, '\n')
  const crlf = lf.replace(/\n/g, '\r\n')
  const withBom = '﻿' + crlf

  afterEach(() => vi.useRealTimers())

  it('l’exemple contient bien des fins de ligne à convertir', () => {
    expect(crlf).toContain('\r\n')
    expect(crlf.length).toBeGreaterThan(lf.length + 100)
  })

  it('même pagination, avec ou sans marque BOM', () => {
    expect(shownPages(crlf)).toEqual(shownPages(lf))
    expect(shownPages(withBom)).toEqual(shownPages(lf))
  })

  it('mêmes statistiques', () => {
    const stats = (text: string): unknown => {
      const doc = parse(text)
      return computeStats(doc, paginate(doc, layout))
    }
    expect(stats(crlf)).toEqual(stats(lf))
  })

  it('PDF identique octet par octet, à date fixée', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-20T10:00:00Z'), toFake: ['Date'] })
    const reference = await pdfOf(lf)
    expect((await pdfOf(crlf)).equals(reference)).toBe(true)
    expect((await pdfOf(withBom)).equals(reference)).toBe(true)
  })

  it('l’éditeur reçoit le même texte et NeoScenar réécrit le fichier avec « \\n »', () => {
    const parts = splitScenario(crlf)
    expect(parts.body).toBe(splitScenario(lf).body)
    expect(joinScenario(parts, parts.body)).toBe(lf)
  })
})
