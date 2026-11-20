import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { EditorState } from '@codemirror/state'
import { EditorView, highlightActiveLine, keymap } from '@codemirror/view'
import { fr } from '../../i18n/fr'
import { analysisField } from './analysis'
import { elementDecorations, sectionEndBanners } from './decorations'
import { pageLayoutField, pageLayoutUpdater, setPageLayout, type PageLayout } from './pageLayout'
import { pageBreakLayer } from './pageBreaks'
import { scriptSearch } from './scriptSearch'
import { scriptEditing } from '../editing/scriptEditing'
import { scriptCompletion, type NameSource } from '../completion/scriptCompletion'
import { effectiveType } from '../editing/pendingTypes'
import type { ElementType } from '@neoscenar/fountain'
import type { ReconcileResult } from '../../../shared/scriptLink'
import { sheetClick, type SheetTarget } from './sheetClick'
import { revisionEditing } from './revision'
import { linkResult, numbersWaiting, scriptLink, writeNumbers, type LinkSource } from './scriptLink'

export interface ScriptListeners {
  /** Nouveau texte du corps du scénario (et l'état de l'éditeur, déjà analysé). */
  onChange(body: string, state: EditorState): void
  /** Le curseur a bougé ou le texte a changé : type et ligne du curseur. */
  onCursor(state: EditorState): void
  /** Nouvelle pagination (regroupée) : traits, indicateur, navigateur. */
  onPageLayout(layout: PageLayout, state: EditorState): void
  /** Rapprochement fait après une modification : les cartes suivent le texte (étape 8). */
  onLink?(result: ReconcileResult): void
  /** Cmd + clic sur un personnage ou un lieu d'en-tête : ouvrir sa fiche (étape 10C). */
  onOpenSheet?(target: SheetTarget): void
}

/** Type de l'élément sous le curseur, tel qu'il est affiché. */
export function cursorType(state: EditorState): ElementType {
  return effectiveType(state, state.doc.lineAt(state.selection.main.head).number) ?? 'action'
}

/**
 * État de l'éditeur de scénario : le texte Fountain du corps du scénario, son historique
 * d'annulation (propre à l'éditeur), son habillage et son clavier.
 */
export function createScriptState(
  body: string,
  listeners?: ScriptListeners,
  nameSources: readonly NameSource[] = [],
  link: LinkSource | null = null
): EditorState {
  return EditorState.create({
    doc: body,
    extensions: [
      analysisField,
      pageLayoutField,
      pageLayoutUpdater,
      pageBreakLayer,
      scriptEditing(),
      scriptSearch(),
      scriptCompletion(nameSources),
      elementDecorations,
      sectionEndBanners,
      scriptLink(link),
      sheetClick(listeners?.onOpenSheet),
      revisionEditing(),
      // Le fond n'apparaît que si l'hôte porte la classe « highlight-line » (réglage de l'application).
      highlightActiveLine(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.lineWrapping,
      // Correcteur orthographique du système (voir la configuration dans src/main/spellcheck.ts) ;
      // il est désactivé ligne par ligne sur les en-têtes et les personnages (decorations.ts).
      EditorView.contentAttributes.of({
        'aria-label': fr.script.editorLabel,
        spellcheck: 'true',
        lang: 'fr',
        autocorrect: 'off',
        autocapitalize: 'off'
      }),
      EditorView.updateListener.of((update) => {
        if (!listeners) return
        if (update.docChanged) listeners.onChange(update.state.doc.toString(), update.state)
        for (const transaction of update.transactions) {
          for (const effect of transaction.effects) {
            if (effect.is(setPageLayout)) listeners.onPageLayout(effect.value, update.state)
            if (effect.is(linkResult)) listeners.onLink?.(effect.value)
            // Numéros en attente après une frappe : écrits juste après, dans une étape à part.
            if (effect.is(numbersWaiting)) {
              const { view } = update
              queueMicrotask(() => {
                // L'éditeur a pu être fermé entre-temps (changement de module).
                if (view.dom.isConnected) view.dispatch({ effects: writeNumbers.of(null) })
              })
            }
          }
        }
        if (update.docChanged || update.selectionSet) listeners.onCursor(update.state)
      })
    ]
  })
}
