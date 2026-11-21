import { describe, expect, it } from 'vitest'
import { mergeNameLists, mergeNames } from './nameLists'
import { headingProposals } from './proposals'

describe('mergeNames', () => {
  it('ajoute seulement les noms absents, sans tenir compte de la casse', () => {
    expect(mergeNames(['CUISINE'], ['cuisine', 'GARAGE'])).toEqual(['CUISINE', 'GARAGE'])
  })

  it('garde la même liste quand rien n’est ajouté', () => {
    const list = ['CUISINE']
    expect(mergeNames(list, undefined)).toBe(list)
  })
})

describe('mergeNameLists', () => {
  it('réunit les sources dans l’ordre, la première gardant la priorité', () => {
    const lists = mergeNameLists([
      { locations: ['CUISINE'] },
      { locations: ['Cuisine', 'GARAGE'], times: ['JOUR'] }
    ])
    expect(lists).toEqual({ locations: ['CUISINE', 'GARAGE'], characters: [], times: ['JOUR'] })
  })

  it('donne les mêmes propositions d’en-tête quel que soit le découpage en sources', () => {
    const one = mergeNameLists([{ locations: ['CUISINE', 'GARAGE'], times: ['JOUR', 'NUIT'] }])
    const two = mergeNameLists([
      { locations: ['CUISINE'] },
      { locations: ['GARAGE'], times: ['JOUR', 'NUIT'] }
    ])
    for (const typed of ['IN', 'INT. ', 'INT. C', 'INT. CUISINE - ', 'INT. CUISINE - N']) {
      expect(headingProposals(typed, two)).toEqual(headingProposals(typed, one))
    }
  })
})
