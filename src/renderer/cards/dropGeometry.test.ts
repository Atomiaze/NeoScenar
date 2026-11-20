import { describe, expect, it } from 'vitest'
import {
  insertionIndex,
  remainingIndex,
  rowAt,
  sceneInsertionIndex,
  sceneMarker,
  shotMarker,
  type Box
} from './dropGeometry'

/** Carte de 100 × 80 à la colonne `column` et à la ligne `line` (espacement 10). */
function card(column: number, line: number): Box {
  const left = column * 110
  const top = line * 90
  return { left, top, right: left + 100, bottom: top + 80 }
}

// Deux lignes : 3 plans, puis 2 plans (la rangée est passée à la ligne).
const cards = [card(0, 0), card(1, 0), card(2, 0), card(0, 1), card(1, 1)]

describe('position d’insertion d’un plan', () => {
  it('avant la carte dont on survole la moitié gauche', () => {
    expect(insertionIndex(cards, { x: 10, y: 40 })).toBe(0)
    expect(insertionIndex(cards, { x: 120, y: 40 })).toBe(1)
  })

  it('après la carte dont on survole la moitié droite', () => {
    expect(insertionIndex(cards, { x: 90, y: 40 })).toBe(1)
  })

  it('à droite de la dernière carte d’une ligne : avant la première de la ligne suivante', () => {
    expect(insertionIndex(cards, { x: 400, y: 40 })).toBe(3)
  })

  it('sur la deuxième ligne', () => {
    expect(insertionIndex(cards, { x: 10, y: 130 })).toBe(3)
    expect(insertionIndex(cards, { x: 140, y: 130 })).toBe(4)
  })

  it('après tout : à la fin', () => {
    expect(insertionIndex(cards, { x: 300, y: 130 })).toBe(5)
    expect(insertionIndex(cards, { x: 10, y: 500 })).toBe(5)
  })

  it('scène sans plan : position 0', () => {
    expect(insertionIndex([], { x: 10, y: 10 })).toBe(0)
  })
})

describe('rangées', () => {
  const rows = [
    { left: 0, top: 0, right: 800, bottom: 100 },
    { left: 0, top: 120, right: 800, bottom: 300 },
    { left: 0, top: 320, right: 800, bottom: 400 }
  ]

  it('rangée sous le pointeur, ou la plus proche', () => {
    expect(rowAt(rows, 50)).toBe(0)
    expect(rowAt(rows, 200)).toBe(1)
    expect(rowAt(rows, 105)).toBe(0)
    expect(rowAt(rows, 116)).toBe(1)
    expect(rowAt(rows, -50)).toBe(0)
    expect(rowAt(rows, 900)).toBe(2)
  })

  it('position d’insertion d’une scène', () => {
    expect(sceneInsertionIndex(rows, 10)).toBe(0)
    expect(sceneInsertionIndex(rows, 60)).toBe(1)
    expect(sceneInsertionIndex(rows, 250)).toBe(2)
    expect(sceneInsertionIndex(rows, 390)).toBe(3)
  })

  it('repère de scène entre deux rangées', () => {
    expect(sceneMarker(rows, 1, 20)).toEqual({ left: 0, top: 108, right: 800, bottom: 112 })
    expect(sceneMarker(rows, 3, 20).top).toBe(408)
  })
})

describe('repère de plan', () => {
  const row = { left: 0, top: 0, right: 800, bottom: 170 }

  it('dans l’espace avant la carte visée', () => {
    expect(shotMarker(cards, 1, row, 10)).toEqual({ left: 103, top: 0, right: 107, bottom: 80 })
  })

  it('après la dernière carte', () => {
    expect(shotMarker(cards, 5, row, 10).left).toBe(213)
  })

  it('scène sans plan : au début de la zone des plans', () => {
    expect(shotMarker([], 0, row, 10)).toEqual({ left: 0, top: 0, right: 4, bottom: 170 })
  })
})

describe('position une fois les éléments déplacés retirés', () => {
  it('ne compte pas les éléments déplacés situés avant', () => {
    const ids = ['a', 'b', 'c', 'd', 'e']
    expect(remainingIndex(ids, new Set(['b', 'c']), 4)).toBe(2)
    expect(remainingIndex(ids, new Set(['b']), 1)).toBe(1)
    expect(remainingIndex(ids, new Set(['e']), 5)).toBe(4)
  })
})
