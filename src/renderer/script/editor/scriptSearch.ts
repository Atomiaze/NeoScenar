// Rechercher et remplacer (panneau de CodeMirror), en français.

import { closeSearchPanel, openSearchPanel, search, searchPanelOpen } from '@codemirror/search'
import { EditorState, type Extension } from '@codemirror/state'
import { keymap, ViewPlugin, type ViewUpdate } from '@codemirror/view'

/** Toutes les phrases du panneau de @codemirror/search (vérifiées par un test). */
export const SEARCH_PHRASES: Record<string, string> = {
  Find: 'Rechercher',
  Replace: 'Remplacer par',
  next: 'Suivant',
  previous: 'Précédent',
  all: 'Tout sélectionner',
  'match case': 'Respecter la casse',
  'by word': 'Mot entier',
  regexp: 'Expression régulière',
  replace: 'Remplacer',
  'replace all': 'Tout remplacer',
  close: 'Fermer',
  'current match': 'résultat actuel',
  'replaced $ matches': '$ remplacements faits',
  'replaced match on line $': 'remplacement fait à la ligne $',
  'on line': 'à la ligne',
  'Go to line': 'Aller à la ligne',
  go: 'Aller'
}

/**
 * Panneau de recherche en haut de l'éditeur. Dans le champ, Entrée passe au résultat suivant,
 * Maj + Entrée au précédent, Échap ferme. Les raccourcis de CodeMirror qui entrent en collision avec
 * ceux de KIT ne sont pas repris : Cmd + G reste la transition (pas « Rechercher le suivant »).
 */
/** Pas de correcteur orthographique dans les champs (une seule ligne) du panneau de recherche. */
const noSpellcheckInPanel = ViewPlugin.define(() => ({
  update(update: ViewUpdate) {
    if (!searchPanelOpen(update.state) || searchPanelOpen(update.startState)) return
    update.view.requestMeasure({
      read: () => null,
      write: (_value, view) => {
        for (const field of view.dom.querySelectorAll<HTMLInputElement>('.cm-search input')) {
          field.spellcheck = false
        }
      }
    })
  }
}))

export function scriptSearch(): Extension {
  return [
    search({ top: true }),
    noSpellcheckInPanel,
    EditorState.phrases.of(SEARCH_PHRASES),
    keymap.of([
      { key: 'Mod-f', run: openSearchPanel, scope: 'editor search-panel' },
      { key: 'Escape', run: closeSearchPanel, scope: 'editor search-panel' }
    ])
  ]
}
