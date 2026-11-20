import { describe, expect, it } from 'vitest'
import { normalizeCharacterLine } from './characterExtensions'

describe('ligne de personnage', () => {
  it('met le nom et les extensions connues en majuscules', () => {
    expect(normalizeCharacterLine('élodie (v.o.)')).toBe('ÉLODIE (V.O.)')
    expect(normalizeCharacterLine('paul (o.s.) (suite)')).toBe('PAUL (O.S.) (SUITE)')
    expect(normalizeCharacterLine('marie (o.c.)')).toBe('MARIE (O.C.)')
    expect(normalizeCharacterLine('li (sous-titre)')).toBe('LI (SOUS-TITRE)')
  })

  it('laisse les autres textes entre parenthèses tels quels', () => {
    expect(normalizeCharacterLine('paul (au téléphone)')).toBe('PAUL (au téléphone)')
  })

  it('garde le marqueur de forçage et le dialogue simultané', () => {
    expect(normalizeCharacterLine('@mcclane (v.o.) ^')).toBe('@MCCLANE (V.O.) ^')
  })
})
