import { describe, expect, it } from 'vitest'
import { syntaxMarkers } from './syntaxMarkers'

const hidden = (type: Parameters<typeof syntaxMarkers>[0], line: string, forced = true): string[] =>
  syntaxMarkers(type, forced, line, true).map((range) => line.slice(range.from, range.to))

describe('marqueurs de syntaxe masqués', () => {
  it('repère les marqueurs de forçage en début de ligne', () => {
    expect(hidden('action', '!SILENCE.')).toEqual(['!'])
    expect(hidden('character', '@McCLANE')).toEqual(['@'])
    expect(hidden('scene_heading', '.LE GRENIER - SOUVENIR')).toEqual(['.'])
    expect(hidden('transition', '> FONDU AU NOIR')).toEqual(['> '])
    expect(hidden('lyrics', '~La la la')).toEqual(['~'])
    expect(hidden('synopsis', '= Chloé trouve une clé.')).toEqual(['= '])
    expect(hidden('section', '## Séquence 1')).toEqual(['## '])
  })

  it('repère les deux marqueurs du texte centré', () => {
    expect(hidden('centered', '> FIN <')).toEqual(['> ', ' <'])
  })

  it('repère le numéro de scène en fin d’en-tête', () => {
    expect(hidden('scene_heading', 'INT. MAISON - JOUR #12A#', false)).toEqual([' #12A#'])
  })

  it('ne masque rien dans un élément non forcé', () => {
    expect(hidden('action', 'Elle crie !', false)).toEqual([])
    expect(hidden('transition', 'CUT TO:', false)).toEqual([])
    expect(hidden('scene_heading', 'INT. MAISON - JOUR', false)).toEqual([])
  })

  it('ne regarde que la première ligne de l’élément', () => {
    expect(syntaxMarkers('action', true, '!suite', false)).toEqual([])
  })
})
