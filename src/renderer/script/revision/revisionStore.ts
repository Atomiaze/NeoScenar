// Interface du mode révision (étape 13E) : palette, bulle du commentaire, confirmation de « Effacer
// toutes les marques ». Les modifications du texte passent par l'éditeur (editor/revision.ts).

import { EditorView } from '@codemirror/view'
import type { Text } from '@codemirror/state'
import { fr } from '../../i18n/fr'
import { createStore } from '../../state/createStore'
import type { RevisionColor, RevisionMark } from '../../../shared/revision/revisionMarks'
import { displayedComment } from '../../../shared/revision/revisionMarks'
import {
  buildRevisionList,
  countByColor,
  filterRevisionList,
  toggleColorFilter,
  type RevisionListItem
} from '../../../shared/revision/revisionList'
import { getActiveView, scriptStore, showNotice } from '../scriptStore'
import { analysisField } from '../editor/analysis'
import {
  highlightSelection,
  markAtCursor,
  markFromContextMenu,
  markStartingAt,
  marksOf,
  removeMarks,
  setMarkColor,
  setMarkComment
} from '../editor/revision'

const t = fr.script.revision

export interface CommentEdit {
  /** Début de la marque (elle est relue au moment d'enregistrer). */
  start: number
  /** Commentaire préchargé, avec de vrais retours à la ligne. */
  initial: string
  /** Ouverte depuis le crayon du panneau : le focus y revient ensuite (18C-9). */
  fromPanel: boolean
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
  /** Couleurs cachées par le filtre du panneau (en mémoire seulement, 18C-9). */
  hiddenColors: RevisionColor[]
  /** Bouton du panneau à qui rendre le focus après une action (consommé par le panneau). */
  panelFocus: PanelFocus | null
}

/** Ligne visée par la marque qui commence à `start`, ou à défaut la ligne affichée `index`. */
export interface PanelFocus {
  start?: number
  index?: number
  part: 'row' | 'edit' | 'color'
}

export const revisionStore = createStore<RevisionState>({
  paletteShown: false,
  comment: null,
  confirmClear: null,
  panelShown: true,
  items: [],
  hiddenColors: [],
  panelFocus: null
})

/** Quitter le mode révision remet le filtre du panneau à « tout ». */
export function togglePalette(): void {
  revisionStore.set((state) =>
    state.paletteShown ? { paletteShown: false, hiddenColors: [] } : { paletteShown: true }
  )
}

export function applyColor(color: RevisionColor): void {
  const view = getActiveView()
  if (!view) return
  const refused = highlightSelection(view, color)
  if (refused) showNotice(t[refused])
  view.focus()
}

function openCommentFor(mark: RevisionMark, fromPanel = false): void {
  const view = getActiveView()
  if (!view) return
  view.dispatch({ selection: { anchor: mark.open.to }, scrollIntoView: true })
  const coords = view.coordsAtPos(mark.open.to) ?? view.coordsAtPos(mark.open.from)
  revisionStore.set({
    comment: {
      start: mark.open.from,
      initial: displayedComment(mark.comment),
      fromPanel,
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
  // La marque est relue à sa position : si elle a disparu entre-temps, rien n'est écrit.
  const mark = markStartingAt(view.state, edit.start)
  if (mark) setMarkComment(view, mark, comment)
  if (!edit.fromPanel) {
    view.focus()
    return
  }
  // Depuis le panneau : la ligne est mise à jour, son texte sélectionné, le focus revient au crayon.
  refreshList()
  const item = revisionStore.get().items.find((entry) => entry.start === edit.start)
  if (item) selectInEditor(view, item)
  revisionStore.set({ panelFocus: { start: edit.start, part: 'edit' } })
}

export function cancelComment(): void {
  const edit = revisionStore.get().comment
  revisionStore.set({ comment: null })
  if (edit?.fromPanel) revisionStore.set({ panelFocus: { start: edit.start, part: 'edit' } })
  else getActiveView()?.focus()
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

/** Changement de projet : filtre remis à « tout ». */
export function resetRevisionFilter(): void {
  revisionStore.set({ hiddenColors: [], panelFocus: null })
}

/** Clic (ou Alt + clic : `alone`) sur une pastille du filtre. */
export function toggleFilterColor(color: RevisionColor, alone: boolean): void {
  revisionStore.set((state) => ({
    hiddenColors: toggleColorFilter(state.hiddenColors, color, alone, countByColor(state.items))
  }))
}

export function shownItems(
  state: Pick<RevisionState, 'items' | 'hiddenColors'>
): RevisionListItem[] {
  return filterRevisionList(state.items, state.hiddenColors)
}

export function consumePanelFocus(): void {
  revisionStore.set({ panelFocus: null })
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

/** La liste a pu prendre un peu de retard sur la frappe : on la met à jour avant d'agir. */
function upToDate(view: EditorView): void {
  if (view.state.doc === listedDoc) return
  if (listTimer) clearTimeout(listTimer)
  refreshList()
}

/** Ligne affichée (filtre compris) à la place donnée, et sa marque dans le texte actuel. */
function shownAt(
  position: number
): { view: EditorView; item: RevisionListItem; mark: RevisionMark } | null {
  const view = getActiveView()
  if (!view) return null
  upToDate(view)
  const item = shownItems(revisionStore.get())[position]
  const mark = item ? markStartingAt(view.state, item.start) : null
  return item && mark ? { view, item, mark } : null
}

function selectInEditor(view: EditorView, item: RevisionListItem): void {
  view.dispatch({
    selection: { anchor: item.from, head: item.to },
    effects: EditorView.scrollIntoView(item.from, { y: 'center' })
  })
}

/** Clic sur la n-ième ligne : le texte surligné est sélectionné, amené au milieu, et on peut taper. */
export function goToRevision(position: number): void {
  const found = shownAt(position)
  if (!found) return
  selectInEditor(found.view, found.item)
  found.view.focus()
}

/** Crayon d'une ligne : la même fenêtre que « Modifier le commentaire… » du clic droit. */
export function editCommentFromPanel(position: number): void {
  const found = shownAt(position)
  if (found) openCommentFor(found.mark, true)
}

/** Pastille d'une ligne : nouvelle couleur, commentaire gardé (Cmd + Z annule). */
export function recolorFromPanel(position: number, color: RevisionColor): void {
  const found = shownAt(position)
  if (!found) return
  setMarkColor(found.view, found.mark, color)
  refreshList()
  // Si le filtre cache la nouvelle couleur, la ligne disparaît : le focus va à la suivante.
  revisionStore.set({ panelFocus: { start: found.mark.open.from, index: position, part: 'color' } })
}

/** Poubelle d'une ligne : la marque est retirée sans confirmation (Cmd + Z annule). */
export function removeFromPanel(position: number): void {
  const found = shownAt(position)
  if (!found) return
  removeMarks(found.view, [found.mark])
  refreshList()
  // Le focus passe à la ligne suivante, ou à la précédente s'il n'y en a plus.
  revisionStore.set({ panelFocus: { index: position, part: 'row' } })
}
