import { workingSize, type Size } from '../../../shared/imageFormat'
import type { ThumbnailCrop, ThumbnailRotation } from '../../../shared/projectTypes'
import {
  imagePlacement,
  rotatedSize,
  rotationMatrix,
  type Rect
} from '../../../shared/thumbnail/geometry'

// Décodage et dessin des images avec les outils de Chromium (aucune bibliothèque).

type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

export function bitmapSize(image: ImageBitmap): Size {
  return { width: image.width, height: image.height }
}

/**
 * Décode une image. « from-image » applique l'orientation EXIF : une photo de téléphone prise en
 * portrait arrive debout.
 */
export async function decodeImage(bytes: Uint8Array): Promise<ImageBitmap> {
  return createImageBitmap(new Blob([bytes as BlobPart]), { imageOrientation: 'from-image' })
}

/** Dessine l'image entière, pivotée, dans le rectangle `place` (pixels du canvas). */
export function drawRotated(
  context: Context2D,
  image: ImageBitmap,
  rotation: ThumbnailRotation,
  place: Rect
): void {
  const turned = rotatedSize(bitmapSize(image), rotation)
  context.save()
  context.translate(place.x, place.y)
  context.scale(place.width / turned.width, place.height / turned.height)
  context.transform(...rotationMatrix(rotation, bitmapSize(image)))
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0)
  context.restore()
}

/** Dessine la vignette (cadre ou image entière avec bandes) sur un canvas de taille `output`. */
export function drawThumbnail(
  context: Context2D,
  image: ImageBitmap,
  crop: ThumbnailCrop,
  output: Size
): void {
  const turned = rotatedSize(bitmapSize(image), crop.rotation)
  context.fillStyle = crop.bands === 'black' ? '#000000' : '#ffffff'
  context.fillRect(0, 0, output.width, output.height)
  drawRotated(context, image, crop.rotation, imagePlacement(turned, crop, output))
}

/** Fabrique la vignette PNG à la définition de travail (1920 sur le côté le plus long). */
export async function renderThumbnailPng(
  image: ImageBitmap,
  crop: ThumbnailCrop,
  projectSize: Size
): Promise<Uint8Array> {
  const output = workingSize(projectSize)
  const canvas = new OffscreenCanvas(output.width, output.height)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas indisponible')
  drawThumbnail(context, image, crop, output)
  const blob = await canvas.convertToBlob({ type: 'image/png' })
  return new Uint8Array(await blob.arrayBuffer())
}
