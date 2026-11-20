// Toile de dessin : un simple tableau de pixels RGBA, sans écran ni canvas. Toutes les fonctions
// de dessin travaillent dessus et sont testées dans Vitest.

export interface Raster {
  width: number
  height: number
  /** 4 octets par pixel (rouge, vert, bleu, opacité), ligne par ligne. */
  data: Uint8ClampedArray
}

export interface Rgb {
  r: number
  g: number
  b: number
}

/** Rectangle de pixels (coordonnées entières). */
export interface PixelRect {
  x: number
  y: number
  width: number
  height: number
}

/** Couleur du papier : la gomme et « Tout effacer » peignent avec. */
export const PAPER: Rgb = { r: 255, g: 255, b: 255 }

export function hexToRgb(hex: string): Rgb {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  }
}

/** Couleur opaque sous forme d'un seul nombre de 32 bits, dans l'ordre mémoire du processeur. */
export function packRgb(color: Rgb): number {
  const bytes = new Uint8ClampedArray([color.r, color.g, color.b, 255])
  return new Uint32Array(bytes.buffer)[0]
}

/** Vue « un nombre par pixel » de la toile (plus rapide pour remplir). */
export function pixels32(raster: Raster): Uint32Array {
  return new Uint32Array(raster.data.buffer, raster.data.byteOffset, raster.width * raster.height)
}

export function createRaster(width: number, height: number, color: Rgb = PAPER): Raster {
  const raster = { width, height, data: new Uint8ClampedArray(width * height * 4) }
  pixels32(raster).fill(packRgb(color))
  return raster
}

export function fullRect(raster: Raster): PixelRect {
  return { x: 0, y: 0, width: raster.width, height: raster.height }
}

/** Plus petit rectangle contenant les deux (null = aucun). */
export function unionRect(a: PixelRect | null, b: PixelRect | null): PixelRect | null {
  if (!a) return b
  if (!b) return a
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y
  }
}

/** Partie du rectangle qui est dans la toile, ou null. */
export function clipRect(rect: PixelRect, raster: Raster): PixelRect | null {
  const x = Math.max(0, rect.x)
  const y = Math.max(0, rect.y)
  const right = Math.min(raster.width, rect.x + rect.width)
  const bottom = Math.min(raster.height, rect.y + rect.height)
  return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null
}

/** « Tout effacer » (avec la couleur du papier) ou remplir toute la toile. */
export function fillRaster(raster: Raster, color: Rgb = PAPER): PixelRect {
  pixels32(raster).fill(packRgb(color))
  return fullRect(raster)
}

/** Vrai si toute la toile est de cette couleur (blanche par défaut : toile vide). */
export function isBlank(raster: Raster, color: Rgb = PAPER): boolean {
  const value = packRgb(color)
  return pixels32(raster).every((pixel) => pixel === value)
}

/** Copie toute une toile de même taille (point de départ, plan précédent). */
export function copyRaster(target: Raster, source: Raster): PixelRect {
  if (source.width !== target.width || source.height !== target.height) {
    throw new Error('copyRaster : tailles différentes')
  }
  target.data.set(source.data)
  return fullRect(target)
}

export function getPixel(raster: Raster, x: number, y: number): Rgb & { a: number } {
  const i = (y * raster.width + x) * 4
  const d = raster.data
  return { r: d[i], g: d[i + 1], b: d[i + 2], a: d[i + 3] }
}
