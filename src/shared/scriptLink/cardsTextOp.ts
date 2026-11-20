import { numberKey } from '../decoupage/order'
import type { Decoupage, ItemNumber, Scene } from '../projectTypes'
import type { BlockPlace, HeadingToInsert } from './cardTextEdits'
import type { BlockMove, TextOp } from './textOps'

// Effet sur le texte d'une action des cartes, déduit en comparant le découpage avant et après
// l'action. Une seule règle pour toutes les actions (ajouter, dupliquer, déplacer, supprimer,
// renuméroter, modifier l'en-tête) : on ne peut pas oublier un cas.

const plain = (scene: Scene): ItemNumber => ({ number: scene.number, letter: scene.letter })

/**
 * `linked` : numéros (clés « 30 », « 30A ») des scènes présentes dans le texte. Les cartes
 * orphelines n'ont pas de texte : on ne touche qu'aux cartes. Null s'il n'y a rien à faire.
 *
 * Ordre des opérations : retirer les blocs supprimés (anciens numéros), renuméroter, déplacer,
 * insérer les en-têtes des nouvelles scènes, réécrire les en-têtes modifiés.
 */
export function cardsTextOp(
  before: Decoupage,
  after: Decoupage,
  linked: ReadonlySet<string>
): TextOp | null {
  const beforeById = new Map(before.scenes.map((scene) => [scene.id, scene]))
  const afterIds = new Set(after.scenes.map((scene) => scene.id))
  const isLinked = (scene: Scene): boolean => linked.has(numberKey(scene))

  const removed = before.scenes.filter((scene) => isLinked(scene) && !afterIds.has(scene.id))
  // Scènes liées toujours là, dans l'ordre d'après.
  const kept = after.scenes.filter((scene) => {
    const old = beforeById.get(scene.id)
    return old !== undefined && isLinked(old)
  })
  const mapping = kept.flatMap((scene) => {
    const old = beforeById.get(scene.id)!
    return numberKey(old) === numberKey(scene) ? [] : [{ from: plain(old), to: plain(scene) }]
  })

  const ops: TextOp[] = []
  if (removed.length > 0) ops.push({ kind: 'removeBlocks', numbers: removed.map(plain) })
  if (mapping.length > 0) ops.push({ kind: 'renumber', mapping })
  const moves = movedBlocks(before, after, kept)
  if (moves.length > 0) ops.push({ kind: 'moveBlocks', moves })
  ops.push(...insertedHeadings(after, beforeById, isLinked))
  for (const scene of kept) {
    if (beforeById.get(scene.id)!.heading !== scene.heading) {
      ops.push({ kind: 'setHeading', number: plain(scene), heading: scene.heading })
    }
  }
  if (ops.length === 0) return null
  return ops.length === 1 ? ops[0] : { kind: 'sequence', ops }
}

/** Place juste après la scène liée (ou nouvelle) qui précède, sinon avant la première scène. */
function placeAfterPrevious(
  scenes: readonly Scene[],
  index: number,
  inText: (scene: Scene) => boolean
): BlockPlace {
  for (let i = index - 1; i >= 0; i--) if (inText(scenes[i])) return { after: plain(scenes[i]) }
  return 'start'
}

/**
 * Scènes liées dont l'ordre a changé. Celles qui gardent leur ordre relatif forment la plus longue
 * suite possible ; les autres sont déplacées, dans l'ordre d'arrivée, chacune juste après la scène
 * liée qui la précède désormais (les blocs gardent donc l'ordre des cartes).
 */
function movedBlocks(before: Decoupage, after: Decoupage, kept: readonly Scene[]): BlockMove[] {
  const rank = new Map(before.scenes.map((scene, i) => [scene.id, i]))
  const ranks = kept.map((scene) => rank.get(scene.id)!)
  const stay = longestIncreasing(ranks)
  const keptIds = new Set(kept.map((scene) => scene.id))
  const inText = (scene: Scene): boolean => keptIds.has(scene.id)
  return kept.flatMap((scene, i) => {
    if (stay.has(i)) return []
    return [
      {
        number: plain(scene),
        place: placeAfterPrevious(after.scenes, after.scenes.indexOf(scene), inText)
      }
    ]
  })
}

/** Indices d'une plus longue suite croissante (algorithme simple, quelques centaines de scènes). */
function longestIncreasing(values: readonly number[]): Set<number> {
  const length = values.map(() => 1)
  const previous = values.map(() => -1)
  values.forEach((value, i) => {
    for (let j = 0; j < i; j++) {
      if (values[j] < value && length[j] + 1 > length[i]) {
        length[i] = length[j] + 1
        previous[i] = j
      }
    }
  })
  let end = length.indexOf(Math.max(0, ...length))
  const result = new Set<number>()
  for (; end >= 0; end = previous[end]) result.add(end)
  return result
}

/** En-têtes des nouvelles scènes, par groupes consécutifs, chacun après la scène qui le précède. */
function insertedHeadings(
  after: Decoupage,
  beforeById: ReadonlyMap<string, Scene>,
  isLinked: (scene: Scene) => boolean
): TextOp[] {
  const isNew = (scene: Scene): boolean => !beforeById.has(scene.id)
  const inText = (scene: Scene): boolean => {
    const old = beforeById.get(scene.id)
    return old ? isLinked(old) : true
  }
  const ops: TextOp[] = []
  let group: HeadingToInsert[] = []
  let place: BlockPlace = 'end'
  const flush = (): void => {
    if (group.length > 0) ops.push({ kind: 'insertHeadings', place, headings: group })
    group = []
  }
  after.scenes.forEach((scene, i) => {
    if (!isNew(scene)) {
      flush()
      return
    }
    if (group.length === 0) {
      place = placeAfterPrevious(after.scenes, i, inText)
      // Rien de lié avant elle, ni après : à la fin du scénario (texte d'ouverture éventuel conservé).
      if (
        place === 'start' &&
        !after.scenes.slice(i + 1).some((other) => !isNew(other) && inText(other))
      ) {
        place = 'end'
      }
    }
    group.push({ heading: scene.heading, number: plain(scene) })
  })
  flush()
  return ops
}
