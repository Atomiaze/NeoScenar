// Sections depuis le navigateur : couleur (18C-14), ajouter, renommer, supprimer, imbriquer (18C-15).
// Chaque action est une étape de l'historique de l'éditeur ; aucun numéro de scène ne change.

import { setSectionColor } from '../../../shared/scriptLink/sectionColor'
import {
  appendSection,
  deleteSection,
  insertSectionAbove,
  renameSection,
  sectionHasSynopsis,
  shiftSection
} from '../../../shared/scriptLink/sectionEdit'
import type { TextChange } from '../../../shared/scriptLink/textChanges'
import { editScriptFromSheets, getActiveView } from '../scriptStore'

/** Applique au texte de l'éditeur la modification calculée par `edit`, s'il y en a une. */
function editSections(edit: (text: string) => TextChange | null): void {
  const view = getActiveView()
  if (!view) return
  const change = edit(view.state.doc.toString())
  if (change) editScriptFromSheets([change])
}

/** Choisit la couleur de la section dont la ligne commence à `from` ; null = automatique. */
export function chooseSectionColor(from: number, hex: string | null): void {
  editSections((text) => setSectionColor(text, from, hex))
}

/** Insère une section au-dessus de la scène ou de la section qui commence à `from`. */
export function addSectionAbove(from: number, title: string): void {
  editSections((text) => insertSectionAbove(text, from, title))
}

/** Ajoute une section de niveau 1 à la fin du scénario. */
export function addSectionAtEnd(title: string): void {
  editSections((text) => appendSection(text, title))
}

export function renameSectionAt(from: number, title: string): void {
  editSections((text) => renameSection(text, from, title))
}

export function deleteSectionAt(from: number): void {
  editSections((text) => deleteSection(text, from))
}

/** Imbrique (+1) ou désimbrique (−1) la section ; ses sous-sections suivent. */
export function shiftSectionAt(from: number, delta: 1 | -1): void {
  editSections((text) => shiftSection(text, from, delta))
}

/** La suppression de cette section demande-t-elle confirmation (elle a un synopsis) ? */
export function deletionNeedsConfirm(from: number): boolean {
  const view = getActiveView()
  return view ? sectionHasSynopsis(view.state.doc.toString(), from) : false
}
