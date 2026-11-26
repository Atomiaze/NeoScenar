import type { ItemNumber } from '../projectTypes'
import { draftNumberKeys } from './draftScene'
import { numberKey } from '../decoupage/order'
import { sceneBody, sceneDescription, type TextOp } from './textOps'

// Texte des copies faites par « Dupliquer avec / sans contenu ». L'en-tête de la copie est déjà
// inséré par l'effet ordinaire des cartes (`cardsTextOp`) ; on y ajoute ce qui vient de l'original.

export interface DuplicatedPair {
  /** Numéro de la scène d'origine dans le texte d'avant la duplication. */
  original: ItemNumber
  /** Numéro de la copie après la duplication. */
  copy: ItemNumber
}

/**
 * - avec contenu : tout le corps de l'original (résumé, notes, action, dialogues…) ;
 * - sans contenu : seulement le résumé (lignes `=`) et la note de brouillon, comme sur la carte.
 *
 * `text` : texte d'avant la duplication. Null s'il n'y a rien à ajouter.
 */
export function duplicatedTextOp(
  text: string,
  pairs: readonly DuplicatedPair[],
  withContent: boolean
): TextOp | null {
  const ops: TextOp[] = []
  const drafts = withContent ? new Set<string>() : draftNumberKeys(text)
  for (const { original, copy } of pairs) {
    if (withContent) {
      const body = sceneBody(text, original)
      if (body) ops.push({ kind: 'setBody', number: copy, body, expected: '' })
      continue
    }
    const description = sceneDescription(text, original)
    if (description) ops.push({ kind: 'setDescription', number: copy, description })
    if (drafts.has(numberKey(original))) ops.push({ kind: 'setDraft', number: copy, draft: true })
  }
  if (ops.length === 0) return null
  return ops.length === 1 ? ops[0] : { kind: 'sequence', ops }
}
