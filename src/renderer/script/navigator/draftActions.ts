// Marquer une scène comme brouillon depuis le navigateur (18C-13) : une étape de l'historique de
// l'éditeur, comme toute modification venue d'ailleurs que la frappe.

import { setDraft } from '../../../shared/scriptLink/draftScene'
import { draftBlocksOf } from '../editor/drafts'
import { editScriptFromSheets, getActiveView } from '../scriptStore'

/** Marque ou démarque la scène dont l'en-tête commence à `from`. */
export function toggleDraft(from: number, draft: boolean): void {
  const view = getActiveView()
  if (!view) return
  const change = setDraft(view.state.doc.toString(), from, draft)
  if (!change) return
  editScriptFromSheets([change])
  // Le curseur était dans la scène devenue brouillon : il passe juste au-dessus.
  const head = view.state.selection.main.head
  const block = draftBlocksOf(view.state).find((b) => head >= b.from && head < b.to)
  if (block) view.dispatch({ selection: { anchor: Math.max(0, block.from - 1) } })
}
