import type { ItemNumber } from '../projectTypes'
import { MAX_ITEM_NUMBER, NUMBER_STEP, numberKey } from './order'

// Choix des numéros des éléments ajoutés ou déplacés, d'après leurs voisins.
// Les plans sont toujours rangés par numéro croissant : tout nombre entier strictement compris entre
// les numéros des deux voisins est donc libre. Les scènes suivent l'ordre du scénario et peuvent être
// hors de l'ordre des numéros : on indique alors les numéros déjà pris (`taken`), à éviter.

/**
 * - needs-renumber : plus de numéro libre, mais une renumérotation réglerait le problème ;
 * - no-room : numéros verrouillés et aucune lettre disponible (insertion impossible ici).
 */
export type AllocationProblem = 'needs-renumber' | 'no-room'

export type Allocation =
  { ok: true; numbers: ItemNumber[] } | { ok: false; problem: AllocationProblem }

/** Numéros déjà utilisés, sous forme de clés « 30 », « 30A » (voir numberKey). */
export type TakenNumbers = ReadonlySet<string>

const NOTHING_TAKEN: TakenNumbers = new Set()

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function plain(number: number): ItemNumber {
  return { number, letter: '' }
}

/**
 * À la fin : multiples de 10 qui suivent le dernier numéro (après 15 → 20 ; liste vide → 10), en
 * sautant ceux qui sont pris. Null si l'on dépasse 9999.
 */
function numbersAtEnd(
  previous: ItemNumber | undefined,
  count: number,
  taken: TakenNumbers
): number[] | null {
  let next = previous
    ? Math.floor(previous.number / NUMBER_STEP) * NUMBER_STEP + NUMBER_STEP
    : NUMBER_STEP
  const numbers: number[] = []
  while (numbers.length < count) {
    if (next > MAX_ITEM_NUMBER) return null
    if (!taken.has(numberKey(plain(next)))) numbers.push(next)
    next += NUMBER_STEP
  }
  return numbers
}

/** Nombres entiers libres répartis régulièrement entre low et high (exclus), ou null s'il en manque. */
function spreadBetween(
  low: number,
  high: number,
  count: number,
  taken: TakenNumbers
): number[] | null {
  const free: number[] = []
  for (let number = low + 1; number < high; number++) {
    if (!taken.has(numberKey(plain(number)))) free.push(number)
  }
  if (free.length < count) return null
  // Entre 10 et 20 → 15 ; entre 10 et 15 → 12 ; 3 entre 10 et 20 → 12, 15, 17.
  return Array.from(
    { length: count },
    (_, index) => free[Math.floor(((index + 1) * (free.length + 1)) / (count + 1)) - 1]
  )
}

/** Les premiers nombres entiers libres juste après low (avant high) : 21, 22, 23… ; ou null. */
function followingNumbers(
  low: number,
  high: number,
  count: number,
  taken: TakenNumbers
): number[] | null {
  const free: number[] = []
  for (let number = low + 1; number < high && free.length < count; number++) {
    if (!taken.has(numberKey(plain(number)))) free.push(number)
  }
  return free.length === count ? free : null
}

/** Lettres libres après le numéro précédent (P_0010 → P_0010A, P_0010B…), jusqu'au suivant. */
function lettersAfter(
  previous: ItemNumber,
  next: ItemNumber | undefined,
  count: number,
  taken: TakenNumbers
): ItemNumber[] | null {
  // Une seule lettre par numéro : au-delà de Z, ou après une lettre déjà double, plus de place.
  if (previous.letter.length > 1) return null
  const start = previous.letter === '' ? 0 : LETTERS.indexOf(previous.letter) + 1
  const sameNumberNext = next && next.number === previous.number
  const end = sameNumberNext ? LETTERS.indexOf(next.letter) : LETTERS.length
  const free: ItemNumber[] = []
  for (let index = start; index < end && free.length < count; index++) {
    const candidate = { number: previous.number, letter: LETTERS[index] }
    if (!taken.has(numberKey(candidate))) free.push(candidate)
  }
  return free.length === count ? free : null
}

/**
 * Numéros pour `count` éléments placés entre `previous` et `next` (absents en début ou en fin de
 * liste). Un nombre libre est toujours préféré ; les lettres ne servent que si les numéros sont
 * verrouillés et qu'il n'y a plus de nombre libre. Les numéros de `taken` ne sont jamais choisis.
 */
/**
 * Comment choisir parmi les nombres libres :
 * - spread : au milieu (25 entre 20 et 30), multiple de 10 à la fin ; règle habituelle ;
 * - following : les suivants (21, 22…), pour des copies successives d'une même scène.
 */
export type NumberStrategy = 'spread' | 'following'

export function allocateNumbers(
  previous: ItemNumber | undefined,
  next: ItemNumber | undefined,
  count: number,
  locked: boolean,
  taken: TakenNumbers = NOTHING_TAKEN,
  strategy: NumberStrategy = 'spread'
): Allocation {
  if (!next && strategy === 'spread') {
    const atEnd = numbersAtEnd(previous, count, taken)
    if (atEnd) return { ok: true, numbers: atEnd.map(plain) }
  }
  const low = previous ? previous.number : 0
  const high = next ? next.number : MAX_ITEM_NUMBER + 1
  const spread =
    strategy === 'following'
      ? followingNumbers(low, high, count, taken)
      : spreadBetween(low, high, count, taken)
  if (spread) return { ok: true, numbers: spread.map(plain) }

  if (!locked) return { ok: false, problem: 'needs-renumber' }
  const letters = previous ? lettersAfter(previous, next, count, taken) : null
  return letters ? { ok: true, numbers: letters } : { ok: false, problem: 'no-room' }
}

/** Numéros 10, 20, 30… pour une liste de `count` éléments, sans lettre. */
export function renumberedNumbers(count: number): ItemNumber[] {
  // Très longue liste : on resserre l'écart pour rester sous 9999.
  const step = Math.max(1, Math.min(NUMBER_STEP, Math.floor(MAX_ITEM_NUMBER / Math.max(count, 1))))
  return Array.from({ length: count }, (_, index) => plain((index + 1) * step))
}
