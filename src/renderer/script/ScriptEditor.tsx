import { EditorView } from '@codemirror/view'
import { useEffect, useRef } from 'react'
import { useStore } from '../state/createStore'
import { layoutCssVariables } from './layoutProfile'
import {
  attachView,
  detachView,
  getActiveView,
  loadHighlightActiveLine,
  loadScriptZoom,
  scriptStore,
  takeEditorState
} from './scriptStore'

const CSS_VARIABLES = layoutCssVariables()

/**
 * La « page » du scénario : un éditeur CodeMirror sur le texte Fountain du corps du scénario.
 * Il n'est recréé que si le texte est remplacé de l'extérieur (`version`) : changer la page de titre
 * ne le touche pas.
 */
export function ScriptEditor({ version }: { version: number }) {
  const host = useRef<HTMLDivElement>(null)
  const zoom = useStore(scriptStore, (state) => state.zoom)
  const highlight = useStore(scriptStore, (state) => state.highlightActiveLine)

  useEffect(() => {
    void loadScriptZoom()
    void loadHighlightActiveLine()
  }, [])

  useEffect(() => {
    const parts = scriptStore.get().parts
    if (!host.current || !parts) return
    const view = new EditorView({ state: takeEditorState(parts), parent: host.current })
    attachView(view)
    view.focus()
    return () => {
      detachView(view, version)
      view.destroy()
    }
  }, [version])

  // La taille du texte a changé : CodeMirror remesure les lignes (traits de page compris).
  useEffect(() => {
    getActiveView()?.requestMeasure()
  }, [zoom])

  const style = { ...CSS_VARIABLES, '--script-zoom': String(zoom) } as React.CSSProperties
  return (
    <div
      className={`script-editor-host${highlight ? ' highlight-line' : ''}`}
      ref={host}
      style={style}
    />
  )
}
