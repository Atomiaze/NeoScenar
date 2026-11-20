import { PAPER, packRgb, pixels32, type Raster, type Rgb } from './raster'

// Outils des tests : lire une toile comme une grille de caractères.

export const BLACK: Rgb = { r: 0, g: 0, b: 0 }
export const RED: Rgb = { r: 255, g: 0, b: 0 }

/** Pixels d'une couleur donnée, sous forme « x,y ». */
export function pixelsOf(raster: Raster, color: Rgb): Set<string> {
  const value = packRgb(color)
  const result = new Set<string>()
  pixels32(raster).forEach((pixel, index) => {
    if (pixel === value) result.add(`${index % raster.width},${Math.floor(index / raster.width)}`)
  })
  return result
}

/** Nombre de pixels qui ne sont ni blancs ni de la couleur donnée (pixels « intermédiaires »). */
export function countOthers(raster: Raster, color: Rgb): number {
  const allowed = new Set([packRgb(color), packRgb(PAPER)])
  return pixels32(raster).filter((pixel) => !allowed.has(pixel)).length
}

/** Vrai si les pixels donnés forment un seul bloc (voisins en 8 directions). */
export function isConnected(cells: Set<string>): boolean {
  const [first] = cells
  if (!first) return true
  const seen = new Set([first])
  const queue = [first]
  while (queue.length > 0) {
    const [x, y] = (queue.pop() as string).split(',').map(Number)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${x + dx},${y + dy}`
        if (cells.has(key) && !seen.has(key)) {
          seen.add(key)
          queue.push(key)
        }
      }
    }
  }
  return seen.size === cells.size
}
