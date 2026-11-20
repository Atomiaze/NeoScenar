import { describe, expect, it } from 'vitest'
import { stamp, strokeSegment } from './brush'
import { floodFill } from './fill'
import { createRaster, getPixel, isBlank, PAPER, type Raster, type Rgb } from './raster'
import { BLACK, pixelsOf, RED } from './testRaster'

function square(raster: Raster, x: number, y: number, side: number, color: Rgb = BLACK): void {
  const corners = [
    { x, y },
    { x: x + side, y },
    { x: x + side, y: y + side },
    { x, y: y + side }
  ]
  corners.forEach((corner, i) => strokeSegment(raster, corner, corners[(i + 1) % 4], 3, color))
}

describe('pot de peinture', () => {
  it('toile vide : tout le fond est rempli', () => {
    const raster = createRaster(64, 48)
    expect(floodFill(raster, 10, 10, RED)).toEqual({ x: 0, y: 0, width: 64, height: 48 })
    expect(pixelsOf(raster, RED).size).toBe(64 * 48)
  })

  it('zone fermée : remplie sans déborder', () => {
    const raster = createRaster(100, 100)
    square(raster, 20, 20, 50)
    floodFill(raster, 45, 45, RED)
    expect(getPixel(raster, 45, 45)).toMatchObject(RED)
    expect(getPixel(raster, 5, 5)).toMatchObject(PAPER)
    expect(getPixel(raster, 90, 90)).toMatchObject(PAPER)
    // Le trait reste noir.
    expect(getPixel(raster, 20, 45)).toMatchObject(BLACK)
  })

  it('zone ouverte : le remplissage s’échappe par l’ouverture', () => {
    const raster = createRaster(100, 100)
    square(raster, 20, 20, 50)
    // On efface un morceau du côté droit.
    strokeSegment(raster, { x: 70, y: 40 }, { x: 70, y: 50 }, 6, PAPER)
    floodFill(raster, 45, 45, RED)
    expect(getPixel(raster, 5, 5)).toMatchObject(RED)
  })

  it('un trait diagonal d’un pixel ne laisse pas passer le remplissage', () => {
    const raster = createRaster(60, 60)
    strokeSegment(raster, { x: 0, y: 59 }, { x: 59, y: 0 }, 1, BLACK)
    floodFill(raster, 2, 2, RED)
    expect(getPixel(raster, 57, 57)).toMatchObject(PAPER)
  })

  it('tolérance : sur un trait adouci (image importée), pas de liseré clair et pas de fuite', () => {
    const raster = createRaster(60, 60)
    // Cercle noir dont le bord est adouci par des gris, comme un scan.
    stamp(raster, 30, 30, 44, { r: 235, g: 235, b: 235 })
    stamp(raster, 30, 30, 42, { r: 190, g: 190, b: 190 })
    stamp(raster, 30, 30, 40, { r: 120, g: 120, b: 120 })
    stamp(raster, 30, 30, 38, BLACK)
    stamp(raster, 30, 30, 34, { r: 120, g: 120, b: 120 })
    stamp(raster, 30, 30, 32, { r: 190, g: 190, b: 190 })
    stamp(raster, 30, 30, 30, { r: 235, g: 235, b: 235 })
    stamp(raster, 30, 30, 28, PAPER)
    floodFill(raster, 30, 30, RED)
    // Les gris clairs autour du trait sont repris (pas de liseré)…
    expect(getPixel(raster, 30, 30 - 15)).toMatchObject(RED)
    expect(getPixel(raster, 30, 30 - 16)).toMatchObject(RED)
    // … mais le remplissage ne traverse pas le trait.
    expect(getPixel(raster, 30, 30 - 18)).toMatchObject(BLACK)
    expect(getPixel(raster, 1, 1)).toMatchObject(PAPER)
  })

  it('cliquer sur la couleur active ne fait rien', () => {
    const raster = createRaster(20, 20, RED)
    expect(floodFill(raster, 5, 5, RED)).toBeNull()
  })

  it('clic hors de la toile : rien', () => {
    const raster = createRaster(20, 20)
    expect(floodFill(raster, -1, 5, RED)).toBeNull()
    expect(isBlank(raster)).toBe(true)
  })

  it('grande toile (1920 × 1080) remplie en un temps raisonnable', () => {
    const raster = createRaster(1920, 1080)
    for (let i = 0; i < 30; i++) {
      strokeSegment(raster, { x: i * 60, y: 0 }, { x: 1919 - i * 40, y: 1079 }, 5, BLACK)
    }
    const start = performance.now()
    floodFill(raster, 3, 1070, RED)
    floodFill(raster, 960, 540, { r: 0, g: 0, b: 255 })
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(1000)
  })
})
