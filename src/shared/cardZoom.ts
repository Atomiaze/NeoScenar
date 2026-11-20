// Taille des cartes du module Cartes (1 = taille normale), mémorisée dans les préférences.

export const CARD_ZOOM = { min: 0.6, max: 1.6, step: 0.1, default: 1 } as const

/** Ramène une valeur quelconque dans les limites du réglage ; défaut si ce n'est pas un nombre. */
export function clampCardZoom(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return CARD_ZOOM.default
  const clamped = Math.min(CARD_ZOOM.max, Math.max(CARD_ZOOM.min, value))
  return Math.round(clamped * 100) / 100
}
