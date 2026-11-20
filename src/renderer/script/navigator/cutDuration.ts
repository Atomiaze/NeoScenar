import { sceneDuration } from '../../../shared/decoupage'
import { numberKey } from '../../../shared/decoupage/order'
import type { Decoupage } from '../../../shared/projectTypes'

/**
 * Durée du découpage d'une scène (somme des durées de ses plans), retrouvée par son numéro ; null
 * si la scène n'a pas de carte ou si aucun de ses plans n'a de durée.
 */
export function cutSeconds(decoupage: Decoupage | null, key: string | null): number | null {
  if (!decoupage || key === null) return null
  const scene = decoupage.scenes.find((item) => numberKey(item) === key)
  if (!scene || scene.shots.every((shot) => shot.duration === null)) return null
  return sceneDuration(scene)
}
