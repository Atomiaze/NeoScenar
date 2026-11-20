import type { Decoupage, Scene, Shot } from '../projectTypes'
import { failure, success, type EditResult } from './result'

// Modification des champs des fiches et des couleurs.

export type ShotPatch = Partial<
  Pick<
    Shot,
    | 'name'
    | 'color'
    | 'duration'
    | 'shotSize'
    | 'cameraMovement'
    | 'cameraAngle'
    | 'sound'
    | 'music'
    | 'description'
    | 'thumbnail'
    | 'thumbnailSource'
    | 'thumbnailCrop'
  >
>

export type ScenePatch = Partial<Pick<Scene, 'name' | 'heading' | 'color'>>

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

function isValidColor(color: string | null | undefined): boolean {
  return color === undefined || color === null || HEX_COLOR.test(color)
}

function isValidDuration(duration: number | null | undefined): boolean {
  return duration === undefined || duration === null || (Number.isFinite(duration) && duration >= 0)
}

/** Faux si l'objet modifié serait identique : on évite alors une étape d'annulation inutile. */
function changes<T extends object>(item: T, patch: Partial<T>): boolean {
  return (Object.keys(patch) as (keyof T)[]).some((key) => item[key] !== patch[key])
}

export function updateShot(decoupage: Decoupage, shotId: string, patch: ShotPatch): EditResult {
  if (!isValidColor(patch.color) || !isValidDuration(patch.duration)) return failure('invalid')
  const scene = decoupage.scenes.find((item) => item.shots.some((shot) => shot.id === shotId))
  if (!scene) return failure('not-found')
  const shot = scene.shots.find((item) => item.id === shotId) as Shot
  if (!changes(shot, patch)) return success(decoupage)
  return success({
    ...decoupage,
    scenes: decoupage.scenes.map((item) =>
      item === scene
        ? { ...item, shots: item.shots.map((s) => (s.id === shotId ? { ...s, ...patch } : s)) }
        : item
    )
  })
}

/** L'en-tête de scène est toujours mis en majuscules (« INT. CUISINE - JOUR »). */
export function updateScene(decoupage: Decoupage, sceneId: string, patch: ScenePatch): EditResult {
  if (!isValidColor(patch.color)) return failure('invalid')
  const scene = decoupage.scenes.find((item) => item.id === sceneId)
  if (!scene) return failure('not-found')
  const normalized: ScenePatch =
    patch.heading === undefined
      ? patch
      : { ...patch, heading: patch.heading.toLocaleUpperCase('fr') }
  if (!changes(scene, normalized)) return success(decoupage)
  return success({
    ...decoupage,
    scenes: decoupage.scenes.map((item) => (item === scene ? { ...item, ...normalized } : item))
  })
}

/** Applique une couleur (ou la couleur par défaut, null) à toutes les scènes et plans indiqués. */
export function setColor(
  decoupage: Decoupage,
  itemIds: readonly string[],
  color: string | null
): EditResult {
  if (!isValidColor(color)) return failure('invalid')
  const ids = new Set(itemIds)
  let changed = false
  const recolor = <T extends { id: string; color: string | null }>(item: T): T => {
    if (!ids.has(item.id) || item.color === color) return item
    changed = true
    return { ...item, color }
  }
  const scenes = decoupage.scenes.map((scene) => {
    const shots = scene.shots.map(recolor)
    const recolored = recolor(scene)
    const shotsChanged = shots.some((shot, i) => shot !== scene.shots[i])
    return shotsChanged ? { ...recolored, shots } : recolored
  })
  return success(changed ? { ...decoupage, scenes } : decoupage)
}
