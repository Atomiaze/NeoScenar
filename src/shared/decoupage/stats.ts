import type { Decoupage, Scene } from '../projectTypes'
import { numberKey } from './order'

/** Durée totale d'une scène en secondes (les plans sans durée comptent pour 0). */
export function sceneDuration(scene: Scene): number {
  return scene.shots.reduce((total, shot) => total + (shot.duration ?? 0), 0)
}

/**
 * Durée du film : somme des scènes. Les scènes dont le numéro est dans `excluded` (« 30 », « 30A »)
 * ne comptent pas : ce sont les brouillons (18C-13), qui ne sont ni imprimés ni comptés.
 */
export function totalDuration(
  decoupage: Decoupage,
  excluded: ReadonlySet<string> = new Set()
): number {
  return decoupage.scenes.reduce(
    (total, scene) => (excluded.has(numberKey(scene)) ? total : total + sceneDuration(scene)),
    0
  )
}

export function shotCount(decoupage: Decoupage): number {
  return decoupage.scenes.reduce((total, scene) => total + scene.shots.length, 0)
}

/** 32 → « 0:32 » ; 754,6 → « 12:35 » ; 3725 → « 1:02:05 » (arrondi à la seconde). */
export function formatDuration(seconds: number): string {
  const rounded = Math.round(seconds)
  const hours = Math.floor(rounded / 3600)
  const minutes = Math.floor((rounded % 3600) / 60)
  const secs = String(rounded % 60).padStart(2, '0')
  // Au-delà d'une heure : h:mm:ss (1:02:05) ; sinon m:ss (0:08, 12:30).
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}` : `${minutes}:${secs}`
}
