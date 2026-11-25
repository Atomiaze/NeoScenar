// Couleur d'une section depuis le navigateur (18C-14) : une étape de l'historique de l'éditeur.

import { setSectionColor } from '../../../shared/scriptLink/sectionColor'
import { editScriptFromSheets, getActiveView } from '../scriptStore'

/** Choisit la couleur de la section dont la ligne commence à `from` ; null = automatique. */
export function chooseSectionColor(from: number, hex: string | null): void {
  const view = getActiveView()
  if (!view) return
  const change = setSectionColor(view.state.doc.toString(), from, hex)
  if (change) editScriptFromSheets([change])
}
