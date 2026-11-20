import { describe, expect, it } from 'vitest'
import { inlineLayout, parseInline } from '../src/index.ts'

describe('inlineLayout', () => {
  it('donne la position du texte en gras et de ses marqueurs', () => {
    expect(inlineLayout('Un **mot** fort')).toEqual({
      styled: [{ from: 5, to: 8, bold: true, italic: false, underline: false }],
      markers: [
        { from: 3, to: 5 },
        { from: 8, to: 10 }
      ]
    })
  })

  it('italique, souligné et les deux à la fois', () => {
    const { styled } = inlineLayout('*a* _b_ ***c***')
    expect(styled).toEqual([
      { from: 1, to: 2, bold: false, italic: true, underline: false },
      { from: 5, to: 6, bold: false, italic: false, underline: true },
      { from: 11, to: 12, bold: true, italic: true, underline: false }
    ])
  })

  it('un marqueur orphelin reste du texte ordinaire', () => {
    expect(inlineLayout('2 * 3 = 6')).toEqual({ styled: [], markers: [] })
  })

  it('une barre oblique d’échappement est un marqueur', () => {
    expect(inlineLayout('Une étoile : \\*.').markers).toEqual([{ from: 13, to: 14 }])
  })

  it('parseInline donne toujours le même texte visible', () => {
    expect(parseInline('Une étoile : \\*, **gras**.').map((span) => span.text)).toEqual([
      'Une étoile : *, ',
      'gras',
      '.'
    ])
  })
})
