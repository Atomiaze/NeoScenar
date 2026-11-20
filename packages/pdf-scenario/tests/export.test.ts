import { describe, expect, it } from 'vitest'
import { paginate, parse } from '@neoscenar/fountain'
import { exportPdf, layout, plan, readFountainExample, readPdf } from './helpers.ts'

const EXAMPLE = readFountainExample('le-dernier-bus.fountain')

/**
 * Lignes attendues de chaque page du scénario, d'après la pagination (texte sans les espaces de début),
 * rangée par rangée : les deux colonnes d'un dialogue simultané partagent la même rangée.
 */
function expectedLines(text: string): string[][] {
  const pagination = paginate(parse(text), layout)
  return pagination.pages.map((page) =>
    page.fragments
      .flatMap((fragment) =>
        pagination.layouts[fragment.elementIndex].lines
          .slice(fragment.firstLine, fragment.firstLine + fragment.lineCount)
          .map((line, index) => ({
            row: fragment.row + index,
            column: line.column,
            text: line.text
          }))
      )
      .sort((a, b) => a.row - b.row || a.column - b.column)
      .map((line) => line.text.trim())
  )
}

// La comparaison avec le PDF de KIT se fait dans packages/fountain/tests/reference.test.ts (local).
describe('« Le Dernier Bus » (scénario d’exemple)', async () => {
  const pdf = await readPdf(await exportPdf(EXAMPLE))
  const scriptPages = pdf.pages.slice(1)
  // Le lecteur de PDF réunit sur une ligne les deux colonnes d'un dialogue simultané.
  const body = (page: { text: string }[]): string[] =>
    page.flatMap((line) => line.text.split(/\s{2,}/)).filter((text) => !/^\d+\.$/.test(text))

  it('donne 8 pages : la page de titre et 7 pages de scénario', () => {
    expect(pdf.pages).toHaveLength(8)
  })

  it('commence chaque page comme la pagination', () => {
    expect(scriptPages.map((page) => body(page)[0])).toEqual([
      'INT. LYCÉE - SALLE DE THÉÂTRE - SOIR',
      'LA MÈRE (V.O.)',
      'INÈS',
      'ÉLIOTT',
      'LE CAISSIER',
      'ÉLIOTT',
      "INT. MAISON D'INÈS - NUIT"
    ])
  })

  it('imprime, page par page, exactement les lignes de la pagination', () => {
    expect(scriptPages.map(body)).toEqual(expectedLines(EXAMPLE))
  })

  it('place les lignes sur la grille de 58 lignes, à 12 pt d’intervalle', () => {
    const first = scriptPages[0][0].baseline
    expect(first).toBeCloseTo(72 + 12 * (1187 / 2048), 1)
    for (const page of scriptPages)
      for (const line of page.filter((l) => l.baseline > 60)) {
        const row = (line.baseline - first) / 12
        expect(Math.abs(row - Math.round(row))).toBeLessThan(0.01)
        expect(Math.round(row)).toBeLessThan(58)
      }
  })

  it('numérote les pages à partir de la deuxième page du scénario, en haut à droite', () => {
    const pageNumbers = scriptPages.map((page) => page.find((line) => line.baseline < 60)?.text)
    expect(pageNumbers).toEqual([undefined, '2.', '3.', '4.', '5.', '6.', '7.'])
  })

  it('écrit les numéros de scène dans la marge gauche', () => {
    const numbers = scriptPages.flatMap((page) => page.filter((l) => l.margin).map((l) => l.margin))
    expect(numbers).toEqual(['1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.'])
  })

  it('garde les accents dans le texte sélectionnable', () => {
    const all = scriptPages
      .flat()
      .map((line) => line.text)
      .join('\n')
    expect(all).toContain('ÉLIOTT')
    expect(all).toContain('À cause de mon frère.')
    expect(all).toMatch(/[àâçéèêëîïôûù]/)
  })

  it('imprime la page de titre', () => {
    expect(pdf.pages[0].map((line) => line.text)).toEqual([
      'LE DERNIER BUS',
      'Comédie dramatique',
      "Atelier d'écriture",
      'Classe de 5e audiovisuel',
      'Scénario original',
      'contact@example.com',
      '2026'
    ])
  })

  it('renseigne le titre, l’auteur et le créateur du PDF', () => {
    expect(pdf.info.Title).toBe('LE DERNIER BUS')
    expect(pdf.info.Author).toBe("Atelier d'écriture, Classe de 5e audiovisuel")
    expect(pdf.info.Creator).toBe('NeoScenar')
  })
})

describe('page de titre', () => {
  const TITLE = `Title: Mon film
Credit: Comédie
Author: Alice
    Bob
Source: D'après une idée de Chloé
Contact:
    Saint Luc Liège
    alice@example.com
Draft date: 2026
Notes: ne pas imprimer
Inconnue: ne pas imprimer

INT. HÔPITAL - JOUR #10#

Texte.
`
  const rowOf = (baseline: number): number =>
    Math.round((baseline - 72 - 12 * (1187 / 2048)) / 12) + 1

  it('place les champs sur les lignes de KIT ; un auteur sur deux lignes repousse la mention', () => {
    const [titlePage] = plan(TITLE)
    const rows = titlePage.runs.map((run) => [rowOf(run.baseline), run.text.trim()])
    expect(rows).toEqual([
      [17, 'MON FILM'],
      [21, 'Comédie'],
      [23, 'Alice'],
      [24, 'Bob'],
      [26, "D'après une idée de Chloé"],
      [40, 'Saint Luc Liège'],
      [41, 'alice@example.com'],
      [58, '2026']
    ])
  })

  it('souligne le titre et centre les champs sur la page ; le contact est à la marge gauche', () => {
    const [titlePage] = plan(TITLE)
    const title = titlePage.runs[0]
    expect(title.underline).toBe(true)
    expect(title.x + (title.text.length * 7.2) / 2).toBeCloseTo(595 / 2, 5)
    expect(titlePage.runs.find((run) => run.text === 'Saint Luc Liège')?.x).toBe(108)
  })

  it("n'imprime ni les notes ni les clés inconnues", async () => {
    const pdf = await readPdf(await exportPdf(TITLE))
    expect(pdf.pages[0].map((line) => line.text).join(' ')).not.toContain('ne pas imprimer')
  })

  it("est omise si l'option est décochée, ou si le scénario n'en a pas", async () => {
    expect(plan(TITLE, { pageDeTitre: false })).toHaveLength(1)
    expect(plan('INT. MAISON - JOUR\n\nTexte.\n')).toHaveLength(1)
  })
})

describe('numéros de scène', () => {
  const TEXT = `INT. A - JOUR #10#

Un.

INT. B - JOUR #20#

Deux.

INT. HÔPITAL - NUIT #30#

Trois.

INT. D - NUIT

Quatre.
`
  const margins = async (numerotation: 'fountain' | 'continue'): Promise<string[]> => {
    const pdf = await readPdf(await exportPdf(TEXT, { numerotation }))
    return pdf.pages
      .flat()
      .filter((line) => line.margin)
      .map((line) => line.margin)
  }

  it('reprend le numéro écrit dans le Fountain ; une scène sans numéro prend sa place', async () => {
    expect(await margins('fountain')).toEqual(['10.', '20.', '30.', '4.'])
  })

  it('numérote 1, 2, 3 avec l’option « continue », sans toucher au texte', async () => {
    expect(await margins('continue')).toEqual(['1.', '2.', '3.', '4.'])
  })

  it('n’imprime pas le #30# dans l’en-tête', async () => {
    const pdf = await readPdf(await exportPdf(TEXT))
    expect(pdf.pages[0].map((line) => line.text)).toContain('INT. HÔPITAL - NUIT')
  })
})

describe('éléments', () => {
  const TEXT = `# ACTE 1

## Séquence

= Résumé à ne pas imprimer

INT. MAISON - JOUR

Action [[note à ne pas imprimer]] visible. /* texte masqué */

LE VOISIN(O.S.)
(bas)
Bonjour.

ÉLODIE (V.O.)
Salut.

> FONDU AU NOIR.

CUT TO:

> THE END <

===

EXT. RUE - NUIT

**Gras**, *italique*, _souligné_ et ***_les trois_***.

BOB ^
Ensemble.
`

  it('imprime chaque élément à sa place, et pas les notes, sections, résumés ni texte masqué', async () => {
    const pdf = await readPdf(await exportPdf(TEXT))
    const pages = pdf.pages.map((page) => page.map((line) => line.text))
    expect(pages).toHaveLength(2)
    expect(pages[0]).toEqual([
      'INT. MAISON - JOUR',
      // La note retirée laisse ses deux espaces, comme dans la pagination de l'éditeur.
      'Action  visible.',
      'LE VOISIN(O.S.)',
      '(bas)',
      'Bonjour.',
      'ÉLODIE (V.O.)',
      'Salut.',
      'FONDU AU NOIR.',
      'CUT TO:',
      'THE END'
    ])
    const all = pages.flat().join('\n')
    for (const hidden of ['ACTE', 'Séquence', 'Résumé', 'note', 'masqué'])
      expect(all).not.toContain(hidden)
  })

  it('aligne les transitions à droite et centre le texte centré', () => {
    const [page] = plan(TEXT)
    const run = (text: string) => page.runs.find((r) => r.text === text)!
    for (const transition of ['FONDU AU NOIR.', 'CUT TO:'])
      expect(run(transition).x + transition.length * 7.2).toBeCloseTo(108 + 61 * 7.2, 5)
    expect(run('THE END').x + (7 * 7.2) / 2).toBeCloseTo(108 + (61 * 7.2) / 2, 5)
  })

  it('imprime le gras, l’italique, le souligné et leurs combinaisons', () => {
    const page = plan(TEXT)[1]
    const styles = page.runs
      .filter((run) => run.text.trim() !== '' && run.baseline > 60)
      .map((run) => [run.text, run.bold, run.italic, run.underline])
    expect(styles).toContainEqual(['Gras', true, false, false])
    expect(styles).toContainEqual(['italique', false, true, false])
    expect(styles).toContainEqual(['souligné', false, false, true])
    expect(styles).toContainEqual(['les trois', true, true, true])
  })

  it('imprime la mise en forme dans le texte relu, sans les marqueurs, avec quatre polices', async () => {
    const pdf = await readPdf(await exportPdf(TEXT))
    expect(pdf.pages[1].map((line) => line.text)).toContain(
      'Gras, italique, souligné et les trois.'
    )
    expect(pdf.fonts[1].size).toBe(4)
  })

  it('imprime le dialogue double l’un sous l’autre (à revoir à l’étape 13)', async () => {
    const pdf = await readPdf(await exportPdf(TEXT))
    expect(pdf.pages[1].map((line) => line.text).slice(-2)).toEqual(['BOB', 'Ensemble.'])
  })
})

describe('automatismes (étape 13D)', async () => {
  const TEXT = readFountainExample('automatismes.fountain')
  const pdf = await readPdf(await exportPdf(TEXT, {}, { continued: true, newPageForActs: true }))
  const scriptPages = pdf.pages.slice(1)
  const texts = scriptPages.map((page) => page.map((line) => line.text))

  it('imprime (SUITE) après les extensions', () => {
    expect(texts.flat()).toContain('MARIE (V.O.) (SUITE)')
    expect(texts.flat()).toContain('MARIE (SUITE)')
  })

  it('commence chaque acte sur une nouvelle page', () => {
    expect(scriptPages).toHaveLength(3)
    expect(texts[1][0]).toBe('2.') // numéro de page, puis l'en-tête de l'acte deux
    expect(texts[1][1]).toBe('INT. SALON - NUIT')
  })

  it('imprime les dialogues simultanés côte à côte, sur les mêmes lignes', () => {
    const page = scriptPages[1]
    const names = page.find((line) => line.text.startsWith('PAUL') && line.text.endsWith('MARIE'))
    expect(names).toBeDefined()
    const next = page[page.indexOf(names!) + 1]
    expect(next.baseline - names!.baseline).toBe(12)
    expect(next.text).toMatch(/^On y va \? +Maintenant \? Il fait nuit,$/)
  })

  it('sans option, n’imprime ni (SUITE) ni page d’acte', async () => {
    const plain = await readPdf(await exportPdf(TEXT))
    expect(plain.pages.slice(1)).toHaveLength(2)
    expect(
      plain.pages.flat().some((line) => line.text.includes('(SUITE)') && line.text.includes('V.O.'))
    ).toBe(false)
  })
})
