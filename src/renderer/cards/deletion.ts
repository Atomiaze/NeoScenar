import type { ItemSelection } from '../../shared/decoupage'
import { formatSceneNumber } from '../../shared/numbering'
import type { Decoupage } from '../../shared/projectTypes'
import { fr } from '../i18n/fr'

export interface DeletionPlan {
  items: ItemSelection
  /** Question à poser avant de supprimer, ou null pour supprimer tout de suite. */
  confirmation: string | null
}

/**
 * Ce que la suppression de la sélection va retirer. Un seul plan, ou une scène vide : suppression
 * immédiate (l'annulation permet de revenir en arrière). Sinon, une confirmation.
 */
export function planDeletion(decoupage: Decoupage, ids: readonly string[]): DeletionPlan | null {
  const wanted = new Set(ids)
  const scenes = decoupage.scenes.filter((scene) => wanted.has(scene.id))
  const deletedSceneIds = new Set(scenes.map((scene) => scene.id))
  // Les plans d'une scène supprimée partent avec elle : on ne les compte pas deux fois.
  const shotIds = decoupage.scenes
    .filter((scene) => !deletedSceneIds.has(scene.id))
    .flatMap((scene) => scene.shots.filter((shot) => wanted.has(shot.id)).map((shot) => shot.id))
  if (scenes.length === 0 && shotIds.length === 0) return null

  const items = { sceneIds: [...deletedSceneIds], shotIds }
  const shotsInScenes = scenes.reduce((total, scene) => total + scene.shots.length, 0)

  if (scenes.length === 0) {
    return { items, confirmation: shotIds.length === 1 ? null : fr.deletion.shots(shotIds.length) }
  }
  if (scenes.length === 1 && shotIds.length === 0) {
    const scene = scenes[0]
    if (scene.shots.length === 0) return { items, confirmation: null }
    const label = formatSceneNumber(scene.number, scene.letter)
    return { items, confirmation: fr.deletion.sceneWithShots(label, scene.shots.length) }
  }
  return {
    items,
    confirmation: fr.deletion.mixed(scenes.length, shotsInScenes, shotIds.length)
  }
}
