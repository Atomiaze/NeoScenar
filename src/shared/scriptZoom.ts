// Zoom de l'éditeur de scénario (texte seulement), mémorisé dans les préférences (scriptZoom).

/** Paliers proposés par Cmd + + et Cmd + - (1 = 100 %). */
export const SCRIPT_ZOOM_STEPS = [0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2] as const

export const DEFAULT_SCRIPT_ZOOM = 1

/** Valeur lue (préférences) ramenée au palier le plus proche ; 100 % si absente ou abîmée. */
export function clampScriptZoom(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_SCRIPT_ZOOM
  return SCRIPT_ZOOM_STEPS.reduce((best, step) =>
    Math.abs(step - value) < Math.abs(best - value) ? step : best
  )
}

/** Palier suivant (agrandir), précédent (réduire), ou 100 % ; les limites ne sont jamais dépassées. */
export function nextScriptZoom(current: number, direction: 'in' | 'out' | 'reset'): number {
  if (direction === 'reset') return DEFAULT_SCRIPT_ZOOM
  const index = SCRIPT_ZOOM_STEPS.indexOf(
    clampScriptZoom(current) as (typeof SCRIPT_ZOOM_STEPS)[number]
  )
  const next = index + (direction === 'in' ? 1 : -1)
  return SCRIPT_ZOOM_STEPS[Math.max(0, Math.min(SCRIPT_ZOOM_STEPS.length - 1, next))]
}
