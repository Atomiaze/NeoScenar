// Interface du mode révision (étape 13E) : palette, bulle du commentaire, confirmation de « Effacer
// toutes les marques ». Les modifications du texte passent par l'éditeur (editor/revision.ts).

import { EditorView } from '@codemirror/view'
import type { Text } from '@codemirror/state'
import { fr } from '../../i18n/fr'
import { createStore } from '../../state/createStore'
import type { RevisionColor, RevisionMark } from '../../../shared/revision/revisionMarks'
import { buildRevisionList, type RevisionListItem } from '../../../shared/revision/revisionList'
import { getActiveView, scriptStore, showNotice } from '../scriptStore'
import { analysisField } from '../editor/analysis'
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
  /** Panneau des révisions affiché (préférence par projet, 18C-8). */
  panelShown: boolean
  /** Lignes du panneau, recalculées peu après chaque modification du texte. */
  items: RevisionListItem[]
}

export const revisionStore = createStore<RevisionState>({
  paletteShown: false,
  comment: null,
  confirmClear: null,
  panelShown: true,
  items: []
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

// Panneau des révisions (étape 18C-8).

/** Affichage du panneau pour le projet ouvert, lu dans les préférences de l'application. */
export async function loadRevisionPanelShown(): Promise<void> {
  revisionStore.set({ panelShown: await window.neoscenar.getRevisionPanelShown() })
}

export function toggleRevisionPanel(): void {
  const panelShown = !revisionStore.get().panelShown
  revisionStore.set({ panelShown })
  void window.neoscenar.setRevisionPanelShown(panelShown)
}

/** Recalcul différé : une longue frappe sur un long scénario ne recalcule la liste qu'une fois. */
const LIST_DELAY_MS = 200
let listTimer: ReturnType<typeof setTimeout> | null = null
let listedDoc: Text | null = null

function refreshList(): void {
  listTimer = null
  const view = getActiveView()
  if (!view) return
  const { state } = view
  listedDoc = state.doc
  const analysis = state.field(analysisField)
  revisionStore.set({
    items: buildRevisionList(state.doc.toString(), analysis.doc, analysis.revisionMarks)
  })
}

/** À appeler à chaque changement possible du texte : rien n'est fait si le texte est le même. */
export function scheduleRevisionList(immediate = false): void {
  const view = getActiveView()
  if (!view || view.state.doc === listedDoc) return
  if (listTimer) clearTimeout(listTimer)
  listTimer = immediate ? null : setTimeout(refreshList, LIST_DELAY_MS)
  if (immediate) refreshList()
}

/** Suit le texte de l'éditeur tant que le panneau est affiché ; renvoie de quoi arrêter. */
export function watchRevisionList(): () => void {
  listedDoc = null
  scheduleRevisionList(true)
  const stop = scriptStore.subscribe(() => scheduleRevisionList())
  return () => {
    stop()
    if (listTimer) clearTimeout(listTimer)
    listTimer = null
    listedDoc = null
  }
}

/** Clic sur la n-ième ligne : le texte surligné est sélectionné, amené au milieu, et on peut taper. */
export function goToRevision(position: number): void {
  const view = getActiveView()
  if (!view) return
  // La liste a pu prendre un peu de retard sur la frappe : on la met à jour d'abord.
  if (view.state.doc !== listedDoc) {
    if (listTimer) clearTimeout(listTimer)
    refreshList()
  }
  const item = revisionStore.get().items[position]
  if (!item) return
  view.dispatch({
    selection: { anchor: item.from, head: item.to },
    effects: EditorView.scrollIntoView(item.from, { y: 'center' })
  })
  view.focus()
}
