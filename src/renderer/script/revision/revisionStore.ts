// Interface du mode révision (étape 13E) : palette, bulle du commentaire, confirmation de « Effacer
// toutes les marques ». Les modifications du texte passent par l'éditeur (editor/revision.ts).

import { fr } from '../../i18n/fr'
import { createStore } from '../../state/createStore'
import type { RevisionColor, RevisionMark } from '../../../shared/revision/revisionMarks'
import { getActiveView, showNotice } from '../scriptStore'
import {
  highlightSelection,
  markAtCursor,
  markFromContextMenu,
  markStartingAt,
  marksOf,
  removeMarks,
  setMarkComment
} from '../editor/revision'

const t = fr.script.revision

export interface CommentEdit {
  /** Début de la marque (elle est relue au moment d'enregistrer). */
  start: number
  initial: string
  /** Position de la bulle à l'écran (sous le début du texte surligné). */
  left: number
  top: number
}

interface RevisionState {
  paletteShown: boolean
  comment: CommentEdit | null
  /** Nombre de marques à effacer, quand la confirmation est affichée. */
  confirmClear: number | null
}

export const revisionStore = createStore<RevisionState>({
  paletteShown: false,
  comment: null,
  confirmClear: null
})

export function togglePalette(): void {
  revisionStore.set((state) => ({ paletteShown: !state.paletteShown }))
}

export function applyColor(color: RevisionColor): void {
  const view = getActiveView()
  if (!view) return
  const refused = highlightSelection(view, color)
  if (refused) showNotice(t[refused])
  view.focus()
}

function openCommentFor(mark: RevisionMark): void {
  const view = getActiveView()
  if (!view) return
  view.dispatch({ selection: { anchor: mark.open.to }, scrollIntoView: true })
  const coords = view.coordsAtPos(mark.open.to) ?? view.coordsAtPos(mark.open.from)
  revisionStore.set({
    comment: {
      start: mark.open.from,
      initial: mark.comment,
      left: coords?.left ?? 100,
      top: (coords?.bottom ?? 100) + 6
    }
  })
}

/** « Commentaire… » de la palette : la marque où se trouve le curseur. */
export function editCommentAtCursor(): void {
  const view = getActiveView()
  if (!view) return
  const mark = markAtCursor(view.state)
  if (mark) openCommentFor(mark)
  else showNotice(t.noMarkAtCursor)
}

/** « Ajouter / Modifier le commentaire… » du clic droit. */
export function editCommentFromContextMenu(): void {
  const view = getActiveView()
  const mark = view ? markFromContextMenu(view.state) : null
  if (mark) openCommentFor(mark)
}

export function saveComment(comment: string): void {
  const view = getActiveView()
  const edit = revisionStore.get().comment
  revisionStore.set({ comment: null })
  if (!view || !edit) return
  const mark = markStartingAt(view.state, edit.start)
  if (mark) setMarkComment(view, mark, comment)
  view.focus()
}

export function cancelComment(): void {
  revisionStore.set({ comment: null })
  getActiveView()?.focus()
}

/** « Effacer cette marque » du clic droit. */
export function removeMarkFromContextMenu(): void {
  const view = getActiveView()
  const mark = view ? markFromContextMenu(view.state) : null
  if (view && mark) removeMarks(view, [mark])
}

export function askClearAll(): void {
  const view = getActiveView()
  if (!view) return
  const count = marksOf(view.state).length
  if (count === 0) showNotice(t.noMarks)
  else revisionStore.set({ confirmClear: count })
}

export function cancelClearAll(): void {
  revisionStore.set({ confirmClear: null })
  getActiveView()?.focus()
}

/** Une seule étape de l'historique de l'éditeur : Cmd + Z remet toutes les marques. */
export function clearAll(): void {
  revisionStore.set({ confirmClear: null })
  const view = getActiveView()
  if (!view) return
  const marks = marksOf(view.state)
  removeMarks(view, marks)
  showNotice(t.cleared(marks.length))
  view.focus()
}

/** Changement de projet ou de module : on ferme la bulle et la confirmation. */
export function closeRevisionPopups(): void {
  revisionStore.set({ comment: null, confirmClear: null })
}
