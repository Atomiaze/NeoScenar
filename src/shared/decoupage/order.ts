import type { ItemNumber } from '../projectTypes'

/** Plus grand numéro possible : les numéros s'affichent sur 4 chiffres (P_9999). */
export const MAX_ITEM_NUMBER = 9999

/** Écart entre deux numéros consécutifs, à la création et après une renumérotation. */
export const NUMBER_STEP = 10

/** Ordre des numéros : P_0010 < P_0010A < P_0010B < P_0011 < P_0020. */
export function compareItemNumbers(a: ItemNumber, b: ItemNumber): number {
  if (a.number !== b.number) return a.number - b.number
  if (a.letter === b.letter) return 0
  // Sans lettre avant avec lettre, puis A < B < … < Z.
  if (a.letter.length !== b.letter.length) return a.letter.length - b.letter.length
  return a.letter < b.letter ? -1 : 1
}

/** Clé unique d'un numéro, pour les ensembles et les tables : « 30 », « 30A ». */
export function numberKey(item: ItemNumber): string {
  return `${item.number}${item.letter}`
}

/** Vrai si les numéros sont rangés du plus petit au plus grand, sans doublon. */
export function isStrictlyIncreasing(items: readonly ItemNumber[]): boolean {
  return items.every((item, index) => index === 0 || compareItemNumbers(items[index - 1], item) < 0)
}
