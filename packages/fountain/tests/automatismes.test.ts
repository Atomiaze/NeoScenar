import { describe, expect, it } from 'vitest'
import {
  continuedCharacters,
  dualDialogues,
  estimateDurations,
  pageStarts,
  paginate,
  parse,
  resolveLayout,
  type Pagination
} from '../src/index.ts'
import { readExample, readProfile } from './helpers.ts'

const layout = resolveLayout(readProfile())
const TEXT = readExample('automatismes.fountain')

/** Texte imprimé de chaque élément (lignes jointes par « | »). */
function printed(pagination: Pagination): string[] {
  return pagination.layouts
    .filter((element) => element.lines.length > 0)
    .map((element) => element.lines.map((line) => line.text).join(' | '))
}

/** Lignes imprimées : [page, rang, colonne arrondie, texte]. */
function rows(pagination: Pagination): [number, number, number, string][] {
  return pagination.pages.flatMap((page) =>
    page.fragments.flatMap((fragment) =>
      pagination.layouts[fragment.elementIndex].lines
        .slice(fragment.firstLine, fragment.firstLine + fragment.lineCount)
        .map(
          (line, i) =>
            [page.number, fragment.row + i, Math.round(line.column), line.text] as [
              number,
              number,
              number,
              string
            ]
        )
    )
  )
}

describe('(SUITE)', () => {
  const doc = parse(TEXT)
  const names = (source: ReturnType<typeof parse>): string[] =>
    [...continuedCharacters(source)].map((index) => source.elements[index].text)

  it('ne s’ajoute que quand le même personnage reparle après des actions ou des notes', () => {
    // La 2e réplique de MARIE (V.O.) seulement : (SUITE) déjà écrit, autre personnage, autre scène.
    expect(names(doc)).toEqual(['MARIE (V.O.)'])
  })

  it('reconnaît le personnage malgré une extension différente, et CONT’D déjà écrit', () => {
    const text =
      'MARIE (V.O.)\nUn.\n\nElle sort.\n\nMARIE\nDeux.\n\nPAUL\nTrois.\n\nAction.\n\nPAUL (CONT’D)\nQuatre.\n'
    expect(names(parse(text))).toEqual(['MARIE'])
  })

  it('est coupée par un en-tête, une transition, une section ou un saut de page', () => {
    for (const breaker of ['INT. ICI - JOUR', 'CUT TO:', '# Acte', '===']) {
      const text = `MARIE\nUn.\n\n${breaker}\n\nMARIE\nDeux.\n`
      expect(continuedCharacters(parse(text)).size).toBe(0)
    }
  })

  it('est imprimée après les extensions, seulement avec l’option', () => {
    expect(printed(paginate(doc, layout))).not.toContain('MARIE (V.O.) (SUITE)')
    const withMark = printed(paginate(doc, layout, { continued: true }))
    expect(withMark.filter((text) => text.includes('(SUITE)'))).toEqual([
      'MARIE (V.O.) (SUITE)',
      'MARIE (SUITE)'
    ])
  })

  it('ne change pas le texte du fichier', () => {
    paginate(doc, layout, { continued: true })
    expect(doc.elements.some((element) => element.text === 'MARIE (V.O.) (SUITE)')).toBe(false)
  })
})

describe('dialogues simultanés', () => {
  const doc = parse(TEXT)

  it('associent le bloc marqué ^ au bloc qui le précède', () => {
    const pairs = dualDialogues(doc)
    expect(pairs).toHaveLength(1)
    expect(pairs[0].left.map((index) => doc.elements[index].type)).toEqual([
      'character',
      'dialogue'
    ])
    expect(pairs[0].right.map((index) => doc.elements[index].type)).toEqual([
      'character',
      'dialogue'
    ])
    // Le bloc qui suit la paire n'en fait pas partie.
    expect(doc.elements[pairs[0].right[1] + 1].text).toBe('PAUL')
  })

  it('sont côte à côte : deux colonnes de 28 caractères, noms centrés', () => {
    const all = rows(paginate(doc, layout))
    // Colonne de gauche à 0, de droite à 61 − 28 = 33 ; noms centrés sur 28 caractères.
    const paul = all.find((row) => row[3] === 'PAUL' && row[2] === 12)!
    const marie = all.find((row) => row[3] === 'MARIE' && row[1] === paul[1])
    expect(marie?.[2]).toBe(45) // 33 + (28 − 5) / 2 = 44,5
    expect(all.find((row) => row[3] === 'On y va ?')).toEqual([
      paul[0],
      paul[1] + 1,
      0,
      'On y va ?'
    ])
    const right = all.filter((row) => row[2] === 33)
    expect(right[0][1]).toBe(paul[1] + 1)
    expect(right.every((row) => row[3].length <= 28)).toBe(true)
  })

  it('occupent la hauteur de la plus longue colonne', () => {
    const pagination = paginate(doc, layout)
    const all = rows(pagination)
    const paul = all.find((row) => row[3] === 'PAUL' && row[2] === 12)!
    const longest = all.filter((row) => row[2] === 33).length
    const next = all.find((row) => row[3] === '(soupirant)')!
    // Nom, colonne la plus longue, une ligne vide, puis le nom du bloc suivant.
    expect(next[1]).toBe(paul[1] + 1 + longest + 1 + 1)
  })

  it('durent comme la plus longue colonne', () => {
    // Gauche : 2 lignes, droite : 4. L'un sous l'autre, la droite ajouterait aussi sa ligne vide.
    const stacked = parse(TEXT.replace('MARIE ^', 'MARIE'))
    const seconds = (source: ReturnType<typeof parse>): number =>
      estimateDurations(source, paginate(source, layout)).totalSeconds
    expect(seconds(stacked) - seconds(doc)).toBeCloseTo((3 * 60) / layout.linesPerPage, 5)
  })

  it('restent l’un sous l’autre si une colonne dépasse une page', () => {
    const long = Array.from({ length: 200 }, (_, i) => `Phrase ${i}.`).join(' ')
    const text = `PAUL\n${long}\n\nMARIE ^\nNon.\n`
    const pagination = paginate(parse(text), layout)
    expect(pagination.layouts.some((element) => element.dual !== undefined)).toBe(false)
  })

  it('ne sont pas coupés entre deux pages', () => {
    const filler = Array.from({ length: 28 }, (_, i) => `Action ${i}.`).join('\n\n')
    const text = `${filler}\n\nPAUL\nUn.\nDeux.\n\nMARIE ^\nTrois.\n`
    const pagination = paginate(parse(text), layout)
    const pages = new Set(
      rows(pagination)
        .filter((row) => ['PAUL', 'MARIE', 'Un.', 'Trois.'].includes(row[3]))
        .map((row) => row[0])
    )
    expect([...pages]).toEqual([2])
  })
})

describe('nouvelle page à chaque acte', () => {
  const doc = parse(TEXT)

  it('n’ajoute rien sans l’option', () => {
    expect(paginate(doc, layout).pages).toHaveLength(2) // seulement le saut ===
  })

  it('commence chaque acte sur une nouvelle page, sans page vide', () => {
    const pagination = paginate(doc, layout, { newPageForActs: true })
    expect(pagination.pages).toHaveLength(3)
    const firstTexts = pagination.pages.map(
      (page) => pagination.layouts[page.fragments[0].elementIndex].lines[0].text
    )
    expect(firstTexts).toEqual(['INT. CUISINE - JOUR', 'INT. SALON - NUIT', 'INT. GARAGE - NUIT'])
  })

  it('place le trait de l’éditeur sur la ligne de l’acte', () => {
    const pagination = paginate(doc, layout, { newPageForActs: true })
    const start = pageStarts(pagination)[0]
    expect(TEXT.slice(start.sourceOffset).startsWith('# Acte deux')).toBe(true)
  })

  it('un saut === juste avant un acte ne fait pas de page vide', () => {
    const text = 'Avant.\n\n===\n\n# Acte\n\nAprès.\n'
    expect(paginate(parse(text), layout, { newPageForActs: true }).pages).toHaveLength(2)
  })
})
