import { describe, expect, it } from 'vitest'
import { removeRange, removeRanges } from './noteRemoval'

/** Retire la première note `[[…]]` du texte. */
function withoutNote(text: string): string {
  const from = text.indexOf('[[')
  return removeRange(text, { from, to: text.indexOf(']]', from) + 2 })
}

describe('removeRange (note retirée)', () => {
  it('au milieu d’une ligne : un seul espace gardé', () => {
    expect(withoutNote('Il entre [[à revoir]] dans la pièce.')).toBe('Il entre dans la pièce.')
  })

  it('collée au mot d’un côté : pas d’espace ajouté ni perdu', () => {
    expect(withoutNote('Il entre[[à revoir]] dans la pièce.')).toBe('Il entre dans la pièce.')
    expect(withoutNote('Il entre [[à revoir]]dans la pièce.')).toBe('Il entre dans la pièce.')
    expect(withoutNote('Il[[à revoir]]entre.')).toBe('Ilentre.')
  })

  it('en début de ligne : aucun espace au début', () => {
    expect(withoutNote('[[note]] Il entre.')).toBe('Il entre.')
  })

  it('en fin de ligne : aucun espace à la fin', () => {
    expect(withoutNote('Il entre. [[note]]')).toBe('Il entre.')
    expect(withoutNote('Il entre. [[note]]\nSuite.')).toBe('Il entre.\nSuite.')
  })

  it('seule sur sa ligne : la ligne devient vide, sans toucher aux retours à la ligne', () => {
    expect(withoutNote('Avant.\n[[note]]\nAprès.')).toBe('Avant.\n\nAprès.')
  })

  it('ne touche pas aux autres espaces de la ligne', () => {
    expect(withoutNote('Un  deux [[note]] trois  quatre')).toBe('Un  deux trois  quatre')
  })

  it('plusieurs espaces autour de la note : le côté droit est ramené au seul espace de gauche', () => {
    expect(withoutNote('a  [[note]]  b')).toBe('a  b')
  })

  it('une note sur une autre ligne n’influence pas la ligne voisine', () => {
    expect(withoutNote('Haut. \n[[note]] bas.')).toBe('Haut. \nbas.')
  })
})

describe('removeRanges', () => {
  it('retire plusieurs notes, quel que soit l’ordre donné', () => {
    const text = 'Un [[a]] deux [[b]] trois.'
    const first = { from: 3, to: 8 }
    const second = { from: 14, to: 19 }
    expect(removeRanges(text, [first, second])).toBe('Un deux trois.')
    expect(removeRanges(text, [second, first])).toBe('Un deux trois.')
  })
})
