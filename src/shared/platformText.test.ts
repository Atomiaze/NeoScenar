import { describe, expect, it } from 'vitest'
import { fr } from '../renderer/i18n/fr'
import { adaptText, adaptTexts, currentTextPlatform, textPlatform } from './platformText'

/** Tous les textes d'un objet de textes (les fonctions sont appelées avec des valeurs d'essai). */
function allStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (typeof value === 'function') {
    try {
      return allStrings((value as (...a: unknown[]) => unknown)('X', 2, 'Y', 3))
    } catch {
      return []
    }
  }
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(allStrings)
  return []
}

describe('textes selon le système', () => {
  it('reconnaît les trois systèmes', () => {
    expect(textPlatform('darwin')).toBe('mac')
    expect(textPlatform('win32')).toBe('windows')
    expect(textPlatform('linux')).toBe('linux')
    expect(textPlatform('freebsd')).toBe('linux')
  })

  it('hors d’Electron (tests), les textes du Mac', () => {
    expect(currentTextPlatform()).toBe('mac')
    expect(fr.drawing.undo).toBe('Annuler (Cmd + Z)')
  })

  it('adapte raccourcis et gestionnaire de fichiers', () => {
    expect(adaptText('Annuler (Cmd + Z)', 'windows')).toBe('Annuler (Ctrl + Z)')
    expect(adaptText('Rétablir (Cmd + Maj + Z)', 'linux')).toBe('Rétablir (Ctrl + Maj + Z)')
    expect(adaptText('⌘↩', 'windows')).toBe('Ctrl+↵')
    expect(adaptText('⌘J', 'linux')).toBe('Ctrl+J')
    expect(adaptText('Option + clic', 'windows')).toBe('Alt + clic')
    expect(adaptText('Afficher dans le Finder', 'windows')).toBe(
      'Afficher dans l’Explorateur de fichiers'
    )
    expect(adaptText('Image glissée du Finder', 'windows')).toBe(
      'Image glissée de l’Explorateur de fichiers'
    )
    expect(adaptText('Afficher dans le Finder', 'linux')).toBe(
      'Afficher dans le gestionnaire de fichiers'
    )
    // Mots qui ressemblent sans être des touches.
    expect(adaptText('Options de l’export ; Cmdlet', 'windows')).toBe(
      'Options de l’export ; Cmdlet'
    )
  })

  it('ne change rien sur Mac', () => {
    expect(adaptTexts(fr, 'mac')).toBe(fr)
    expect(adaptText('Annuler (Cmd + Z)', 'mac')).toBe('Annuler (Cmd + Z)')
  })

  it('aucun texte de l’application ne cite Cmd, ⌘ ou le Finder sous Windows et Linux', () => {
    for (const platform of ['windows', 'linux'] as const) {
      const texts = allStrings(adaptTexts(fr, platform))
      expect(texts.length).toBeGreaterThan(1000)
      expect(texts.filter((text) => /\bCmd\b|⌘|⌥|\bFinder\b/.test(text))).toEqual([])
    }
  })

  it('garde la forme des textes : fonctions, nombres et listes', () => {
    const texts = adaptTexts(
      { a: 'Cmd + Z', f: (n: number) => `${n} × Cmd`, n: 3, list: ['⌘J'] },
      'windows'
    )
    expect(texts).toEqual({ a: 'Ctrl + Z', f: expect.any(Function), n: 3, list: ['Ctrl+J'] })
    expect(texts.f(2)).toBe('2 × Ctrl')
    expect(adaptTexts(fr, 'windows').research.docs.nameTaken('Plage')).toBe(
      fr.research.docs.nameTaken('Plage')
    )
  })
})
