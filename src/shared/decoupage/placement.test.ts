import { describe, expect, it } from 'vitest'
import { addSceneIndex, addShotPosition, neighborShot } from './placement'
import { formatDuration, sceneDuration, totalDuration } from './stats'
import { updateShot } from './fields'
import { makeDecoupage } from './testFixtures'

const decoupage = makeDecoupage({ '10': ['10', '20'], '20': ['10'] })

describe('emplacement de « Ajouter un plan »', () => {
  it('après le plan sélectionné', () => {
    expect(addShotPosition(decoupage, { kind: 'shot', id: 'S10-P10' })).toEqual({
      sceneId: 'S10',
      index: 1
    })
  })

  it('à la fin de la scène sélectionnée', () => {
    expect(addShotPosition(decoupage, { kind: 'scene', id: 'S10' })).toEqual({
      sceneId: 'S10',
      index: 2
    })
  })

  it('sans sélection, à la fin de la dernière scène', () => {
    expect(addShotPosition(decoupage, null)).toEqual({ sceneId: 'S20', index: 1 })
  })

  it('aucune scène : impossible', () => {
    expect(addShotPosition(makeDecoupage({}), null)).toBeNull()
  })
})

describe('emplacement de « Ajouter une scène »', () => {
  it('après la scène sélectionnée ou celle du plan sélectionné', () => {
    expect(addSceneIndex(decoupage, { kind: 'scene', id: 'S10' })).toBe(1)
    expect(addSceneIndex(decoupage, { kind: 'shot', id: 'S10-P20' })).toBe(1)
  })

  it('sans sélection, à la fin', () => {
    expect(addSceneIndex(decoupage, null)).toBe(2)
  })
})

describe('durées', () => {
  it('additionne les durées, les plans vides comptent pour 0', () => {
    let d = decoupage
    for (const [id, duration] of [
      ['S10-P10', 12.5],
      ['S10-P20', 20],
      ['S20-P10', 40]
    ] as const) {
      const result = updateShot(d, id, { duration })
      if (result.ok) d = result.decoupage
    }
    expect(sceneDuration(d.scenes[0])).toBe(32.5)
    expect(totalDuration(d)).toBe(72.5)
  })

  it('format m:ss', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(32)).toBe('0:32')
    expect(formatDuration(754.6)).toBe('12:35')
  })
})

describe('plan voisin dans l’ordre du film', () => {
  const decoupage = makeDecoupage({ '10': ['10', '20'], '20': ['10'] })

  it('passe d’une scène à l’autre', () => {
    expect(neighborShot(decoupage, 'S10-P20', 1)?.id).toBe('S20-P10')
    expect(neighborShot(decoupage, 'S20-P10', -1)?.id).toBe('S10-P20')
  })

  it('aucun voisin au début, à la fin, ou pour un plan inconnu', () => {
    expect(neighborShot(decoupage, 'S10-P10', -1)).toBeNull()
    expect(neighborShot(decoupage, 'S20-P10', 1)).toBeNull()
    expect(neighborShot(decoupage, 'inconnu', 1)).toBeNull()
  })
})
