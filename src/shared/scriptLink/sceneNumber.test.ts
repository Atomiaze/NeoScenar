import { describe, expect, it } from 'vitest'
import { parseSceneNumber, sceneLabel, sceneNumberMarker } from './sceneNumber'

describe('numéros de scène du Fountain', () => {
  it.each([
    ['30', { number: 30, letter: '' }],
    ['30A', { number: 30, letter: 'A' }],
    ['5', { number: 5, letter: '' }],
    ['9999Z', { number: 9999, letter: 'Z' }]
  ])('« %s » est valide', (raw, expected) => {
    expect(parseSceneNumber(raw)).toEqual(expected)
  })

  it.each(['3.1', 'A2', '12-B', '0030', '0', '10000', '30a', '30AB', '', 'trente'])(
    '« %s » est invalide',
    (raw) => {
      expect(parseSceneNumber(raw)).toBeNull()
    }
  )

  it('convertit #30# ↔ S_0030', () => {
    expect(sceneLabel({ number: 30, letter: '' })).toBe('S_0030')
    expect(sceneLabel({ number: 30, letter: 'A' })).toBe('S_0030A')
    expect(sceneLabel({ number: 5, letter: '' })).toBe('S_0005')
    expect(sceneNumberMarker({ number: 30, letter: 'A' })).toBe('#30A#')
  })
})
