import { numberKey } from '../../../shared/decoupage/order'
import type { ItemNumber } from '../../../shared/projectTypes'
import { draftNumberKeys } from '../../../shared/scriptLink'
import { linkedText } from '../../scriptLink/cardsLink'
import { useStore } from '../../state/createStore'
import { scriptStore } from '../scriptStore'

// Le texte n'est relu qu'une fois par modification, quel que soit le nombre de cartes affichées.
let cachedText: string | null = null
let cachedKeys: ReadonlySet<string> = new Set()

function draftKeys(): ReadonlySet<string> {
  const text = linkedText()
  if (text !== cachedText) {
    cachedText = text
    cachedKeys = text === null ? new Set() : draftNumberKeys(text)
  }
  return cachedKeys
}

/** La scène de ce numéro est-elle un brouillon dans le scénario (18C-13) ? Suit chaque modification. */
export function useIsDraft(number: ItemNumber): boolean {
  useStore(scriptStore, (state) => state.textRevision)
  return draftKeys().has(numberKey(number))
}
