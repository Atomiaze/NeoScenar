import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { paginate, parse } from '@neoscenar/fountain'
import { formatDuration } from '../../../shared/decoupage'
import { analyze } from '../editor/analysis'
import { scriptLayout } from '../layoutProfile'
import {
  buildNavigator,
  currentItem,
  flattenNavigator,
  type NavigatorItem,
  type NavigatorScene,
  type NavigatorSection
} from './buildNavigator'

function navigatorOf(text: string) {
  const doc = parse(text, { titlePage: false })
  return buildNavigator(doc, paginate(doc, scriptLayout))
}

/** Arbre réduit à sa forme : « # titre » pour un acte, « n. en-tête » pour une scène. */
function shape(items: NavigatorItem[]): unknown[] {
  return items.map((item) =>
    item.kind === 'section'
      ? { [`${'#'.repeat(item.level)} ${item.title}`]: shape(item.children) }
      : `${item.number} ${item.heading}`.trim()
  )
}

const scenes = (items: NavigatorItem[]): NavigatorScene[] =>
  flattenNavigator(items).filter((item): item is NavigatorScene => item.kind === 'scene')

const PER_LINE = 60 / 58

describe('arbre du navigateur', () => {
  const tree = navigatorOf(
    [
      'Une action d’ouverture, avant tout en-tête.',
      'INT. AVANT - JOUR #10#',
      '# ACTE 1 - INTRO',
      '## Séquence A',
      'INT. CUISINE - JOUR #20#',
      '### Détail',
      'EXT. RUE - NUIT #25A#',
      '## Séquence B',
      '# ACTE 2',
      '## Séquence vide',
      'INT. GRENIER - JOUR'
    ].join('\n\n')
  )

  it('imbrique #, ## et ### ; une section ferme celles de niveau égal ou inférieur', () => {
    expect(shape(tree.items)).toEqual([
      'S_0010 INT. AVANT - JOUR',
      {
        '# ACTE 1 - INTRO': [
          {
            '## Séquence A': [
              'S_0020 INT. CUISINE - JOUR',
              { '### Détail': ['S_0025A EXT. RUE - NUIT'] }
            ]
          },
          { '## Séquence B': [] }
        ]
      },
      // Sans numéro (pas encore relié aux cartes) : rien n'est affiché.
      { '# ACTE 2': [{ '## Séquence vide': ['INT. GRENIER - JOUR'] }] }
    ])
  })

  it('ignore le texte avant le premier en-tête ; compte les scènes', () => {
    expect(tree.sceneCount).toBe(4)
    expect(flattenNavigator(tree.items).every((item) => item.index > 0)).toBe(true)
  })

  it('une section sans scène apparaît avec une durée nulle', () => {
    const empty = (tree.items[1] as NavigatorSection).children[1]
    expect(empty).toMatchObject({ kind: 'section', title: 'Séquence B', seconds: 0 })
    expect(formatDuration(empty.seconds)).toBe('0:00')
  })

  it('donne à chaque acte la même couleur que son bandeau dans l’éditeur', () => {
    const doc = parse('# ACTE 1\n\n## A\n\n# ACTE 2\n', { titlePage: false })
    const colors = analyze('# ACTE 1\n\n## A\n\n# ACTE 2\n', 5).sectionColors
    const sections = flattenNavigator(buildNavigator(doc, paginate(doc, scriptLayout)).items)
    expect(sections.map((item) => (item as NavigatorSection).color)).toEqual([...colors.values()])
    expect(new Set(sections.map((item) => (item as NavigatorSection).color)).size).toBe(3)
  })
})

describe('numéros de scène', () => {
  it('sont ceux de la marge : S_0030 ; rien sans numéro valide (pas de numérotation 1, 2, 3)', () => {
    const text =
      'INT. A - JOUR\n\nEXT. B - NUIT #12A#\n\nINT. C - JOUR #3.1#\n\n.D #20#\n\nINT. E - JOUR'
    const margin = [...analyze(text, text.split('\n').length).sceneNumbers.values()]
    const shown = scenes(navigatorOf(text).items).map((scene) => scene.number)
    expect(shown).toEqual(['', 'S_0012A', '', 'S_0020', ''])
    expect(margin).toEqual(shown.filter((number) => number !== ''))
    expect(scenes(navigatorOf(text).items).map((scene) => scene.numberKey)).toEqual([
      null,
      '12A',
      null,
      '20',
      null
    ])
  })

  it('l’en-tête est affiché sans marqueur de forçage ni numéro', () => {
    expect(scenes(navigatorOf('.LE GRENIER #4#\n\nAction.').items)[0].heading).toBe('LE GRENIER')
  })
})

describe('durées', () => {
  const text = [
    'Ouverture, avant tout acte.', // 1 ligne (début de page)
    '# ACTE 1',
    'Une action d’ouverture de l’acte.', // 1 + 1
    '## Séquence',
    'INT. A - JOUR', // 2 + 1
    'Action.', // 1 + 1
    '# ACTE 2',
    'INT. B - JOUR', // 2 + 1
    'Une action.' // 1 + 1
  ].join('\n\n')
  const tree = navigatorOf(text)
  const [act1, act2] = tree.items as NavigatorSection[]

  it('par scène', () => {
    const [first, second] = scenes(tree.items)
    expect(first.seconds / PER_LINE).toBeCloseTo(5)
    expect(second.seconds / PER_LINE).toBeCloseTo(5)
  })

  it('par acte : tout jusqu’à la section suivante de même niveau ou plus haut, ouverture comprise', () => {
    expect(act1.seconds / PER_LINE).toBeCloseTo(7)
    expect(act1.children[0].seconds / PER_LINE).toBeCloseTo(5)
    expect(act2.seconds / PER_LINE).toBeCloseTo(5)
  })

  it('le total est la somme des actes, plus le texte avant le premier acte', () => {
    expect(tree.totalSeconds / PER_LINE).toBeCloseTo(13)
    expect(tree.totalSeconds).toBeCloseTo(act1.seconds + act2.seconds + PER_LINE)
  })

  it('format m:ss, puis h:mm:ss au-delà d’une heure', () => {
    expect(formatDuration(8)).toBe('0:08')
    expect(formatDuration(90)).toBe('1:30')
    expect(formatDuration(750)).toBe('12:30')
    expect(formatDuration(3599.6)).toBe('1:00:00')
    expect(formatDuration(3725)).toBe('1:02:05')
  })
})

describe('première ligne de la scène', () => {
  const first = (body: string): string =>
    scenes(navigatorOf(`INT. A - JOUR\n\n${body}`).items)[0].firstLine

  it('retire les marqueurs, la mise en forme et les notes', () => {
    expect(first('!Elle **court** [[plan large]] _vite_.\nSuite.')).toBe('Elle court vite.')
  })

  it('saute le synopsis et les notes ; prend un personnage s’il vient en premier', () => {
    expect(first('= Résumé.\n\n[[Note.]]\n\n@McCLANE\nYippee.')).toBe('McCLANE')
  })

  it('scène vide : première ligne vide', () => {
    expect(first('')).toBe('')
    expect(scenes(navigatorOf('INT. A - JOUR\n\n# ACTE 2\n\nAction.').items)[0].firstLine).toBe('')
  })
})

describe('« contient une note »', () => {
  const noted = (text: string): boolean[] =>
    flattenNavigator(navigatorOf(text).items).map((item) => item.hasNote)

  it('une marque de révision n’est pas une note : elle est comptée à part, et remonte vers l’acte', () => {
    const text =
      '# ACTE 1\n\nINT. A - JOUR\n\nElle [[R:jaune|Trop long]]entre[[/R]].\n\n' +
      'MARIE\n[[R:rose]]Bonjour.[[/R]]\n\nINT. B - NUIT\n\nIl [[R:bleu]]sort.\n'
    const items = flattenNavigator(navigatorOf(text).items)
    expect(items.map((item) => [item.hasNote, item.revisionCount])).toEqual([
      [true, 2],
      [false, 2],
      // Ouverture sans fermeture : une note ordinaire.
      [true, 0]
    ])
  })

  it('note dans l’action, l’en-tête ou un dialogue', () => {
    expect(noted('INT. A - JOUR\n\nElle [[à revoir]] entre.')).toEqual([true])
    expect(noted('INT. A - JOUR [[lieu ?]]\n\nElle entre.')).toEqual([true])
    expect(noted('INT. A - JOUR\n\nMARIE\nBonjour [[plus fort]].')).toEqual([true])
    expect(noted('INT. A - JOUR\n\nElle entre.')).toEqual([false])
  })

  it('remonte vers l’acte et ses parents ; le texte mis de côté ne compte pas', () => {
    expect(noted('# ACTE\n\n## SÉQ\n\nINT. A - JOUR\n\n[[Note.]]\n\nINT. B - JOUR')).toEqual([
      true,
      true,
      true,
      false
    ])
    expect(noted('# ACTE\n\nINT. A - JOUR\n\n/* ancien */')).toEqual([false, false])
  })
})

describe('scène courante', () => {
  const text =
    'Ouverture.\n\n# ACTE\n\nINT. A - JOUR #10#\n\nAction.\n\nINT. B - JOUR #20#\n\nAction.'
  const items = navigatorOf(text).items

  it('dernier en-tête ou section au-dessus du curseur ; rien avant', () => {
    expect(currentItem(items, 1)).toBeNull()
    expect(currentItem(items, 3)).toMatchObject({ kind: 'section', title: 'ACTE' })
    expect(currentItem(items, 7)).toMatchObject({ kind: 'scene', number: 'S_0010' })
    expect(currentItem(items, 11)).toMatchObject({ kind: 'scene', number: 'S_0020' })
  })
})

describe('scénario d’exemple de l’étape 6', () => {
  it('donne un arbre stable', () => {
    const file = join(
      import.meta.dirname,
      '../../../../packages/fountain/tests/exemples/exemple-complet.fountain'
    )
    const tree = navigatorOf(readFileSync(file, 'utf8').split('\n\n').slice(1).join('\n\n'))
    const summary = (items: NavigatorItem[]): unknown[] =>
      items.map((item) =>
        item.kind === 'section'
          ? {
              section: item.title,
              level: item.level,
              duration: formatDuration(item.seconds),
              note: item.hasNote,
              synopsis: item.synopsis,
              children: summary(item.children)
            }
          : {
              scene: `${item.number} ${item.heading}`.trim(),
              duration: formatDuration(item.seconds),
              firstLine: item.firstLine,
              note: item.hasNote
            }
      )
    expect({
      scenes: tree.sceneCount,
      total: formatDuration(tree.totalSeconds),
      items: summary(tree.items)
    }).toMatchSnapshot()
  })
})
