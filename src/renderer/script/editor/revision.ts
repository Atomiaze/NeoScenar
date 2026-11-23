// Mode révision dans l'éditeur (étape 13E) : bulle du commentaire au survol, marque visée par le clic
// droit, et commandes qui appliquent les modifications calculées dans src/shared/revision/.
// Chaque commande est une seule étape de l'historique de l'éditeur : Cmd + Z la défait.

import { EditorView, hoverTooltip } from '@codemirror/view'
import type { EditorState, Extension } from '@codemirror/state'
import {
  displayedComment,
  markAt,
  planColor,
  planComment,
  planHighlight,
  planRemoveMarks,
  type RevisionColor,
  type RevisionMark
} from '../../../shared/revision/revisionMarks'
import type { TextChange } from '../../../shared/scriptLink/textChanges'
import { analysisField } from './analysis'

/**
 * Début de la marque sous le dernier clic droit dans l'éditeur, et l'heure du clic : le menu se
 * construit aussitôt après ; un clic droit ailleurs ne doit pas reprendre une marque d'avant.
 */
let contextMark: { start: number; time: number } | null = null
const CONTEXT_DELAY_MS = 2000
// Tout clic droit oublie la marque précédente ; celui de l'éditeur la retient ensuite (phase de
// capture : ce gestionnaire passe avant celui de l'éditeur).
if (typeof window !== 'undefined') {
  window.addEventListener('contextmenu', () => (contextMark = null), true)
}

export function marksOf(state: EditorState): RevisionMark[] {
  return state.field(analysisField).revisionMarks
}

/** Marque qui commence à la position donnée (elle a pu bouger : on la relit dans le texte actuel). */
export function markStartingAt(state: EditorState, start: number): RevisionMark | null {
  return marksOf(state).find((mark) => mark.open.from === start) ?? null
}

/** Marque où se trouve le curseur, ou null. */
export function markAtCursor(state: EditorState): RevisionMark | null {
  return markAt(marksOf(state), state.selection.main.head)
}

/** Marque visée par le dernier clic droit, si elle existe toujours. */
export function markFromContextMenu(state: EditorState): RevisionMark | null {
  if (!contextMark || Date.now() - contextMark.time > CONTEXT_DELAY_MS) return null
  return markStartingAt(state, contextMark.start)
}

function apply(view: EditorView, changes: readonly TextChange[], event: string): void {
  if (changes.length === 0) return
  view.dispatch({ changes: [...changes], userEvent: event, scrollIntoView: false })
}

/** Surligne la sélection ; renvoie la raison d'un refus, ou null. */
export function highlightSelection(
  view: EditorView,
  color: RevisionColor
): 'emptySelection' | 'noAllowedParagraph' | null {
  const { state } = view
  const { from, to } = state.selection.main
  const plan = planHighlight(
    state.doc.toString(),
    state.field(analysisField).doc,
    { from, to },
    color
  )
  if ('error' in plan) return plan.error
  apply(view, plan.changes, 'input.revision')
  return null
}

export function setMarkComment(view: EditorView, mark: RevisionMark, comment: string): void {
  const change = planComment(mark, comment)
  if (view.state.sliceDoc(change.from, change.to) === change.insert) return
  apply(view, [change], 'input.revision')
}

/** Change la couleur d'une marque (panneau, 18C-9) : seul le mot de la couleur est réécrit. */
export function setMarkColor(view: EditorView, mark: RevisionMark, color: RevisionColor): void {
  const change = planColor(view.state.doc.toString(), mark, color)
  if (change) apply(view, [change], 'input.revision')
}

export function removeMarks(view: EditorView, marks: readonly RevisionMark[]): void {
  const { state } = view
  const changes = planRemoveMarks(state.doc.toString(), state.field(analysisField).doc, marks)
  apply(view, changes, 'delete.revision')
}

/** Bulle du commentaire au survol du texte surligné. */
const commentTooltip = hoverTooltip(
  (view, pos) => {
    const mark = markAt(marksOf(view.state), pos)
    if (!mark || !mark.comment) return null
    return {
      pos: mark.open.to,
      end: mark.close.from,
      above: true,
      create: () => {
        const dom = document.createElement('div')
        dom.className = `rev-tooltip rev-${mark.color}`
        dom.textContent = displayedComment(mark.comment)
        return { dom }
      }
    }
  },
  { hoverTime: 250 }
)

/** Retient la marque sous le clic droit, sans empêcher le menu habituel (correcteur, copier…). */
const contextMenuTracker = EditorView.domEventHandlers({
  contextmenu(event, view) {
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
    const mark = pos === null ? null : markAt(marksOf(view.state), pos)
    contextMark = mark ? { start: mark.open.from, time: Date.now() } : null
    return false
  }
})

export function revisionEditing(): Extension {
  return [commentTooltip, contextMenuTracker]
}

/** Ce que le menu du clic droit doit proposer pour la marque visée (null : rien de plus). */
export function contextMenuInfo(state: EditorState | null): { hasComment: boolean } | null {
  const mark = state ? markFromContextMenu(state) : null
  return mark ? { hasComment: mark.comment !== '' } : null
}
