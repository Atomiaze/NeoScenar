import type { Scene, Shot } from '../projectTypes'

// Une carte vide peut être supprimée sans prévenir quand sa scène disparaît du scénario :
// l'élève n'y perd rien. Toute autre carte devient orpheline.

function isEmptyShot(shot: Shot): boolean {
  return (
    shot.name === '' &&
    shot.color === null &&
    shot.thumbnail === null &&
    shot.thumbnailSource === null &&
    shot.thumbnailCrop === null &&
    shot.duration === null &&
    shot.shotSize === null &&
    shot.cameraMovement === null &&
    shot.cameraAngle === null &&
    shot.sound === '' &&
    shot.music === '' &&
    shot.description === ''
  )
}

/**
 * Nom et couleur par défaut, et au plus un plan sans aucun contenu. L'en-tête n'est pas regardé :
 * il vient du scénario.
 */
export function isEmptyCard(scene: Scene): boolean {
  return (
    scene.name === '' &&
    scene.color === null &&
    scene.shots.length <= 1 &&
    scene.shots.every(isEmptyShot)
  )
}
