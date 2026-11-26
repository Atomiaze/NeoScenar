import type { Decoupage, Scene, Shot } from '../projectTypes'
import type { IdSource } from './factories'
import { placeNumbered, takenNumbers } from './placeNumbered'
import { failure, success, type EditResult } from './result'
import type { PlaceOptions } from './structure'

// Dupliquer des plans et des scènes : copies identiques, sauf le numéro et l'identifiant interne.

function copyShot(shot: Shot, ids: IdSource): Shot {
  // Les fichiers de la vignette sont copiés ensuite, sous le nom de la copie (copyThumbnailFiles) :
  // les deux vignettes restent indépendantes.
  return { ...shot, id: ids.newId() }
}

/** Les plans de la copie gardent leurs numéros (la numérotation recommence dans chaque scène). */
function copyScene(scene: Scene, ids: IdSource): Scene {
  return { ...scene, id: ids.newId(), shots: scene.shots.map((shot) => copyShot(shot, ids)) }
}

export interface DuplicateOptions extends PlaceOptions {
  /**
   * Scènes déjà copiées pendant la séance : identifiant de la copie → identifiant de la scène
   * d'origine. Une nouvelle copie se place après les copies précédentes de la même scène.
   */
  copiedFrom?: ReadonlyMap<string, string>
}

/**
 * Duplique des scènes (avec leurs plans) et des plans, avec les règles habituelles de numérotation.
 * Un plan dont la scène est aussi dupliquée n'est copié qu'une fois, avec sa scène. Les identifiants
 * des copies sont renvoyés dans l'ordre d'affichage.
 *
 * - Plans : les copies sont insérées ensemble, dans leur ordre, juste après le dernier plan
 *   sélectionné de chaque scène (P_0015 entre P_0010 et P_0020).
 * - Scènes : les copies se placent après la dernière scène sélectionnée et après ses copies
 *   précédentes, avec des numéros qui se suivent (S_0021, S_0022…) ; copier une copie revient à
 *   copier la scène d'origine. On peut ainsi faire neuf copies avant de manquer de place.
 */
export function duplicateItems(
  decoupage: Decoupage,
  itemIds: readonly string[],
  ids: IdSource,
  options: DuplicateOptions = {}
): EditResult {
  const wanted = new Set(itemIds)
  const locked = decoupage.numbersLocked
  const renumber = options.renumber === true
  const origin = (id: string): string => options.copiedFrom?.get(id) ?? id
  const shotCopies: string[] = []
  let found = 0

  const scenes: Scene[] = []
  for (const scene of decoupage.scenes) {
    if (wanted.has(scene.id)) {
      found += 1
      scenes.push(scene)
      continue
    }
    const picked = scene.shots.filter((shot) => wanted.has(shot.id))
    if (picked.length === 0) {
      scenes.push(scene)
      continue
    }
    found += picked.length
    const lastIndex = scene.shots.findLastIndex((shot) => wanted.has(shot.id))
    const copies = picked.map((shot) => copyShot(shot, ids))
    const placed = placeNumbered(scene.shots, lastIndex + 1, copies, locked, renumber)
    if (!placed.ok) return failure(placed.problem)
    shotCopies.push(...copies.map((shot) => shot.id))
    scenes.push({ ...scene, shots: placed.list })
  }

  const pickedScenes = scenes.filter((scene) => wanted.has(scene.id))
  let finalScenes = scenes
  const sceneCopies: string[] = []
  const copiedFrom: Record<string, string> = {}
  if (pickedScenes.length > 0) {
    // Après la dernière scène sélectionnée, puis après les copies qui la suivent déjà.
    const origins = new Set(pickedScenes.map((scene) => origin(scene.id)))
    let index = scenes.findLastIndex((scene) => wanted.has(scene.id)) + 1
    while (index < scenes.length && origins.has(origin(scenes[index].id))) index++
    const copies = pickedScenes.map((scene) => copyScene(scene, ids))
    const placed = placeNumbered(
      scenes,
      index,
      copies,
      locked,
      renumber,
      takenNumbers(scenes),
      'following'
    )
    if (!placed.ok) return failure(placed.problem)
    finalScenes = placed.list
    sceneCopies.push(...copies.map((scene) => scene.id))
    copies.forEach((copy, i) => (copiedFrom[copy.id] = origin(pickedScenes[i].id)))
  }

  // Identifiants inconnus (élément supprimé entre-temps) : ignorés, sauf s'il ne reste rien.
  if (found === 0) return failure('not-found')

  return {
    ...success({ ...decoupage, scenes: finalScenes }, [...shotCopies, ...sceneCopies]),
    ...(sceneCopies.length > 0 ? { copiedFrom } : {})
  } as EditResult
}

/**
 * Dupliquer des scènes depuis le clic droit (« Dupliquer avec / sans contenu ») : chaque copie se
 * place juste après sa scène d'origine (et après les copies précédentes de celle-ci), avec le
 * numéro libre qui suit. La carte est copiée (nom, en-tête, couleur) mais jamais ses plans ni son
 * storyboard. Le texte de la scène est l'affaire du lien avec le scénario (`duplicatedTextOp`).
 */
export function duplicateScenesEach(
  decoupage: Decoupage,
  sceneIds: readonly string[],
  ids: IdSource,
  options: DuplicateOptions = {}
): EditResult {
  const wanted = new Set(sceneIds)
  const locked = decoupage.numbersLocked
  const renumber = options.renumber === true
  const copiedFrom: Record<string, string> = {}
  const origin = (id: string): string => copiedFrom[id] ?? options.copiedFrom?.get(id) ?? id
  // Dans l'ordre d'affichage : la copie d'une scène ne décale pas celles qui la précèdent.
  const originals = decoupage.scenes.filter((scene) => wanted.has(scene.id))
  if (originals.length === 0) return failure('not-found')

  let list: Scene[] = decoupage.scenes
  const created: string[] = []
  for (const original of originals) {
    let index = list.findIndex((scene) => scene.id === original.id) + 1
    const source = origin(original.id)
    while (index < list.length && origin(list[index].id) === source) index++
    const copy: Scene = { ...original, id: ids.newId(), shots: [], orphan: false }
    const placed = placeNumbered(
      list,
      index,
      [copy],
      locked,
      renumber,
      takenNumbers(list),
      'following'
    )
    if (!placed.ok) return failure(placed.problem)
    list = placed.list
    created.push(copy.id)
    copiedFrom[copy.id] = source
  }
  return { ...success({ ...decoupage, scenes: list }, created), copiedFrom } as EditResult
}
