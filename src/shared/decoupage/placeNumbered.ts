import type { ItemNumber } from '../projectTypes'
import {
  allocateNumbers,
  renumberedNumbers,
  type AllocationProblem,
  type NumberStrategy,
  type TakenNumbers
} from './allocate'
import { numberKey } from './order'

export type PlaceResult<T> = { ok: true; list: T[] } | { ok: false; problem: AllocationProblem }

/**
 * Numéros déjà pris dans une liste de scènes. Les scènes suivent l'ordre du scénario et peuvent être
 * hors de l'ordre des numéros : un numéro « entre deux voisines » peut alors déjà exister ailleurs.
 */
export function takenNumbers(list: readonly ItemNumber[]): TakenNumbers {
  return new Set(list.map(numberKey))
}

/** Remet 10, 20, 30… dans l'ordre actuel et supprime les lettres. */
export function renumberList<T extends ItemNumber>(list: readonly T[]): T[] {
  const numbers = renumberedNumbers(list.length)
  return list.map((item, index) => ({ ...item, ...numbers[index] }))
}

/**
 * Place `items` à la position `index` de `list` en leur donnant des numéros libres entre leurs
 * nouveaux voisins. Les autres éléments gardent leur numéro, sauf si `renumberIfNeeded` autorise
 * à renuméroter toute la liste faute de numéro libre. Les numéros de `taken` ne sont jamais choisis.
 */
export function placeNumbered<T extends ItemNumber>(
  list: readonly T[],
  index: number,
  items: readonly T[],
  locked: boolean,
  renumberIfNeeded: boolean,
  taken?: TakenNumbers,
  strategy?: NumberStrategy
): PlaceResult<T> {
  const allocation = allocateNumbers(
    list[index - 1],
    list[index],
    items.length,
    locked,
    taken,
    strategy
  )
  if (allocation.ok) {
    const placed = items.map((item, i) => ({ ...item, ...allocation.numbers[i] }))
    return { ok: true, list: [...list.slice(0, index), ...placed, ...list.slice(index)] }
  }
  if (allocation.problem === 'needs-renumber' && renumberIfNeeded && !locked) {
    return {
      ok: true,
      list: renumberList([...list.slice(0, index), ...items, ...list.slice(index)])
    }
  }
  return { ok: false, problem: allocation.problem }
}
