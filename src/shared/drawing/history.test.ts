import { describe, expect, it } from 'vitest'
import { strokeSegment } from './brush'
import {
  DRAWING_HISTORY_LIMIT,
  EMPTY_DRAWING_HISTORY,
  historyBytes,
  packRegion,
  recordStep,
  redoStep,
  undoStep,
  unpackRegion,
  type DrawingHistory
} from './history'
import { createRaster, fillRaster, fullRect, type Raster } from './raster'
import { BLACK, RED } from './testRaster'

function clone(raster: Raster): Raster {
  return { ...raster, data: new Uint8ClampedArray(raster.data) }
}

function draw(history: DrawingHistory, raster: Raster, y: number): DrawingHistory {
  const before = clone(raster)
  const rect = strokeSegment(raster, { x: 2, y }, { x: 90, y }, 3, BLACK)
  return rect ? recordStep(history, before, raster, rect) : history
}

describe('historique de l’éditeur', () => {
  it('une zone compressée se décompresse à l’identique', () => {
    const raster = createRaster(40, 30)
    strokeSegment(raster, { x: 3, y: 4 }, { x: 35, y: 25 }, 5, RED)
    const region = packRegion(raster, { x: 5, y: 3, width: 20, height: 15 })
    const copy = createRaster(40, 30, BLACK)
    unpackRegion(copy, region)
    expect(packRegion(copy, region.rect).runs).toEqual(region.runs)
  })

  it('annuler puis rétablir une suite de traits', () => {
    const raster = createRaster(100, 100)
    const states: Uint8ClampedArray[] = [new Uint8ClampedArray(raster.data)]
    let history = EMPTY_DRAWING_HISTORY
    for (const y of [10, 30, 50]) {
      history = draw(history, raster, y)
      states.push(new Uint8ClampedArray(raster.data))
    }
    for (let i = 2; i >= 0; i--) {
      history = undoStep(history, raster).history
      expect(raster.data).toEqual(states[i])
    }
    expect(undoStep(history, raster).rect).toBeNull()
    for (let i = 1; i <= 3; i++) {
      history = redoStep(history, raster).history
      expect(raster.data).toEqual(states[i])
    }
  })

  it('un nouveau trait efface ce qui pouvait être rétabli', () => {
    const raster = createRaster(100, 100)
    let history = draw(EMPTY_DRAWING_HISTORY, raster, 10)
    history = undoStep(history, raster).history
    history = draw(history, raster, 20)
    expect(history.future).toEqual([])
  })

  it('garde les 50 dernières étapes', () => {
    const raster = createRaster(100, 100)
    let history = EMPTY_DRAWING_HISTORY
    for (let i = 0; i < 60; i++) history = draw(history, raster, (i % 90) + 5)
    expect(history.past).toHaveLength(DRAWING_HISTORY_LIMIT)
  })

  it('reste léger : 50 « Tout effacer » d’une toile 1920 × 1080 tiennent en peu de mémoire', () => {
    const raster = createRaster(1920, 1080)
    let history = EMPTY_DRAWING_HISTORY
    for (let i = 0; i < 50; i++) {
      const before = clone(raster)
      strokeSegment(raster, { x: 10, y: 10 }, { x: 1900, y: 1000 }, 40, BLACK)
      fillRaster(raster)
      history = recordStep(history, before, raster, fullRect(raster))
    }
    // Moins de 20 Mo, alors que 50 copies brutes pèseraient plus de 800 Mo.
    expect(historyBytes(history)).toBeLessThan(20 * 1024 * 1024)
  })
})
