import { pixels32, type PixelRect, type Raster } from './raster'

// Historique de l'éditeur de dessin. Chaque étape ne garde que la zone modifiée, avant et après,
// compressée (des suites de pixels identiques) : un dessin fait d'aplats prend très peu de place.

/** Au moins 50 étapes (spécification de l'étape 4). */
export const DRAWING_HISTORY_LIMIT = 50

/** Pixels d'une zone, compressés : [nombre, couleur, nombre, couleur…]. */
export interface PackedRegion {
  rect: PixelRect
  runs: Uint32Array
}

export function packRegion(source: Raster, rect: PixelRect): PackedRegion {
  const pixels = pixels32(source)
  const runs: number[] = []
  for (let y = rect.y; y < rect.y + rect.height; y++) {
    const row = y * source.width
    for (let x = rect.x; x < rect.x + rect.width; x++) {
      const value = pixels[row + x]
      const last = runs.length - 1
      if (last > 0 && runs[last] === value) runs[last - 1]++
      else runs.push(1, value)
    }
  }
  return { rect, runs: Uint32Array.from(runs) }
}

/** Recopie une zone compressée dans la toile. */
export function unpackRegion(target: Raster, region: PackedRegion): void {
  const pixels = pixels32(target)
  const { rect, runs } = region
  let x = rect.x
  let y = rect.y
  for (let r = 0; r < runs.length; r += 2) {
    let count = runs[r]
    const value = runs[r + 1]
    while (count > 0) {
      const span = Math.min(count, rect.x + rect.width - x)
      const start = y * target.width + x
      pixels.fill(value, start, start + span)
      count -= span
      x += span
      if (x >= rect.x + rect.width) {
        x = rect.x
        y++
      }
    }
  }
}

export interface DrawingStep {
  before: PackedRegion
  after: PackedRegion
}

export interface DrawingHistory {
  past: DrawingStep[]
  future: DrawingStep[]
}

export const EMPTY_DRAWING_HISTORY: DrawingHistory = { past: [], future: [] }

/**
 * Enregistre une étape : `before` est une copie de la toile avant la modification, `raster` la
 * toile après, `rect` la zone modifiée.
 */
export function recordStep(
  history: DrawingHistory,
  before: Raster,
  raster: Raster,
  rect: PixelRect
): DrawingHistory {
  const step = { before: packRegion(before, rect), after: packRegion(raster, rect) }
  const past = [...history.past, step].slice(-DRAWING_HISTORY_LIMIT)
  return { past, future: [] }
}

/** Annule la dernière étape dans la toile. Renvoie la zone à redessiner (null : rien). */
export function undoStep(
  history: DrawingHistory,
  raster: Raster
): { history: DrawingHistory; rect: PixelRect | null } {
  const step = history.past[history.past.length - 1]
  if (!step) return { history, rect: null }
  unpackRegion(raster, step.before)
  return {
    history: { past: history.past.slice(0, -1), future: [...history.future, step] },
    rect: step.before.rect
  }
}

export function redoStep(
  history: DrawingHistory,
  raster: Raster
): { history: DrawingHistory; rect: PixelRect | null } {
  const step = history.future[history.future.length - 1]
  if (!step) return { history, rect: null }
  unpackRegion(raster, step.after)
  return {
    history: { past: [...history.past, step], future: history.future.slice(0, -1) },
    rect: step.after.rect
  }
}

/** Place occupée par l'historique, en octets (pour vérifier qu'il reste léger). */
export function historyBytes(history: DrawingHistory): number {
  return [...history.past, ...history.future].reduce(
    (total, step) => total + step.before.runs.byteLength + step.after.runs.byteLength,
    0
  )
}
