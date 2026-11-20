import { describe, expect, it } from 'vitest'
import {
  compareScripts,
  comparisonText,
  sceneIdsOf,
  type ComparedScript,
  type DiffPart
} from './compareScripts'
import type { Decoupage } from '../projectTypes'

/** Comparaison sans découpage : association par numéro, puis par en-tête. */
const compareTexts = (before: string, after: string) =>
  compareScripts({ text: before }, { text: after })

const scene = (number: string, heading: string, body: string): string =>
  `${heading} #${number}#\n\n${body}\n\n`

const s10 = scene('10', 'INT. CUISINE - JOUR', 'Marie boit son café.')
const s20 = scene('20', 'EXT. RUE - NUIT', 'Paul court sous la pluie.')
const s30 = scene('30', 'INT. BUS - NUIT', 'Paul s’assoit, trempé.')
const s40 = scene('40', 'EXT. PARC - JOUR', 'Les enfants jouent.')

const joined = (parts: DiffPart[], kind: DiffPart['kind']): string =>
  parts
    .filter((part) => part.kind === kind)
    .map((part) => part.text.trim())
    .join(' ')

describe('compareScripts', () => {
  it('deux textes identiques : aucune différence', () => {
    const result = compareTexts(s10 + s20, s10 + s20)
    expect(result.items).toEqual([])
    expect(result.counts).toEqual({ added: 0, removed: 0, moved: 0, modified: 0, unchanged: 2 })
  })

  it('les fins de ligne Windows et la marque BOM ne comptent pas', () => {
    const windows = '\uFEFF' + (s10 + s20).replace(/\n/g, '\r\n')
    expect(compareTexts(s10 + s20, windows).items).toEqual([])
  })

  it('scène ajoutée et scène supprimée, chacune à sa place', () => {
    const result = compareTexts(s10 + s20 + s30, s10 + s30 + s40)
    expect(result.items.map((item) => [item.label, item.status])).toEqual([
      ['S_0020', 'removed'],
      ['S_0040', 'added']
    ])
    expect(result.items[0].parts).toEqual([
      { kind: 'removed', text: 'EXT. RUE - NUIT\n\nPaul court sous la pluie.' }
    ])
    expect(result.counts).toMatchObject({ added: 1, removed: 1, unchanged: 2 })
  })

  it('scène déplacée : seule celle qui change de place est signalée', () => {
    const result = compareTexts(s10 + s20 + s30 + s40, s10 + s30 + s40 + s20)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({ label: 'S_0020', moved: true, modified: false })
  })

  it('scène modifiée : mots ajoutés et retirés', () => {
    const changed = scene('20', 'EXT. RUE - NUIT', 'Paul marche sous la neige.')
    const result = compareTexts(s10 + s20, s10 + changed)
    expect(result.items).toHaveLength(1)
    const [item] = result.items
    expect(item).toMatchObject({ label: 'S_0020', status: 'kept', moved: false, modified: true })
    // La ponctuation est un mot à part : le point n'est ni ajouté ni retiré.
    expect(joined(item.parts, 'removed')).toBe('court pluie')
    expect(joined(item.parts, 'added')).toBe('marche neige')
  })

  it('scène déplacée et modifiée', () => {
    const changed = scene('10', 'INT. CUISINE - JOUR', 'Marie boit son thé.')
    const result = compareTexts(s10 + s20 + s30, s20 + s30 + changed)
    expect(result.items).toEqual([
      expect.objectContaining({ label: 'S_0010', moved: true, modified: true })
    ])
  })

  it('l’association se fait par numéro, même si l’en-tête change', () => {
    const renamed = scene('20', 'EXT. AVENUE - NUIT', 'Paul court sous la pluie.')
    const result = compareTexts(s10 + s20, s10 + renamed)
    expect(result.items[0]).toMatchObject({ status: 'kept', heading: 'EXT. AVENUE - NUIT' })
    expect(joined(result.items[0].parts, 'removed')).toBe('RUE')
  })

  it('scène sans numéro : associée par son en-tête', () => {
    const plain = 'INT. GRENIER - NUIT\n\nUne malle.\n\n'
    const plainChanged = 'INT. GRENIER - NUIT\n\nUne malle ouverte.\n\n'
    const result = compareTexts(s10 + plain, s10 + plainChanged)
    expect(result.items).toEqual([
      expect.objectContaining({ label: '', heading: 'INT. GRENIER - NUIT', status: 'kept' })
    ])
  })

  it('page de titre modifiée : une ligne à part', () => {
    const result = compareTexts('Title: Avant\n\n' + s10, 'Title: Après\n\n' + s10)
    expect(result.items).toEqual([expect.objectContaining({ kind: 'titlePage', modified: true })])
    expect(result.counts.unchanged).toBe(1)
  })

  it('une note [[ ]] modifiée rend la scène modifiée', () => {
    const noted = scene('10', 'INT. CUISINE - JOUR', 'Marie boit son café. [[à revoir]]')
    expect(compareTexts(s10, noted).items[0]).toMatchObject({ label: 'S_0010', modified: true })
  })
})

describe('association par identifiant de carte', () => {
  const side = (text: string, ids: Record<string, string>): ComparedScript => ({
    text,
    sceneIds: ids
  })
  const bar4 = scene('4', 'INT. BAR - NUIT', 'Hugo boit.')
  const bar2 = scene('2', 'INT. BAR - NUIT', 'Hugo boit.')
  const rue2 = scene('2', 'EXT. RUE - JOUR', 'Mélanie court.')
  const maison3 = scene('3', 'INT. MAISON - JOUR', 'Ils déjeunent.')

  it('scène déplacée puis renumérotée : déplacée, ancien et nouveau numéro', () => {
    // Avant : RUE #2, MAISON #3, BAR #4. Après : RUE supprimée, BAR renumérotée #2 avant MAISON.
    const result = compareScripts(
      side(rue2 + maison3 + bar4, { '2': 'rue', '3': 'maison', '4': 'bar' }),
      side(bar2 + maison3, { '2': 'bar', '3': 'maison' })
    )
    // Dans l'ordre d'« après » : BAR d'abord, puis RUE à son ancienne place (avant MAISON).
    expect(result.items.map((item) => [item.previousLabel, item.label, item.status])).toEqual([
      ['S_0004', 'S_0002', 'kept'],
      ['', 'S_0002', 'removed']
    ])
    expect(result.items[0]).toMatchObject({ moved: true, modified: false })
    expect(result.items[1].heading).toBe('EXT. RUE - JOUR')
    expect(result.counts).toMatchObject({ removed: 1, moved: 1, modified: 0, unchanged: 1 })
  })

  it('scène renumérotée sans être déplacée (insertion avant elle) : ni déplacée ni modifiée', () => {
    const before = scene('10', 'INT. A - JOUR', 'Un.') + scene('20', 'INT. B - JOUR', 'Deux.')
    const after =
      scene('10', 'INT. A - JOUR', 'Un.') +
      scene('20', 'INT. NOUVELLE - JOUR', 'Insérée.') +
      scene('30', 'INT. B - JOUR', 'Deux.')
    const result = compareScripts(
      side(before, { '10': 'a', '20': 'b' }),
      side(after, { '10': 'a', '20': 'nouvelle', '30': 'b' })
    )
    expect(result.items).toEqual([
      expect.objectContaining({ label: 'S_0020', heading: 'INT. NOUVELLE - JOUR', status: 'added' })
    ])
    expect(result.counts).toMatchObject({ added: 1, moved: 0, modified: 0, unchanged: 2 })
  })

  it('scène modifiée et renumérotée : l’étiquette montre le changement de numéro', () => {
    const result = compareScripts(
      side(scene('20', 'INT. B - JOUR', 'Deux.'), { '20': 'b' }),
      side(scene('30', 'INT. B - JOUR', 'Deux fois.'), { '30': 'b' })
    )
    expect(result.items[0]).toMatchObject({
      previousLabel: 'S_0020',
      label: 'S_0030',
      moved: false,
      modified: true
    })
  })

  it('deux cartes différentes au même numéro ne sont pas associées', () => {
    const result = compareScripts(
      side(scene('20', 'INT. B - JOUR', 'Deux.'), { '20': 'b' }),
      side(scene('20', 'INT. B - JOUR', 'Deux.'), { '20': 'autre' })
    )
    expect(result.items.map((item) => item.status)).toEqual(['added', 'removed'])
  })

  it('sans carte d’un côté : secours par numéro', () => {
    const result = compareScripts(
      side(scene('20', 'INT. B - JOUR', 'Deux.'), {}),
      side(scene('20', 'INT. C - JOUR', 'Deux.'), { '20': 'b' })
    )
    expect(result.items).toEqual([expect.objectContaining({ status: 'kept', modified: true })])
  })

  it('sceneIdsOf ignore les cartes orphelines', () => {
    const decoupage = {
      scenes: [
        { id: 'a', number: 10, letter: '', orphan: false },
        { id: 'b', number: 20, letter: 'A', orphan: false },
        { id: 'c', number: 30, letter: '', orphan: true }
      ]
    } as unknown as Decoupage
    expect(sceneIdsOf(decoupage)).toEqual({ '10': 'a', '20A': 'b' })
  })
})

describe('comparisonText', () => {
  it('uniformise les fins de ligne', () => {
    expect(comparisonText('\uFEFFa\r\nb\rc')).toBe('a\nb\nc')
  })
})
