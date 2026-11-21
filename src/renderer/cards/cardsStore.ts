import type { SaveStatus, UndoAction } from '../../shared/api'
import { CARD_ZOOM, clampCardZoom } from '../../shared/cardZoom'
import { emptyCustomVocabulary, type CustomVocabulary } from '../../shared/customVocabulary'
import type { Vocabulary } from '../../shared/vocabulary'
import {
  breakMerge,
  commit,
  createHistory,
  redo,
  redoLabel,
  replacePresent,
  undo,
  undoLabel,
  type History,
  type ItemRef
} from '../../shared/decoupage'
import type { Decoupage, ProjectSettings, ThumbnailCrop } from '../../shared/projectTypes'
import type { TextOp } from '../../shared/scriptLink/textOps'
import { createStore } from '../state/createStore'
import { EMPTY_SELECTION, pruneSelection, type Selection } from './selection'

/** Fenêtre ouverte par le module Cartes. */
export type CardsDialog =
  | { kind: 'add-many' }
  | { kind: 'renumber' }
  | {
      kind: 'confirm'
      title: string
      message?: string
      confirmLabel: string
      /** Libellé du bouton de refus (« Annuler » par défaut). */
      cancelLabel?: string
      /** Action destructrice : bouton rouge. */
      danger?: boolean
      onConfirm(): void
    }
  | { kind: 'message'; title: string; message: string }
  | { kind: 'crop'; request: CropRequest }
  | { kind: 'image'; title: string; path: string }

/** Fenêtre de recadrage : image d'origine déjà décodée et cadre de départ. */
export interface CropRequest {
  shotId: string
  /** Image d'origine, chemin relatif au dossier neoscenar/. */
  source: string
  image: ImageBitmap
  crop: ThumbnailCrop
  /** Nom de la modification pour le menu Annuler (import, remplacement ou recadrage). */
  label: UndoAction
}

export interface ContextMenuState {
  /** Position de la souris dans la fenêtre. */
  x: number
  y: number
  /** Carte sur laquelle on a fait un clic droit. */
  target: ItemRef
}

/**
 * Historique des cartes. Chaque étape garde aussi son effet sur le texte du scénario (étape 8) :
 * l'opération qui le défait (ou le refait), décrite par les numéros de scène.
 */
export type CardsHistory = History<Decoupage, TextOp>

/** Options d'une modification : nom (pour le menu Annuler) et regroupement d'une saisie. */
export interface EditOptions {
  label: UndoAction
  mergeKey?: string
  /** Opération sur le texte du scénario qui défera cette modification. */
  effect?: TextOp
}

// État central du module Cartes : découpage (avec son historique d'annulation), sélection,
// réglages d'affichage et état de l'enregistrement.

export interface CardsState {
  /** Projet dont le découpage est chargé. */
  projectId: string | null
  /** Null tant que le découpage n'est pas chargé. */
  history: CardsHistory | null
  selection: Selection
  zoom: number
  panelOpen: boolean
  saveStatus: SaveStatus
  /** Le processus principal a refusé les données envoyées (ne devrait jamais arriver). */
  syncError: string | null
  /** Erreur de chargement du découpage. */
  loadError: string | null
  dialog: CardsDialog | null
  contextMenu: ContextMenuState | null
  /** Vocabulaire du cours (null tant qu'il n'est pas chargé ou s'il est illisible). */
  vocabulary: Vocabulary | null
  vocabularyError: string | null
  /** Entrées personnelles des menus de plan (préférences de l'application). */
  customVocabulary: CustomVocabulary
  /** Augmente à chaque demande de placer le curseur dans le champ « Nom » de la fiche. */
  nameFocusRequest: number
  /** Format de l'image et cadence du projet ouvert. */
  settings: ProjectSettings
  /** Vignette en cours de fabrication (le bouton concerné attend). */
  busyShotId: string | null
  /** Mode « avec vignettes » des cartes. */
  showThumbnails: boolean
  /** Import de plusieurs images en cours. */
  importProgress: { done: number; total: number } | null
  /** Éditeur de dessin ouvert sur ce plan (par-dessus toute la fenêtre), ou null. */
  drawing: { shotId: string } | null
}

export const cardsStore = createStore<CardsState>({
  projectId: null,
  history: null,
  selection: EMPTY_SELECTION,
  zoom: CARD_ZOOM.default,
  panelOpen: true,
  saveStatus: { state: 'saved' },
  syncError: null,
  loadError: null,
  dialog: null,
  contextMenu: null,
  vocabulary: null,
  vocabularyError: null,
  customVocabulary: emptyCustomVocabulary(),
  nameFocusRequest: 0,
  settings: { fps: 25, resolution: { width: 1920, height: 1080 } },
  busyShotId: null,
  showThumbnails: false,
  importProgress: null,
  drawing: null
})

/** Charge le découpage d'un projet. Ne fait rien si c'est déjà le projet chargé. */
export async function loadProject(projectId: string): Promise<void> {
  if (cardsStore.get().projectId === projectId) return
  cardsStore.set({ projectId, history: null, selection: EMPTY_SELECTION, loadError: null })
  const result = await window.neoscenar.getDecoupage()
  // Un autre projet a pu être ouvert entre-temps.
  if (cardsStore.get().projectId !== projectId) return
  if (result.ok) {
    const history: CardsHistory = createHistory(result.value)
    cardsStore.set({ history, syncError: null })
    syncUndoMenu(history)
  } else cardsStore.set({ loadError: result.error })
}

/**
 * Scènes copiées pendant la séance : copie → scène d'origine. Une nouvelle copie d'une scène se
 * place après ses copies précédentes (voir duplicateItems).
 */
const copies = new Map<string, string>()

export function copiedFrom(): ReadonlyMap<string, string> {
  return copies
}

export function rememberCopies(record: Readonly<Record<string, string>>): void {
  for (const [copy, original] of Object.entries(record)) copies.set(copy, original)
}

export function unloadProject(): void {
  copies.clear()
  cardsStore.set({
    projectId: null,
    history: null,
    selection: EMPTY_SELECTION,
    dialog: null,
    contextMenu: null,
    drawing: null
  })
  syncUndoMenu(null)
}

let sentUndo: { undo: string | null; redo: string | null } = { undo: null, redo: null }

/** Met à jour « Annuler… » / « Rétablir… » dans le menu Édition, seulement si ça change. */
function syncUndoMenu(history: CardsHistory | null): void {
  // Dans l'éditeur de dessin, Annuler / Rétablir agissent sur le dessin : libellés simples.
  const show = history && !cardsStore.get().drawing
  const next = {
    undo: show ? (undoLabel(history) as UndoAction | null) : null,
    redo: show ? (redoLabel(history) as UndoAction | null) : null
  }
  if (next.undo === sentUndo.undo && next.redo === sentUndo.redo) return
  sentUndo = next
  void window.neoscenar.setUndoState(next)
}

export function openDialog(dialog: CardsDialog): void {
  cardsStore.set({ dialog, contextMenu: null })
}

/** Ouvre l'éditeur de dessin sur un plan. */
export function openDrawing(shotId: string): void {
  cardsStore.set({ drawing: { shotId }, contextMenu: null })
  syncUndoMenu(cardsStore.get().history)
}

export function closeDrawing(): void {
  cardsStore.set({ drawing: null })
  syncUndoMenu(cardsStore.get().history)
}

/** Annuler / Rétablir de l'éditeur de dessin ouvert (fournis par l'éditeur). */
export const drawingUndo: { undo(): void; redo(): void } = {
  undo: () => undefined,
  redo: () => undefined
}

export function closeDialog(): void {
  cardsStore.set({ dialog: null })
}

export function openContextMenu(contextMenu: ContextMenuState): void {
  cardsStore.set({ contextMenu })
}

export function closeContextMenu(): void {
  if (cardsStore.get().contextMenu) cardsStore.set({ contextMenu: null })
}

export function setSelection(selection: Selection): void {
  cardsStore.set({ selection })
}

/** Envoie la nouvelle version au processus principal, qui la vérifie puis l'enregistre. */
function sendToMain(decoupage: Decoupage): void {
  void window.neoscenar.updateDecoupage(decoupage).then((result) => {
    cardsStore.set({ syncError: result.ok ? null : result.error })
  })
}

/** Remplace l'historique et envoie le découpage s'il a changé ; nettoie la sélection. */
function replaceHistory(next: CardsHistory, selection?: Selection): void {
  const { history, selection: current } = cardsStore.get()
  if (!history) return
  const changed = next.present !== history.present
  cardsStore.set({
    history: next,
    selection: pruneSelection(next.present, selection ?? current)
  })
  if (changed) sendToMain(next.present)
  syncUndoMenu(next)
}

/** Applique une modification du découpage (une étape d'annulation, sauf saisie regroupée). */
export function commitDecoupage(
  decoupage: Decoupage,
  options: EditOptions,
  selection?: Selection
): void {
  const { history } = cardsStore.get()
  if (history) replaceHistory(commit(history, decoupage, options), selection)
}

/**
 * Les cartes suivent le scénario (étape 8) : le découpage est remplacé sans créer d'étape
 * d'annulation dans les cartes, puisque la modification vient du texte.
 */
export function setLinkedDecoupage(decoupage: Decoupage): void {
  const { history } = cardsStore.get()
  if (history) replaceHistory(replacePresent(history, decoupage))
}

/** Annule la dernière étape ; `redoEffect` refera son effet sur le texte (calculé en l'annulant). */
export function undoDecoupage(redoEffect?: TextOp): void {
  const { history } = cardsStore.get()
  if (history) replaceHistory(undo(history, redoEffect))
}

/** Rétablit l'étape annulée ; `undoEffect` défera de nouveau son effet sur le texte. */
export function redoDecoupage(undoEffect?: TextOp): void {
  const { history } = cardsStore.get()
  if (history) replaceHistory(redo(history, undoEffect))
}

let zoomSaveTimer: ReturnType<typeof setTimeout> | null = null

/** Change la taille des cartes ; la préférence est enregistrée peu après le dernier changement. */
export function setZoom(value: number): void {
  const zoom = clampCardZoom(value)
  cardsStore.set({ zoom })
  if (zoomSaveTimer) clearTimeout(zoomSaveTimer)
  zoomSaveTimer = setTimeout(() => void window.neoscenar.setCardZoom(zoom), 400)
}

export async function loadZoom(): Promise<void> {
  cardsStore.set({ zoom: clampCardZoom(await window.neoscenar.getCardZoom()) })
}

export async function loadShowThumbnails(): Promise<void> {
  cardsStore.set({ showThumbnails: await window.neoscenar.getShowThumbnails() })
}

export function toggleThumbnails(): void {
  const showThumbnails = !cardsStore.get().showThumbnails
  cardsStore.set({ showThumbnails })
  void window.neoscenar.setShowThumbnails(showThumbnails)
}

/** Change les entrées personnelles : les menus des plans suivent tout de suite. */
export function saveCustomVocabulary(value: CustomVocabulary): void {
  cardsStore.set({ customVocabulary: value })
  void window.neoscenar.setCustomVocabulary(value)
}

export async function loadVocabulary(): Promise<void> {
  // Les entrées personnelles sont relues à chaque fois : elles peuvent avoir changé dans les Réglages.
  cardsStore.set({ customVocabulary: await window.neoscenar.getCustomVocabulary() })
  if (cardsStore.get().vocabulary) return
  const result = await window.neoscenar.getVocabulary()
  if (result.ok) cardsStore.set({ vocabulary: result.value, vocabularyError: null })
  else cardsStore.set({ vocabularyError: result.error })
}

/** Double-clic ou Entrée : ouvre la fiche et place le curseur dans le champ « Nom ». */
export function requestNameFocus(): void {
  cardsStore.set((state) => ({ panelOpen: true, nameFocusRequest: state.nameFocusRequest + 1 }))
}

/** Fin de la saisie dans un champ : la prochaine frappe sera une nouvelle étape d'annulation. */
export function endTyping(): void {
  const { history } = cardsStore.get()
  if (history) cardsStore.set({ history: breakMerge(history) })
}

export function togglePanel(): void {
  cardsStore.set((state) => ({ panelOpen: !state.panelOpen }))
}

export function setSaveStatus(saveStatus: SaveStatus): void {
  cardsStore.set({ saveStatus })
}
