import { StateEffect } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { undo, redo } from '@codemirror/commands'
import { useEffect, useRef } from 'react'
import { Dialog } from '../../components/Dialog'
import { fr } from '../../i18n/fr'
import { useStore } from '../../state/createStore'
import { createScriptState } from '../editor/createScriptState'
import { layoutCssVariables } from '../layoutProfile'
import { editorNameSources, scriptStore } from '../scriptStore'
import { closeDraftEditor, draftStore, validateDraft, type DraftEdit } from './draftStore'
import { searchMatches, selectFirstMatch } from './searchMatches'
import './draft.css'

const t = fr.script.draft
const CSS_VARIABLES = layoutCssVariables()

/** Éditeur de la fenêtre ouverte, pour Annuler / Rétablir du menu Édition. */
let dialogView: EditorView | null = null

/** Annuler / Rétablir du menu quand la fenêtre d'un brouillon est ouverte. Vrai si traité. */
export function handleDraftUndo(command: 'undo' | 'redo'): boolean {
  if (!dialogView) return false
  if (command === 'undo') undo(dialogView)
  else redo(dialogView)
  return true
}

/** Fenêtre « Modifier le brouillon » (18C-13), affichée par-dessus tous les modules. */
export function DraftEditorDialog() {
  const editing = useStore(draftStore, (state) => state.editing)
  return editing ? <DraftEditor editing={editing} /> : null
}

function DraftEditor({ editing }: { editing: DraftEdit }) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const error = useStore(draftStore, (state) => state.error)
  const zoom = useStore(scriptStore, (state) => state.zoom)

  useEffect(() => {
    if (!host.current) return
    // Le même éditeur que le scénario (éléments, raccourcis, propositions), sans lien avec les cartes.
    const base = createScriptState(editing.text, undefined, editorNameSources())
    const { query } = editing
    const created = new EditorView({
      state: query
        ? base.update({ effects: StateEffect.appendConfig.of(searchMatches(query)) }).state
        : base,
      parent: host.current
    })
    // Ouverte depuis la recherche : la première occurrence est sélectionnée ; sinon, fin du texte.
    if (!query || !selectFirstMatch(created, query)) {
      created.dispatch({ selection: { anchor: created.state.doc.length } })
    }
    created.focus()
    view.current = created
    dialogView = created
    return () => {
      if (dialogView === created) dialogView = null
      created.destroy()
    }
  }, [editing])

  const validate = (): void => {
    if (view.current) validateDraft(view.current.state.doc.toString())
  }
  const title = editing.label ? t.titleWithNumber(editing.label) : t.title
  const style = { ...CSS_VARIABLES, '--script-zoom': String(zoom) } as React.CSSProperties

  return (
    <Dialog
      title={title}
      onClose={closeDraftEditor}
      className="draft-dialog"
      actions={
        <>
          <button type="button" onClick={closeDraftEditor}>
            {t.cancel}
          </button>
          <button type="button" className="primary" onClick={validate}>
            {t.validate}
          </button>
        </>
      }
    >
      <p className="muted draft-dialog-hint">{t.hint}</p>
      <div className="script-editor-host draft-editor-host" ref={host} style={style} />
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  )
}
