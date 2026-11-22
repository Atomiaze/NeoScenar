import { redo, undo } from '@codemirror/commands'
import { EditorView } from '@codemirror/view'
import type { SaveStatus } from '../../shared/api'
import type { DocumentFolder } from '../../shared/research/documents'
import type { ScriptNames } from '../../shared/research/scriptSheets'
import { nameKey } from '../../shared/research/sheetNames'
import type { Sheet, SheetImage, SheetKind, SheetPatch } from '../../shared/research/types'
import { isTypingTarget } from '../cards/typingTarget'
import { createStore } from '../state/createStore'

// État du module Recherches. Les fiches sont relues sur le disque à l'ouverture du module et à
// chaque retour dans NeoScenar ; chaque modification est envoyée au processus principal, qui
// l'enregistre automatiquement.

/** Fenêtre de renommage (étape 10D) : ce que le remplacement changerait dans le scénario. */
export interface RenameDialog {
  kind: 'rename'
  fileName: string
  from: string
  to: string
  always: number
  inText: number
  headings: number
}

/** Dossier ou note choisi dans la branche Documents (chemin relatif à neoscenar/documents/). */
export interface DocSelection {
  type: 'folder' | 'note'
  path: string
}

export type ResearchDialog =
  | { kind: 'new' }
  | { kind: 'delete'; fileName: string }
  | RenameDialog
  | { kind: 'docNew'; what: 'folder' | 'note'; parent: string }
  | { kind: 'docRename'; entry: DocSelection }
  | { kind: 'docDelete'; entry: DocSelection }
  | null

/** Rubriques sans fiches : entrées simples du panneau (comme « Générique »). */
export type ProjectSection =
  | 'sheets'
  | 'documents'
  | 'credits'
  | 'titlePage'
  | 'logLine'
  | 'synopsis'
  | 'pitch'
  | 'tagLine'
  | 'intention'

interface ResearchState {
  /** Le module est affiché (le menu Annuler n'agit alors pas sur les cartes). */
  active: boolean
  /** Type de la fiche ouverte, ou de la branche choisie dans l'arbre : c'est là que « Nouveau » crée. */
  kind: SheetKind
  /** Fiches de chaque type, relues ensemble (l'arbre montre les deux listes). */
  sheets: Record<SheetKind, Sheet[]>
  loaded: boolean
  selected: string | null
  /** Branche affichée : les fiches (Personnages, Lieux) ou les documents. */
  section: ProjectSection
  /** Arbre des documents, relu sur le disque ; null avant la première lecture. */
  documents: DocumentFolder | null
  docSelected: DocSelection | null
  dialog: ResearchDialog
  /** Image affichée en grand (chemin relatif à neoscenar/). */
  preview: string | null
  status: SaveStatus
  error: string | null
  /** Noms du scénario au dernier rapprochement des fiches (étape 10C), ou null avant le premier. */
  scriptNames: ScriptNames | null
  /** Augmente quand une fiche doit être montrée (Cmd + clic, bandeau) : le module s'affiche. */
  openRequest: number
}

const initial: ResearchState = {
  active: false,
  kind: 'personnages',
  sheets: { personnages: [], lieux: [] },
  loaded: false,
  selected: null,
  section: 'sheets',
  documents: null,
  docSelected: null,
  dialog: null,
  preview: null,
  status: { state: 'saved' },
  error: null,
  scriptNames: null,
  openRequest: 0
}

export const researchStore = createStore<ResearchState>(initial)

export function setResearchActive(active: boolean): void {
  researchStore.set({ active })
}

/**
 * Annuler / Rétablir dans le module Recherches : seulement la frappe du champ en cours (les fiches
 * n'ont pas d'historique). Vrai si le module est affiché : les cartes ne sont alors pas touchées.
 */
export function handleResearchUndo(command: 'undo' | 'redo'): boolean {
  if (!researchStore.get().active) return false
  // Un document Markdown (CodeMirror) a son propre historique.
  const editor = document.activeElement?.closest('.cm-editor')
  const markdown = editor instanceof HTMLElement ? EditorView.findFromDOM(editor) : null
  if (markdown) (command === 'undo' ? undo : redo)(markdown)
  else if (isTypingTarget(document.activeElement)) document.execCommand(command)
  return true
}

export function setResearchStatus(status: SaveStatus): void {
  researchStore.set({ status })
}

export function showResearchError(error: string | null): void {
  researchStore.set({ error })
}

export function openResearchDialog(dialog: ResearchDialog): void {
  researchStore.set({ dialog })
}

export function showImage(path: string | null): void {
  researchStore.set({ preview: path })
}

/** Choisir un dossier ou une note de la branche Documents (null : rien d'ouvert). */
export function selectDocument(docSelected: DocSelection | null): void {
  researchStore.set({ section: 'documents', docSelected })
}

/** Choisir l'entrée « Générique » de l'arbre. */
export function selectCredits(): void {
  researchStore.set({ section: 'credits' })
}

/** Choisir une entrée simple du panneau (page de titre, synopsis…). */
export function selectSection(section: ProjectSection): void {
  researchStore.set({ section })
}

export function selectSheet(kind: SheetKind, fileName: string | null): void {
  researchStore.set({ kind, selected: fileName, section: 'sheets' })
}

/** Choisir une branche de l'arbre : « Nouveau » y crée, sans rien ouvrir. */
export function selectBranch(kind: SheetKind): void {
  researchStore.set((state) =>
    state.kind === kind && state.section === 'sheets'
      ? {}
      : { kind, selected: null, section: 'sheets' }
  )
}

/** La fiche ouverte (du type actif), ou null. */
export function currentSheet(state: ResearchState): Sheet | null {
  return state.sheets[state.kind].find((sheet) => sheet.fileName === state.selected) ?? null
}

/** Ouvre le formulaire du générique dans le module Recherches (qui s'affiche). */
export function showCredits(): void {
  researchStore.set((state) => ({ section: 'credits', openRequest: state.openRequest + 1 }))
}

/** Ouvre une fiche dans le module Recherches (qui s'affiche). */
export function showSheet(kind: SheetKind, fileName: string): void {
  researchStore.set((state) => ({
    kind,
    selected: fileName,
    section: 'sheets',
    openRequest: state.openRequest + 1
  }))
}

function findSheet(kind: SheetKind, name: string): Sheet | undefined {
  const key = nameKey(name)
  return researchStore.get().sheets[kind].find((sheet) => nameKey(sheet.nom) === key)
}

/**
 * Cmd + clic sur un nom du scénario : ouvre sa fiche. Si elle n'existe pas encore (scénario pas
 * encore enregistré), elle est créée vide, comme au rapprochement.
 */
export async function openSheetByName(kind: SheetKind, name: string): Promise<void> {
  if (!findSheet(kind, name)) {
    const result = await window.neoscenar.createAutoSheets(kind, [name])
    if (!result.ok) {
      showResearchError(result.error)
      return
    }
    await loadSheets()
  }
  const sheet = findSheet(kind, name)
  if (sheet) showSheet(kind, sheet.fileName)
}

/** Relit les fiches des deux types ; la fiche choisie le reste si elle existe encore. */
export async function loadSheets(): Promise<void> {
  const [characters, places] = await Promise.all([
    window.neoscenar.listSheets('personnages'),
    window.neoscenar.listSheets('lieux')
  ])
  if (!characters.ok || !places.ok) {
    const error = !characters.ok ? characters.error : !places.ok ? places.error : ''
    researchStore.set({ loaded: true, error })
    return
  }
  researchStore.set((state) => {
    const sheets = { personnages: characters.value, lieux: places.value }
    const stillThere = sheets[state.kind].some((sheet) => sheet.fileName === state.selected)
    return { sheets, loaded: true, selected: stillThere ? state.selected : null }
  })
}

export async function createSheet(name: string): Promise<string | null> {
  const { kind } = researchStore.get()
  const result = await window.neoscenar.createSheet(kind, name)
  if (!result.ok) return result.error
  await loadSheets()
  researchStore.set({ selected: result.value.fileName, dialog: null })
  return null
}

export async function deleteSheet(fileName: string): Promise<void> {
  const { kind } = researchStore.get()
  const result = await window.neoscenar.deleteSheet(kind, fileName)
  researchStore.set({ dialog: null })
  if (!result.ok) showResearchError(result.error)
  await loadSheets()
}

/** Applique la modification à l'écran tout de suite, puis l'envoie pour être enregistrée. */
export function updateSheet(fileName: string, patch: SheetPatch, images?: SheetImage[]): void {
  const { kind } = researchStore.get()
  // Une fiche créée automatiquement que l'élève complète n'est plus « auto ».
  const sheet = researchStore.get().sheets[kind].find((item) => item.fileName === fileName)
  if (sheet?.auto) patch = { ...patch, auto: false }
  researchStore.set((state) => ({
    sheets: {
      ...state.sheets,
      [kind]: state.sheets[kind].map((sheet) =>
        sheet.fileName === fileName
          ? {
              ...sheet,
              props: { ...sheet.props, ...patch.props },
              sections: { ...sheet.sections, ...patch.sections },
              auto: patch.auto ?? sheet.auto,
              images: images ?? sheet.images
            }
          : sheet
      )
    }
  }))
  void window.neoscenar.updateSheet(kind, fileName, patch).then((result) => {
    if (!result.ok) showResearchError(result.error)
  })
}

export function setImages(sheet: Sheet, images: SheetImage[]): void {
  updateSheet(sheet.fileName, { images: images.map((image) => image.ref) }, images)
}

/** Ajoute des images à la fiche : chemins de fichiers, ou fichiers sans chemin (autre application). */
export async function addImages(fileName: string, files: (string | File)[]): Promise<void> {
  const { kind } = researchStore.get()
  const stored: SheetImage[] = []
  const errors: string[] = []
  for (const file of files) {
    const result =
      typeof file === 'string'
        ? await window.neoscenar.storeSheetImageFile(kind, file)
        : await window.neoscenar.storeSheetImageBytes(
            kind,
            new Uint8Array(await file.arrayBuffer()),
            file.name
          )
    if (result.ok) stored.push(result.value)
    else errors.push(result.error)
  }
  // La fiche a pu changer pendant la copie : on repart de son état actuel.
  const sheet = researchStore
    .get()
    .sheets[kind].find((candidate) => candidate.fileName === fileName)
  if (sheet && stored.length > 0) setImages(sheet, [...sheet.images, ...stored])
  if (errors.length > 0) showResearchError([...new Set(errors)].join('\n'))
}

export function unloadResearch(): void {
  researchStore.set({ ...initial })
}
