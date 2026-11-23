import { describe, expect, it } from 'vitest'
import { fr } from '../renderer/i18n/fr'
import { adaptText } from './platformText'
import { inlineParts, type HelpBlock } from './helpContent'

describe('mise en forme des textes d’aide', () => {
  it('texte simple', () => {
    expect(inlineParts('Bonjour')).toEqual([{ kind: 'text', text: 'Bonjour' }])
  })

  it('gras et code', () => {
    expect(inlineParts('**Tab** accepte, `INT.` ou `EXT.`')).toEqual([
      { kind: 'bold', text: 'Tab' },
      { kind: 'text', text: ' accepte, ' },
      { kind: 'code', text: 'INT.' },
      { kind: 'text', text: ' ou ' },
      { kind: 'code', text: 'EXT.' }
    ])
  })

  it('un marqueur non fermé reste tel quel', () => {
    expect(inlineParts('a ** b')).toEqual([{ kind: 'text', text: 'a ** b' }])
  })

  it('le code garde ses caractères (` - `, [[…]])', () => {
    expect(inlineParts('un tiret (` - `)')[1]).toEqual({ kind: 'code', text: ' - ' })
    expect(inlineParts('`[[R:jaune|commentaire]]texte[[/R]]`')).toEqual([
      { kind: 'code', text: '[[R:jaune|commentaire]]texte[[/R]]' }
    ])
  })
})

describe('aide du module Scénario', () => {
  const tabs = fr.script.help.tabs

  it('huit rubriques, toutes remplies', () => {
    expect(tabs).toHaveLength(8)
    for (const tab of tabs) expect(tab.blocks.length).toBeGreaterThan(0)
  })

  it('tableaux réguliers et gras toujours fermés', () => {
    const texts: string[] = []
    const collect = (block: HelpBlock): void => {
      if (block.kind === 'table') {
        for (const row of block.rows) expect(row).toHaveLength(block.head.length)
        texts.push(...block.head, ...block.rows.flat())
      } else if (block.kind === 'list') {
        for (const item of block.items) {
          if (typeof item === 'string') texts.push(item)
          else texts.push(item.text, ...item.items)
        }
      } else texts.push(block.text)
    }
    tabs.forEach((tab) => tab.blocks.forEach(collect))
    for (const text of texts) expect((text.match(/\*\*/g) ?? []).length % 2).toBe(0)
  })

  it('raccourcis ⌘ sur Mac, Ctrl sur Windows et Linux', () => {
    expect(adaptText('⌘ + Entrée', 'windows')).toBe('Ctrl + Entrée')
    expect(adaptText('⌘ + ↑ / ⌘ + ↓', 'linux')).toBe('Ctrl + ↑ / Ctrl + ↓')
    expect(adaptText('⌘ + Maj + U', 'windows')).toBe('Ctrl + Maj + U')
    expect(adaptText('Alt + clic (Option sur Mac)', 'windows')).toBe('Alt + clic (Option sur Mac)')
  })
})
