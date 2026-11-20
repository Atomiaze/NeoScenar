import { describe, expect, it } from 'vitest'
import { formatFullShotId, formatSceneNumber, formatShotNumber } from './numbering'

describe('numérotation', () => {
  it('formate les scènes', () => {
    expect(formatSceneNumber(10)).toBe('S_0010')
    expect(formatSceneNumber(25)).toBe('S_0025')
  })

  it('formate les plans', () => {
    expect(formatShotNumber(15)).toBe('P_0015')
    expect(formatShotNumber(10, 'A')).toBe('P_0010A')
  })

  it('formate l’identifiant complet d’un plan', () => {
    expect(formatFullShotId({ number: 20, letter: '' }, { number: 30, letter: '' })).toBe(
      'S_0020_P_0030'
    )
  })
})
