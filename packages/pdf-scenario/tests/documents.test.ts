import { describe, expect, it } from 'vitest'
import {
  exportScenarioPdf,
  planPages,
  type DocumentLine,
  type PdfTextDocument
} from '../src/index.ts'
import { documentPagePlans } from '../src/documents.ts'
import { inputFor, layout, readFountainExample, readPdf } from './helpers.ts'

const rowOf = (baseline: number): number =>
  Math.round((baseline - 72 - 12 * (1187 / 2048)) / 12) + 1

const text = (value: string): DocumentLine => ({ kind: 'text', text: value, marks: [] })
const heading = (level: 1 | 2 | 3, value: string): DocumentLine => ({
  kind: 'heading',
  level,
  text: value,
  marks: []
})
const BLANK: DocumentLine = { kind: 'blank' }

const SYNOPSIS: PdfTextDocument = {
  title: 'Synopsis',
  lines: [
    heading(1, 'Début'),
    BLANK,
    {
      kind: 'text',
      text: 'Léa entre, très pressée.',
      marks: [{ from: 4, to: 9, bold: true, italic: false }]
    },
    BLANK,
    BLANK,
    heading(2, 'Milieu'),
    heading(3, 'Détail'),
    { kind: 'rule' },
    text('Fin.')
  ]
}

describe('pages des documents', () => {
  const [page] = documentPagePlans(SYNOPSIS, layout)
  const rows = page.runs.map((run) => [rowOf(run.baseline), run.text])

  it('commence par le titre automatique en titre 1 (gras, majuscules), puis le texte', () => {
    expect(rows[0]).toEqual([1, 'SYNOPSIS'])
    expect(page.runs[0].bold).toBe(true)
    expect(rows).toContainEqual([3, 'DÉBUT'])
  })

  it('met en forme les titres 2 (gras) et 3 (gras italique), garde le gras du texte', () => {
    const milieu = page.runs.find((run) => run.text === 'Milieu')
    const detail = page.runs.find((run) => run.text === 'Détail')
    expect([milieu?.bold, milieu?.italic]).toEqual([true, false])
    expect([detail?.bold, detail?.italic]).toEqual([true, true])
    expect(page.runs.find((run) => run.text === 'entre')?.bold).toBe(true)
  })

  it('ne laisse jamais deux lignes vides de suite, et met une ligne vide avant un titre', () => {
    expect(rows).toContainEqual([5, 'Léa '])
    expect(rows).toContainEqual([7, 'Milieu'])
    expect(rows).toContainEqual([9, 'Détail'])
  })

  it('trace la ligne horizontale sur la largeur du texte, aux marges du scénario', () => {
    expect(page.rules).toHaveLength(1)
    const [rule] = page.rules ?? []
    expect(rule.x1).toBe(layout.profile.text.leftPt)
    expect(rule.x2 - rule.x1).toBeCloseTo(layout.textWidthCh * layout.profile.font.charWidthPt, 5)
    expect(rows).toContainEqual([11, 'Fin.'])
  })

  it('coupe les longues lignes à la largeur du texte, et passe à la page suivante', () => {
    const long = 'mot '.repeat(40).trim()
    const pages = documentPagePlans(
      { title: 'Pitch', lines: Array.from({ length: 40 }, () => [text(long), BLANK]).flat() },
      layout
    )
    expect(pages.length).toBeGreaterThan(1)
    for (const plan of pages)
      for (const run of plan.runs) {
        expect(run.x + run.text.length * 7.2).toBeLessThanOrEqual(
          layout.profile.text.leftPt + layout.textWidthCh * 7.2 + 0.001
        )
        expect(rowOf(run.baseline)).toBeLessThanOrEqual(layout.linesPerPage)
      }
    // Une nouvelle page ne commence jamais par une ligne vide.
    expect(rowOf(pages[1].runs[0].baseline)).toBe(1)
  })

  it('ne laisse pas un titre seul en bas de page', () => {
    const filler = Array.from({ length: layout.linesPerPage - 4 }, (_, i) => text(`Ligne ${i}`))
    const pages = documentPagePlans(
      { title: 'Note d’intention', lines: [...filler, heading(2, 'Suite'), text('Texte.')] },
      layout
    )
    expect(pages).toHaveLength(2)
    expect(pages[1].runs.map((run) => run.text)).toEqual(['Suite', 'Texte.'])
  })
})

describe('PDF avec documents', () => {
  const EXAMPLE = readFountainExample('le-dernier-bus.fountain')
  const NOTE: PdfTextDocument = { title: 'Note d’intention', lines: [text('Pourquoi ce film.')] }

  it('ordre : page de titre, documents, scénario ; numérotation du scénario inchangée', () => {
    const alone = planPages(inputFor(EXAMPLE))
    const withDocs = planPages({ ...inputFor(EXAMPLE), documents: [SYNOPSIS, NOTE] })
    expect(withDocs).toHaveLength(alone.length + 2)
    expect(withDocs[0]).toEqual(alone[0])
    expect(withDocs[1].runs[0].text).toBe('SYNOPSIS')
    expect(withDocs[2].runs[0].text).toBe('NOTE D’INTENTION')
    expect(withDocs.slice(3)).toEqual(alone.slice(1))
  })

  it('sans le scénario : seulement les documents demandés, sans numéro de page', async () => {
    const input = {
      ...inputFor(EXAMPLE, { pageDeTitre: false, scenario: false }),
      documents: [SYNOPSIS, NOTE]
    }
    const pdf = await readPdf(await exportScenarioPdf(input))
    expect(pdf.pages).toHaveLength(2)
    expect(pdf.pages[0][0].text).toBe('SYNOPSIS')
    expect(pdf.pages[1].map((line) => line.text)).toEqual(['NOTE D’INTENTION', 'Pourquoi ce film.'])
    expect(pdf.pages.flat().some((line) => /^\d+\.$/.test(line.text))).toBe(false)
  })
})

describe('page de titre : log line et tag line', () => {
  const TITLE = 'Title: Mon film\nAuthor: Alice\n\nINT. MAISON - JOUR\n\nTexte.\n'

  it('imprime la tag line en italique puis la log line, centrées sous le titre et l’auteur', () => {
    const [page] = planPages({
      ...inputFor(TITLE),
      titleExtras: { tagLine: 'Il ne reviendra pas.', logLine: 'Un homme seul attend le bus.' }
    })
    const rows = page.runs.map((run) => [rowOf(run.baseline), run.text.trim(), run.italic])
    expect(rows).toEqual([
      [17, 'MON FILM', false],
      [23, 'Alice', false],
      [27, 'Il ne reviendra pas.', true],
      [29, 'Un homme seul attend le bus.', false]
    ])
    const log = page.runs[3]
    expect(log.x + (log.text.length * 7.2) / 2).toBeCloseTo(595 / 2, 5)
  })

  it('sans version retenue, la page de titre ne change pas', () => {
    const plain = planPages(inputFor(TITLE))[0]
    const extras = planPages({ ...inputFor(TITLE), titleExtras: { tagLine: null, logLine: null } })
    expect(extras[0]).toEqual(plain)
  })

  it('une log line seule suffit à faire une page de titre', () => {
    const pages = planPages({
      ...inputFor('INT. MAISON - JOUR\n\nTexte.\n'),
      titleExtras: { tagLine: null, logLine: 'Un homme seul.' }
    })
    expect(pages).toHaveLength(2)
    expect(pages[0].runs.map((run) => run.text)).toEqual(['Un homme seul.'])
  })
})
