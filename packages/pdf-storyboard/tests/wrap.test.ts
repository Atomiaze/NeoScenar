import { describe, expect, it } from 'vitest'
import { wrapText } from '../src/wrap.ts'
import { words } from './helpers.ts'

// Chasse fixe : 1 point par caractère.
const measure = (text: string): number => text.length

describe('retour à la ligne', () => {
  it('garde un texte court sur une ligne', () => {
    expect(wrapText('Marie entre', () => 40, measure)).toEqual(['Marie entre'])
  })

  it('ne rend aucune ligne pour un texte vide', () => {
    expect(wrapText('', () => 40, measure)).toEqual([])
    expect(wrapText('  \n\n', () => 40, measure)).toEqual([])
  })

  it('passe à la ligne entre les mots sans en perdre aucun', () => {
    const text = 'Marie traverse la cuisine sans un regard pour Paul, attablé devant son café.'
    const lines = wrapText(text, () => 20, measure)
    expect(lines.length).toBeGreaterThan(3)
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(20)
    expect(words(lines.join(' '))).toEqual(words(text))
  })

  it('tient compte de la première ligne plus courte (après le libellé)', () => {
    const lines = wrapText('un deux trois quatre', (line) => (line === 0 ? 4 : 30), measure)
    expect(lines).toEqual(['un', 'deux trois quatre'])
  })

  it('coupe un mot plus long qu’une ligne entre deux caractères, sans rien perdre', () => {
    const lines = wrapText('Anticonstitutionnellement', () => 10, measure)
    expect(lines).toEqual(['Anticonsti', 'tutionnell', 'ement'])
  })

  it('garde les retours à la ligne et les lignes vides du milieu', () => {
    expect(wrapText('Porte.\n\nMARIE : Tu es là ?\n', () => 40, measure)).toEqual([
      'Porte.',
      '',
      'MARIE : Tu es là ?'
    ])
  })
})
