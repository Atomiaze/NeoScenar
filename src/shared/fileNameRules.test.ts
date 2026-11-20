import { describe, expect, it } from 'vitest'
import { sanitizeFolderName } from './folderName'
import {
  avoidReservedName,
  fileNameProblem,
  isPathTooLong,
  isReservedName,
  MAX_PATH_LENGTH
} from './fileNameRules'
import { safeFileStem, sheetFileName } from './research/sheetNames'

describe('noms réservés par Windows', () => {
  it('avec ou sans extension, sans tenir compte de la casse', () => {
    for (const name of [
      'CON',
      'con',
      'Prn.txt',
      'AUX.tar.gz',
      'nul',
      'COM1',
      'com9.md',
      'LPT3',
      'CON '
    ]) {
      expect(isReservedName(name), name).toBe(true)
    }
    for (const name of ['CONTE', 'Con_', 'COM10', 'COM0', 'LPT', 'auxiliaire.md', 'MA CON']) {
      expect(isReservedName(name), name).toBe(false)
    }
  })

  it('un nom venu d’ailleurs reçoit « _ » avant son premier point', () => {
    expect(avoidReservedName('CON')).toBe('CON_')
    expect(avoidReservedName('aux.png')).toBe('aux_.png')
    expect(avoidReservedName('Marie')).toBe('Marie')
    expect(isReservedName(avoidReservedName('nul.tar.gz'))).toBe(false)
  })
})

describe('nom tapé par l’élève', () => {
  it('accepte accents et espaces', () => {
    expect(fileNameProblem('Repérages été')).toBeNull()
  })

  it('signale chaque cas refusé', () => {
    expect(fileNameProblem('')).toEqual({ kind: 'empty' })
    for (const char of ['<', '>', ':', '"', '/', '\\', '|', '?', '*']) {
      expect(fileNameProblem(`a${char}b`)).toEqual({ kind: 'forbidden-char', char })
    }
    expect(fileNameProblem('a\tb')).toEqual({ kind: 'forbidden-char', char: '\t' })
    expect(fileNameProblem('Plage.')).toEqual({ kind: 'trailing' })
    expect(fileNameProblem('Plage ')).toEqual({ kind: 'trailing' })
    expect(fileNameProblem('.cache')).toEqual({ kind: 'leading-dot' })
    expect(fileNameProblem('LPT1')).toEqual({ kind: 'reserved' })
  })
})

describe('noms produits par NeoScenar', () => {
  it('fiche d’un personnage au nom réservé ou avec caractères interdits', () => {
    expect(sheetFileName('CON')).toBe('CON_.md')
    expect(sheetFileName('Aux')).toBe('Aux_.md')
    expect(sheetFileName('QUI ?')).toBe('QUI _.md')
    expect(safeFileStem('M. X.')).toBe('M. X')
  })

  it('dossier du film', () => {
    expect(sanitizeFolderName('Con')).toBe('Con_')
    expect(sanitizeFolderName('Nul !')).toBe('Nul_')
    expect(sanitizeFolderName('Mon Film')).toBe('Mon_Film')
  })
})

it('longueur des chemins', () => {
  expect(isPathTooLong('C:\\' + 'a'.repeat(MAX_PATH_LENGTH - 3))).toBe(false)
  expect(isPathTooLong('C:\\' + 'a'.repeat(MAX_PATH_LENGTH - 2))).toBe(true)
})
