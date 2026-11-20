import { describe, expect, it } from 'vitest'
import { renumberProject, renumberScene, setNumbersLocked } from './numbers'
import { allIds, makeDecoupage, sceneNumbers, shotNumbers } from './testFixtures'

describe('renuméroter', () => {
  it('une scène : 10, 20, 30… et plus de lettres', () => {
    const start = makeDecoupage({ '10': ['5', '10', '10A', '11'], '20': ['15'] })
    const result = renumberScene(start, 'S10')
    if (!result.ok) throw new Error(result.problem)
    expect(shotNumbers(result.decoupage, 0)).toEqual(['P_0010', 'P_0020', 'P_0030', 'P_0040'])
    // Les autres scènes ne changent pas.
    expect(shotNumbers(result.decoupage, 1)).toEqual(['P_0015'])
  })

  it('tout le projet : scènes et plans', () => {
    const start = makeDecoupage({ '5': ['15', '15A'], '7': ['10'], '12': ['3', '7'] })
    const result = renumberProject(start)
    if (!result.ok) throw new Error(result.problem)
    expect(sceneNumbers(result.decoupage)).toEqual(['S_0010', 'S_0020', 'S_0030'])
    expect(shotNumbers(result.decoupage, 0)).toEqual(['P_0010', 'P_0020'])
    expect(shotNumbers(result.decoupage, 2)).toEqual(['P_0010', 'P_0020'])
  })

  it('les identifiants internes ne changent pas', () => {
    const start = makeDecoupage({ '5': ['15', '15A'], '10A': ['10'] })
    const result = renumberProject(start)
    expect(result.ok && allIds(result.decoupage)).toEqual(allIds(start))
  })

  it('indisponible quand les numéros sont verrouillés', () => {
    const start = makeDecoupage({ '10': ['10', '15'] }, true)
    expect(renumberScene(start, 'S10')).toEqual({ ok: false, problem: 'locked' })
    expect(renumberProject(start)).toEqual({ ok: false, problem: 'locked' })
  })
})

describe('verrouiller', () => {
  it('verrouille et déverrouille sans toucher aux numéros', () => {
    const start = makeDecoupage({ '10': ['10'] })
    const locked = setNumbersLocked(start, true)
    expect(locked.ok && locked.decoupage.numbersLocked).toBe(true)
    expect(locked.ok && locked.decoupage.scenes).toBe(start.scenes)
  })

  it('aucun changement si l’état est déjà le bon', () => {
    const start = makeDecoupage({ '10': ['10'] }, true)
    const result = setNumbersLocked(start, true)
    expect(result.ok && result.decoupage).toBe(start)
  })
})
