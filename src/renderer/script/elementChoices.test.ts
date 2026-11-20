import { describe, expect, it } from 'vitest'
import { ELEMENT_CHOICES, elementBarItems, elementTitle } from './elementChoices'

describe('barre des éléments', () => {
  it('12 boutons dans l’ordre du sélecteur, avec un séparateur après la transition', () => {
    const items = elementBarItems('action')
    expect(items.map((item) => (item.kind === 'separator' ? '|' : item.type))).toEqual([
      'scene_heading',
      'action',
      'character',
      'parenthetical',
      'dialogue',
      'transition',
      '|',
      'lyrics',
      'note',
      'section',
      'synopsis',
      'centered',
      'page_break'
    ])
    expect(items.filter((item) => item.kind === 'button').map((item) => item.type)).toEqual(
      ELEMENT_CHOICES
    )
  })

  it('chaque bouton a une icône et une bulle : nom et raccourci s’il existe', () => {
    for (const item of elementBarItems('action')) {
      if (item.kind === 'button') expect(item.icon).toMatch(/^element/)
    }
    expect(elementTitle('character')).toBe('Personnage — ⌘U')
    expect(elementTitle('scene_heading')).toBe('En-tête de scène — ⌘↩')
    expect(elementTitle('lyrics')).toBe('Paroles')
  })

  it('met en évidence le bouton de l’élément sous le curseur, et lui seul', () => {
    const active = (type: Parameters<typeof elementBarItems>[0]) =>
      elementBarItems(type).flatMap((item) =>
        item.kind === 'button' && item.active ? [item.type] : []
      )
    expect(active('dialogue')).toEqual(['dialogue'])
    expect(active('note')).toEqual(['note'])
    // Le texte mis de côté n'a pas de bouton : aucun n'est mis en évidence.
    expect(active('boneyard')).toEqual([])
  })
})
