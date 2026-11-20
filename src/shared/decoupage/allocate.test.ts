import { describe, expect, it } from 'vitest'
import { formatShotNumber } from '../numbering'
import { allocateNumbers, renumberedNumbers } from './allocate'
import { compareItemNumbers, isStrictlyIncreasing } from './order'
import { parseNumber } from './testFixtures'

/** Raccourci : allocate('10', '20') → ['P_0015']. */
function allocate(
  previous: string | null,
  next: string | null,
  count = 1,
  locked = false
): string[] | string {
  const result = allocateNumbers(
    previous ? parseNumber(previous) : undefined,
    next ? parseNumber(next) : undefined,
    count,
    locked
  )
  return result.ok
    ? result.numbers.map((n) => formatShotNumber(n.number, n.letter))
    : result.problem
}

describe('ordre des numéros', () => {
  it('P_0010 < P_0010A < P_0010B < P_0011 < P_0020', () => {
    const sorted = ['10', '10A', '10B', '11', '20'].map(parseNumber)
    expect(isStrictlyIncreasing(sorted)).toBe(true)
    const shuffled = ['11', '10B', '20', '10', '10A'].map(parseNumber)
    expect(shuffled.sort(compareItemNumbers)).toEqual(sorted)
  })

  it('refuse les doublons', () => {
    expect(isStrictlyIncreasing(['10', '10'].map(parseNumber))).toBe(false)
    expect(isStrictlyIncreasing(['10A', '10A'].map(parseNumber))).toBe(false)
  })
})

describe('numéro à la fin', () => {
  it('premier élément d’une liste vide : 10', () => {
    expect(allocate(null, null)).toEqual(['P_0010'])
  })

  it('multiple de 10 suivant le dernier numéro', () => {
    expect(allocate('20', null)).toEqual(['P_0030'])
    expect(allocate('15', null)).toEqual(['P_0020'])
    expect(allocate('10A', null)).toEqual(['P_0020'])
  })

  it('plusieurs à la fin : de 10 en 10', () => {
    expect(allocate('20', null, 3)).toEqual(['P_0030', 'P_0040', 'P_0050'])
  })

  it('près de 9999 : un nombre libre restant, sinon renumérotation', () => {
    expect(allocate('9995', null)).toEqual(['P_9997'])
    expect(allocate('9999', null)).toBe('needs-renumber')
  })
})

describe('numéro entre deux éléments', () => {
  it('au milieu de l’intervalle', () => {
    expect(allocate('10', '20')).toEqual(['P_0015'])
    expect(allocate('10', '15')).toEqual(['P_0012'])
    expect(allocate('10', '12')).toEqual(['P_0011'])
  })

  it('avant le premier élément, l’intervalle commence à 0', () => {
    expect(allocate(null, '10')).toEqual(['P_0005'])
    expect(allocate(null, '2')).toEqual(['P_0001'])
  })

  it('plusieurs éléments répartis régulièrement', () => {
    expect(allocate('10', '20', 3)).toEqual(['P_0012', 'P_0015', 'P_0017'])
    expect(allocate('10', '20', 9)).toEqual([
      'P_0011',
      'P_0012',
      'P_0013',
      'P_0014',
      'P_0015',
      'P_0016',
      'P_0017',
      'P_0018',
      'P_0019'
    ])
  })

  it('après un numéro à lettre, les nombres suivants sont libres', () => {
    expect(allocate('10A', '20')).toEqual(['P_0015'])
  })
})

describe('plus de numéro libre', () => {
  it('non verrouillé : il faut renuméroter', () => {
    expect(allocate('10', '11')).toBe('needs-renumber')
    expect(allocate('10', '20', 10)).toBe('needs-renumber')
    expect(allocate(null, '1')).toBe('needs-renumber')
  })

  it('verrouillé : un nombre libre reste prioritaire', () => {
    expect(allocate('10', '20', 1, true)).toEqual(['P_0015'])
  })

  it('verrouillé : lettre ajoutée au numéro précédent', () => {
    expect(allocate('10', '11', 1, true)).toEqual(['P_0010A'])
    expect(allocate('10A', '11', 1, true)).toEqual(['P_0010B'])
    expect(allocate('10', '11', 3, true)).toEqual(['P_0010A', 'P_0010B', 'P_0010C'])
  })

  it('verrouillé : lettre libre avant une lettre existante', () => {
    expect(allocate('10', '10B', 1, true)).toEqual(['P_0010A'])
  })

  it('verrouillé : aucune place entre P_0010 et P_0010A', () => {
    expect(allocate('10', '10A', 1, true)).toBe('no-room')
  })

  it('verrouillé : au-delà de Z, insertion impossible', () => {
    expect(allocate('10Y', '11', 1, true)).toEqual(['P_0010Z'])
    expect(allocate('10Z', '11', 1, true)).toBe('no-room')
    expect(allocate('10Y', '11', 2, true)).toBe('no-room')
  })

  it('verrouillé : avant le premier élément sans place, impossible', () => {
    expect(allocate(null, '1', 1, true)).toBe('no-room')
  })
})

describe('numéros de renumérotation', () => {
  it('10, 20, 30… sans lettre', () => {
    expect(renumberedNumbers(3)).toEqual([
      { number: 10, letter: '' },
      { number: 20, letter: '' },
      { number: 30, letter: '' }
    ])
  })

  it('très longue liste : l’écart se resserre pour rester sous 9999', () => {
    const numbers = renumberedNumbers(2000)
    expect(numbers[numbers.length - 1].number).toBeLessThanOrEqual(9999)
    expect(isStrictlyIncreasing(numbers)).toBe(true)
  })
})
