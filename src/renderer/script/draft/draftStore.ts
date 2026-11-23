// Fenêtre d'édition d'une scène brouillon (18C-13) : le texte de la scène, modifié dans un petit
// éditeur à part, revient dans le scénario à la validation, en une seule étape de l'historique de
// l'éditeur principal. Rien n'est écrit avant « Valider ».

import { getSearchQuery, type SearchQuery } from '@codemirror/search'
import { parse } from '@neoscenar/fountain'
import { numberKey } from '../../../shared/decoupage/order'
import {
  draftBlocks,
  draftEditableText,
  readScriptScenes,
  rebuiltDraftBlock,
  sceneLabel,
  type TextRange
} from '../../../shared/scriptLink'
import type { ItemNumber } from '../../../shared/projectTypes'
import { fr } from '../../i18n/fr'
import { createStore } from '../../state/createStore'
import { onDraftSearchHit } from '../editor/drafts'
import { editScriptFromSheets, getActiveView, scriptText } from '../scriptStore'

export interface DraftEdit {
  /** Bloc d'origine, et son texte : la validation vérifie qu'il n'a pas changé entre-temps. */
  block: TextRange
  original: string
  /** Texte proposé dans la fenêtre (sans la note [[BROUILLON]]). */
  text: string
  /** « S_0020 », ou vide sans numéro. */
  label: string
  /** Ouverte depuis la recherche : ce qui était cherché, surligné dans la fenêtre. */
  query?: SearchQuery
}

interface DraftState {
  editing: DraftEdit | null
  /** Refus de la validation (en-tête effacé, scénario changé). */
  error: string | null
  /** Dernier résultat de recherche trouvé dans un brouillon : en-tête de la scène. */
  searchHit: { from: number; label: string; heading: string; query: SearchQuery | null } | null
}

export const draftStore = createStore<DraftState>({ editing: null, error: null, searchHit: null })

/** Bloc brouillon dont l'en-tête commence à `from`, dans le texte actuel. */
function blockAt(text: string, from: number): TextRange | undefined {
  return draftBlocks(parse(text, { titlePage: false }), text.length).find((b) => b.from === from)
}

function labelAt(text: string, from: number): { label: string; heading: string } {
  const scene = readScriptScenes(text).find((item) => item.line.from === from)
  return { label: scene?.number ? sceneLabel(scene.number) : '', heading: scene?.heading ?? '' }
}

/** Ouvre la fenêtre pour la scène brouillon dont l'en-tête commence à `from`. */
export function openDraftEditor(from: number, query?: SearchQuery): void {
  const text = scriptText()
  if (text === null) return
  const block = blockAt(text, from)
  if (!block) return
  const original = text.slice(block.from, block.to)
  draftStore.set({
    editing: {
      block,
      original,
      text: draftEditableText(original),
      label: labelAt(text, from).label,
      ...(query ? { query } : {})
    },
    error: null,
    searchHit: null
  })
}

/** Ouvre la fenêtre depuis une carte : la scène brouillon qui porte ce numéro. */
export function openDraftEditorFor(number: ItemNumber): void {
  const text = scriptText()
  if (text === null) return
  const key = numberKey(number)
  const scene = readScriptScenes(text).find((item) => item.number && numberKey(item.number) === key)
  if (scene) openDraftEditor(scene.line.from)
}

export function closeDraftEditor(): void {
  draftStore.set({ editing: null, error: null })
}

/** Remet le texte modifié dans le scénario. Faux (fenêtre gardée ouverte) en cas de refus. */
export function validateDraft(edited: string): boolean {
  const editing = draftStore.get().editing
  const text = scriptText()
  if (!editing || text === null) return false
  const { block, original } = editing
  if (text.slice(block.from, block.to) !== original) {
    draftStore.set({ error: fr.script.draft.changed })
    return false
  }
  const rebuilt = rebuiltDraftBlock(edited, original, block.to === text.length)
  if (rebuilt === null) {
    draftStore.set({ error: fr.script.draft.headingNeeded })
    return false
  }
  if (rebuilt !== original) editScriptFromSheets([{ ...block, insert: rebuilt }])
  closeDraftEditor()
  return true
}

/** La recherche est tombée dans un brouillon : la scène est signalée sous la barre d'outils. */
function showDraftSearchHit(from: number | null): void {
  const text = scriptText()
  if (from === null || text === null) clearDraftSearchHit()
  else {
    const view = getActiveView()
    const query = view ? getSearchQuery(view.state) : null
    draftStore.set({
      searchHit: { from, ...labelAt(text, from), query: query?.valid ? query : null }
    })
  }
}

onDraftSearchHit(showDraftSearchHit)

export function clearDraftSearchHit(): void {
  if (draftStore.get().searchHit) draftStore.set({ searchHit: null })
}
