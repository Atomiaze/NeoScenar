import type {
  FontWeight,
  LayoutItem,
  LayoutTools,
  PlacedLayout
} from '../../shared/credits/creditsLayout'

// Dessin du générique sur un canvas (étape 10bC) : texte blanc dans la police Inter embarquée
// (déclarée dans creditsExport.css), fond transparent, logos décodés par Chromium.

export const CREDITS_FONT = 'NeoScenar Inter'

const font = (weight: FontWeight, size: number): string =>
  `${weight === 'bold' ? 700 : 400} ${size}px "${CREDITS_FONT}"`

/** Attend que les deux graisses d'Inter soient chargées : sinon le canvas dessine une autre police. */
export async function loadCreditsFonts(): Promise<void> {
  await Promise.all([
    document.fonts.load(font('normal', 20)),
    document.fonts.load(font('bold', 20))
  ])
}

/** Logos décodés, par chemin ; un logo illisible est simplement absent. */
export async function loadLogos(paths: readonly string[]): Promise<Map<string, ImageBitmap>> {
  const logos = new Map<string, ImageBitmap>()
  await Promise.all(
    [...new Set(paths)].map(async (path) => {
      const result = await window.neoscenar.readCreditsLogo(path)
      if (!result.ok) return
      try {
        logos.set(path, await createImageBitmap(new Blob([result.value as BlobPart])))
      } catch {
        // Fichier abîmé : le logo n'est pas dessiné.
      }
    })
  )
  return logos
}

/** Outils de mesure pour le calcul de mise en page, avec un canvas de travail. */
export function layoutTools(logos: Map<string, ImageBitmap>): LayoutTools {
  const context = new OffscreenCanvas(1, 1).getContext('2d')!
  return {
    measure(text, weight, size) {
      context.font = font(weight, size)
      return context.measureText(text).width
    },
    logoSize(path) {
      const logo = logos.get(path)
      return logo ? { width: logo.width, height: logo.height } : null
    }
  }
}

type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

/**
 * Dessine les éléments sur un fond transparent, décalés de `top` (partie d'un déroulant coupé) et
 * à l'échelle `scale` (aperçu réduit).
 */
export function drawItems(
  context: Context2D,
  items: readonly LayoutItem[],
  logos: Map<string, ImageBitmap>,
  { top = 0, scale = 1 }: { top?: number; scale?: number } = {}
): void {
  context.save()
  context.scale(scale, scale)
  context.translate(0, -top)
  context.fillStyle = '#ffffff'
  context.textBaseline = 'alphabetic'
  context.imageSmoothingQuality = 'high'
  for (const item of items) {
    if (item.kind === 'text') {
      context.font = font(item.weight, item.size)
      context.textAlign = item.align
      context.fillText(item.text, item.x, item.y)
    } else {
      const logo = logos.get(item.path)
      if (logo) context.drawImage(logo, item.x, item.y, item.width, item.height)
    }
  }
  context.restore()
}

/** PNG d'une zone de `height` pixels commençant à `top`. */
export async function renderPng(
  layout: PlacedLayout,
  logos: Map<string, ImageBitmap>,
  top = 0,
  height = layout.height
): Promise<Uint8Array> {
  const canvas = new OffscreenCanvas(Math.round(layout.width), Math.max(1, Math.round(height)))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas')
  // Seuls les éléments qui touchent la zone sont dessinés (un déroulant peut être très long).
  const visible = layout.items.filter((item) => {
    const extent = item.kind === 'text' ? item.size * 1.5 : item.height
    const itemTop = item.kind === 'text' ? item.y - extent : item.y
    return itemTop < top + height && item.y + extent > top
  })
  drawItems(context, visible, logos, { top })
  const blob = await canvas.convertToBlob({ type: 'image/png' })
  return new Uint8Array(await blob.arrayBuffer())
}
