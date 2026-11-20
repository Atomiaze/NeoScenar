import { allocateNumbers } from '../decoupage/allocate'
import { MAX_ITEM_NUMBER, NUMBER_STEP, numberKey } from '../decoupage/order'
import type { ItemNumber } from '../projectTypes'

// Numéros de scène déjà utilisés pendant un rapprochement (scènes du texte, cartes orphelines…) et
// choix de numéros libres. Contrairement aux cartes, le rapprochement ne peut jamais refuser :
// chaque scène du scénario doit recevoir un numéro.

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export class NumberPool {
  private readonly taken = new Set<string>()
  private largest = 0

  constructor(numbers: Iterable<ItemNumber> = []) {
    for (const number of numbers) this.add(number)
  }

  add(number: ItemNumber): void {
    this.taken.add(numberKey(number))
    this.largest = Math.max(this.largest, number.number)
  }

  has(number: ItemNumber): boolean {
    return this.taken.has(numberKey(number))
  }

  /**
   * Numéros « dans l'ordre » pour `count` scènes placées entre deux voisines : un nombre libre
   * (25 entre 20 et 30), sinon une lettre (20A), que les numéros soient verrouillés ou non.
   * Null s'il n'y a pas assez de place. Les numéros choisis sont aussitôt réservés.
   */
  between(
    previous: ItemNumber | undefined,
    next: ItemNumber | undefined,
    count: number
  ): ItemNumber[] | null {
    const allocation = allocateNumbers(previous, next, count, true, this.taken)
    if (!allocation.ok) return null
    allocation.numbers.forEach((number) => this.add(number))
    return allocation.numbers
  }

  /**
   * Dernier recours, quand il n'y a plus aucune place entre les voisines : un numéro après le plus
   * grand (hors de l'ordre), sinon le premier numéro libre. Réservé aussitôt.
   */
  lastResort(): ItemNumber {
    const candidates = function* (largest: number): Generator<ItemNumber> {
      for (
        let n = (Math.floor(largest / NUMBER_STEP) + 1) * NUMBER_STEP;
        n <= MAX_ITEM_NUMBER;
        n += NUMBER_STEP
      ) {
        yield { number: n, letter: '' }
      }
      for (let n = 1; n <= MAX_ITEM_NUMBER; n++) yield { number: n, letter: '' }
      for (let n = 1; n <= MAX_ITEM_NUMBER; n++) {
        for (const letter of LETTERS) yield { number: n, letter }
      }
    }
    for (const candidate of candidates(this.largest)) {
      if (!this.has(candidate)) {
        this.add(candidate)
        return candidate
      }
    }
    // 9999 × 27 scènes : impossible en pratique.
    throw new Error('Plus aucun numéro de scène disponible')
  }
}
