import { describe, expect, it } from 'vitest'
import { createElement, parse, serialize, updateElement, type ElementType } from '../src/index.ts'
import { readExample } from './helpers.ts'

describe('réécriture des éléments créés ou modifiés', () => {
  it('ne touche qu’à l’élément modifié', () => {
    const text = 'INT. MAISON - JOUR\n\nMarie entre.\n\n\n\nElle sort.\n'
    const doc = parse(text)
    doc.elements[1] = updateElement(doc.elements[1], { text: 'Marie court.' })
    expect(serialize(doc)).toBe('INT. MAISON - JOUR\n\nMarie court.\n\nElle sort.\n')
  })

  it('garde les fins de ligne du document', () => {
    const doc = parse('INT. A - JOUR\r\n\r\nAction.\r\n')
    doc.elements.push(createElement('action', 'Nouvelle action.'))
    expect(serialize(doc)).toBe('INT. A - JOUR\r\n\r\nAction.\r\n\r\nNouvelle action.\r\n')
  })

  it('ajoute une fin de ligne si le fichier n’en avait pas', () => {
    const doc = parse('Action.')
    doc.elements.push(createElement('action', 'Suite.'))
    expect(serialize(doc)).toBe('Action.\n\nSuite.\n')
  })

  it('n’ajoute le forçage que lorsqu’il est nécessaire', () => {
    const doc = parse('')
    doc.elements = [
      createElement('scene_heading', 'INT. MAISON - JOUR', { scene: { number: '4' } as never }),
      createElement('scene_heading', 'SOUVENIR'),
      createElement('action', 'Marie entre.'),
      createElement('action', 'TOUT EXPLOSE.\nLe silence.'),
      createElement('action', 'INT. Ceci est une action'),
      createElement('character', 'ÉLODIE (V.O.)'),
      createElement('dialogue', 'Bonjour.\n\nAu revoir.'),
      createElement('character', 'McCLANE'),
      createElement('parenthetical', 'riant'),
      createElement('dialogue', 'Yippee.'),
      createElement('transition', 'CUT TO:'),
      createElement('transition', 'FONDU AU NOIR.'),
      createElement('centered', 'FIN'),
      createElement('page_break', ''),
      createElement('section', 'Acte deux', { section: { level: 2 } }),
      createElement('synopsis', 'Tout recommence.'),
      createElement('lyrics', 'La la la'),
      createElement('note', 'À revoir'),
      createElement('boneyard', ' vieux texte ')
    ]
    expect(serialize(doc)).toBe(
      [
        'INT. MAISON - JOUR #4#',
        '',
        '.SOUVENIR',
        '',
        'Marie entre.',
        '',
        '!TOUT EXPLOSE.',
        'Le silence.',
        '',
        '!INT. Ceci est une action',
        '',
        'ÉLODIE (V.O.)',
        'Bonjour.',
        '  ',
        'Au revoir.',
        '',
        '@McCLANE',
        '(riant)',
        'Yippee.',
        '',
        'CUT TO:',
        '',
        '>FONDU AU NOIR.',
        '',
        '> FIN <',
        '',
        '===',
        '',
        '## Acte deux',
        '',
        '= Tout recommence.',
        '',
        '~La la la',
        '',
        '[[À revoir]]',
        '',
        '/* vieux texte */',
        ''
      ].join('\n')
    )
  })

  it('un personnage seul, sans dialogue, est forcé', () => {
    const doc = parse('')
    doc.elements = [createElement('character', 'MARIE')]
    expect(serialize(doc)).toBe('@MARIE\n')
  })

  it('modifier un en-tête recalcule le lieu et garde le numéro', () => {
    const doc = parse('INT. MAISON - JOUR #3#\n')
    const updated = updateElement(doc.elements[0], { text: 'EXT. JARDIN - NUIT' })
    expect(updated.scene).toEqual({ prefix: 'EXT.', location: 'JARDIN', time: 'NUIT', number: '3' })
    doc.elements[0] = updated
    expect(serialize(doc)).toBe('EXT. JARDIN - NUIT #3#\n')
  })

  it('page de titre créée par programme', () => {
    const doc = parse('INT. A - JOUR\n')
    doc.titlePage = {
      entries: [
        { key: 'Title', value: 'Mon film' },
        { key: 'Contact', value: 'IES Saint-Luc\nLiège' }
      ]
    }
    expect(serialize(doc)).toBe(
      'Title: Mon film\nContact:\n    IES Saint-Luc\n    Liège\n\nINT. A - JOUR\n'
    )
    expect(parse(serialize(doc)).titlePage?.entries[1].value).toBe('IES Saint-Luc\nLiège')
  })

  it('tous les éléments de l’exemple réécrits par programme gardent leur type et leur texte', () => {
    const original = parse(readExample('exemple-complet.fountain'))
    const regenerated = {
      ...original,
      elements: original.elements.map((element) => updateElement(element, {}))
    }
    const reparsed = parse(serialize(regenerated))
    const summary = (elements: { type: ElementType; text: string }[]): string[] =>
      elements.map((element) => `${element.type} | ${element.text}`)
    expect(summary(reparsed.elements)).toEqual(summary(original.elements))
  })
})
