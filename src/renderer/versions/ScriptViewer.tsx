import { EditorView } from '@codemirror/view'
import { useEffect, useRef } from 'react'
import { layoutCssVariables } from '../script/layoutProfile'
import { createReadOnlyScriptState } from '../script/editor/readOnlyScriptState'
import { splitScenario } from '../script/scenarioText'
import '../script/script.css'

const CSS_VARIABLES = layoutCssVariables()

/** Page du scénario en lecture seule (corps du scénario, sans la page de titre). */
export function ScriptViewer({ text, label }: { text: string; label: string }) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!host.current) return
    const { body } = splitScenario(text)
    const view = new EditorView({
      state: createReadOnlyScriptState(body, label),
      parent: host.current
    })
    return () => view.destroy()
  }, [text, label])

  // « script-module » porte les couleurs de la page (clair et sombre), comme dans le Scénario.
  return (
    <div className="script-module version-viewer">
      <div className="script-editor-host" ref={host} style={CSS_VARIABLES as React.CSSProperties} />
    </div>
  )
}
