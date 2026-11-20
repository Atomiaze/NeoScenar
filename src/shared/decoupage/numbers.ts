import type { Decoupage } from '../projectTypes'
import { renumberList } from './placeNumbered'
import { failure, success, type EditResult } from './result'

// Renumérotation et verrouillage des numéros. Les identifiants internes ne changent jamais.

/** Remet 10, 20, 30… aux plans d'une scène, dans l'ordre actuel, sans lettre. */
export function renumberScene(decoupage: Decoupage, sceneId: string): EditResult {
  if (decoupage.numbersLocked) return failure('locked')
  if (!decoupage.scenes.some((scene) => scene.id === sceneId)) return failure('not-found')
  return success({
    ...decoupage,
    scenes: decoupage.scenes.map((scene) =>
      scene.id === sceneId ? { ...scene, shots: renumberList(scene.shots) } : scene
    )
  })
}

/** Remet 10, 20, 30… aux scènes du projet, puis aux plans de chaque scène. */
export function renumberProject(decoupage: Decoupage): EditResult {
  if (decoupage.numbersLocked) return failure('locked')
  return success({
    ...decoupage,
    scenes: renumberList(decoupage.scenes).map((scene) => ({
      ...scene,
      shots: renumberList(scene.shots)
    }))
  })
}

export function setNumbersLocked(decoupage: Decoupage, locked: boolean): EditResult {
  if (decoupage.numbersLocked === locked) return success(decoupage)
  return success({ ...decoupage, numbersLocked: locked })
}
