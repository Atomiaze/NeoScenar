import { formatSceneNumber } from '../numbering'
import type { Decoupage } from '../projectTypes'
import { isStrictlyIncreasing, MAX_ITEM_NUMBER, numberKey } from './order'

/**
 * Problème de cohérence d'un découpage :
 * - duplicate-id : deux éléments ont le même identifiant interne ;
 * - bad-order : numéros de scène en double (`where` : « scenes »), ou numéros de plan en double ou
 *   dans le désordre (`where` : « S_0010 ») ;
 * - too-large : numéro supérieur à 9999.
 */
export type DecoupageProblem =
  | { kind: 'duplicate-id'; id: string }
  | { kind: 'bad-order'; where: string }
  | { kind: 'too-large'; where: string }

/** Vérifie les règles que toutes les opérations doivent respecter. Null si tout va bien. */
export function findDecoupageProblem(decoupage: Decoupage): DecoupageProblem | null {
  const seen = new Set<string>()
  for (const id of decoupage.scenes.flatMap((scene) => [
    scene.id,
    ...scene.shots.map((s) => s.id)
  ])) {
    if (seen.has(id)) return { kind: 'duplicate-id', id }
    seen.add(id)
  }
  // Les numéros de scène suivent l'ordre du scénario : uniques, mais pas forcément croissants
  // (une scène déplacée quand les numéros sont verrouillés garde son numéro).
  const sceneNumbers = new Set(decoupage.scenes.map(numberKey))
  if (sceneNumbers.size !== decoupage.scenes.length) return { kind: 'bad-order', where: 'scenes' }
  for (const scene of decoupage.scenes) {
    const label = formatSceneNumber(scene.number, scene.letter)
    if (scene.number > MAX_ITEM_NUMBER) return { kind: 'too-large', where: label }
    if (!isStrictlyIncreasing(scene.shots)) return { kind: 'bad-order', where: label }
    if (scene.shots.some((shot) => shot.number > MAX_ITEM_NUMBER)) {
      return { kind: 'too-large', where: label }
    }
  }
  return null
}
