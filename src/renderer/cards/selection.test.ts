import { describe, expect, it } from 'vitest'
import { deleteItems } from '../../shared/decoupage'
import { makeDecoupage } from '../../shared/decoupage/testFixtures'
import {
  EMPTY_SELECTION,
  moveWithArrow,
  pruneSelection,
  selectOnClick,
  single,
  type Selection
} from './selection'

const decoupage = makeDecoupage({ '10': ['10', '20', '30'], '20': ['10'], '30': [] })
const shot = (id: string) => ({ kind: 'shot' as const, id })
const scene = (id: string) => ({ kind: 'scene' as const, id })
const plain = { toggle: false, range: false }

describe('sélection à la souris', () => {
  it('clic : une seule carte', () => {
    const selection = selectOnClick(decoupage, single(shot('S10-P10')), scene('S20'), plain)
    expect(selection).toEqual({ ids: ['S20'], anchor: scene('S20') })
  })

  it('Cmd + clic : ajoute puis retire', () => {
    let selection = single(shot('S10-P10'))
    selection = selectOnClick(decoupage, selection, shot('S10-P30'), { toggle: true, range: false })
    expect(selection.ids).toEqual(['S10-P10', 'S10-P30'])
    selection = selectOnClick(decoupage, selection, shot('S10-P10'), { toggle: true, range: false })
    expect(selection.ids).toEqual(['S10-P30'])
  })

  it('Maj + clic : plage de plans, même d’une scène à l’autre', () => {
    const selection = selectOnClick(decoupage, single(shot('S10-P20')), shot('S20-P10'), {
      toggle: false,
      range: true
    })
    expect(selection.ids).toEqual(['S10-P20', 'S10-P30', 'S20-P10'])
    expect(selection.anchor).toEqual(shot('S10-P20'))
  })

  it('Maj + clic vers l’arrière', () => {
    const selection = selectOnClick(decoupage, single(shot('S10-P30')), shot('S10-P10'), {
      toggle: false,
      range: true
    })
    expect(selection.ids).toEqual(['S10-P10', 'S10-P20', 'S10-P30'])
  })

  it('Maj + clic sur une scène : simple clic', () => {
    const selection = selectOnClick(decoupage, single(shot('S10-P10')), scene('S20'), {
      toggle: false,
      range: true
    })
    expect(selection.ids).toEqual(['S20'])
  })
})

describe('flèches', () => {
  const from = (ref: ReturnType<typeof shot>): Selection => single(ref)

  it('sans sélection : première carte', () => {
    expect(moveWithArrow(decoupage, EMPTY_SELECTION, 'right')).toEqual(single(scene('S10')))
  })

  it('gauche / droite : carte précédente / suivante, en passant d’une rangée à l’autre', () => {
    expect(moveWithArrow(decoupage, from(shot('S10-P30')), 'right')).toEqual(single(scene('S20')))
    expect(moveWithArrow(decoupage, single(scene('S20')), 'left')).toEqual(single(shot('S10-P30')))
    expect(moveWithArrow(decoupage, single(scene('S10')), 'left')).toEqual(single(scene('S10')))
  })

  it('haut / bas : rangée voisine, même position si possible', () => {
    expect(moveWithArrow(decoupage, from(shot('S10-P10')), 'down')).toEqual(single(shot('S20-P10')))
    expect(moveWithArrow(decoupage, from(shot('S10-P30')), 'down')).toEqual(single(shot('S20-P10')))
    expect(moveWithArrow(decoupage, from(shot('S20-P10')), 'down')).toEqual(single(scene('S30')))
    expect(moveWithArrow(decoupage, single(scene('S20')), 'up')).toEqual(single(scene('S10')))
    expect(moveWithArrow(decoupage, single(scene('S10')), 'up')).toEqual(single(scene('S10')))
  })
})

describe('après une suppression', () => {
  it('retire de la sélection les cartes disparues', () => {
    const result = deleteItems(decoupage, { sceneIds: ['S20'], shotIds: [] })
    if (!result.ok) throw new Error(result.problem)
    const selection = { ids: ['S10-P10', 'S20-P10'], anchor: shot('S20-P10') }
    expect(pruneSelection(result.decoupage, selection)).toEqual({ ids: ['S10-P10'], anchor: null })
  })

  it('rien à retirer : même objet', () => {
    const selection = single(shot('S10-P10'))
    expect(pruneSelection(decoupage, selection)).toBe(selection)
  })
})
