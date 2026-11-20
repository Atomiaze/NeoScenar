import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { pendingTypes } from '../editing/pendingTypes'
import { analysisField } from './analysis'
import { elementDecorations, sectionEndBanners } from './decorations'
import { pageBreakLayer } from './pageBreaks'
import { pageLayoutField, pageLayoutUpdater } from './pageLayout'

/**
 * Scénario en lecture seule (Consulter une version, étape 13C) : même habillage et mêmes traits de
 * page que l'éditeur, mais aucune saisie, aucun numéro écrit, aucun lien avec les cartes ni les
 * fiches. Ne dépend d'aucun magasin du projet ouvert.
 */
export function createReadOnlyScriptState(body: string, label: string): EditorState {
  return EditorState.create({
    doc: body,
    extensions: [
      analysisField,
      pageLayoutField,
      pageLayoutUpdater,
      pageBreakLayer,
      // Les décorations lisent ce champ (types en attente de l'éditeur) : il reste vide ici.
      pendingTypes,
      elementDecorations,
      sectionEndBanners,
      EditorView.lineWrapping,
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      EditorView.contentAttributes.of({ 'aria-label': label, 'aria-readonly': 'true' })
    ]
  })
}
