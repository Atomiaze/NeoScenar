import { aspectRatio, type Size } from '../imageFormat'
import type { CropFrame, ThumbnailCrop, ThumbnailRotation } from '../projectTypes'

// Géométrie de la fenêtre de recadrage. Le cadre est exprimé en fractions (0 à 1) de l'image
// après rotation ; les calculs se font en pixels pour garder exactement les proportions.

/** Rectangle en pixels. */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

/** Le plus petit cadre autorisé, en pixels de l'image (au moins). */
export const MIN_FRAME_PIXELS = 16

export const FULL_FRAME: CropFrame = { x: 0, y: 0, width: 1, height: 1 }

/** Taille de l'image une fois pivotée. */
export function rotatedSize(size: Size, rotation: ThumbnailRotation): Size {
  return rotation === 90 || rotation === 270 ? { width: size.height, height: size.width } : size
}

/** Pivoter à gauche ou à droite de 90°. */
export function rotate(
  rotation: ThumbnailRotation,
  direction: 'left' | 'right'
): ThumbnailRotation {
  return ((rotation + (direction === 'right' ? 90 : 270)) % 360) as ThumbnailRotation
}

function toPixels(frame: CropFrame, image: Size): Rect {
  return {
    x: frame.x * image.width,
    y: frame.y * image.height,
    width: frame.width * image.width,
    height: frame.height * image.height
  }
}

function toFrame(rect: Rect, image: Size): CropFrame {
  return {
    x: rect.x / image.width,
    y: rect.y / image.height,
    width: rect.width / image.width,
    height: rect.height / image.height
  }
}

/** Le plus grand cadre aux proportions de `target`, centré dans l'image. */
export function initialFrame(image: Size, target: Size): CropFrame {
  const ratio = aspectRatio(target)
  const width = Math.min(image.width, image.height * ratio)
  const height = width / ratio
  return toFrame(
    { x: (image.width - width) / 2, y: (image.height - height) / 2, width, height },
    image
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Déplace le cadre de (dx, dy) pixels, sans jamais le laisser sortir de l'image. */
export function moveFrame(frame: CropFrame, image: Size, dx: number, dy: number): CropFrame {
  const rect = toPixels(frame, image)
  return toFrame(
    {
      ...rect,
      x: clamp(rect.x + dx, 0, image.width - rect.width),
      y: clamp(rect.y + dy, 0, image.height - rect.height)
    },
    image
  )
}

/**
 * Redimensionne le cadre en tirant un coin vers `pointer` (en pixels de l'image). Le coin opposé
 * reste fixe ; les proportions de `target` sont gardées ; le cadre reste dans l'image.
 */
export function resizeFrame(
  frame: CropFrame,
  image: Size,
  target: Size,
  corner: Corner,
  pointer: { x: number; y: number }
): CropFrame {
  const ratio = aspectRatio(target)
  const rect = toPixels(frame, image)
  const left = corner.endsWith('left')
  const top = corner.startsWith('top')
  // Coin opposé, qui ne bouge pas.
  const anchor = { x: left ? rect.x + rect.width : rect.x, y: top ? rect.y + rect.height : rect.y }
  const maxWidth = Math.min(
    left ? anchor.x : image.width - anchor.x,
    (top ? anchor.y : image.height - anchor.y) * ratio
  )
  const minWidth = Math.min(maxWidth, Math.max(MIN_FRAME_PIXELS, MIN_FRAME_PIXELS * ratio))
  const wanted = Math.max(Math.abs(pointer.x - anchor.x), Math.abs(pointer.y - anchor.y) * ratio)
  const width = clamp(wanted, minWidth, maxWidth)
  const height = width / ratio
  return toFrame(
    {
      x: left ? anchor.x - width : anchor.x,
      y: top ? anchor.y - height : anchor.y,
      width,
      height
    },
    image
  )
}

/**
 * Où dessiner l'image entière (pivotée) dans la vignette, en pixels de la vignette, pour que le
 * cadre la remplisse exactement (mode « crop »), ou pour qu'elle y tienne entière, centrée,
 * avec des bandes (mode « fit »).
 */
export function imagePlacement(
  image: Size,
  crop: Pick<ThumbnailCrop, 'mode' | 'frame'>,
  output: Size
): Rect {
  if (crop.mode === 'fit') {
    const scale = Math.min(output.width / image.width, output.height / image.height)
    const width = image.width * scale
    const height = image.height * scale
    return { x: (output.width - width) / 2, y: (output.height - height) / 2, width, height }
  }
  const frame = toPixels(crop.frame, image)
  const scaleX = output.width / frame.width
  const scaleY = output.height / frame.height
  return {
    x: -frame.x * scaleX,
    y: -frame.y * scaleY,
    width: image.width * scaleX,
    height: image.height * scaleY
  }
}

/**
 * Transformation (a, b, c, d, e, f, comme pour un canvas) qui fait pivoter une image de taille
 * `original` dans le sens des aiguilles d'une montre, son coin haut-gauche restant en (0, 0).
 */
export function rotationMatrix(
  rotation: ThumbnailRotation,
  original: Size
): [number, number, number, number, number, number] {
  switch (rotation) {
    case 90:
      return [0, 1, -1, 0, original.height, 0]
    case 180:
      return [-1, 0, 0, -1, original.width, original.height]
    case 270:
      return [0, -1, 1, 0, 0, original.width]
    default:
      return [1, 0, 0, 1, 0, 0]
  }
}

/** Applique une transformation à un point (utile pour les tests et les vérifications). */
export function applyMatrix(
  matrix: readonly number[],
  point: { x: number; y: number }
): { x: number; y: number } {
  const [a, b, c, d, e, f] = matrix
  return { x: a * point.x + c * point.y + e, y: b * point.x + d * point.y + f }
}

/** Cadre de départ : rotation nulle, plus grand cadre centré. */
export function defaultCrop(image: Size, target: Size): ThumbnailCrop {
  return {
    rotation: 0,
    mode: 'crop',
    frame: initialFrame(image, target),
    bands: 'white',
    auto: false
  }
}
