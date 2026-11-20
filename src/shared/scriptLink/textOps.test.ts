import { describe, expect, it } from 'vitest'
import { readScriptScenes } from './scriptScenes'
import { applyTextChanges } from './textChanges'
import { applyTextOp, sceneDescription, type TextOp } from './textOps'

const n = (number: number, letter = ''): { number: number; letter: string } => ({ number, letter })

const SCRIPT = [
  'INT. A - JOUR #10#',
  '',
  '= La cuisine au matin.',
  '',
  'Action A.',
  '',
  'INT. B - JOUR #20#',
  '',
  'MARIE',
  'Bonjour.',
  '',
  '# ACTE 2',
  '',
  'INT. C - JOUR #30#',
  '',
  'Action C.',
  '',
  'INT. D - NUIT #40#',
  '',
  'Action D.',
  ''
].join('\n')

const numbers = (text: string): (string | null)[] =>
  readScriptScenes(text).map((scene) => scene.rawNumber)

/** Applique, vérifie les étapes, puis annule et rétablit : retour exact aux deux textes. */
function roundTrip(op: TextOp, text = SCRIPT): string {
  const done = applyTextOp(text, op)
  expect(done.steps.reduce(applyTextChanges, text)).toBe(done.text)
  const undone = applyTextOp(done.text, done.inverse)
  expect(undone.text).toBe(text)
  expect(applyTextOp(undone.text, undone.inverse).text).toBe(done.text)
  return done.text
}

describe('effets des actions des cartes sur le texte, et leur annulation', () => {
  it('ajouter des scènes, puis annuler', () => {
    const after = roundTrip({
      kind: 'insertHeadings',
      place: { after: n(20) },
      headings: [
        { heading: '', number: n(23) },
        { heading: 'EXT. JARDIN - JOUR', number: n(26) }
      ]
    })
    expect(numbers(after)).toEqual(['10', '20', '23', '26', '30', '40'])
  })

  it('supprimer plusieurs scènes : texte restitué à l’identique, à sa place', () => {
    const after = roundTrip({ kind: 'removeBlocks', numbers: [n(20), n(30), n(40)] })
    expect(numbers(after)).toEqual(['10'])
    expect(after).toContain('# ACTE 2')
  })

  it('déplacer plusieurs scènes ensemble : une seule modification, blocs dans le même ordre', () => {
    const after = roundTrip({
      kind: 'moveBlocks',
      moves: [
        { number: n(10), place: { after: n(40) }, newNumber: n(50) },
        { number: n(20), place: { after: n(50) }, newNumber: n(60) }
      ]
    })
    expect(numbers(after)).toEqual(['30', '40', '50', '60'])
    expect(after.indexOf('INT. A')).toBeLessThan(after.indexOf('INT. B'))
  })

  it('réécrire l’en-tête : l’annulation rend la ligne exacte (point de forçage compris)', () => {
    const text = '.SCÈNE À ÉCRIRE #10#\n\nAction.\n'
    const after = roundTrip({ kind: 'setHeading', number: n(10), heading: 'int. cuisine' }, text)
    expect(after).toBe('INT. CUISINE #10#\n\nAction.\n')
  })

  it('écrire la description d’une scène depuis sa carte', () => {
    const after = roundTrip({
      kind: 'setDescription',
      number: n(30),
      description: 'Chloé monte au grenier.\nElle trouve la boîte.'
    })
    expect(sceneDescription(after, n(30))).toBe('Chloé monte au grenier.\nElle trouve la boîte.')
    expect(sceneDescription(SCRIPT, n(10))).toBe('La cuisine au matin.')
  })

  it('renuméroter', () => {
    const after = roundTrip({
      kind: 'renumber',
      mapping: [
        { from: n(20), to: n(30) },
        { from: n(30), to: n(40) },
        { from: n(40), to: n(50) }
      ]
    })
    expect(numbers(after)).toEqual(['10', '30', '40', '50'])
  })

  it('plusieurs opérations en une (renuméroter puis insérer)', () => {
    const after = roundTrip({
      kind: 'sequence',
      ops: [
        { kind: 'renumber', mapping: [{ from: n(20), to: n(11) }] },
        {
          kind: 'insertHeadings',
          place: { after: n(11) },
          headings: [{ heading: '', number: n(12) }]
        }
      ]
    })
    expect(numbers(after)).toEqual(['10', '11', '12', '30', '40'])
  })

  it('scène effacée du texte entre-temps : ignorée sans erreur', () => {
    const removed = applyTextOp(SCRIPT, { kind: 'removeBlocks', numbers: [n(99)] })
    expect(removed.text).toBe(SCRIPT)
    expect(removed.steps).toEqual([])
    expect(applyTextOp(SCRIPT, { kind: 'setHeading', number: n(99), heading: 'X' }).text).toBe(
      SCRIPT
    )
  })

  it('ajout après une scène qui a disparu : à la place qui correspond au numéro', () => {
    const after = applyTextOp(SCRIPT, {
      kind: 'insertHeadings',
      place: { after: n(25) },
      headings: [{ heading: '', number: n(27) }]
    }).text
    expect(numbers(after)).toEqual(['10', '20', '27', '30', '40'])
  })
})
