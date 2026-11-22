// État du navigateur de scènes : l'arbre (recalculé de façon regroupée pendant la frappe), la ligne
// du curseur, les actes repliés (pendant la session) et l'affichage du panneau (préférence).
// Il ne stocke rien dans le projet : tout est tiré du texte de l'éditeur.

import { Transaction } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { createStore } from '../../state/createStore'
import { minimalChange } from '../editing/pendingTypes'
import { flushPageLayout, type PageLayout } from '../editor/pageLayout'
import { getActiveView } from '../scriptStore'
import {
  buildNavigator,
  flattenNavigator,
  type NavigatorItem,
  type NavigatorTree
} from './buildNavigator'
import { setSynopsis } from './synopsis'

interface NavigatorState {
  tree: NavigatorTree | null
  cursorLine: number
  /** Clés des actes repliés (voir sectionKey). */
  collapsed: ReadonlySet<string>
  /** Préférence de l'application (bouton et menu Présentation > Navigateur de scènes). */
  shown: boolean
  /** Masqué de l'extérieur, quelle que soit la préférence (mode concentration, sous-étape G). */
  suppressed: boolean
  /** Masqué tout seul : la page A4 ne tient pas à côté du panneau des révisions (18C-8). */
  autoHidden: boolean
  /** Ouvert ou fermé à la main pendant le mode révision : plus de masquage automatique. */
  keepShown: boolean
}

export const navigatorStore = createStore<NavigatorState>({
  tree: null,
  cursorLine: 1,
  collapsed: new Set(),
  shown: true,
  suppressed: false,
  autoHidden: false,
  keepShown: false
})

/** Le panneau est-il affiché à l'écran (préférence, mode concentration, manque de place) ? */
export function navigatorVisible(state: NavigatorState): boolean {
  return state.shown && !state.suppressed && !state.autoHidden
}

/** Nouvelle pagination (partagée avec les traits de page) : l'arbre est reconstruit à partir d'elle. */
export function setNavigatorLayout(layout: PageLayout): void {
  navigatorStore.set({ tree: buildNavigator(layout.doc, layout.pagination) })
}

export function setCursorLine(cursorLine: number): void {
  if (navigatorStore.get().cursorLine !== cursorLine) navigatorStore.set({ cursorLine })
}

export function resetNavigator(): void {
  synopsisSession = null
  navigatorStore.set({ tree: null, cursorLine: 1, collapsed: new Set() })
}

export function toggleCollapsed(key: string, collapse?: boolean): void {
  const collapsed = new Set(navigatorStore.get().collapsed)
  const next = collapse ?? !collapsed.has(key)
  if (next) collapsed.add(key)
  else collapsed.delete(key)
  navigatorStore.set({ collapsed })
}

let shownLoaded: Promise<void> | null = null

/** Affichage du panneau, lu une fois dans les préférences de l'application. */
export function loadNavigatorShown(): Promise<void> {
  shownLoaded ??= window.neoscenar.getShowSceneNavigator().then((shown) => {
    navigatorStore.set({ shown })
  })
  return shownLoaded
}

/** Bouton de la barre d'outils et menu Présentation > Navigateur de scènes. */
export async function toggleNavigatorShown(): Promise<void> {
  await loadNavigatorShown()
  // Un geste de l'élève l'emporte sur le masquage automatique jusqu'à la fin du mode révision.
  if (navigatorStore.get().autoHidden) {
    navigatorStore.set({ autoHidden: false, keepShown: true })
    return
  }
  navigatorStore.set({ keepShown: true })
  const shown = !navigatorStore.get().shown
  navigatorStore.set({ shown })
  await window.neoscenar.setShowSceneNavigator(shown)
}

/** Début ou fin du mode révision : le navigateur retrouve son affichage habituel. */
export function resetNavigatorSqueeze(): void {
  navigatorStore.set({ autoHidden: false, keepShown: false })
}

export function setNavigatorAutoHidden(autoHidden: boolean): void {
  if (navigatorStore.get().autoHidden !== autoHidden) navigatorStore.set({ autoHidden })
}

/** Masque le panneau de l'extérieur (mode concentration), sans toucher à la préférence. */
export function setNavigatorSuppressed(suppressed: boolean): void {
  navigatorStore.set({ suppressed })
}

/**
 * Clic (ou Entrée) sur une scène ou un acte : l'en-tête vient près du haut de l'éditeur, le curseur
 * se place au début de la ligne qui le suit, et l'éditeur reprend le focus.
 */
export function goToItem(item: NavigatorItem): void {
  goToLine(item.line)
}

/** Même chose pour une ligne d'en-tête connue (statistiques). Renvoie faux si l'éditeur n'est pas affiché. */
export function goToLine(headingLine: number): boolean {
  const view = getActiveView()
  if (!view) return false
  const { doc } = view.state
  if (headingLine > doc.lines) return false
  const line = doc.line(headingLine)
  const anchor = headingLine < doc.lines ? doc.line(headingLine + 1).from : line.to
  view.dispatch({
    selection: { anchor },
    effects: EditorView.scrollIntoView(line.from, { y: 'start', yMargin: 48 })
  })
  view.focus()
  return true
}

/** Va au n-ième élément du navigateur (ordre du texte), d'après un arbre à jour. */
export function goToItemAt(position: number): void {
  const view = getActiveView()
  // L'arbre affiché peut avoir un temps de retard sur la frappe : on le met à jour d'abord.
  if (view) flushPageLayout(view)
  const tree = navigatorStore.get().tree
  const item = tree ? flattenNavigator(tree.items)[position] : undefined
  if (item) goToItem(item)
}

// Description : une séance de modification (de l'entrée dans le champ à la sortie) = une seule étape
// d'annulation. Pendant la séance, le texte suit la frappe sans entrer dans l'historique ; à la sortie,
// la séance est rejouée d'un bloc.
interface SynopsisSession {
  /** Début de l'en-tête (ou de la section) décrit : il ne bouge pas, on n'écrit qu'après lui. */
  from: number
  before: string
  pending: string | null
  timer: ReturnType<typeof setTimeout> | null
}

let synopsisSession: SynopsisSession | null = null

/** Regroupement des écritures de la description pendant la frappe. */
const SYNOPSIS_DELAY_MS = 250

export function beginSynopsis(item: NavigatorItem): void {
  const view = getActiveView()
  if (!view) return
  endSynopsis()
  synopsisSession = {
    from: item.from,
    before: view.state.doc.toString(),
    pending: null,
    timer: null
  }
}

function writeSynopsis(session: SynopsisSession): void {
  const view = getActiveView()
  if (session.timer) clearTimeout(session.timer)
  session.timer = null
  if (!view || session.pending === null) return
  const change = setSynopsis(view.state.doc.toString(), session.from, session.pending)
  session.pending = null
  if (change) {
    view.dispatch({ changes: change, annotations: Transaction.addToHistory.of(false) })
  }
}

export function updateSynopsis(description: string): void {
  const session = synopsisSession
  if (!session) return
  session.pending = description
  session.timer ??= setTimeout(() => writeSynopsis(session), SYNOPSIS_DELAY_MS)
}

export function endSynopsis(): void {
  const session = synopsisSession
  synopsisSession = null
  const view = getActiveView()
  if (!session || !view) return
  writeSynopsis(session)
  const after = view.state.doc.toString()
  if (after === session.before) return
  view.dispatch({
    changes: minimalChange(after, session.before),
    annotations: Transaction.addToHistory.of(false)
  })
  view.dispatch({ changes: minimalChange(session.before, after), userEvent: 'input.synopsis' })
}
