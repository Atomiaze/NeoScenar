// Lien scénario ↔ cartes dans l'éditeur (étape 8) : après chaque modification du texte, et quand le
// curseur quitte une ligne, le rapprochement remet les cartes en accord avec le texte.
//
// Annulation : les numéros d'un texte collé (« #25# ») rejoignent l'étape d'annulation du collage.
// En revanche, le numéro donné à un en-tête qu'on vient d'écrire est toujours une étape à lui seul :
// le premier Cmd + Z ne retire que lui, jamais les lettres tapées. Une frappe n'écrit donc jamais de
// numéro ; s'il en faut, une transaction séparée et isolée dans l'historique les écrit aussitôt après.

import { isolateHistory } from '@codemirror/commands'
import {
  Annotation,
  EditorState,
  Facet,
  Prec,
  StateEffect,
  type Extension,
  type StateEffectType,
  type Transaction
} from '@codemirror/state'
import type { IdSource } from '../../../shared/decoupage'
import type { Decoupage, Scene } from '../../../shared/projectTypes'
import { reconcile, type ReconcileResult, type TextRange } from '../../../shared/scriptLink'
import { analysisField } from './analysis'

/** Ce que l'éditeur doit connaître des cartes pour faire le rapprochement. */
export interface LinkSource {
  /** Découpage actuel et cartes connues récemment, ou null si le lien n'est pas actif. */
  current(): { decoupage: Decoupage; knownCards: readonly Scene[] } | null
  ids: IdSource
}

export const linkSource = Facet.define<LinkSource, LinkSource | null>({
  combine: (values) => values[0] ?? null
})

/** Résultat d'un rapprochement, joint à la transaction : les cartes le reprennent. */
export const linkResult = StateEffect.define<ReconcileResult>()

/**
 * Quitter l'éditeur (changement de module) : l'en-tête en cours de frappe est numéroté et sa carte
 * créée, comme si le curseur avait quitté la ligne.
 */
export const settleLink = StateEffect.define<null>()

/**
 * Joint à une frappe après laquelle des en-têtes attendent leur numéro (par exemple Entrée en fin
 * d'en-tête) : l'éditeur envoie alors aussitôt `writeNumbers`, dans une transaction à part.
 */
export const numbersWaiting = StateEffect.define<null>()

/** Écrire les numéros en attente, dans une étape d'annulation à part. */
export const writeNumbers = StateEffect.define<null>()

/** Modification venue des cartes : le rapprochement a déjà été fait par l'action des cartes. */
export const fromCards = Annotation.define<boolean>()

/** Zones collées ou glissées, dans le nouveau texte. */
function insertedRanges(tr: Transaction): TextRange[] {
  if (!tr.isUserEvent('input.paste') && !tr.isUserEvent('input.drop')) return []
  const ranges: TextRange[] = []
  tr.changes.iterChangedRanges((_fromA, _toA, from, to) => ranges.push({ from, to }))
  return ranges
}

function cursorLine(state: EditorState): number {
  return state.doc.lineAt(state.selection.main.head).number
}

function isUndoOrRedo(tr: Transaction): boolean {
  return tr.isUserEvent('undo') || tr.isUserEvent('redo')
}

function hasEffect(tr: Transaction, type: StateEffectType<null>): boolean {
  return tr.effects.some((effect) => effect.is(type))
}

/** Rapprochement sur le texte final de la transaction ; null si le lien n'est pas actif. */
function reconcileTransaction(
  tr: Transaction,
  frozen: boolean
): { result: ReconcileResult; changed: boolean } | null {
  const source = tr.startState.facet(linkSource)
  const current = source?.current()
  if (!source || !current) return null
  const { state } = tr
  const line = state.doc.lineAt(state.selection.main.head)
  const result = reconcile(
    state.doc.toString(),
    current.decoupage,
    {
      editingLine: hasEffect(tr, settleLink) ? null : { from: line.from, to: line.to },
      insertedRanges: insertedRanges(tr),
      movedBlock: tr.isUserEvent('input.drop'),
      knownCards: current.knownCards,
      freezeText: frozen,
      parsed: state.field(analysisField).doc
    },
    source.ids
  )
  const changed = result.textChanges.length > 0 || result.decoupage !== current.decoupage
  return { result, changed }
}

const reconcileAfterChange = EditorState.transactionFilter.of((tr) => {
  if (isUndoOrRedo(tr) || tr.annotation(fromCards)) return tr
  const pasted = insertedRanges(tr).length > 0
  const ownStep = hasEffect(tr, settleLink) || hasEffect(tr, writeNumbers)
  const leftLine =
    !tr.docChanged &&
    tr.selection !== undefined &&
    cursorLine(tr.state) !== cursorLine(tr.startState)

  // Frappe (y compris Entrée, effacer…) : les cartes suivent, mais aucun numéro n'est écrit ici.
  if (tr.docChanged && !pasted && !ownStep) {
    const typed = reconcileTransaction(tr, true)
    if (!typed) return tr
    const effects = [
      ...(typed.changed ? [linkResult.of(typed.result)] : []),
      ...(typed.result.waiting ? [numbersWaiting.of(null)] : [])
    ]
    return effects.length > 0 ? [tr, { effects }] : tr
  }
  if (!pasted && !ownStep && !leftLine) return tr

  const linked = reconcileTransaction(tr, false)
  if (!linked?.changed) return tr
  const { result } = linked
  return [
    tr,
    {
      changes: result.textChanges,
      sequential: true,
      effects: linkResult.of(result),
      // Un numéro écrit en quittant une ligne est une étape d'annulation à lui seul ; celui d'un
      // texte collé fait partie du collage.
      annotations: pasted || result.textChanges.length === 0 ? [] : isolateHistory.of('full')
    }
  ]
})

/**
 * Après Annuler ou Rétablir (qui ne passent pas par les filtres de transaction) : les cartes suivent,
 * mais aucun numéro n'est écrit, pour qu'un numéro annulé ne réapparaisse pas aussitôt. Les scènes
 * sans numéro attendent la modification suivante.
 */
const reconcileAfterUndo = EditorState.transactionExtender.of((tr) => {
  if (!tr.docChanged || !isUndoOrRedo(tr)) return null
  const undone = reconcileTransaction(tr, true)
  return undone?.changed ? { effects: linkResult.of(undone.result) } : null
})

/**
 * Rapprochement dans l'éditeur. Il passe après les autres ajustements (majuscules, lignes quittées)
 * pour voir le texte final de la transaction.
 */
export function scriptLink(source: LinkSource | null): Extension {
  return source
    ? [linkSource.of(source), Prec.lowest(reconcileAfterChange), reconcileAfterUndo]
    : []
}
