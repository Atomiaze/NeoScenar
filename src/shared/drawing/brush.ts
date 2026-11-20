import {
  clipRect,
  packRgb,
  pixels32,
  unionRect,
  type PixelRect,
  type Raster,
  type Rgb
} from './raster'

// Pinceau et gomme nets : un tampon rond répété le long du trajet. Chaque pixel est entièrement
// colorié ou pas du tout (aucun anticrénelage), ce qui garantit des remplissages propres.

export const MIN_BRUSH_SIZE = 1
export const MAX_BRUSH_SIZE = 100
export const BRUSH_PRESETS = [2, 5, 10, 20, 40] as const

export function clampBrushSize(size: number): number {
  return Math.min(MAX_BRUSH_SIZE, Math.max(MIN_BRUSH_SIZE, Math.round(size)))
}

/**
 * Forme du tampon : pour chaque ligne (décalage dy), le premier et le dernier décalage dx.
 * Diamètre impair : centré sur un pixel ; pair : centré sur un coin de pixel. Le disque contient
 * les pixels dont le centre est à moins d'un rayon du centre du tampon.
 */
export interface Stamp {
  size: number
  rows: { dy: number; from: number; to: number }[]
}

const stamps = new Map<number, Stamp>()

export function stampShape(size: number): Stamp {
  const diameter = clampBrushSize(size)
  const cached = stamps.get(diameter)
  if (cached) return cached
  const radius = diameter / 2
  const center = diameter % 2 === 1 ? 0.5 : 0
  const reach = Math.ceil(radius) + 1
  const rows: Stamp['rows'] = []
  for (let dy = -reach; dy <= reach; dy++) {
    let from = Infinity
    let to = -Infinity
    for (let dx = -reach; dx <= reach; dx++) {
      const px = dx + 0.5 - center
      const py = dy + 0.5 - center
      if (px * px + py * py <= radius * radius) {
        from = Math.min(from, dx)
        to = Math.max(to, dx)
      }
    }
    if (from <= to) rows.push({ dy, from, to })
  }
  const stamp = { size: diameter, rows }
  stamps.set(diameter, stamp)
  return stamp
}

/** Pixel d'ancrage du tampon pour une position de la souris (en pixels de la toile). */
function anchor(size: number, x: number, y: number): { x: number; y: number } {
  return size % 2 === 1
    ? { x: Math.floor(x), y: Math.floor(y) }
    : { x: Math.round(x), y: Math.round(y) }
}

/** Pose un tampon rond ; renvoie la zone modifiée (null si hors de la toile). */
export function stamp(
  raster: Raster,
  x: number,
  y: number,
  size: number,
  color: Rgb
): PixelRect | null {
  const shape = stampShape(size)
  const at = anchor(shape.size, x, y)
  const pixels = pixels32(raster)
  const value = packRgb(color)
  let dirty: PixelRect | null = null
  for (const row of shape.rows) {
    const py = at.y + row.dy
    if (py < 0 || py >= raster.height) continue
    const from = Math.max(0, at.x + row.from)
    const to = Math.min(raster.width - 1, at.x + row.to)
    if (from > to) continue
    pixels.fill(value, py * raster.width + from, py * raster.width + to + 1)
    dirty = unionRect(dirty, { x: from, y: py, width: to - from + 1, height: 1 })
  }
  return dirty && clipRect(dirty, raster)
}

/** Écart entre deux tampons : assez petit pour ne jamais laisser de trou. */
export function stampSpacing(size: number): number {
  return Math.max(0.5, clampBrushSize(size) / 4)
}

/**
 * Trait entre deux points (positions en pixels de la toile, à virgule) : des tampons rapprochés,
 * le premier sur `from`, le dernier sur `to`.
 */
export function strokeSegment(
  raster: Raster,
  from: { x: number; y: number },
  to: { x: number; y: number },
  size: number,
  color: Rgb
): PixelRect | null {
  const length = Math.hypot(to.x - from.x, to.y - from.y)
  const steps = Math.max(1, Math.ceil(length / stampSpacing(size)))
  let dirty: PixelRect | null = null
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    dirty = unionRect(
      dirty,
      stamp(raster, from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, size, color)
    )
  }
  return dirty
}
