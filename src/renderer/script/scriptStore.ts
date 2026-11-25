import { isolateHistory, redo, undo } from '@codemirror/commands'
import { openSearchPanel } from '@codemirror/search'
import { ChangeSet, Transaction, type EditorState } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import type { ScenarioConflictChoice, ScenarioSaveStatus } from '../../shared/api'
import { fr } from '../i18n/fr'
import { createStore } from '../state/createStore'
import { DEFAULT_SCRIPT_ZOOM, nextScriptZoom } from '../../shared/scriptZoom'
import { isTypingTarget } from '../cards/typingTarget'
import {
  plainTitle,
  updateTitlePage,
  type ElementType,
  type TitlePageValues
} from '@neoscenar/fountain'
import { createScriptState, cursorType } from './editor/createScriptState'
import type { NameSource } from './completion/scriptCompletion'
import { setElementType } from './editing/commands'
import { joinScenario, splitScenario, type ScenarioParts } from './scenarioText'
import {
  resetNavigator,
  setCursorLine,
  setNavigatorLayout,
  setNavigatorSuppressed
} from './navigator/navigatorStore'
import { pageAt, pageLayoutField, type PageLayout } from './editor/pageLayout'
import { checkWrapping } from './editor/wrapCheck'
import { fromCards, linkResult, settleLink, type LinkSource } from './editor/scriptLink'
import type { TextChange } from '../../shared/scriptLink/textChanges'
import { openSheetByName, researchStore } from '../research/researchStore'
import { readScriptScenes, sceneAt, type ReconcileResult } from '../../shared/scriptLink'
import type { ItemNumber } from '../../shared/projectTypes'
import { analysisField } from './editor/analysis'
import { loadContinuedMarks, loadProjectPagination } from './editor/paginationSettings'

interface ScriptState {
  projectId: string | null
  parts: ScenarioParts | null
  loadError: string | null
  /** Le texte a été refusé par le processus principal (ne devrait pas arriver). */
  sendError: string | null
  status: ScenarioSaveStatus
  /** Change quand le texte est remplacé de l'extérieur (fichier rechargé) : l'éditeur est recréé. */
  version: number
  /** Message discret affiché quelques secondes (fichier rechargé…). */
  notice: string | null
  /** Type de l'élément où se trouve le curseur (sélecteur de la barre d'outils). */
  cursorType: ElementType
  /** Indicateur « Page x / y » : page du curseur et nombre de pages. */
  cursorPage: number
  pageCount: number
  /** Fenêtre « Page de titre… » ouverte. */
  titlePageOpen: boolean
  /** Zoom du texte du scénario (1 = 100 %), mémorisé dans les préférences. */
  zoom: number
  /** Mode concentration (F5) : seule la page reste visible, en plein écran. Jamais mémorisé. */
  focusMode: boolean
  /** Barre des éléments affichée (préférence de l'application). */
  elementBarShown: boolean
  /** Ligne du curseur surlignée (préférence de l'application). */
  highlightActiveLine: boolean
  /** Augmente à chaque modification du texte (pour la description affichée sur les cartes). */
  textRevision: number
}

export const scriptStore = createStore<ScriptState>({
  projectId: null,
  parts: null,
  loadError: null,
  sendError: null,
  status: { state: 'saved' },
  version: 0,
  notice: null,
  cursorType: 'action',
  cursorPage: 1,
  pageCount: 1,
  titlePageOpen: false,
  zoom: DEFAULT_SCRIPT_ZOOM,
  focusMode: false,
  elementBarShown: true,
  highlightActiveLine: true,
  textRevision: 0
})

// L'état de l'éditeur (texte, curseur, historique) survit au changement de module, pendant la session.
// Il est lié à la version du texte : après un rechargement, l'ancien état n'est plus repris.
// C'est aussi le « document du scénario » : les actions des cartes le modifient même quand l'éditeur
// n'est pas affiché (étape 8). Quand l'éditeur est affiché, c'est lui qui a l'état à jour.
let documentState: { version: number; state: EditorState } | null = null
let activeView: EditorView | null = null

// Lien avec les cartes (étape 8), fourni par le module du lien pour éviter une dépendance circulaire.
let editorLink: {
  source: LinkSource
  onLink(result: ReconcileResult): void
  /** Fichier relu : rapproche le corps des cartes et renvoie le corps à utiliser. */
  beforeReload(body: string): Promise<string>
} | null = null

export function configureEditorLink(link: typeof editorLink): void {
  editorLink = link
}

// Moments proposés dans l'en-tête de scène (vocabulaire du cours), lus une fois.
let sceneTimes: readonly string[] = []
const vocabularyTimes: NameSource = () => ({ times: sceneTimes })

// Noms des fiches du module Recherches (étape 10C), proposés comme ceux du scénario.
const sheetNames: NameSource = () => {
  const { sheets } = researchStore.get()
  return {
    characters: sheets.personnages.map((sheet) => sheet.nom),
    locations: sheets.lieux.map((sheet) => sheet.nom)
  }
}

/** Propositions de l'éditeur (moments du cours, fiches) : reprises par la fenêtre d'un brouillon. */
export function editorNameSources(): readonly NameSource[] {
  return [vocabularyTimes, sheetNames]
}

/** Moments du cours, déjà lus (vide tant que la lecture n'est pas finie). */
export function getSceneTimes(): readonly string[] {
  return sceneTimes
}

export async function loadSceneTimes(): Promise<readonly string[]> {
  if (sceneTimes.length > 0) return sceneTimes
  const result = await window.neoscenar.getVocabulary()
  // Sans vocabulaire, l'assistant propose quand même les préfixes, les lieux et les personnages.
  if (result.ok) sceneTimes = result.value.sceneTimes
  return sceneTimes
}

/** Lecture du scénario en cours : un second appel pour le même projet l'attend au lieu de la croire finie. */
let pendingLoad: { projectId: string; promise: Promise<void> } | null = null

/**
 * Charge le scénario d'un projet. Déjà chargé : rien. En cours de lecture (le module Scénario l'a
 * lancée juste avant le rapprochement, au changement de projet) : on attend cette lecture-là.
 */
export function loadScenario(projectId: string): Promise<void> {
  void loadSceneTimes()
  void loadContinuedMarks()
  // Relu à chaque fois : une version restaurée peut changer l'option du projet.
  void loadProjectPagination()
  if (scriptStore.get().projectId === projectId) {
    return pendingLoad?.projectId === projectId ? pendingLoad.promise : Promise.resolve()
  }
  documentState = null
  // Nouvelle version : l'éditeur de l'ancien projet, en se fermant, ne doit ni être réutilisé
  // pour ce projet-ci ni y numéroter un en-tête (son texte n'a plus cours).
  scriptStore.set((state) => ({
    projectId,
    parts: null,
    loadError: null,
    sendError: null,
    version: state.version + 1
  }))
  const promise = readScenario(projectId)
  pendingLoad = { projectId, promise }
  return promise
}

async function readScenario(projectId: string): Promise<void> {
  const result = await window.neoscenar.getScenario()
  if (pendingLoad?.projectId === projectId) pendingLoad = null
  // Un autre projet a pu être ouvert entre-temps : sa lecture tardive est ignorée.
  if (scriptStore.get().projectId !== projectId) return
  if (result.ok) scriptStore.set({ parts: splitScenario(result.value) })
  else scriptStore.set({ loadError: result.error })
}

export function unloadScenario(): void {
  exitFocusMode()
  resetNavigator()
  documentState = null
  activeView = null
  pendingLoad = null
  scriptStore.set({ projectId: null, parts: null, loadError: null, sendError: null })
}

export function setScenarioStatus(status: ScenarioSaveStatus): void {
  scriptStore.set({ status })
}

function sendBody(body: string): void {
  const parts = scriptStore.get().parts
  if (!parts) return
  scriptStore.set((state) => ({ textRevision: state.textRevision + 1 }))
  void window.neoscenar.updateScenario(joinScenario(parts, body)).then((result) => {
    scriptStore.set({ sendError: result.ok ? null : result.error })
  })
}

/** État de départ de l'éditeur : celui de la dernière visite, sinon le texte du fichier. */
export function takeEditorState(parts: ScenarioParts): EditorState {
  const saved = documentState
  if (saved && saved.version === scriptStore.get().version) return saved.state
  const state = createDocument(parts)
  documentState = { version: scriptStore.get().version, state }
  return state
}

function createDocument(parts: ScenarioParts): EditorState {
  return createScriptState(
    parts.body,
    {
      onChange: sendBody,
      onCursor: updateCursor,
      onPageLayout: (layout, state) => {
        applyLayout(layout)
        updateCursor(state)
      },
      onLink: (result) => editorLink?.onLink(result),
      onOpenSheet: (target) => void openSheetByName(target.kind, target.name)
    },
    [vocabularyTimes, sheetNames],
    editorLink?.source ?? null
  )
}

function updateCursor(state: EditorState): void {
  const type = cursorType(state)
  if (scriptStore.get().cursorType !== type) scriptStore.set({ cursorType: type })
  const layout = state.field(pageLayoutField, false)
  const page = layout ? pageAt(layout.starts, state.selection.main.head) : 1
  if (scriptStore.get().cursorPage !== page) scriptStore.set({ cursorPage: page })
  setCursorLine(state.doc.lineAt(state.selection.main.head).number)
}

export function attachView(view: EditorView): void {
  activeView = view
  updateCursor(view.state)
  const layout = view.state.field(pageLayoutField, false)
  if (layout) applyLayout(layout)
}

function applyLayout(layout: PageLayout): void {
  setNavigatorLayout(layout)
  scriptStore.set({ pageCount: layout.pagination.pages.length })
}

/** Texte actuel du corps du scénario (éditeur affiché ou non), ou null s'il n'est pas chargé. */
export function scriptText(): string | null {
  const parts = scriptStore.get().parts
  return parts ? currentBody(parts) : null
}

/** Texte complet du scénario (page de titre comprise), tel qu'il serait enregistré ; null si non chargé. */
export function fullScriptText(): string | null {
  const parts = scriptStore.get().parts
  return parts ? joinScenario(parts, currentBody(parts)) : null
}

/**
 * Modification du texte venue des cartes (étape 8). Elle n'entre pas dans l'historique de l'éditeur
 * (Cmd + Z dans l'éditeur ne défait jamais une action des cartes) et le rapprochement de l'éditeur
 * ne la retraite pas : l'action des cartes l'a déjà fait. Elle est enregistrée comme une frappe,
 * que l'éditeur soit affiché ou non.
 */
export function editScriptFromCards(changes: ChangeSet): void {
  const spec = {
    changes,
    annotations: [Transaction.addToHistory.of(false), fromCards.of(true)]
  }
  if (activeView) {
    activeView.dispatch(spec)
    return
  }
  const parts = scriptStore.get().parts
  if (!parts) return
  const state = takeEditorState(parts).update(spec).state
  documentState = { version: scriptStore.get().version, state }
  sendBody(state.doc.toString())
}

/**
 * Modification du texte venue du bandeau des fiches (« Remplacer MARI par MARIE », étape 10C). Au
 * contraire des cartes, elle entre dans l'historique de l'éditeur, comme une étape à part : Cmd + Z
 * la défait. Les cartes suivent (lieux des en-têtes), que l'éditeur soit affiché ou non.
 * Renvoie le numéro de révision du texte après la modification (voir `undoScriptEdit`).
 */
export function editScriptFromSheets(
  changes: readonly TextChange[],
  /**
   * « input.drop » : bloc déplacé (navigateur, 18C-12), traité comme un texte glissé : le
   * rapprochement écrit son numéro dans la même étape d'annulation.
   */
  userEvent: 'input.replace' | 'input.drop' = 'input.replace'
): number {
  const spec = {
    changes: [...changes],
    annotations: [isolateHistory.of('full'), Transaction.userEvent.of(userEvent)]
  }
  if (activeView) activeView.dispatch(spec)
  else {
    const parts = scriptStore.get().parts
    if (parts) applyStored(takeEditorState(parts).update(spec))
  }
  return scriptStore.get().textRevision
}

/** Modification faite hors de l'historique de l'éditeur, et de quoi la défaire (`revertScriptEdit`). */
export interface QuietEdit {
  /** Révision du texte juste après la modification. */
  revision: number
  inverse: ChangeSet
}

/**
 * Modification venue du renommage d'une fiche (étape 10D). Comme les actions des cartes, elle
 * n'entre pas dans l'historique de l'éditeur : seul le bouton « Annuler » du bandeau la défait. Les
 * cartes suivent (lieux des en-têtes). Null si le scénario n'est pas chargé.
 */
export function editScriptQuietly(changes: readonly TextChange[]): QuietEdit | null {
  const parts = scriptStore.get().parts
  if (!parts) return null
  const doc = activeView ? activeView.state.doc : takeEditorState(parts).doc
  const set = ChangeSet.of([...changes], doc.length)
  dispatchQuietly(set)
  return { revision: scriptStore.get().textRevision, inverse: set.invert(doc) }
}

/** Défait `editScriptQuietly`, seulement si le texte n'a pas changé depuis. Vrai si c'est fait. */
export function revertScriptEdit(edit: QuietEdit): boolean {
  if (scriptStore.get().textRevision !== edit.revision) return false
  dispatchQuietly(edit.inverse)
  return true
}

function dispatchQuietly(changes: ChangeSet): void {
  const spec = {
    changes,
    annotations: [Transaction.addToHistory.of(false), Transaction.userEvent.of('input.replace')]
  }
  if (activeView) activeView.dispatch(spec)
  else {
    const parts = scriptStore.get().parts
    if (parts) applyStored(takeEditorState(parts).update(spec))
  }
}

/**
 * Défait la dernière étape de l'éditeur, seulement si le texte n'a pas changé depuis la révision
 * donnée (sinon on défairait autre chose). Vrai si c'est fait.
 */
export function undoScriptEdit(revision: number): boolean {
  if (scriptStore.get().textRevision !== revision) return false
  if (activeView) return undo(activeView)
  const parts = scriptStore.get().parts
  if (!parts) return false
  let done: Transaction | null = null
  undo({ state: takeEditorState(parts), dispatch: (tr) => (done = tr) })
  if (done) applyStored(done)
  return done !== null
}

/** Transaction faite sans éditeur affiché : gardée pour la prochaine visite, enregistrée, reliée. */
function applyStored(tr: Transaction): void {
  documentState = { version: scriptStore.get().version, state: tr.state }
  for (const effect of tr.effects) if (effect.is(linkResult)) editorLink?.onLink(effect.value)
  if (tr.docChanged) sendBody(tr.state.doc.toString())
}

/** Ligne du curseur dans l'éditeur affiché (en cours de frappe), ou null. */
export function editingLineNumber(): number | null {
  const view = activeView
  return view ? view.state.doc.lineAt(view.state.selection.main.head).number : null
}

/**
 * Scène du curseur dans l'éditeur (celle mise en évidence dans le navigateur) : son numéro, après
 * avoir numéroté l'en-tête en cours de frappe ; « none » si le curseur n'est dans aucune scène ;
 * null si l'éditeur n'est pas affiché.
 */
export function sceneAtCursor(): ItemNumber | 'none' | null {
  const view = activeView
  if (!view) return null
  view.dispatch({ effects: settleLink.of(null) })
  const { state } = view
  const text = state.doc.toString()
  const scenes = readScriptScenes(text, state.field(analysisField).doc)
  return sceneAt(scenes, state.selection.main.head, text.length)?.number ?? 'none'
}

/** Remet le focus dans l'éditeur affiché (après une action lancée depuis le menu). */
export function focusEditor(): void {
  activeView?.focus()
}

/** Éditeur affiché (pour le navigateur de scènes), ou null. */
export function getActiveView(): EditorView | null {
  return activeView
}

/** Sélecteur d'élément de la barre d'outils : change le type de la ligne du curseur. */
export function chooseElementType(type: ElementType): void {
  const view = activeView
  if (!view) return
  setElementType(type)(view)
  view.focus()
}

export function detachView(view: EditorView, version: number): void {
  // Un en-tête en cours de frappe est numéroté (et sa carte créée) avant de quitter l'éditeur.
  // Pas après un rechargement du fichier : l'ancien texte n'a plus cours.
  if (version === scriptStore.get().version) view.dispatch({ effects: settleLink.of(null) })
  documentState = { version, state: view.state }
  if (activeView === view) activeView = null
}

const NOTICE_DURATION_MS = 6000
let noticeTimer: ReturnType<typeof setTimeout> | null = null

export function showNotice(notice: string): void {
  if (noticeTimer) clearTimeout(noticeTimer)
  scriptStore.set({ notice })
  noticeTimer = setTimeout(() => scriptStore.set({ notice: null }), NOTICE_DURATION_MS)
}

/**
 * Corps du scénario modifié avant la création de l'éditeur (première liaison, rapprochement à
 * l'ouverture) : il devient le texte de départ de l'éditeur et il est enregistré.
 */
export function replaceBodyBeforeEditing(body: string): void {
  const parts = scriptStore.get().parts
  if (!parts || body === parts.body) return
  documentState = null
  scriptStore.set({ parts: { ...parts, body } })
  sendBody(body)
}

/**
 * Texte relu après une modification dans un autre logiciel : rapproché des cartes (numéros écrits si
 * besoin, puis enregistrés), puis l'éditeur est recréé sur ce texte.
 */
async function replaceText(fileText: string): Promise<void> {
  const parts = splitScenario(fileText)
  const body = editorLink ? await editorLink.beforeReload(parts.body) : parts.body
  if (!scriptStore.get().parts) return
  scriptStore.set((state) => ({ parts: { ...parts, body }, version: state.version + 1 }))
  if (body !== parts.body) sendBody(body)
}

/**
 * Vérifie si scenario.fountain a été modifié dans un autre logiciel. Sans modification en attente
 * dans NeoScenar, le fichier est relu sans poser de question ; sinon la fenêtre de choix s'ouvre.
 */
export async function checkScenario(): Promise<void> {
  if (!scriptStore.get().parts) return
  const reloaded = await window.neoscenar.checkScenario()
  if (reloaded === null || !scriptStore.get().parts) return
  await replaceText(reloaded)
  showNotice(fr.script.reloadedNotice)
}

/** Décision après une modification de scenario.fountain dans un autre logiciel. */
export async function resolveConflict(choice: ScenarioConflictChoice): Promise<void> {
  const result = await window.neoscenar.resolveScenarioConflict(choice)
  if (!result.ok) {
    scriptStore.set({ sendError: result.error })
    return
  }
  if (choice === 'reload') await replaceText(result.value)
}

/**
 * Annuler / Rétablir du menu Édition quand le module Scénario est affiché : l'historique de
 * l'éditeur, sauf si un autre champ de saisie a le focus. Vrai si la commande a été traitée.
 */
export function handleScriptUndo(command: 'undo' | 'redo'): boolean {
  const view = activeView
  if (!view) return false
  const focused = document.activeElement
  if (!view.dom.contains(focused) && isTypingTarget(focused)) return false
  if (command === 'undo') undo(view)
  else redo(view)
  return true
}

/** Mode développement (menu Présentation) : compare les coupures de lignes de l'écran et de l'impression. */
export function checkLineWrapping(): void {
  const view = activeView
  if (!view) return
  const { checked, differences } = checkWrapping(view)
  console.table(differences)
  // Gardé aussi dans la fenêtre, pour l'examiner dans la console de développement.
  Object.assign(window, { neoscenarWrapCheck: differences })
  showNotice(fr.script.wrapCheckResult(differences.length, checked))
}

export function openTitlePage(): void {
  scriptStore.set({ titlePageOpen: true })
}

export function closeTitlePage(): void {
  scriptStore.set({ titlePageOpen: false })
}

/** Texte actuel du corps du scénario : celui de l'éditeur s'il a été ouvert, sinon celui du fichier. */
function currentBody(parts: ScenarioParts): string {
  if (activeView) return activeView.state.doc.toString()
  // Après un rechargement du fichier, l'ancien document n'a plus cours.
  const saved = documentState?.version === scriptStore.get().version ? documentState : null
  return saved?.state.doc.toString() ?? parts.body
}

/**
 * Valider la fenêtre « Page de titre… » : seule la page de titre change (le corps du scénario et
 * l'historique d'annulation de l'éditeur ne sont pas touchés), puis le titre suit dans projet.json.
 */
export async function saveTitlePage(values: TitlePageValues): Promise<void> {
  const parts = scriptStore.get().parts
  if (!parts) return
  const titlePage = updateTitlePage(parts.titlePage, values)
  if (titlePage !== parts.titlePage) {
    const next = { ...parts, titlePage }
    scriptStore.set({ parts: next })
    const result = await window.neoscenar.updateScenario(joinScenario(next, currentBody(next)))
    scriptStore.set({ sendError: result.ok ? null : result.error })
  }
  const title = plainTitle(values.Title)
  if (title !== '') await window.neoscenar.updateProjectTitle(title)
  closeTitlePage()
}

/** Édition > Rechercher… (Cmd + F) : panneau de recherche de l'éditeur. */
export function openFind(): void {
  if (activeView) openSearchPanel(activeView)
}

let zoomLoaded: Promise<void> | null = null

/** Zoom du scénario, lu une fois dans les préférences. */
export function loadScriptZoom(): Promise<void> {
  zoomLoaded ??= window.neoscenar.getScriptZoom().then((zoom) => scriptStore.set({ zoom }))
  return zoomLoaded
}

/** Cmd + + / Cmd + - / Cmd + 0 dans le Scénario : seul le texte du scénario change de taille. */
export async function zoomScript(direction: 'in' | 'out' | 'reset'): Promise<void> {
  await loadScriptZoom()
  const zoom = nextScriptZoom(scriptStore.get().zoom, direction)
  if (zoom === scriptStore.get().zoom) return
  scriptStore.set({ zoom })
  void window.neoscenar.setScriptZoom(zoom)
}

/** F5 ou Présentation > Mode concentration : entrer ou sortir. */
export function toggleFocusMode(): void {
  if (scriptStore.get().focusMode) exitFocusMode()
  else if (activeView) {
    scriptStore.set({ focusMode: true })
    // Le navigateur est masqué sans toucher à sa préférence : il revient tel qu'il était.
    setNavigatorSuppressed(true)
    void window.neoscenar.setFocusMode(true)
    activeView.focus()
  }
}

/** Sortie du mode concentration (F5, menu, Échap, ou plein écran quitté par le système). */
export function exitFocusMode(): void {
  if (!scriptStore.get().focusMode) return
  scriptStore.set({ focusMode: false })
  setNavigatorSuppressed(false)
  void window.neoscenar.setFocusMode(false)
}

let elementBarLoaded: Promise<void> | null = null

/** Affichage de la barre des éléments, lu une fois dans les préférences. */
export function loadElementBarShown(): Promise<void> {
  elementBarLoaded ??= window.neoscenar
    .getShowElementBar()
    .then((elementBarShown) => scriptStore.set({ elementBarShown }))
  return elementBarLoaded
}

/** Présentation > Barre des éléments : afficher ou masquer (préférence de l'application). */
export async function toggleElementBar(): Promise<void> {
  await loadElementBarShown()
  const elementBarShown = !scriptStore.get().elementBarShown
  scriptStore.set({ elementBarShown })
  await window.neoscenar.setShowElementBar(elementBarShown)
}

let highlightLoaded: Promise<void> | null = null

/** Surbrillance de la ligne du curseur, lue une fois dans les préférences. */
export function loadHighlightActiveLine(): Promise<void> {
  highlightLoaded ??= window.neoscenar
    .getHighlightActiveLine()
    .then((highlightActiveLine) => scriptStore.set({ highlightActiveLine }))
  return highlightLoaded
}

/** Réglages > Surligner la ligne du curseur : appliqué tout de suite, mémorisé. */
export async function setHighlightActiveLine(highlightActiveLine: boolean): Promise<void> {
  scriptStore.set({ highlightActiveLine })
  await window.neoscenar.setHighlightActiveLine(highlightActiveLine)
}
