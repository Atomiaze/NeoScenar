import { describe, expect, it } from 'vitest'
import { parseVersions, retainedText, writeVersions } from './versionedTexts'

describe('versionedTexts', () => {
  it('écrit le format prévu', () => {
    const out = writeVersions([
      { text: 'Un père cherche…', retained: false },
      { text: 'Un homme seul…', retained: true }
    ])
    expect(out).toBe(
      '## Version 1\n\nUn père cherche…\n\n## Version 2 (retenue)\n\nUn homme seul…\n'
    )
  })

  it('aller-retour sans perte, texte sur plusieurs lignes compris', () => {
    const versions = [
      { text: 'A\nsuite', retained: false },
      { text: '', retained: false },
      { text: 'C', retained: true }
    ]
    expect(parseVersions(writeVersions(versions))).toEqual(versions)
  })

  it('renumérote et ne garde qu’une version retenue à l’écriture', () => {
    const out = writeVersions([
      { text: 'a', retained: true },
      { text: 'b', retained: true }
    ])
    expect(out).toContain('## Version 1 (retenue)')
    expect(out).toContain('## Version 2\n')
  })

  it('lit un fichier écrit à la main (numéros faux, casse, CRLF)', () => {
    const source = '## version 7 (Retenue)\r\n\r\nPremier\r\n\r\n##  Version 3\r\n\r\nSecond\r\n'
    expect(parseVersions(source)).toEqual([
      { text: 'Premier', retained: true },
      { text: 'Second', retained: false }
    ])
  })

  it('un texte sans titre est une seule version', () => {
    expect(parseVersions('Juste une phrase.\n')).toEqual([
      { text: 'Juste une phrase.', retained: false }
    ])
  })

  it('un texte avant le premier titre devient la première version', () => {
    expect(parseVersions('Avant\n\n## Version 1\n\nAprès\n').map((v) => v.text)).toEqual([
      'Avant',
      'Après'
    ])
  })

  it('plusieurs « (retenue) » : la première l’emporte', () => {
    const parsed = parseVersions('## Version 1 (retenue)\n\na\n\n## Version 2 (retenue)\n\nb\n')
    expect(parsed.map((v) => v.retained)).toEqual([true, false])
  })

  it('fichier vide = aucune version', () => {
    expect(parseVersions('')).toEqual([])
    expect(parseVersions('  \n\n')).toEqual([])
    expect(writeVersions([])).toBe('')
  })

  it('retainedText ignore une version retenue vide', () => {
    expect(retainedText([{ text: ' ', retained: true }])).toBeNull()
    expect(retainedText([{ text: ' x ', retained: true }])).toBe('x')
  })
})
