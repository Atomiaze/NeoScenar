import { parse } from '@neoscenar/fountain'
import { describe, expect, it } from 'vitest'
import { applyTextChanges } from '../scriptLink/textChanges'
import { matchCase, planRename } from './scriptRename'

const SCRIPT = [
  'INT. CHAMBRE DE MARIE - JOUR #10#',
  '',
  'Marie entre. MARIETTE la suit. marie sourit.',
  '',
  'MARIE (V.O.)',
  'Je suis Marie. [[Marie à revoir]]',
  '',
  'PAUL',
  '(à Marie)',
  'Bonjour MARIE.',
  '',
  '/* Marie dans un passage mis de côté */',
  '',
  'EXT. MAISON - CUISINE - NUIT #20#',
  '',
  'Retour à la maison - cuisine.',
  ''
].join('\n')

function plan(kind: 'personnages' | 'lieux', from: string, to: string) {
  return planRename(SCRIPT, parse(SCRIPT, { titlePage: false }), kind, from, to)
}

describe('matchCase', () => {
  it('reprend la casse du mot remplacé', () => {
    expect(matchCase('MARIE', 'Marion')).toBe('MARION')
    expect(matchCase('Marie', 'MARION')).toBe('Marion')
    expect(matchCase('marie', 'MARION')).toBe('marion')
    expect(matchCase('MaRie', 'Marion')).toBe('Marion')
    expect(matchCase('ÉLODIE', 'émilie')).toBe('ÉMILIE')
  })
})

describe('planRename', () => {
  it('personnage : éléments Personnage toujours, texte en mot entier, en-têtes seulement comptés', () => {
    const result = plan('personnages', 'MARIE', 'MARION')
    expect(result.always).toHaveLength(1)
    expect(result.inText).toHaveLength(5)
    expect(result.headings).toBe(1)
    const after = applyTextChanges(SCRIPT, [...result.always, ...result.inText])
    expect(after).toContain('INT. CHAMBRE DE MARIE - JOUR #10#')
    expect(after).toContain('Marion entre. MARIETTE la suit. marion sourit.')
    expect(after).toContain('MARION (V.O.)')
    expect(after).toContain('Je suis Marion. [[Marie à revoir]]')
    expect(after).toContain('(à Marion)')
    expect(after).toContain('Bonjour MARION.')
    expect(after).toContain('/* Marie dans un passage mis de côté */')
  })

  it('lieu : remplace ses en-têtes et, en option, le texte', () => {
    const result = plan('lieux', 'MAISON - CUISINE', 'Maison - Salon')
    expect(result.headings).toBe(0)
    const after = applyTextChanges(SCRIPT, [...result.always, ...result.inText])
    expect(after).toContain('EXT. MAISON - SALON - NUIT #20#')
    expect(after).toContain('Retour à la maison - salon.')
  })

  it('ne trouve rien pour un nom absent', () => {
    const result = plan('personnages', 'LÉA', 'LÉO')
    expect(result).toEqual({ always: [], inText: [], headings: 0 })
  })
})
