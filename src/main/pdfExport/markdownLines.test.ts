import { describe, expect, it } from 'vitest'
import { markdownLines, stripInline } from './markdownLines'

describe('stripInline', () => {
  it('retire les étoiles et garde le gras et l’italique', () => {
    expect(stripInline('Un **grand** *petit* film')).toEqual({
      text: 'Un grand petit film',
      marks: [
        { from: 3, to: 8, bold: true, italic: false },
        { from: 9, to: 14, bold: false, italic: true }
      ]
    })
  })

  it('lit le gras italique et l’italique dans le gras', () => {
    expect(stripInline('***tout***').marks).toEqual([{ from: 0, to: 4, bold: true, italic: true }])
    expect(stripInline('**a *b* c**')).toEqual({
      text: 'a b c',
      marks: [
        { from: 0, to: 2, bold: true, italic: false },
        { from: 2, to: 3, bold: true, italic: true },
        { from: 3, to: 5, bold: true, italic: false }
      ]
    })
  })

  it('laisse tel quel ce qui n’est pas de la mise en forme', () => {
    expect(stripInline('2 * 3 = 6 et **x')).toEqual({ text: '2 * 3 = 6 et **x', marks: [] })
  })
})

describe('markdownLines', () => {
  it('lit les titres, les lignes horizontales, le texte et les lignes vides', () => {
    const source = '\n# Début\n\nLéa **entre**.\r\n\n---\n### Fin *ici*\n\n'
    expect(markdownLines(source)).toEqual([
      { kind: 'heading', level: 1, text: 'Début', marks: [] },
      { kind: 'blank' },
      { kind: 'text', text: 'Léa entre.', marks: [{ from: 4, to: 9, bold: true, italic: false }] },
      { kind: 'blank' },
      { kind: 'rule' },
      {
        kind: 'heading',
        level: 3,
        text: 'Fin ici',
        marks: [{ from: 4, to: 7, bold: false, italic: true }]
      }
    ])
  })

  it('garde comme du texte le Markdown non pris en charge', () => {
    expect(markdownLines('#### Quatre\n- liste')).toEqual([
      { kind: 'text', text: '#### Quatre', marks: [] },
      { kind: 'text', text: '- liste', marks: [] }
    ])
  })
})
