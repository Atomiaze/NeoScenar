import { describe, expect, it } from 'vitest'
import { parse, type ElementType } from '@neoscenar/fountain'
import {
  convertLine,
  typeAtLine,
  uppercaseOutsideParentheses,
  type ConversionContext
} from './convert'

function convert(
  text: string,
  index: number,
  context: Partial<ConversionContext> & { to: ElementType }
) {
  return convertLine(text, index, { from: 'action', previous: null, ...context })
}

function typeOf(text: string, index: number): ElementType | null {
  return typeAtLine(parse(text, { titlePage: false }), index + 1)
}

describe('changement de type d’une ligne', () => {
  it('« fondu au noir » en transition donne « > FONDU AU NOIR » (forçage nécessaire)', () => {
    const result = convert('Elle sort.\n\nfondu au noir\n', 2, {
      to: 'transition',
      previous: 'action'
    })
    expect(result.text).toBe('Elle sort.\n\n> FONDU AU NOIR\n')
    expect(typeOf(result.text, result.line)).toBe('transition')
  })

  it('« cut to: » en transition : majuscules, pas de forçage', () => {
    const result = convert('Elle sort.\n\ncut to:\n', 2, { to: 'transition', previous: 'action' })
    expect(result.text).toBe('Elle sort.\n\nCUT TO:\n')
  })

  it('en-tête : majuscules, point de forçage seulement sans préfixe INT./EXT.', () => {
    expect(convert('int. maison - jour', 0, { to: 'scene_heading' }).text).toBe(
      'INT. MAISON - JOUR'
    )
    expect(convert('le grenier', 0, { to: 'scene_heading' }).text).toBe('.LE GRENIER')
  })

  it('personnage suivi d’une réplique : majuscules sauf l’extension, pas de forçage', () => {
    const result = convert('Elle entre.\n\nchloé (off)\nBonjour.\n', 2, {
      to: 'character',
      previous: 'action'
    })
    expect(result.text).toBe('Elle entre.\n\nCHLOÉ (off)\nBonjour.\n')
    expect(typeOf(result.text, 2)).toBe('character')
  })

  it('personnage seul : forçage par « @ »', () => {
    expect(convert('Elle entre.\n\nchloé\n', 2, { to: 'character', previous: 'action' }).text).toBe(
      'Elle entre.\n\n@CHLOÉ\n'
    )
  })

  it('un personnage redevenu action est séparé de la ligne qui le suivait', () => {
    const result = convert('BOUM\nLa porte claque.', 0, { from: 'character', to: 'action' })
    expect(result.text).toBe('BOUM\n\nLa porte claque.')
    expect(typeOf(result.text, 0)).toBe('action')
  })

  it('action qui serait lue comme un en-tête : forçage par « ! »', () => {
    const result = convert('INT. ET EXT. SE MÉLANGENT.', 0, { from: 'scene_heading', to: 'action' })
    expect(result.text).toBe('!INT. ET EXT. SE MÉLANGENT.')
    expect(typeOf(result.text, 0)).toBe('action')
  })

  it('action ordinaire : aucun forçage', () => {
    expect(convert('Elle entre.', 0, { to: 'action' }).text).toBe('Elle entre.')
  })

  it('didascalie : parenthèses ajoutées, collée au personnage', () => {
    const result = convert('CHLOÉ\n\nà elle-même\nBonjour.', 2, {
      from: 'action',
      to: 'parenthetical',
      previous: 'character'
    })
    expect(result.text).toBe('CHLOÉ\n(à elle-même)\nBonjour.')
    expect(result.line).toBe(1)
    expect(typeOf(result.text, 1)).toBe('parenthetical')
  })

  it('dialogue : collé au personnage (ligne vide retirée)', () => {
    const result = convert('CHLOÉ\n\nBonjour.\n', 2, { to: 'dialogue', previous: 'character' })
    expect(result.text).toBe('CHLOÉ\nBonjour.\n')
    expect(typeOf(result.text, 1)).toBe('dialogue')
  })

  it('une didascalie redevenue dialogue perd ses parenthèses', () => {
    const result = convert('CHLOÉ\n(bonjour)\n', 1, {
      from: 'parenthetical',
      to: 'dialogue',
      previous: 'character'
    })
    expect(result.text).toBe('CHLOÉ\nbonjour\n')
  })

  it('ajoute une ligne vide avant une action placée sous une réplique', () => {
    const result = convert('CHLOÉ\nBonjour.\nElle sort.', 2, {
      from: 'dialogue',
      to: 'action',
      previous: 'dialogue'
    })
    expect(result.text).toBe('CHLOÉ\nBonjour.\n\nElle sort.')
    expect(typeOf(result.text, result.line)).toBe('action')
  })

  it('ajoute une ligne vide après, si la ligne suivante appartient à un autre élément', () => {
    const result = convert('CHLOÉ\nBonjour.\nAu revoir.', 1, {
      from: 'dialogue',
      to: 'transition',
      previous: 'character'
    })
    expect(result.text).toBe('CHLOÉ\n\n> BONJOUR.\n\nAu revoir.')
  })

  it('texte centré, paroles, synopsis, section, note, saut de page', () => {
    expect(convert('fin', 0, { to: 'centered' }).text).toBe('> fin <')
    expect(convert('la la', 0, { to: 'lyrics' }).text).toBe('~la la')
    expect(convert('Résumé.', 0, { to: 'synopsis' }).text).toBe('= Résumé.')
    expect(convert('ACTE 1', 0, { to: 'section' }).text).toBe('# ACTE 1')
    expect(convert('à revoir', 0, { to: 'note' }).text).toBe('[[à revoir]]')
    // Ligne écrite : le texte est gardé, le saut de page est inséré sous son paragraphe.
    expect(convert('x', 0, { to: 'page_break' })).toEqual({ text: 'x\n\n===', line: 2 })
    // Ligne vide : le saut de page s'écrit quand même (il n'a pas de texte à taper).
    expect(convert('', 0, { to: 'page_break' }).text).toBe('===')
  })

  it('retire les anciens marqueurs avant de réécrire', () => {
    expect(convert('> FIN <', 0, { from: 'centered', to: 'action' }).text).toBe('FIN')
    expect(convert('[[à revoir]]', 0, { from: 'note', to: 'action' }).text).toBe('à revoir')
    expect(convert('@MARIE', 0, { from: 'character', to: 'action' }).text).toBe('MARIE')
  })

  it('une ligne vide reste vide (le type est retenu par l’éditeur) mais les lignes vides autour sont ajustées', () => {
    const result = convert('CHLOÉ\n\n', 2, {
      from: 'action',
      to: 'dialogue',
      previous: 'character'
    })
    expect(result).toEqual({ text: 'CHLOÉ\n', line: 1 })
  })

  for (const to of [
    'scene_heading',
    'action',
    'character',
    'transition',
    'centered',
    'lyrics',
    'synopsis',
    'section',
    'note'
  ] as ElementType[]) {
    it(`le texte produit est relu comme « ${to} »`, () => {
      const result = convert('Elle entre.\n\nun texte quelconque\n', 2, { to, previous: 'action' })
      expect(typeOf(result.text, result.line)).toBe(to)
    })
  }
})

describe('uppercaseOutsideParentheses', () => {
  it('garde les extensions telles quelles', () => {
    expect(uppercaseOutsideParentheses('élodie (v.o.) (suite)')).toBe('ÉLODIE (v.o.) (suite)')
  })
})

describe('saut de page sur une ligne écrite', () => {
  const at = (text: string, index: number, from: ElementType = 'action') =>
    convertLine(text, index, { from, to: 'page_break', previous: null })

  it('inséré sous le paragraphe, entre deux lignes vides', () => {
    expect(at('Une action\nsur deux lignes.\n\nSuite.', 0)).toEqual({
      text: 'Une action\nsur deux lignes.\n\n===\n\nSuite.',
      line: 3
    })
    expect(at('Fin.\n', 0)).toEqual({ text: 'Fin.\n\n===', line: 2 })
  })

  it('une réplique n’est pas coupée', () => {
    expect(at('MARIE\nBonjour.\n\nSuite.', 0, 'character').text).toBe(
      'MARIE\nBonjour.\n\n===\n\nSuite.'
    )
  })

  it('sur un saut de page, rien ne change', () => {
    expect(at('===\n\nSuite.', 0, 'page_break').text).toBe('===\n\nSuite.')
  })
})
