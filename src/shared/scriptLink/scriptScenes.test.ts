import { describe, expect, it } from 'vitest'
import { readScriptScenes, sceneAt } from './scriptScenes'

const slice = (text: string, range: { from: number; to: number }): string =>
  text.slice(range.from, range.to)

describe('scènes du scénario', () => {
  it('lit l’en-tête, le numéro et la position du marqueur', () => {
    const text = 'INT. CUISINE - JOUR #30A#  \n\nMarie entre.\n'
    const [scene] = readScriptScenes(text)
    expect(scene.heading).toBe('INT. CUISINE - JOUR')
    expect(scene.rawNumber).toBe('30A')
    expect(scene.number).toEqual({ number: 30, letter: 'A' })
    expect(slice(text, scene.marker!)).toBe(' #30A#')
    expect(slice(text, scene.line)).toBe('INT. CUISINE - JOUR #30A#  ')
    expect(scene.contentEnd).toBe(scene.marker!.to)
  })

  it('numéro absent ou invalide', () => {
    const [absent, invalid] = readScriptScenes(
      'INT. CUISINE - JOUR\n\nAction.\n\nEXT. RUE - NUIT #3.1#\n'
    )
    expect(absent.rawNumber).toBeNull()
    expect(absent.marker).toBeNull()
    expect(absent.contentEnd).toBe('INT. CUISINE - JOUR'.length)
    expect(invalid.rawNumber).toBe('3.1')
    expect(invalid.number).toBeNull()
  })

  it('en-tête provisoire et notes : en-tête de carte vide ou nettoyé', () => {
    const [placeholder, noted] = readScriptScenes(
      '.SCÈNE À ÉCRIRE #25#\n\nINT. SALON [[à revoir]] - NUIT #30#\n'
    )
    expect(placeholder.heading).toBe('')
    expect(placeholder.number).toEqual({ number: 25, letter: '' })
    expect(noted.heading).toBe('INT. SALON - NUIT')
  })

  it('un bloc s’arrête au prochain en-tête ou à la prochaine section', () => {
    const text = [
      'Texte avant la première scène.',
      '',
      'INT. A - JOUR #10#',
      '',
      'Action A.',
      '',
      '# ACTE 2',
      '',
      'Texte d’ouverture de l’acte.',
      '',
      'INT. B - JOUR #20#',
      '',
      'Action B.',
      '',
      'INT. C - JOUR #30#',
      '',
      'Action C.',
      ''
    ].join('\n')
    const [a, b, c] = readScriptScenes(text)
    expect(slice(text, a.block)).toBe('INT. A - JOUR #10#\n\nAction A.\n\n')
    expect(slice(text, b.block)).toBe('INT. B - JOUR #20#\n\nAction B.\n\n')
    expect(slice(text, c.block)).toBe('INT. C - JOUR #30#\n\nAction C.\n')
  })

  it('scène du curseur : rien avant la première scène ni dans le texte d’ouverture d’un acte', () => {
    const text = 'Avant.\n\nINT. A #10#\n\nUn.\n\n# ACTE 2\n\nOuverture.\n\nINT. B #20#\n\nDeux.\n'
    const scenes = readScriptScenes(text)
    const at = (fragment: string): string | null =>
      sceneAt(scenes, text.indexOf(fragment), text.length)?.rawNumber ?? null
    expect(at('Avant.')).toBeNull()
    expect(at('INT. A')).toBe('10')
    expect(at('Un.')).toBe('10')
    expect(at('Ouverture.')).toBeNull()
    expect(at('Deux.')).toBe('20')
    expect(sceneAt(scenes, text.length, text.length)?.rawNumber).toBe('20')
  })
})
