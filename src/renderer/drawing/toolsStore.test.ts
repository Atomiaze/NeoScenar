import { describe, expect, it } from 'vitest'
import {
  drawingTools,
  nextSize,
  nextZoom,
  setToolSize,
  chooseTool,
  stepToolSize
} from './toolsStore'

describe('réglages de l’éditeur de dessin', () => {
  it('[ et ] passent d’une taille prédéfinie à l’autre, de 1 à 100', () => {
    expect(nextSize(5, 1)).toBe(10)
    expect(nextSize(7, 1)).toBe(10)
    expect(nextSize(7, -1)).toBe(5)
    expect(nextSize(40, 1)).toBe(50)
    expect(nextSize(100, 1)).toBe(100)
    expect(nextSize(1, -1)).toBe(1)
  })

  it('chaque outil garde sa propre taille', () => {
    chooseTool('brush')
    setToolSize(12)
    chooseTool('eraser')
    setToolSize(60)
    stepToolSize(1)
    expect(drawingTools.get().sizes).toEqual({ brush: 12, eraser: 70 })
    chooseTool('fill')
    stepToolSize(-1)
    // Avec le pot de peinture, c'est la taille du pinceau qui change.
    expect(drawingTools.get().sizes.brush).toBe(10)
  })

  it('le zoom avance par paliers', () => {
    expect(nextZoom(0.6, 1)).toBe(0.67)
    expect(nextZoom(1, 1)).toBe(1.5)
    expect(nextZoom(1, -1)).toBe(0.75)
    expect(nextZoom(8, 1)).toBe(8)
  })
})
