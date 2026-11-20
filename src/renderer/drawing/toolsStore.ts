import { BRUSH_PRESETS, clampBrushSize } from '../../shared/drawing/brush'
import { DEFAULT_DRAWING_COLOR } from '../../shared/drawing/swatches'
import { createStore } from '../state/createStore'
import { openDrawing } from '../cards/cardsStore'

// Réglages de l'éditeur de dessin : outil, couleur, taille de chaque outil, grille, zoom.

export type DrawingTool = 'brush' | 'eraser' | 'fill'

/** Outils qui ont une taille (le pot de peinture n'en a pas). */
export type SizedTool = Exclude<DrawingTool, 'fill'>

export interface DrawingTools {
  tool: DrawingTool
  color: string
  /** Chaque outil garde sa propre taille. */
  sizes: Record<SizedTool, number>
  grid: boolean
  /** 'fit' : toile ajustée à la fenêtre ; sinon agrandissement (1 = taille réelle). */
  zoom: number | 'fit'
  /** Agrandissement qui ajuste la toile à la fenêtre (calculé par l'éditeur). */
  fitScale: number
}

export const drawingTools = createStore<DrawingTools>({
  tool: 'brush',
  color: DEFAULT_DRAWING_COLOR,
  sizes: { brush: 5, eraser: 20 },
  grid: false,
  zoom: 'fit',
  fitScale: 1
})

/** À chaque ouverture de l'éditeur : pinceau noir, toile ajustée à la fenêtre. */
export function resetForOpening(): void {
  drawingTools.set({ tool: 'brush', color: DEFAULT_DRAWING_COLOR, zoom: 'fit' })
}

export function chooseTool(tool: DrawingTool): void {
  drawingTools.set({ tool })
}

export function chooseColor(color: string): void {
  // Choisir une couleur avec la gomme active reprend le pinceau.
  const tool = drawingTools.get().tool === 'eraser' ? 'brush' : drawingTools.get().tool
  drawingTools.set({ color, tool })
}

/** Outil dont on règle la taille : l'outil actif, ou le pinceau quand le pot est actif. */
export function sizedTool(tool: DrawingTool): SizedTool {
  return tool === 'fill' ? 'brush' : tool
}

export function setToolSize(size: number): void {
  const { tool, sizes } = drawingTools.get()
  drawingTools.set({ sizes: { ...sizes, [sizedTool(tool)]: clampBrushSize(size) } })
}

/**
 * Touches [ et ] : taille prédéfinie précédente ou suivante (2, 5, 10, 20, 40), puis de 10 en 10
 * jusqu'à 100 ; en dessous de 2, pixel par pixel.
 */
export function nextSize(size: number, direction: 1 | -1): number {
  const steps = [1, ...BRUSH_PRESETS, 50, 60, 70, 80, 90, 100]
  if (direction > 0) return steps.find((step) => step > size) ?? 100
  return [...steps].reverse().find((step) => step < size) ?? 1
}

export function stepToolSize(direction: 1 | -1): void {
  const { tool, sizes } = drawingTools.get()
  setToolSize(nextSize(sizes[sizedTool(tool)], direction))
}

export function toggleGrid(): void {
  drawingTools.set({ grid: !drawingTools.get().grid })
}

/** Agrandissements proposés par Cmd + + et Cmd + -. */
export const ZOOM_STEPS = [0.1, 0.15, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.5, 2, 3, 4, 6, 8]

export function nextZoom(current: number, direction: 1 | -1): number {
  if (direction > 0) return ZOOM_STEPS.find((step) => step > current + 1e-6) ?? 8
  return [...ZOOM_STEPS].reverse().find((step) => step < current - 1e-6) ?? 0.1
}

/** Agrandissement réellement affiché. */
export function currentScale(tools: Pick<DrawingTools, 'zoom' | 'fitScale'>): number {
  return tools.zoom === 'fit' ? tools.fitScale : tools.zoom
}

/** Cmd + +, Cmd + - et Cmd + 0 (menu Affichage) quand l'éditeur est ouvert. */
export function zoomCommand(direction: 'in' | 'out' | 'reset'): void {
  if (direction === 'reset') {
    drawingTools.set({ zoom: 'fit' })
    return
  }
  drawingTools.set({
    zoom: nextZoom(currentScale(drawingTools.get()), direction === 'in' ? 1 : -1)
  })
}

/** Ouvre l'éditeur sur un plan : pinceau noir, toile ajustée à la fenêtre. */
export function openDrawingEditor(shotId: string): void {
  resetForOpening()
  openDrawing(shotId)
}
