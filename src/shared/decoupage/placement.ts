import type { Decoupage, Shot } from '../projectTypes'
import type { ShotPosition } from './structure'

/** Élément de référence pour les boutons « Ajouter » (en général le dernier cliqué). */
export type ItemRef = { kind: 'scene'; id: string } | { kind: 'shot'; id: string }

/** Retrouve la scène et la position d'un plan. */
export function locateShot(
  decoupage: Decoupage,
  shotId: string
): { sceneIndex: number; shotIndex: number } | null {
  for (let sceneIndex = 0; sceneIndex < decoupage.scenes.length; sceneIndex++) {
    const shotIndex = decoupage.scenes[sceneIndex].shots.findIndex((shot) => shot.id === shotId)
    if (shotIndex >= 0) return { sceneIndex, shotIndex }
  }
  return null
}

/**
 * « Ajouter un plan » : après le plan sélectionné ; à la fin de la scène sélectionnée ; sans
 * sélection, à la fin de la dernière scène. Null s'il n'existe aucune scène.
 */
export function addShotPosition(decoupage: Decoupage, anchor: ItemRef | null): ShotPosition | null {
  if (anchor?.kind === 'shot') {
    const found = locateShot(decoupage, anchor.id)
    if (found) {
      return { sceneId: decoupage.scenes[found.sceneIndex].id, index: found.shotIndex + 1 }
    }
  }
  if (anchor?.kind === 'scene') {
    const scene = decoupage.scenes.find((item) => item.id === anchor.id)
    if (scene) return { sceneId: scene.id, index: scene.shots.length }
  }
  const last = decoupage.scenes[decoupage.scenes.length - 1]
  return last ? { sceneId: last.id, index: last.shots.length } : null
}

/** « Ajouter une scène » : après la scène sélectionnée (ou celle du plan sélectionné), sinon à la fin. */
export function addSceneIndex(decoupage: Decoupage, anchor: ItemRef | null): number {
  if (anchor?.kind === 'scene') {
    const index = decoupage.scenes.findIndex((scene) => scene.id === anchor.id)
    if (index >= 0) return index + 1
  }
  if (anchor?.kind === 'shot') {
    const found = locateShot(decoupage, anchor.id)
    if (found) return found.sceneIndex + 1
  }
  return decoupage.scenes.length
}

/** Plan précédent (-1) ou suivant (+1) dans l'ordre du film, d'une scène à l'autre ; ou null. */
export function neighborShot(decoupage: Decoupage, shotId: string, direction: 1 | -1): Shot | null {
  const shots = decoupage.scenes.flatMap((scene) => scene.shots)
  const index = shots.findIndex((shot) => shot.id === shotId)
  if (index < 0) return null
  return shots[index + direction] ?? null
}
