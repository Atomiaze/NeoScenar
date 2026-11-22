import { describe, expect, it } from 'vitest'
import {
  applyChanges,
  inlineSpans,
  insertRule,
  lineKind,
  toggleHeading,
  toggleInline
} from './markdownLite'

describe('lineKind', () => {
  it('reconnaît les titres 1 à 3', () => {
    expect(lineKind('# Un')).toEqual({ kind: 'heading', level: 1, markerLength: 2 })
    expect(lineKind('## Deux')).toEqual({ kind: 'heading', level: 2, markerLength: 3 })
    expect(lineKind('### Trois')).toEqual({ kind: 'heading', level: 3, markerLength: 4 })
  })

  it('laisse le reste du Markdown comme texte', () => {
    expect(lineKind('#Sans espace').kind).toBe('text')
    expect(lineKind('#### Quatre').kind).toBe('text')
    expect(lineKind('- liste').kind).toBe('text')
    expect(lineKind('# ').kind).toBe('text')
  })

  it('reconnaît la ligne horizontale', () => {
    expect(lineKind('---').kind).toBe('rule')
    expect(lineKind('-----  ').kind).toBe('rule')
    expect(lineKind('--').kind).toBe('text')
    expect(lineKind('--- x').kind).toBe('text')
  })
})

describe('inlineSpans', () => {
  it('trouve le gras et l’italique', () => {
    const line = 'un **gras** et un *italique*'
    expect(inlineSpans(line)).toEqual([
      { kind: 'bold', from: 3, to: 11, markerLength: 2 },
      { kind: 'italic', from: 18, to: 28, markerLength: 1 }
    ])
  })

  it('trouve l’italique dans le gras', () => {
    const spans = inlineSpans('***fort***')
    expect(spans.map((span) => span.kind).sort()).toEqual(['bold', 'italic'])
  })

  it('ignore les étoiles isolées ou entourées d’espaces', () => {
    expect(inlineSpans('2 * 3 * 4')).toEqual([])
    expect(inlineSpans('une * seule')).toEqual([])
  })
})

describe('toggleHeading', () => {
  it('ajoute, change et retire un titre', () => {
    const add = toggleHeading('Texte', 10, 1, 12)
    expect(
      applyChanges(
        'Texte',
        add.changes.map((c) => ({ ...c, from: c.from - 10, to: c.to - 10 }))
      )
    ).toBe('# Texte')
    expect(add.head).toBe(14)
    const change = toggleHeading('# Texte', 0, 2, 4)
    expect(applyChanges('# Texte', change.changes)).toBe('## Texte')
    const remove = toggleHeading('## Texte', 0, 2, 5)
    expect(applyChanges('## Texte', remove.changes)).toBe('Texte')
    expect(remove.head).toBe(2)
  })
})

describe('toggleInline', () => {
  it('met en gras la sélection puis l’enlève', () => {
    const on = toggleInline('un mot ici', 3, 6, '**')
    expect(applyChanges('un mot ici', on.changes)).toBe('un **mot** ici')
    expect([on.anchor, on.head]).toEqual([5, 8])
    const text = 'un **mot** ici'
    const off = toggleInline(text, on.anchor, on.head, '**')
    expect(applyChanges(text, off.changes)).toBe('un mot ici')
    expect([off.anchor, off.head]).toEqual([3, 6])
  })

  it('met en italique, et le gras ne compte pas comme de l’italique', () => {
    expect(applyChanges('un mot', toggleInline('un mot', 3, 6, '*').changes)).toBe('un *mot*')
    const bold = 'un **mot**'
    expect(applyChanges(bold, toggleInline(bold, 5, 8, '*').changes)).toBe('un ***mot***')
    const both = 'un ***mot***'
    expect(applyChanges(both, toggleInline(both, 6, 9, '*').changes)).toBe('un **mot**')
    expect(applyChanges(both, toggleInline(both, 6, 9, '**').changes)).toBe('un *mot*')
  })

  it('pose deux marques sans sélection, curseur entre elles', () => {
    const result = toggleInline('ab', 1, 1, '**')
    expect(applyChanges('ab', result.changes)).toBe('a****b')
    expect(result.head).toBe(3)
  })
})

describe('insertRule', () => {
  it('remplace une ligne vide', () => {
    const result = insertRule('', 5, true)
    expect(
      applyChanges(
        'abcd\n\nfin',
        result.changes.map((c) => ({ ...c, from: c.from, to: c.to }))
      )
    ).toBe('abcd\n---\n\nfin')
  })

  it('s’insère sous une ligne de texte avec une ligne vide de chaque côté', () => {
    const result = insertRule('Texte', 0, false)
    expect(applyChanges('Texte', result.changes)).toBe('Texte\n\n---\n')
  })
})
