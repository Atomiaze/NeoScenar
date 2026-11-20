import { updateShot } from '../../shared/decoupage'
import { createRaster, type Raster } from '../../shared/drawing/raster'
import { workingSize, type Size } from '../../shared/imageFormat'
import { FULL_FRAME, imagePlacement } from '../../shared/thumbnail/geometry'
import { bitmapSize, decodeImage, drawRotated } from '../cards/thumbnails/drawing'
import { cardsStore, commitDecoupage } from '../cards/cardsStore'
import { fr } from '../i18n/fr'

// Lecture et enregistrement des dessins (vignettes PNG), avec les outils de Chromium.

/** Toile blanche à la définition de travail du projet (1920 sur le côté le plus long). */
export function blankRaster(project: Size): Raster {
  const size = workingSize(project)
  return createRaster(size.width, size.height)
}

/**
 * Copie une image dans la toile : entière, centrée, sans déformation, avec des bandes blanches
 * si ses proportions ne sont pas celles du projet (vignette « À recadrer »).
 */
export function drawImageInto(raster: Raster, image: ImageBitmap): void {
  const canvas = new OffscreenCanvas(raster.width, raster.height)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas indisponible')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, raster.width, raster.height)
  const output = { width: raster.width, height: raster.height }
  drawRotated(
    context,
    image,
    0,
    imagePlacement(bitmapSize(image), { mode: 'fit', frame: FULL_FRAME }, output)
  )
  raster.data.set(context.getImageData(0, 0, raster.width, raster.height).data)
}

/** Lit une image du storyboard dans la toile. Renvoie un message en cas d'échec. */
export async function loadImageInto(raster: Raster, path: string): Promise<string | null> {
  const bytes = await window.neoscenar.readProjectImage(path)
  if (!bytes.ok) return bytes.error
  let image: ImageBitmap
  try {
    image = await decodeImage(bytes.value)
  } catch {
    return fr.images.decodeFailed
  }
  try {
    drawImageInto(raster, image)
    return null
  } finally {
    image.close()
  }
}

export async function rasterToPng(raster: Raster): Promise<Uint8Array> {
  const canvas = new OffscreenCanvas(raster.width, raster.height)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas indisponible')
  context.putImageData(new ImageData(new Uint8ClampedArray(raster.data), raster.width), 0, 0)
  const blob = await canvas.convertToBlob({ type: 'image/png' })
  return new Uint8Array(await blob.arrayBuffer())
}

/**
 * Enregistre le dessin comme nouvelle vignette, et une copie comme image d'origine (pour pouvoir
 * recadrer plus tard sans perdre le dessin). Les anciens fichiers ne sont jamais touchés.
 * Renvoie un message d'erreur, ou null si tout est enregistré.
 */
export async function saveDrawing(shotId: string, raster: Raster): Promise<string | null> {
  let png: Uint8Array
  try {
    png = await rasterToPng(raster)
  } catch (error) {
    return (error as Error).message
  }
  const thumbnail = await window.neoscenar.storeThumbnail(shotId, png)
  if (!thumbnail.ok) return thumbnail.error
  const original = await window.neoscenar.storeOriginalBytes(shotId, png)
  if (!original.ok) return original.error
  const decoupage = cardsStore.get().history?.present
  if (!decoupage) return null
  const result = updateShot(decoupage, shotId, {
    thumbnail: thumbnail.value,
    thumbnailSource: original.value.path,
    thumbnailCrop: null
  })
  // Une étape d'annulation par plan dessiné.
  if (result.ok) commitDecoupage(result.decoupage, { label: 'drawThumbnail' })
  return null
}
