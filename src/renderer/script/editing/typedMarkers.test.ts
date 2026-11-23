import { describe, expect, it } from 'vitest'
import { markedType, startsWithLooseDot } from './typedMarkers'

describe('symbole en début de ligne', () => {
  it('reconnaît chaque symbole', () => {
    expect(markedType('# ACTE 1')).toBe('section')
    expect(markedType('## Séquence')).toBe('section')
    expect(markedType('= Résumé')).toBe('synopsis')
    expect(markedType('~la la')).toBe('lyrics')
    expect(markedType('===')).toBe('page_break')
    expect(markedType('=====')).toBe('page_break')
    expect(markedType('!BOUM')).toBe('action')
    expect(markedType('@McClane')).toBe('character')
    expect(markedType('.FLASHBACK')).toBe('scene_heading')
    expect(markedType('.élan')).toBe('scene_heading')
    expect(markedType('[[note]]')).toBe('note')
  })

  it('« > texte » transition, « > texte < » centré, « > » seul transition', () => {
    expect(markedType('> FONDU AU NOIR')).toBe('transition')
    expect(markedType('> FIN <')).toBe('centered')
    expect(markedType('> FIN <  ')).toBe('centered')
    expect(markedType('>')).toBe('transition')
  })

  it('« ... », « .5 », texte ordinaire : pas de symbole', () => {
    expect(markedType('... et puis')).toBeNull()
    expect(markedType('.5 seconde')).toBeNull()
    expect(markedType('Elle entre.')).toBeNull()
    expect(markedType('[[note]] et texte')).toBeNull()
  })

  it('point non suivi d’une lettre', () => {
    expect(startsWithLooseDot('... et puis')).toBe(true)
    expect(startsWithLooseDot('.5 seconde')).toBe(true)
    expect(startsWithLooseDot('.')).toBe(true)
    expect(startsWithLooseDot('.FLASHBACK')).toBe(false)
    expect(startsWithLooseDot('Elle.')).toBe(false)
  })
})
