import { describe, expect, it } from 'vitest'
import { cleanNames, fillText, joinNames, schoolYear, titleCaseName } from './creditsNames'

describe('titleCaseName', () => {
  it('met les noms de personnages en casse de titre', () => {
    expect(titleCaseName('MARIE')).toBe('Marie')
    expect(titleCaseName('JEAN-PIERRE')).toBe('Jean-Pierre')
    expect(titleCaseName("L'INFIRMIÈRE")).toBe("L'Infirmière")
    expect(titleCaseName('L’ÉPICIER')).toBe('L’Épicier')
    expect(titleCaseName('HOMME DE MAIN')).toBe('Homme de Main')
    expect(titleCaseName('LE  FACTEUR ')).toBe('Le Facteur')
  })
})

describe('joinNames', () => {
  it('relie les noms comme dans une phrase', () => {
    expect(joinNames([], 'et')).toBe('')
    expect(joinNames(['Léa'], 'et')).toBe('Léa')
    expect(joinNames(['Léa', 'Tom'], 'et')).toBe('Léa et Tom')
    expect(joinNames(['Léa', 'Tom', 'Zoé'], 'et')).toBe('Léa, Tom et Zoé')
  })
})

describe('fillText', () => {
  it('remplace les clés et retire les espaces superflus', () => {
    expect(fillText('{noms} présente', { noms: 'Léa' })).toBe('Léa présente')
    expect(fillText('© {annee} {titulaire}', { annee: '2026', titulaire: '' })).toBe('© 2026')
    expect(fillText('{inconnu}', {})).toBe('{inconnu}')
  })
})

describe('schoolYear', () => {
  it('commence en septembre', () => {
    expect(schoolYear(new Date(2026, 10, 18))).toBe('2026-2027')
    expect(schoolYear(new Date(2027, 5, 30))).toBe('2026-2027')
    expect(schoolYear(new Date(2027, 8, 1))).toBe('2027-2028')
  })
})

describe('cleanNames', () => {
  it('retire les lignes vides, les espaces et les doublons exacts', () => {
    expect(cleanNames(['  Léa  Dupont ', '', '   ', 'Tom', 'Tom'])).toEqual(['Léa Dupont', 'Tom'])
  })
})
