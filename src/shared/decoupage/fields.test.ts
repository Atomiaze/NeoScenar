import { describe, expect, it } from 'vitest'
import { setColor, updateScene, updateShot } from './fields'
import { makeDecoupage } from './testFixtures'

describe('modifier une fiche plan', () => {
  it('modifie les champs demandés et rien d’autre', () => {
    const start = makeDecoupage({ '10': ['10', '20'] })
    const result = updateShot(start, 'S10-P20', { duration: 3.5, shotSize: 'Gros plan' })
    if (!result.ok) throw new Error(result.problem)
    expect(result.decoupage.scenes[0].shots[1]).toMatchObject({
      duration: 3.5,
      shotSize: 'Gros plan',
      name: ''
    })
    expect(result.decoupage.scenes[0].shots[0]).toBe(start.scenes[0].shots[0])
    expect(start.scenes[0].shots[1].duration).toBeNull()
  })

  it('refuse une durée négative ou une couleur mal écrite', () => {
    const start = makeDecoupage({ '10': ['10'] })
    expect(updateShot(start, 'S10-P10', { duration: -1 }).ok).toBe(false)
    expect(updateShot(start, 'S10-P10', { color: 'rouge' }).ok).toBe(false)
  })

  it('valeur identique : découpage inchangé (pas d’étape d’annulation)', () => {
    const start = makeDecoupage({ '10': ['10'] })
    const result = updateShot(start, 'S10-P10', { name: '' })
    expect(result.ok && result.decoupage).toBe(start)
  })
})

describe('modifier une fiche scène', () => {
  it('l’en-tête est mis en majuscules', () => {
    const start = makeDecoupage({ '10': ['10'] })
    const result = updateScene(start, 'S10', { heading: 'int. cuisine - jour', name: 'Réveil' })
    expect(result.ok && result.decoupage.scenes[0]).toMatchObject({
      heading: 'INT. CUISINE - JOUR',
      name: 'Réveil'
    })
  })

  it('scène inconnue', () => {
    expect(updateScene(makeDecoupage({}), 'S10', { name: 'x' })).toEqual({
      ok: false,
      problem: 'not-found'
    })
  })
})

describe('couleurs', () => {
  it('s’appliquent à toute la sélection (scènes et plans)', () => {
    const start = makeDecoupage({ '10': ['10', '20'], '20': ['10'] })
    const result = setColor(start, ['S10-P20', 'S20', 'S20-P10'], '#f2c94c')
    if (!result.ok) throw new Error(result.problem)
    const [s10, s20] = result.decoupage.scenes
    expect([s10.color, s10.shots[0].color, s10.shots[1].color]).toEqual([null, null, '#f2c94c'])
    expect([s20.color, s20.shots[0].color]).toEqual(['#f2c94c', '#f2c94c'])
  })

  it('null remet la couleur par défaut', () => {
    const colored = setColor(makeDecoupage({ '10': ['10'] }), ['S10'], '#f2c94c')
    if (!colored.ok) throw new Error(colored.problem)
    const result = setColor(colored.decoupage, ['S10'], null)
    expect(result.ok && result.decoupage.scenes[0].color).toBeNull()
  })
})
