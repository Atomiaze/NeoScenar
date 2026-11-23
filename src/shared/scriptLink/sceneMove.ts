import { parse } from '@neoscenar/fountain'
import { numberKey } from '../decoupage/order'
import type { Decoupage, ItemNumber, Scene } from '../projectTypes'
import { moveSceneBlock, type BlockPlace } from './cardTextEdits'
import { readScriptScenes } from './scriptScenes'
import { applyTextChanges } from './textChanges'

// Déplacer une scène depuis le navigateur (18C-12). Le navigateur vise une place précise du texte
// (en tête d'un acte, par exemple), ce que l'ordre des cartes seul ne dit pas. Le bloc est déplacé
// avec son numéro d'origine : le rapprochement qui suit le renumérote s'il est hors de l'ordre, en
// gardant sa carte (comme après un couper-coller), et donne le même numéro que `moveScene` dans les
// Cartes (vérifié par les tests). `moveScene` sert d'abord à refuser (numéros verrouillés) ou à
// demander une renumérotation, avec les mêmes règles et les mêmes messages que les Cartes.

const plain = (scene: Scene): ItemNumber => ({ number: scene.number, letter: scene.letter })

/**
 * Place « juste avant » l'élément qui commence à `offset` (en-tête de scène numéroté ou ligne de
 * section) ; null pour `offset` : la fin du texte. Null si rien de connu ne commence là.
 */
export function placeBeforeOffset(text: string, offset: number | null): BlockPlace | null {
  if (offset === null) return 'end'
  const scene = readScriptScenes(text).find((item) => item.line.from === offset)
  if (scene) return scene.number ? { before: scene.number } : null
  const seen = new Map<string, number>()
  for (const element of parse(text, { titlePage: false }).elements) {
    if (element.type !== 'section' || !element.position) continue
    const occurrence = seen.get(element.text) ?? 0
    seen.set(element.text, occurrence + 1)
    if (element.position.startOffset === offset) {
      return { beforeSection: { title: element.text, occurrence } }
    }
  }
  return null
}

/**
 * Rang de la carte une fois retirée de la liste (celui qu'attend `moveScene`) : juste après la carte
 * de la scène qui la précédera dans le texte, sinon tout en tête.
 * Null si la scène ou sa carte est introuvable, ou si le bloc ne bouge pas.
 */
export function cardIndexForMove(
  text: string,
  decoupage: Decoupage,
  number: ItemNumber,
  place: BlockPlace
): number | null {
  const key = numberKey(number)
  const moved = decoupage.scenes.find((scene) => numberKey(scene) === key)
  if (!moved) return null
  const changes = moveSceneBlock(text, number, place)
  if (changes.length === 0) return null
  const keys = (source: string): string[] =>
    readScriptScenes(source).flatMap((scene) => (scene.number ? [numberKey(scene.number)] : []))
  const order = keys(applyTextChanges(text, changes))
  // Ordre des scènes inchangé (la scène change seulement d'acte) : la carte reste où elle est.
  if (order.join('|') === keys(text).join('|')) return decoupage.scenes.indexOf(moved)
  const at = order.indexOf(key)
  const others = decoupage.scenes.filter((scene) => scene !== moved)
  const cardAt = (k: string): number => others.findIndex((scene) => numberKey(scene) === k)
  for (let i = at - 1; i >= 0; i--) {
    const index = cardAt(order[i])
    if (index >= 0) return index + 1
  }
  // Première scène du texte : tout en tête, avant les éventuelles orphelines (rangées par numéro).
  return 0
}

/**
 * Place visée, exprimée avec les numéros d'après `moveScene` (quand l'élève a accepté de renuméroter,
 * les scènes de référence ont pu changer de numéro).
 */
export function renumberedPlace(
  before: Decoupage,
  after: Decoupage,
  place: BlockPlace
): BlockPlace {
  if (typeof place === 'string' || 'beforeSection' in place) return place
  const afterById = new Map(after.scenes.map((scene) => [scene.id, scene]))
  const translate = (item: ItemNumber): ItemNumber => {
    const old = before.scenes.find((scene) => numberKey(scene) === numberKey(item))
    const next = old && afterById.get(old.id)
    return next ? plain(next) : item
  }
  return 'after' in place ? { after: translate(place.after) } : { before: translate(place.before) }
}
