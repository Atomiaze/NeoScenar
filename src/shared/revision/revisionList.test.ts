import { describe, expect, it } from 'vitest'
import { parse } from '@neoscenar/fountain'
import { findRevisionMarks } from './revisionMarks'
import { buildRevisionList, excerptOf } from './revisionList'
import {
  isRevisionPanelShown,
  MAX_REVISION_PANEL_PROJECTS,
  parseRevisionPanelHidden,
  withRevisionPanelShown
} from './panelState'

const list = (text: string) => {
  const doc = parse(text)
  return buildRevisionList(text, doc, findRevisionMarks(doc))
}

describe('buildRevisionList', () => {
  it('donne une ligne par marque, dans l’ordre du texte, avec sa scène', () => {
    const text = `[[R:bleu]]Avant tout[[/R]] commence ici.

INT. CUISINE - JOUR #10#

Marie [[R:jaune|Revoir]]prépare le café[[/R]].

MARIE
[[R:rose]]Bonjour Paul.[[/R]]

EXT. RUE - NUIT

Paul [[R:vert|Trop long]]court[[/R]].

INT. GARE - JOUR #25#

Le train [[R:jaune]]arrive[[/R]].
`
    const items = list(text)
    expect(items.map((item) => [item.color, item.scene, item.excerpt, item.comment])).toEqual([
      ['bleu', null, 'Avant tout', ''],
      ['jaune', 'S_0010', 'prépare le café', 'Revoir'],
      ['rose', 'S_0010', 'Bonjour Paul.', ''],
      ['vert', null, 'court', 'Trop long'],
      ['jaune', 'S_0025', 'arrive', '']
    ])
    // La plage désigne le texte surligné, sans les marqueurs.
    const [, second] = items
    expect(text.slice(second.from, second.to)).toBe('prépare le café')
  })

  it('compte le dernier élément de la scène', () => {
    const items = list(`INT. CUISINE - JOUR #10#

Marie entre.

Elle [[R:jaune]]s’assoit[[/R]].
`)
    expect(items[0].scene).toBe('S_0010')
  })

  it('est vide sans marque', () => {
    expect(list('INT. CUISINE - JOUR #10#\n\nMarie entre.\n')).toEqual([])
  })
})

describe('excerptOf', () => {
  it('retire les notes et ramène le texte sur une ligne', () => {
    expect(excerptOf('Marie [[à revoir]] prépare\n  le café')).toBe('Marie prépare le café')
  })

  it('coupe un texte long avec « … »', () => {
    const long = 'a'.repeat(60)
    const result = excerptOf(long)
    expect(result).toHaveLength(40)
    expect(result.endsWith('…')).toBe(true)
  })
})

describe('affichage du panneau par projet', () => {
  it('est affiché par défaut, masqué seulement pour les projets retenus', () => {
    const hidden = withRevisionPanelShown([], 'p1', false)
    expect(isRevisionPanelShown(hidden, 'p1')).toBe(false)
    expect(isRevisionPanelShown(hidden, 'p2')).toBe(true)
    expect(withRevisionPanelShown(hidden, 'p1', true)).toEqual([])
  })

  it('ne garde que les 50 derniers projets', () => {
    let hidden: string[] = []
    for (let i = 0; i < 60; i++) hidden = withRevisionPanelShown(hidden, `p${i}`, false)
    expect(hidden).toHaveLength(MAX_REVISION_PANEL_PROJECTS)
    expect(hidden[0]).toBe('p10')
  })

  it('lit prudemment les préférences', () => {
    expect(parseRevisionPanelHidden(undefined)).toEqual([])
    expect(parseRevisionPanelHidden({ p1: true })).toEqual([])
    expect(parseRevisionPanelHidden(['p1', 3, '', 'p2'])).toEqual(['p1', 'p2'])
  })
})
