import { describe, expect, it } from 'vitest'
import { makeDecoupage } from '../../shared/decoupage/testFixtures'
import { planDeletion } from './deletion'

const decoupage = makeDecoupage({
  '10': ['10', '20', '30'],
  '20': ['10', '20', '30', '40'],
  '30': []
})

describe('suppression', () => {
  it('un seul plan : immédiate', () => {
    expect(planDeletion(decoupage, ['S10-P20'])).toEqual({
      items: { sceneIds: [], shotIds: ['S10-P20'] },
      confirmation: null
    })
  })

  it('une scène vide : immédiate', () => {
    expect(planDeletion(decoupage, ['S30'])?.confirmation).toBeNull()
  })

  it('plusieurs plans : confirmation', () => {
    const plan = planDeletion(decoupage, ['S10-P10', 'S10-P20', 'S20-P10', 'S20-P20', 'S20-P30'])
    expect(plan?.confirmation).toBe('Supprimer 5 plans ?')
  })

  it('une scène avec ses plans : confirmation qui nomme la scène', () => {
    expect(planDeletion(decoupage, ['S20'])?.confirmation).toBe('Supprimer S_0020 et ses 4 plans ?')
    expect(planDeletion(makeDecoupage({ '10': ['10'] }), ['S10'])?.confirmation).toBe(
      'Supprimer S_0010 et son plan ?'
    )
  })

  it('une scène et un de ses plans : le plan part avec la scène', () => {
    const plan = planDeletion(decoupage, ['S20', 'S20-P10'])
    expect(plan?.items).toEqual({ sceneIds: ['S20'], shotIds: [] })
    expect(plan?.confirmation).toBe('Supprimer S_0020 et ses 4 plans ?')
  })

  it('plusieurs scènes et des plans : confirmation détaillée', () => {
    expect(planDeletion(decoupage, ['S20', 'S30', 'S10-P10'])?.confirmation).toBe(
      'Supprimer 2 scènes (avec leurs 4 plans) et 1 autre plan ?'
    )
    expect(planDeletion(decoupage, ['S10', 'S20'])?.confirmation).toBe(
      'Supprimer 2 scènes (avec leurs 7 plans) ?'
    )
  })

  it('rien de sélectionné : rien à faire', () => {
    expect(planDeletion(decoupage, [])).toBeNull()
  })
})
