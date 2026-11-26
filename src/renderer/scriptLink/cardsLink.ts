// Des cartes vers le scénario (étape 8C) : chaque action des cartes modifie aussi le texte, que
// l'éditeur soit affiché ou non, et Annuler / Rétablir dans les cartes défait ou refait cet effet.

import { ChangeSet } from '@codemirror/state'
import { numberKey } from '../../shared/decoupage/order'
import { redoEffect, undoEffect } from '../../shared/decoupage'
import type { Decoupage } from '../../shared/projectTypes'
import {
  applyTextOp,
  cardsTextOp,
  isEmptyTextOp,
  readScriptScenes,
  reconcile,
  writtenLineCount,
  type TextChange,
  type TextOp
} from '../../shared/scriptLink'
import {
  cardsStore,
  commitDecoupage,
  openDialog,
  redoDecoupage,
  setLinkedDecoupage,
  undoDecoupage,
  type EditOptions
} from '../cards/cardsStore'
import type { Selection } from '../cards/selection'
import { fr } from '../i18n/fr'
import { editScriptFromCards, scriptText } from '../script/scriptStore'
import { knownCards, linkIds, linkStore, noteRemovedCards } from './linkStore'

/** Texte du scénario si le lien est actif, sinon null (les cartes travaillent alors seules). */
export function linkedText(): string | null {
  return linkStore.get().active ? scriptText() : null
}

/** Numéros (clés « 30 », « 30A ») des scènes présentes dans le texte. */
export function textNumberKeys(text: string): Set<string> {
  return new Set(
    readScriptScenes(text).flatMap((scene) => (scene.number ? [numberKey(scene.number)] : []))
  )
}

/** Envoie au document du scénario des modifications successives, combinées en une seule. */
function dispatchSteps(text: string, steps: readonly TextChange[][]): void {
  let set = ChangeSet.empty(text.length)
  for (const step of steps) {
    if (step.length === 0) continue
    const sorted = [...step].sort((a, b) => a.from - b.from)
    set = set.compose(ChangeSet.of(sorted, set.newLength))
  }
  if (!set.empty) editScriptFromCards(set)
}

function combine(first: TextOp | null, second: TextOp | null): TextOp | null {
  if (!first) return second
  if (!second) return first
  return { kind: 'sequence', ops: [first, second] }
}

/**
 * Enregistre une action des cartes : le nouveau découpage, son effet sur le texte (déduit des deux
 * découpages, plus `extraOp` pour ce que le découpage ne contient pas, comme la description), puis
 * le rapprochement. Une seule étape d'annulation dans les cartes, une seule modification du texte.
 */
export function commitCardsChange(
  after: Decoupage,
  options: EditOptions,
  selection?: Selection,
  extraOp: TextOp | null = null,
  /** `extraOp` décrit à lui seul l'effet sur le texte (déplacement d'une section, 18C-16). */
  onlyExtraOp = false
): void {
  const before = cardsStore.get().history?.present
  const text = linkedText()
  if (!before || text === null) {
    commitDecoupage(after, options, selection)
    return
  }
  const op = onlyExtraOp
    ? extraOp
    : combine(cardsTextOp(before, after, textNumberKeys(text)), extraOp)
  const edit = op ? applyTextOp(text, op) : null
  const result = reconcile(edit?.text ?? text, after, { knownCards: knownCards() }, linkIds)
  dispatchSteps(text, [...(edit?.steps ?? []), result.textChanges])
  noteRemovedCards(after, result.decoupage)
  const effect = edit && !isEmptyTextOp(edit.inverse) ? edit.inverse : undefined
  // Une modification du texte seul (la description) est quand même une étape des cartes.
  const decoupage =
    result.decoupage === before && edit && edit.steps.length > 0 ? { ...before } : result.decoupage
  commitDecoupage(decoupage, { ...options, effect }, selection)
}

/** Lignes écrites qui disparaîtraient du texte en appliquant `op` (blocs retirés). */
function writtenLinesRemoved(text: string, op: TextOp): number {
  if (op.kind === 'sequence') {
    // Chaque opération voit le texte laissé par la précédente : l'annulation d'une duplication
    // « avec contenu » vide d'abord la copie (texte inchangé), puis retire un bloc sans texte.
    let current = text
    let total = 0
    for (const item of op.ops) {
      total += writtenLinesRemoved(current, item)
      current = applyTextOp(current, item).text
    }
    return total
  }
  if (op.kind !== 'removeBlocks') return 0
  return op.numbers.reduce((total, number) => total + writtenLineCount(text, number), 0)
}

/**
 * Annuler / Rétablir dans les cartes : le découpage d'avant (ou d'après), l'effet inverse sur le
 * texte (ignoré pour une scène qui n'est plus dans le texte), puis le rapprochement. Les cartes
 * créées entre-temps en écrivant dans l'éditeur sont retrouvées (réserve de cartes).
 */
export function stepCards(direction: 'undo' | 'redo'): void {
  const history = cardsStore.get().history
  if (!history) return
  const pending = direction === 'undo' ? history.past.length : history.future.length
  if (pending === 0) return
  const text = linkedText()
  if (text === null) {
    if (direction === 'undo') undoDecoupage()
    else redoDecoupage()
    return
  }
  const effect = direction === 'undo' ? undoEffect(history) : redoEffect(history)
  // Annuler l'ajout d'une scène sous laquelle l'élève a écrit : on prévient d'abord.
  const lines = direction === 'undo' && effect ? writtenLinesRemoved(text, effect) : 0
  if (lines === 0) {
    runStep(direction)
    return
  }
  openDialog({
    kind: 'confirm',
    title: fr.scriptLink.undoAddTitle,
    message: fr.scriptLink.undoAddMessage(lines),
    confirmLabel: fr.scriptLink.undoAddConfirm,
    danger: true,
    onConfirm: () => runStep(direction)
  })
}

function runStep(direction: 'undo' | 'redo'): void {
  const history = cardsStore.get().history
  const text = linkedText()
  if (!history || text === null) return
  const effect = direction === 'undo' ? undoEffect(history) : redoEffect(history)
  const edit = effect ? applyTextOp(text, effect) : null
  const inverse = edit && !isEmptyTextOp(edit.inverse) ? edit.inverse : undefined
  if (direction === 'undo') undoDecoupage(inverse)
  else redoDecoupage(inverse)
  const restored = cardsStore.get().history?.present
  if (!restored) return
  const result = reconcile(
    edit?.text ?? text,
    restored,
    { knownCards: [...history.present.scenes, ...knownCards()] },
    linkIds
  )
  dispatchSteps(text, [...(edit?.steps ?? []), result.textChanges])
  noteRemovedCards(restored, result.decoupage)
  setLinkedDecoupage(result.decoupage)
}
