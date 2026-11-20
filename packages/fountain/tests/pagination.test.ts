import { describe, expect, it } from 'vitest'
import {
  estimateDurations,
  getSceneNumbers,
  getSectionEnds,
  getSectionRanges,
  pageStarts,
  paginate,
  parse,
  resolveLayout,
  type Pagination
} from '../src/index.ts'
import { readExample, readProfile } from './helpers.ts'

const layout = resolveLayout(readProfile())

/** k actions d'une ligne : la page est remplie sur 1 + 2 × (k − 1) lignes. */
function actions(count: number): string {
  return Array.from({ length: count }, (_, i) => `Action ${i + 1}.`).join('\n\n')
}

function pagesOf(pagination: Pagination, elementIndex: number): number[] {
  return pagination.pages
    .filter((page) => page.fragments.some((fragment) => fragment.elementIndex === elementIndex))
    .map((page) => page.number)
}

function firstFragment(pagination: Pagination, pageNumber: number) {
  return pagination.pages[pageNumber - 1].fragments[0]
}

describe('pagination', () => {
  it('remplit une page de 58 lignes, lignes vides comprises', () => {
    const pagination = paginate(parse(actions(29)), layout) // 1 + 2 × 28 = 57 lignes
    expect(pagination.pages).toHaveLength(1)
    expect(pagination.pages[0].usedLines).toBe(57)
    expect(paginate(parse(actions(30)), layout).pages).toHaveLength(2)
  })

  it('supprime les lignes vides en haut d’une page', () => {
    const pagination = paginate(parse(actions(31)), layout)
    expect(firstFragment(pagination, 2)).toMatchObject({ elementIndex: 29, spaceBefore: 0 })
    expect(pagination.pages[1].usedLines).toBe(3)
  })

  it('n’imprime pas une page vide pour un document vide ou un saut de page final', () => {
    expect(paginate(parse(''), layout).pages).toHaveLength(1)
    expect(paginate(parse(`${actions(2)}\n\n===\n`), layout).pages).toHaveLength(1)
  })

  it('un saut de page === commence une nouvelle page', () => {
    const pagination = paginate(parse('Avant.\n\n===\n\nAprès.\n'), layout)
    expect(
      pagination.pages.map((page) => page.fragments.map((fragment) => fragment.elementIndex))
    ).toEqual([[0], [2]])
  })

  it('un en-tête ne reste jamais seul en bas de page', () => {
    // 28 actions occupent 55 lignes : il en reste 3, assez pour 2 lignes vides et l'en-tête,
    // mais pas pour la ligne vide et la première ligne de l'action qui suit.
    const pagination = paginate(
      parse(`${actions(28)}\n\nINT. CUISINE - JOUR\n\nElle entre.\n`),
      layout
    )
    expect(pagesOf(pagination, 28)).toEqual([2])
    expect(firstFragment(pagination, 2)).toMatchObject({ elementIndex: 28, spaceBefore: 0 })
  })

  it('un en-tête reste en bas de page s’il tient avec sa ligne vide et la ligne qui suit', () => {
    const pagination = paginate(
      parse(`${actions(27)}\n\nINT. CUISINE - JOUR\n\nElle entre.\n`),
      layout
    )
    expect(pagesOf(pagination, 27)).toEqual([1])
    expect(pagesOf(pagination, 28)).toEqual([1])
    expect(pagination.pages[0].usedLines).toBe(58)
  })

  it('un en-tête suivi d’un dialogue passe à la page suivante si le bloc ne tient pas', () => {
    const text = `${actions(26)}\n\nINT. CUISINE - JOUR\n\nCHLOÉ\nUn.\nDeux.\nTrois.\nQuatre.\n`
    const pagination = paginate(parse(text), layout)
    // 51 lignes + 2 + 1 (en-tête) + 1 + bloc de 5 lignes = 60 > 58 : l'en-tête part avec le bloc.
    expect(pagesOf(pagination, 26)).toEqual([2])
    expect(pagesOf(pagination, 27)).toEqual([2])
  })

  it('un personnage n’est jamais séparé de son dialogue : le bloc passe entier à la page suivante', () => {
    const text = `${actions(28)}\n\nCHLOÉ\n(bas)\nUn.\nDeux.\n`
    const pagination = paginate(parse(text), layout)
    // Il reste 3 lignes : la ligne vide, le nom et la didascalie tiendraient, pas la réplique.
    expect(pagesOf(pagination, 28)).toEqual([2])
    expect(pagesOf(pagination, 29)).toEqual([2])
    expect(pagesOf(pagination, 30)).toEqual([2])
    expect(pagination.pages[0].usedLines).toBe(55)
  })

  it('coupe une longue action entre deux lignes', () => {
    const long = Array.from({ length: 70 }, (_, i) => `Ligne ${i + 1}`).join('\n')
    const pagination = paginate(parse(`Début.\n\n${long}\n`), layout)
    expect(pagesOf(pagination, 1)).toEqual([1, 2])
    expect(pagination.pages[0].fragments[1]).toMatchObject({
      firstLine: 0,
      lineCount: 56,
      spaceBefore: 1
    })
    expect(pagination.pages[1].fragments[0]).toMatchObject({
      firstLine: 56,
      lineCount: 14,
      spaceBefore: 0
    })
  })

  it('ne laisse jamais une ligne d’action isolée en bas de page', () => {
    const three = 'Un.\nDeux.\nTrois.'
    // Il reste 3 lignes (ligne vide + 2) : une action de 3 lignes ne peut pas être coupée en 2 + 1.
    const pagination = paginate(parse(`${actions(28)}\n\n${three}\n`), layout)
    expect(pagesOf(pagination, 28)).toEqual([2])
  })

  it('accepte 2 lignes en bas de page et 2 en haut de la suivante', () => {
    const pagination = paginate(parse(`${actions(28)}\n\nUn.\nDeux.\nTrois.\nQuatre.\n`), layout)
    expect(pagination.pages[0].fragments.at(-1)).toMatchObject({ elementIndex: 28, lineCount: 2 })
    expect(pagination.pages[1].fragments[0]).toMatchObject({
      elementIndex: 28,
      firstLine: 2,
      lineCount: 2
    })
  })

  it('ne laisse jamais une ligne d’action isolée en haut de la page suivante', () => {
    // Il reste 5 lignes (ligne vide + 4) pour une action de 5 lignes : 3 en bas, 2 en haut, pas 4 + 1.
    const five = 'Un.\nDeux.\nTrois.\nQuatre.\nCinq.'
    const pagination = paginate(parse(`${actions(27)}\n\n${five}\n`), layout)
    expect(pagination.pages[0].fragments.at(-1)).toMatchObject({ elementIndex: 27, lineCount: 3 })
    expect(pagination.pages[1].fragments[0]).toMatchObject({
      elementIndex: 27,
      firstLine: 3,
      lineCount: 2
    })
  })

  it('un en-tête passe à la page suivante si l’action qui le suit ne peut pas y laisser 2 lignes', () => {
    const text = `${actions(27)}\n\nINT. CUISINE - JOUR\n\nUn.\nDeux.\nTrois.\nQuatre.\n`
    // 53 lignes + 2 + en-tête + 1 = 57 : une seule ligne d'action tiendrait, ce n'est pas assez.
    expect(pagesOf(paginate(parse(text), layout), 27)).toEqual([2])
  })

  it('coupe un bloc de dialogue plus long qu’une page entière plutôt que de boucler', () => {
    const long = Array.from({ length: 70 }, (_, i) => `Réplique ${i + 1}`).join('\n')
    const pagination = paginate(parse(`CHLOÉ\n${long}\n`), layout)
    expect(pagination.pages).toHaveLength(2)
    expect(pagination.pages[0].usedLines).toBe(58)
  })

  it('donne la page de chaque élément ; un élément non imprimé prend celle du suivant', () => {
    const pagination = paginate(
      parse(`${actions(29)}\n\n# ACTE 2\n\nINT. CUISINE - JOUR\n\nAction.\n`),
      layout
    )
    expect(pagination.elementPages.slice(28)).toEqual([1, 2, 2, 2])
  })

  it('indique où commence chaque page à partir de la deuxième', () => {
    const text = `${actions(28)}\n\nINT. CUISINE - JOUR\n\nElle entre.\n`
    const starts = pageStarts(paginate(parse(text), layout))
    const offset = text.indexOf('INT. CUISINE')
    expect(starts).toEqual([
      {
        pageNumber: 2,
        elementIndex: 28,
        line: 0,
        sourceLine: 57,
        wrapIndex: 0,
        sourceOffset: offset
      }
    ])
  })

  it('situe le début d’une page au milieu d’un paragraphe coupé', () => {
    const long = Array.from({ length: 70 }, (_, i) => `Ligne ${i + 1}`).join('\n')
    const text = `Début.\n\n${long}\n`
    const [start] = pageStarts(paginate(parse(text), layout))
    expect(text.slice(start.sourceOffset, (start.sourceOffset ?? 0) + 8)).toBe('Ligne 57')
  })
})

describe('pagination du scénario d’exemple', () => {
  const doc = parse(readExample('exemple-complet.fountain'))
  const pagination = paginate(doc, layout)

  it('pose chaque ligne imprimée une seule fois, sans dépasser 58 lignes par page', () => {
    for (const page of pagination.pages) {
      // Les dialogues simultanés (côte à côte) partagent leurs lignes : on compte le bas de page.
      const used = Math.max(
        0,
        ...page.fragments.map((fragment) => fragment.row + fragment.lineCount)
      )
      expect(used).toBe(page.usedLines)
      expect(page.usedLines).toBeLessThanOrEqual(58)
      expect(page.fragments[0]?.spaceBefore ?? 0).toBe(0)
    }
    const placed = pagination.pages
      .flatMap((page) => page.fragments)
      .reduce((sum, f) => sum + f.lineCount, 0)
    const printed = pagination.layouts.reduce((sum, element) => sum + element.lines.length, 0)
    expect(placed).toBe(printed)
  })

  it('reste stable : même découpage à chaque calcul', () => {
    expect(paginate(parse(readExample('exemple-complet.fountain')), layout)).toEqual(pagination)
    expect(pagination.pages.map((page) => [page.number, page.usedLines])).toMatchSnapshot()
  })

  it('pagine un scénario de 120 pages en moins de 100 ms', () => {
    const body = readExample('exemple-complet.fountain').split('\n\n').slice(1).join('\n\n')
    let text = ''
    while (text.split('\n').length < 120 * 55) text += `${body}\n\n`
    const big = parse(text)
    paginate(big, layout) // échauffement
    let best = Infinity
    for (let run = 0; run < 5; run++) {
      const started = performance.now()
      paginate(big, layout)
      best = Math.min(best, performance.now() - started)
    }
    const pages = paginate(big, layout).pages.length
    console.log(`${pages} pages paginées en ${best.toFixed(1)} ms`)
    expect(best).toBeLessThan(100)
  })
})

describe('durées estimées', () => {
  it('une page pleine dure une minute, au prorata des lignes', () => {
    const doc = parse(actions(29)) // 57 lignes
    const durations = estimateDurations(doc, paginate(doc, layout))
    expect(durations.totalSeconds).toBeCloseTo((57 * 60) / 58, 6)
  })

  it('donne la durée de chaque scène et de chaque section ; la somme des scènes fait le total', () => {
    const doc = parse(
      '# ACTE 1\n\n## Séquence A\n\nINT. CUISINE - JOUR\n\nAction.\n\nCHLOÉ\nOui.\n\n# ACTE 2\n\nEXT. RUE - NUIT\n\nAction.\n'
    )
    const durations = estimateDurations(doc, paginate(doc, layout))
    const perLine = 60 / 58
    // Scène 1 : en-tête 1 (rien d'imprimé avant) + action 1 + 1 + personnage 1 + 1 + réplique 1 = 6 lignes.
    // Scène 2 : en-tête 2 + 1 + action 1 + 1 = 5 lignes.
    expect(durations.scenes.map((scene) => scene.seconds / perLine)).toEqual([6, 5])
    expect(durations.sections.map((section) => [section.level, section.seconds / perLine])).toEqual(
      [
        [1, 6],
        [2, 6],
        [1, 5]
      ]
    )
    expect(durations.totalSeconds / perLine).toBe(11)
  })

  it('une note ne compte pas', () => {
    const doc = parse('Action.\n\n[[Une longue note qui ne sera pas imprimée.]]\n')
    expect(estimateDurations(doc, paginate(doc, layout)).totalSeconds).toBeCloseTo(60 / 58, 6)
  })
})

describe('sections et bandeaux « FIN DE … »', () => {
  const doc = parse(
    [
      '# ACTE 1 - INTRO', // 0
      '## Séquence A', // 1
      'INT. CUISINE - JOUR', // 2
      '## Séquence B', // 3
      'EXT. RUE - NUIT', // 4
      '# ACTE 2 - LA QUÊTE', // 5
      'INT. GRENIER - JOUR', // 6
      '### Détail', // 7
      'Action.' // 8
    ].join('\n\n')
  )

  it('une section va jusqu’à la suivante de même niveau ou plus haut', () => {
    expect(
      getSectionRanges(doc).map((range) => [range.index, range.level, range.title, range.end])
    ).toEqual([
      [0, 1, 'ACTE 1 - INTRO', 5],
      [1, 2, 'Séquence A', 3],
      [3, 2, 'Séquence B', 5],
      [5, 1, 'ACTE 2 - LA QUÊTE', 9],
      [7, 3, 'Détail', 9]
    ])
  })

  it('place les bandeaux avec le titre complet, le plus profond d’abord quand plusieurs se terminent au même endroit', () => {
    expect(getSectionEnds(doc).map((end) => [end.title, end.beforeElement])).toEqual([
      ['Séquence A', 3],
      ['Séquence B', 5],
      ['ACTE 1 - INTRO', 5],
      ['Détail', null],
      ['ACTE 2 - LA QUÊTE', null]
    ])
  })

  it('un niveau plus profond qui suit ne ferme pas la section', () => {
    const ends = getSectionEnds(parse('## Séquence\n\nAction.\n\n# ACTE 2\n'))
    expect(ends.map((end) => [end.title, end.beforeElement])).toEqual([
      ['Séquence', 2],
      ['ACTE 2', null]
    ])
  })
})

describe('numéros de scène affichés', () => {
  it('numéro forcé #…# s’il existe, sinon l’ordre de la scène', () => {
    const doc = parse('INT. A - JOUR\n\nEXT. B - NUIT #12A#\n\nINT. C - JOUR\n')
    expect(getSceneNumbers(doc)).toEqual(['1', '12A', '3'])
  })
})
