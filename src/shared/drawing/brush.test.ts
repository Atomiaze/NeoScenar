import { describe, expect, it } from 'vitest'
import { stamp, stampShape, strokeSegment } from './brush'
import { createRaster, fillRaster, PAPER } from './raster'
import { BLACK, countOthers, isConnected, pixelsOf } from './testRaster'

describe('tampon rond', () => {
  it('nombre de pixels pour plusieurs tailles (proche de l’aire du disque)', () => {
    const counts = [1, 2, 3, 5, 10, 20, 40, 100].map((size) => {
      const raster = createRaster(200, 200)
      stamp(raster, 100, 100, size, BLACK)
      return [size, pixelsOf(raster, BLACK).size]
    })
    expect(counts.slice(0, 3)).toEqual([
      [1, 1],
      [2, 4],
      [3, 9]
    ])
    for (const [size, count] of counts) {
      const area = Math.PI * (size / 2) ** 2
      expect(Math.abs(count - area) / area).toBeLessThan(size < 5 ? 0.6 : 0.08)
    }
  })

  it('position : centré sur le point visé, symétrique', () => {
    const raster = createRaster(20, 20)
    stamp(raster, 10, 10, 4, BLACK)
    const cells = pixelsOf(raster, BLACK)
    for (const key of cells) {
      const [x, y] = key.split(',').map(Number)
      expect(cells.has(`${19 - x},${y}`)).toBe(true)
      expect(cells.has(`${x},${19 - y}`)).toBe(true)
    }
    expect(cells.has('10,10')).toBe(true)
    expect(cells.has('9,9')).toBe(true)
  })

  it('bords nets : aucun pixel intermédiaire, uniquement noir ou blanc', () => {
    const raster = createRaster(120, 120)
    stamp(raster, 60.3, 59.7, 37, BLACK)
    expect(countOthers(raster, BLACK)).toBe(0)
  })

  it('découpé aux bords de la toile, sans erreur', () => {
    const raster = createRaster(30, 30)
    const dirty = stamp(raster, 1, 1, 20, BLACK)
    expect(dirty).toEqual({ x: 0, y: 0, width: 11, height: 11 })
    expect(stamp(raster, -50, -50, 10, BLACK)).toBeNull()
  })

  it('la forme est mémorisée', () => {
    expect(stampShape(40)).toBe(stampShape(40))
  })
})

describe('segment', () => {
  const directions = [
    [5, 5, 195, 5],
    [195, 195, 5, 5],
    [5, 190, 190, 7],
    [100, 3, 104, 196],
    [3, 100, 196, 120],
    [10, 10, 190, 190]
  ]

  it('aucun trou entre deux points éloignés, dans toutes les directions et toutes les tailles', () => {
    for (const size of [1, 2, 3, 10, 40]) {
      for (const [x1, y1, x2, y2] of directions) {
        const raster = createRaster(200, 200)
        strokeSegment(raster, { x: x1, y: y1 }, { x: x2, y: y2 }, size, BLACK)
        const cells = pixelsOf(raster, BLACK)
        expect(isConnected(cells), `taille ${size} de ${x1},${y1} à ${x2},${y2}`).toBe(true)
        expect(cells.has(`${Math.floor(x1)},${Math.floor(y1)}`) || size % 2 === 0).toBe(true)
      }
    }
  })

  it('un trait épais garde sa largeur sur tout le trajet', () => {
    const raster = createRaster(300, 100)
    strokeSegment(raster, { x: 20, y: 50 }, { x: 280, y: 50 }, 20, BLACK)
    const cells = pixelsOf(raster, BLACK)
    for (const x of [30, 100, 150, 222, 270]) {
      const column = [...cells].filter((key) => key.startsWith(`${x},`)).length
      expect(column).toBe(20)
    }
  })

  it('la gomme peint en blanc, la couleur du papier', () => {
    const raster = createRaster(50, 50)
    fillRaster(raster, BLACK)
    strokeSegment(raster, { x: 5, y: 25 }, { x: 45, y: 25 }, 6, PAPER)
    expect(pixelsOf(raster, PAPER).size).toBeGreaterThan(40 * 6)
    expect(countOthers(raster, BLACK)).toBe(0)
  })
})
