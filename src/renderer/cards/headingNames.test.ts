import { describe, expect, it } from 'vitest'
import type { Decoupage, Scene } from '../../shared/projectTypes'
import { headingNameLists, locationsOfOtherScenes } from './headingNames'

function scene(id: string, heading: string): Scene {
  return { id, heading } as Scene
}

const decoupage = {
  scenes: [
    scene('S_0010', 'INT. CUISINE - JOUR'),
    scene('S_0020', 'EXT. RUE SAINT-LUC - NUIT'),
    scene('S_0030', 'INT. CUISINE - NUIT'),
    scene('S_0040', 'SCÈNE À ÉCRIRE'),
    scene('S_0050', 'INT. GA'),
    scene('S_0060', 'INT. MAISON - ')
  ]
} as unknown as Decoupage

describe('locationsOfOtherScenes', () => {
  it('lit les lieux des autres scènes, sans la scène en cours ni l’en-tête provisoire', () => {
    expect(locationsOfOtherScenes(decoupage, 'S_0050')).toEqual([
      'CUISINE',
      'RUE SAINT-LUC',
      'CUISINE',
      'MAISON'
    ])
  })
})

describe('headingNameLists', () => {
  it('ajoute les fiches Lieux et les moments, sans doublon', () => {
    const lists = headingNameLists(decoupage, 'S_0050', ['Cuisine', 'GARAGE'], ['JOUR', 'NUIT'])
    expect(lists.locations).toEqual(['CUISINE', 'RUE SAINT-LUC', 'MAISON', 'GARAGE'])
    expect(lists.times).toEqual(['JOUR', 'NUIT'])
  })
})
