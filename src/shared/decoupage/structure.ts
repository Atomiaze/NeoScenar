import type { Decoupage, Scene, Shot } from '../projectTypes'
import { createScene, createShot, type IdSource } from './factories'
import { placeNumbered, takenNumbers } from './placeNumbered'
import { failure, success, type EditResult } from './result'

// Ajouter, insérer, supprimer et déplacer des scènes et des plans.

/** Nombre maximal d'éléments ajoutés en une fois (« Ajouter plusieurs… »). */
export const MAX_BATCH = 200

export interface PlaceOptions {
  /** Faute de numéro libre, renuméroter la scène (plans) ou les scènes, puis placer. */
  renumber?: boolean
}

/** Position d'un plan : dans la scène `sceneId`, à l'indice `index` de sa liste de plans. */
export interface ShotPosition {
  sceneId: string
  index: number
}

function isValidCount(count: number): boolean {
  return Number.isInteger(count) && count >= 1 && count <= MAX_BATCH
}

function isValidIndex(index: number, length: number): boolean {
  return Number.isInteger(index) && index >= 0 && index <= length
}

function withScenes(decoupage: Decoupage, scenes: Scene[]): Decoupage {
  return { ...decoupage, scenes }
}

/** Ajoute `count` plans vides à une position précise d'une scène. */
export function insertShots(
  decoupage: Decoupage,
  position: ShotPosition,
  count: number,
  ids: IdSource,
  options: PlaceOptions = {}
): EditResult {
  const sceneIndex = decoupage.scenes.findIndex((scene) => scene.id === position.sceneId)
  if (sceneIndex < 0) return failure('not-found')
  const scene = decoupage.scenes[sceneIndex]
  if (!isValidCount(count) || !isValidIndex(position.index, scene.shots.length)) {
    return failure('invalid')
  }

  const newShots = Array.from({ length: count }, () =>
    createShot(ids.newId(), { number: 0, letter: '' })
  )
  const placed = placeNumbered(
    scene.shots,
    position.index,
    newShots,
    decoupage.numbersLocked,
    options.renumber === true
  )
  if (!placed.ok) return failure(placed.problem)

  const scenes = decoupage.scenes.map((item, i) =>
    i === sceneIndex ? { ...item, shots: placed.list } : item
  )
  return success(
    withScenes(decoupage, scenes),
    newShots.map((shot) => shot.id)
  )
}

/** Ajoute `count` scènes à la position `index` ; chacune contient un plan P_0010. */
export function insertScenes(
  decoupage: Decoupage,
  index: number,
  count: number,
  ids: IdSource,
  options: PlaceOptions = {}
): EditResult {
  if (!isValidCount(count) || !isValidIndex(index, decoupage.scenes.length)) {
    return failure('invalid')
  }
  const newScenes = Array.from({ length: count }, () => createScene({ number: 0, letter: '' }, ids))
  const placed = placeNumbered(
    decoupage.scenes,
    index,
    newScenes,
    decoupage.numbersLocked,
    options.renumber === true,
    takenNumbers(decoupage.scenes)
  )
  if (!placed.ok) return failure(placed.problem)
  return success(
    withScenes(decoupage, placed.list),
    newScenes.map((scene) => scene.id)
  )
}

export interface ItemSelection {
  sceneIds: readonly string[]
  shotIds: readonly string[]
}

/** Supprime des scènes (avec leurs plans) et des plans. Ne renumérote rien. */
export function deleteItems(decoupage: Decoupage, selection: ItemSelection): EditResult {
  const sceneIds = new Set(selection.sceneIds)
  const shotIds = new Set(selection.shotIds)
  const scenes = decoupage.scenes
    .filter((scene) => !sceneIds.has(scene.id))
    .map((scene) =>
      scene.shots.some((shot) => shotIds.has(shot.id))
        ? { ...scene, shots: scene.shots.filter((shot) => !shotIds.has(shot.id)) }
        : scene
    )
  return success(withScenes(decoupage, scenes))
}

/** Ordre des plans (identifiants) par scène, pour savoir si un déplacement change quelque chose. */
function shotLayout(scenes: readonly Scene[]): string {
  return scenes
    .map((scene) => `${scene.id}:${scene.shots.map((shot) => shot.id).join(',')}`)
    .join('|')
}

/**
 * Déplace des plans, ensemble et dans leur ordre actuel, vers une scène. `target.index` est la
 * position dans la scène d'arrivée une fois les plans déplacés retirés. Seuls les plans déplacés
 * changent de numéro. Interdit quand les numéros sont verrouillés.
 */
export function moveShots(
  decoupage: Decoupage,
  shotIds: readonly string[],
  target: ShotPosition,
  options: PlaceOptions = {}
): EditResult {
  if (decoupage.numbersLocked) return failure('locked')
  const wanted = new Set(shotIds)
  const moved: Shot[] = decoupage.scenes.flatMap((scene) =>
    scene.shots.filter((shot) => wanted.has(shot.id))
  )
  if (moved.length === 0 || moved.length !== wanted.size) return failure('not-found')

  const remaining = decoupage.scenes.map((scene) => ({
    ...scene,
    shots: scene.shots.filter((shot) => !wanted.has(shot.id))
  }))
  const sceneIndex = remaining.findIndex((scene) => scene.id === target.sceneId)
  if (sceneIndex < 0) return failure('not-found')
  const targetShots = remaining[sceneIndex].shots
  if (!isValidIndex(target.index, targetShots.length)) return failure('invalid')

  // Les plans retombent exactement où ils étaient : rien ne change, pas même leur numéro.
  const arranged = remaining.map((scene, i) =>
    i === sceneIndex
      ? {
          ...scene,
          shots: [
            ...targetShots.slice(0, target.index),
            ...moved,
            ...targetShots.slice(target.index)
          ]
        }
      : scene
  )
  if (shotLayout(arranged) === shotLayout(decoupage.scenes)) return success(decoupage)

  const placed = placeNumbered(targetShots, target.index, moved, false, options.renumber === true)
  if (!placed.ok) return failure(placed.problem)
  const scenes = remaining.map((scene, i) => {
    if (i === sceneIndex) return { ...scene, shots: placed.list }
    // Les scènes non touchées gardent leur objet d'origine (affichage plus rapide).
    const original = decoupage.scenes[i]
    return scene.shots.length === original.shots.length ? original : scene
  })
  return success(withScenes(decoupage, scenes))
}

/**
 * Déplace une scène avec tous ses plans. `index` est sa position une fois retirée de la liste.
 * Interdit quand les numéros sont verrouillés.
 */
export function moveScene(
  decoupage: Decoupage,
  sceneId: string,
  index: number,
  options: PlaceOptions = {}
): EditResult {
  return moveScenes(decoupage, [sceneId], index, options)
}

/**
 * Déplace plusieurs scènes qui se suivent (celles d'une section du navigateur), dans leur ordre, avec
 * leurs plans. `index` est la position de la première une fois toutes retirées de la liste. Elles
 * prennent des numéros libres à leur nouvelle place (ou tout est renuméroté, si demandé).
 * Interdit quand les numéros sont verrouillés.
 */
export function moveScenes(
  decoupage: Decoupage,
  sceneIds: readonly string[],
  index: number,
  options: PlaceOptions = {}
): EditResult {
  if (decoupage.numbersLocked) return failure('locked')
  const ids = new Set(sceneIds)
  const from = decoupage.scenes.findIndex((scene) => ids.has(scene.id))
  const moved = decoupage.scenes.slice(from, from + sceneIds.length)
  if (
    from < 0 ||
    ids.size !== sceneIds.length ||
    moved.length !== sceneIds.length ||
    moved.some((scene, i) => scene.id !== sceneIds[i])
  ) {
    return failure('not-found')
  }
  const others = decoupage.scenes.filter((scene) => !ids.has(scene.id))
  if (!isValidIndex(index, others.length)) return failure('invalid')
  if (index === from) return success(decoupage)

  const placed = placeNumbered(
    others,
    index,
    moved,
    false,
    options.renumber === true,
    takenNumbers(others)
  )
  if (!placed.ok) return failure(placed.problem)
  return success(withScenes(decoupage, placed.list))
}
