import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { paginate, parse } from '@neoscenar/fountain'
import { scriptLayout } from '../script/layoutProfile'
import { buildNavigator } from '../script/navigator/buildNavigator'
import { computeStats, countWords, shotSecondsByNumber } from '../../shared/stats/computeStats'

function stats(text: string, shots?: Map<string, number>) {
  const doc = parse(text, { titlePage: false })
  return computeStats(doc, paginate(doc, scriptLayout), shots)
}

const SMALL = `# ACTE 1

INT. CUISINE - JOUR #10#

Marie prépare le café. Paul entre.

MARIE
Bonjour Paul.

PAUL (V.O.)
Salut ! Tu *as* bien dormi ? [[une note]]

EXT. JARDIN - NUIT #20#

Marie sort.

MARIE
(bas)
Il fait froid.

# ACTE 2

INT./EXT. CUISINE - SOIR #30#

Paul reste seul, sans MARIELLE.

MARIE (SUITE)
Reviens.
`

describe('statistiques d’un petit scénario écrit à la main', () => {
  const result = stats(SMALL)

  it('compte les mots sans signes seuls, notes ni mise en forme', () => {
    expect(countWords('Salut ! Tu *as* bien dormi ? [[note]]')).toBe(5)
    expect(countWords('')).toBe(0)
  })

  it('donne répliques et mots par personnage, extensions ignorées', () => {
    const marie = result.speech.find((stat) => stat.name === 'MARIE')
    const paul = result.speech.find((stat) => stat.name === 'PAUL')
    expect(marie).toMatchObject({ replies: 3, words: 2 + 3 + 1 })
    expect(paul).toMatchObject({ replies: 1, words: 5 })
    expect(result.speakingCharacters).toBe(2)
  })

  it('trie le temps de parole du plus long au plus court', () => {
    const seconds = result.speech.map((stat) => stat.seconds)
    expect(seconds).toEqual([...seconds].sort((a, b) => b - a))
    expect(seconds.every((value) => value > 0)).toBe(true)
  })

  it('dessine la grille : parle, nommé dans une action, absent', () => {
    const rows = Object.fromEntries(result.activity.map((row) => [row.name, row.cells]))
    expect(rows.MARIE).toEqual(['speaks', 'speaks', 'speaks'])
    // PAUL : parle en S_0010, absent en S_0020, nommé (action) en S_0030.
    expect(rows.PAUL).toEqual(['speaks', null, 'named'])
    expect(result.activityScenes.map((scene) => scene.label)).toEqual([
      'S_0010',
      'S_0020',
      'S_0030'
    ])
  })

  it('« MARIELLE » ne compte pas comme « MARIE » (mot entier)', () => {
    const text = `INT. A - JOUR #10#\n\nMarielle arrive.\n\nMARIE\nOui.\n\nINT. B - JOUR #20#\n\nMarielle dort.\n`
    const marie = stats(text).activity.find((row) => row.name === 'MARIE')
    expect(marie?.cells).toEqual(['speaks', null])
  })

  it('range les scènes par acte, INT/EXT et jour/nuit', () => {
    expect(result.scenes.map((scene) => [scene.intExt, scene.dayNight])).toEqual([
      ['int', 'day'],
      ['ext', 'night'],
      ['mixed', 'other']
    ])
    const [first, second, third] = result.scenes
    expect(first.actIndex).toBe(second.actIndex)
    expect(third.actIndex).not.toBe(first.actIndex)
    expect(first.actIndex).toBe(0)
  })

  it('totalise les scènes par lieu', () => {
    expect(result.locationCount).toBe(2)
    expect(result.locations[0]).toMatchObject({ name: 'CUISINE', scenes: 2 })
    expect(result.locations[1]).toMatchObject({ name: 'JARDIN', scenes: 1 })
    const total = result.locations.reduce((sum, place) => sum + place.seconds, 0)
    expect(total).toBeCloseTo(
      result.scenes.reduce((sum, scene) => sum + scene.seconds, 0),
      5
    )
  })

  it('compte les scènes, pages et durée', () => {
    expect(result.sceneCount).toBe(3)
    expect(result.pages).toBe(1)
    expect(result.seconds).toBeGreaterThan(0)
    expect(result.shotSeconds).toBeNull()
  })

  it('additionne les durées des plans, sans les cartes orphelines', () => {
    const cards = [
      { number: 10, letter: '', orphan: false, shots: [{ duration: 4 }, { duration: null }] },
      { number: 20, letter: 'A', orphan: false, shots: [{ duration: 6 }] },
      { number: 30, letter: '', orphan: true, shots: [{ duration: 100 }] }
    ]
    const shots = shotSecondsByNumber(cards)
    expect([...shots]).toEqual([
      ['10', 4],
      ['20A', 6]
    ])
    expect(stats(SMALL, shots).shotSeconds).toBe(10)
  })
})

describe('« Le Dernier Bus » : mêmes totaux que le navigateur', () => {
  const file = join(
    import.meta.dirname,
    '../../../packages/fountain/tests/exemples/le-dernier-bus.fountain'
  )
  const doc = parse(readFileSync(file, 'utf8'), { titlePage: false })
  const pagination = paginate(doc, scriptLayout)
  const result = computeStats(doc, pagination)
  const tree = buildNavigator(doc, pagination)

  it('pages, durée et nombre de scènes concordent', () => {
    expect(result.pages).toBe(pagination.pages.length)
    expect(result.sceneCount).toBe(tree.sceneCount)
    expect(result.seconds).toBeCloseTo(tree.totalSeconds, 5)
  })

  it('la grille et les barres ont une scène par colonne', () => {
    expect(result.scenes).toHaveLength(tree.sceneCount)
    expect(result.activity.every((row) => row.cells.length === tree.sceneCount)).toBe(true)
  })
})
