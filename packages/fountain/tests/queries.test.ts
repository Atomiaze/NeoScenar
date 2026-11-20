import { describe, expect, it } from 'vitest'
import { getCharacters, getLocations, getScenes, parse } from '../src/index.ts'
import { readExample } from './helpers.ts'

const SCRIPT = `Title: Essai

Avant la première scène.

INT. MAISON - CUISINE - JOUR #1#

Marie entre.

MARIE
Bonjour.

# Une section ne coupe pas la scène

JEAN (O.S.)
Salut !

EXT. JARDIN - NUIT

MARIE (SUITE)
Il fait froid.

@Marie
Vraiment froid.

INT. MAISON - CUISINE - SOIR

Jean range.
`

describe('getScenes', () => {
  const scenes = getScenes(parse(SCRIPT))

  it('va d’un en-tête au suivant ; ce qui précède n’appartient à aucune scène', () => {
    expect(scenes.map((scene) => scene.heading.text)).toEqual([
      'INT. MAISON - CUISINE - JOUR',
      'EXT. JARDIN - NUIT',
      'INT. MAISON - CUISINE - SOIR'
    ])
    expect(scenes[0].elements.map((element) => element.type)).toEqual([
      'action',
      'character',
      'dialogue',
      'section',
      'character',
      'dialogue'
    ])
  })

  it('donne l’en-tête analysé et la position', () => {
    expect(scenes[0].order).toBe(1)
    expect(scenes[0].info).toEqual({
      prefix: 'INT.',
      location: 'MAISON - CUISINE',
      time: 'JOUR',
      number: '1'
    })
    expect(scenes[0].position).toMatchObject({ startLine: 5, endLine: 15 })
    const { startOffset, endOffset } = scenes[1].position!
    expect(SCRIPT.slice(startOffset, endOffset)).toBe(
      'EXT. JARDIN - NUIT\n\nMARIE (SUITE)\nIl fait froid.\n\n@Marie\nVraiment froid.\n\n'
    )
  })

  it('renvoie une liste vide sans en-tête', () => {
    expect(getScenes(parse('Juste une action.'))).toEqual([])
  })
})

describe('getCharacters', () => {
  it('noms distincts, extensions et casse ignorées, avec le nombre de répliques', () => {
    expect(getCharacters(parse(SCRIPT))).toEqual([
      { name: 'MARIE', lines: 3 },
      { name: 'JEAN', lines: 1 }
    ])
  })

  it('sur l’exemple complet', () => {
    expect(getCharacters(parse(readExample('exemple-complet.fountain')))).toEqual([
      { name: 'CHLOÉ', lines: 3 },
      { name: 'FRANÇOIS', lines: 3 },
      { name: 'ÉLODIE', lines: 2 },
      { name: 'McCLANE', lines: 1 }
    ])
  })
})

describe('getLocations', () => {
  it('lieux distincts selon la règle NeoScenar, avec le nombre de scènes', () => {
    expect(getLocations(parse(SCRIPT))).toEqual([
      { name: 'MAISON - CUISINE', scenes: 2 },
      { name: 'JARDIN', scenes: 1 }
    ])
  })
})
