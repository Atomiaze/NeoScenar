import { describe, expect, it } from 'vitest'
import { cards } from '../../../shared/scriptLink/testHelpers'
import { cutSeconds } from './cutDuration'

describe('durée du découpage dans le navigateur', () => {
  const decoupage = cards(['10', '20'])
  decoupage.scenes[1].shots = [
    { ...decoupage.scenes[1].shots[0], duration: 40 },
    { ...decoupage.scenes[1].shots[0], id: 'autre', duration: null },
    { ...decoupage.scenes[1].shots[0], id: 'encore', duration: 32 }
  ]

  it('somme des durées des plans, retrouvée par le numéro de la scène', () => {
    expect(cutSeconds(decoupage, '20')).toBe(72)
  })

  it('aucune durée de plan, pas de carte ou pas de numéro : rien', () => {
    expect(cutSeconds(decoupage, '10')).toBeNull()
    expect(cutSeconds(decoupage, '30')).toBeNull()
    expect(cutSeconds(decoupage, null)).toBeNull()
    expect(cutSeconds(null, '20')).toBeNull()
  })
})
