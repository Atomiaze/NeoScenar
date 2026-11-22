// Les marques de révision sont des notes : la pagination, le PDF, les statistiques, les fiches et le
// rapprochement doivent donner exactement le même résultat avec ou sans elles (étape 13E).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { paginate, parse, resolveLayout, type LayoutProfile } from '@neoscenar/fountain'
import { exportScenarioPdf, planPages } from '@neoscenar/pdf-scenario'
import { applyTextChanges } from '../scriptLink/textChanges'
import { readScriptScenes } from '../scriptLink/scriptScenes'
import { scriptNames } from '../research/scriptSheets'
import { computeStats } from '../stats/computeStats'
import { comparisonText } from '../versions/compareScripts'
import { REVISION_COLORS, planComment, planHighlight, findRevisionMarks } from './revisionMarks'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const read = (...parts: string[]): string => readFileSync(join(ROOT, ...parts), 'utf8')
const EXAMPLE = read('packages', 'fountain', 'tests', 'exemples', 'le-dernier-bus.fountain')
const layout = resolveLayout(
  JSON.parse(read('resources', 'mise-en-page', 'final-draft-a4.json')) as LayoutProfile
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

/** Une marque (avec commentaire une fois sur deux) dans chaque paragraphe autorisé, sur un bout de texte. */
function markEverywhere(text: string): string {
  let marked = text
  let index = 0
  for (;;) {
    const doc = parse(marked)
    const element = doc.elements.find(
      (item) =>
        ['action', 'dialogue', 'parenthetical'].includes(item.type) &&
        !item.notes.some((note) => note.text.startsWith('R:'))
    )
    if (!element?.position) return marked
    const start = element.position.startOffset
    const length = element.position.endOffset - start
    // Un tiers du paragraphe, au milieu (coupe parfois un mot : c'est voulu).
    const selection = {
      from: start + Math.floor(length / 3),
      to: start + Math.ceil((2 * length) / 3)
    }
    const plan = planHighlight(marked, doc, selection, REVISION_COLORS[index % 4])
    const changes = 'error' in plan || plan.changes.length === 0 ? null : plan.changes
    if (!changes) {
      // Paragraphe trop court : marqué en entier.
      const whole = planHighlight(marked, doc, { from: start, to: start + length }, 'jaune')
      if ('error' in whole) return marked
      marked = applyTextChanges(marked, whole.changes)
    } else marked = applyTextChanges(marked, changes)
    if (index % 2 === 0) {
      const mark = findRevisionMarks(parse(marked)).find((item) => item.comment === '')
      if (mark) marked = applyTextChanges(marked, [planComment(mark, `Revoir ${index}`)])
    }
    index++
  }
}

const MARKED = markEverywhere(EXAMPLE)

function pdfInput(text: string) {
  const document = parse(text)
  return {
    document,
    pagination: paginate(document, layout, { continued: true }),
    layout,
    fonts,
    options: { pageDeTitre: true, numerotation: 'fountain' as const, scenario: true }
  }
}

/** Le PDF sans ses dates de création (seule chose qui change d'un export à l'autre). */
function withoutDates(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString('latin1')
    .replace(/\/(CreationDate|ModDate) \(D:[^)]*\)/g, '')
}

describe('les marques de révision sont ignorées', () => {
  it('le texte d’essai contient bien des marques partout', () => {
    expect(findRevisionMarks(parse(MARKED)).length).toBeGreaterThan(50)
  })

  it('pagination et PDF identiques', async () => {
    expect(planPages(pdfInput(MARKED))).toEqual(planPages(pdfInput(EXAMPLE)))
    const [marked, plain] = await Promise.all([
      exportScenarioPdf(pdfInput(MARKED)),
      exportScenarioPdf(pdfInput(EXAMPLE))
    ])
    expect(withoutDates(marked)).toBe(withoutDates(plain))
  })

  it('statistiques identiques', () => {
    const stats = (text: string) => {
      const doc = parse(text, { titlePage: false })
      return computeStats(doc, paginate(doc, layout))
    }
    expect(stats(MARKED)).toEqual(stats(EXAMPLE))
  })

  it('scènes (rapprochement) et noms des fiches identiques', () => {
    const scenes = (text: string) =>
      readScriptScenes(text).map(({ number, heading }) => ({ number, heading }))
    expect(scenes(MARKED)).toEqual(scenes(EXAMPLE))
    expect(scriptNames(parse(MARKED))).toEqual(scriptNames(parse(EXAMPLE)))
  })

  it('« Comparer » ne voit aucune différence', () => {
    expect(comparisonText(MARKED)).toBe(comparisonText(EXAMPLE))
  })
})
