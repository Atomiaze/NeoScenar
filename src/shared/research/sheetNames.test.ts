import { describe, expect, it } from 'vitest'
import {
  nameKey,
  proposeColor,
  SHEET_COLORS,
  sheetFileName,
  sortCharacters,
  uniqueFileName
} from './sheetNames'
import type { Sheet } from './types'

describe('sheetFileName', () => {
  it('garde le nom tel quel, accents et espaces compris', () => {
    expect(sheetFileName('MARIE')).toBe('MARIE.md')
    expect(sheetFileName('MAISON - CUISINE')).toBe('MAISON - CUISINE.md')
    expect(sheetFileName('  HÉLÈNE   DUBOIS ')).toBe('HÉLÈNE DUBOIS.md')
  })

  it('remplace les caractères interdits par « _ »', () => {
    expect(sheetFileName('A/B\\C:D*E?F"G<H>I|J')).toBe('A_B_C_D_E_F_G_H_I_J.md')
    expect(sheetFileName('.cache')).toBe('_cache.md')
    expect(sheetFileName('M. DUPONT.')).toBe('M. DUPONT.md')
    expect(sheetFileName('   ')).toBe('_.md')
  })
})

describe('nameKey', () => {
  it('ignore la casse et les espaces en trop', () => {
    expect(nameKey(' Marie ')).toBe(nameKey('MARIE'))
    expect(nameKey('hélène')).toBe('HÉLÈNE')
  })
})

describe('uniqueFileName', () => {
  it('ajoute -2, -3 avant l’extension, sans tenir compte de la casse', () => {
    expect(uniqueFileName('marie.jpg', [])).toBe('marie.jpg')
    expect(uniqueFileName('marie.jpg', ['MARIE.jpg'])).toBe('marie-2.jpg')
    expect(uniqueFileName('marie.jpg', ['marie.jpg', 'marie-2.jpg'])).toBe('marie-3.jpg')
  })
})

describe('proposeColor', () => {
  it('propose la première couleur libre', () => {
    expect(proposeColor([])).toBe(SHEET_COLORS[0])
    expect(proposeColor([SHEET_COLORS[0].toLowerCase()])).toBe(SHEET_COLORS[1])
    expect(SHEET_COLORS).toContain(proposeColor([...SHEET_COLORS]))
  })
})

describe('sortCharacters', () => {
  const sheet = (nom: string, role: string): Sheet => ({
    kind: 'personnages',
    fileName: `${nom}.md`,
    nom,
    props: { role },
    auto: false,
    sections: {},
    images: [],
    unreadable: false
  })

  it('trie par rôle puis par nom', () => {
    const sorted = sortCharacters([
      sheet('ZOÉ', ''),
      sheet('PAUL', 'figurant'),
      sheet('émile', 'principal'),
      sheet('ANNA', 'secondaire'),
      sheet('MARIE', 'Principal')
    ])
    expect(sorted.map((s) => s.nom)).toEqual(['émile', 'MARIE', 'ANNA', 'PAUL', 'ZOÉ'])
  })
})
