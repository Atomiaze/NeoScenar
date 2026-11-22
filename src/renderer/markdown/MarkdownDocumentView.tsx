import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { useEffect, useRef, useState } from 'react'
import { insertRule, toggleHeading, toggleInline } from '../../shared/markdown/markdownLite'
import type { MarkdownTextName } from '../../shared/projectTexts'
import { fr } from '../i18n/fr'
import { showResearchError } from '../research/researchStore'
import { applyEdit, externalChange, markdownExtension } from './markdownExtension'

const t = fr.research.markdown

/** Titre imprimé automatiquement en haut du document dans le PDF (18C-4). */
const PDF_TITLES: Record<MarkdownTextName, string> = {
  synopsis: fr.pdfExport.documentTitles.synopsis,
  pitch: fr.pdfExport.documentTitles.pitch,
  intention: fr.pdfExport.documentTitles.noteIntention
}

function selectionOf(view: EditorView): { from: number; to: number } {
  const { from, to } = view.state.selection.main
  return { from, to }
}

export function applyHeading(view: EditorView, level: 1 | 2 | 3): void {
  const head = view.state.selection.main.head
  const line = view.state.doc.lineAt(head)
  applyEdit(view, toggleHeading(line.text, line.from, level, head))
}

export function applyInline(view: EditorView, mark: '**' | '*'): void {
  const { from, to } = selectionOf(view)
  applyEdit(view, toggleInline(view.state.doc.toString(), from, to, mark))
}

export function applyRule(view: EditorView): void {
  const line = view.state.doc.lineAt(view.state.selection.main.head)
  applyEdit(view, insertRule(line.text, line.from, line.number < view.state.doc.lines))
}

/**
 * Un document Markdown du projet (synopsis, pitch, note d'intention) : texte mis en forme pendant
 * la frappe, enregistré automatiquement, relu au retour dans l'application si un autre logiciel
 * (Obsidian) l'a modifié.
 */
export function MarkdownDocumentView({ name, title }: { name: MarkdownTextName; title: string }) {
  const host = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  // Dernier texte connu du disque ou de l'écran : sert à repérer une modification extérieure.
  const latest = useRef<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    let view: EditorView | null = null

    const load = async (): Promise<void> => {
      const result = await window.neoscenar.readProjectText(name)
      if (cancelled) return
      if (!result.ok) {
        showResearchError(result.error)
        return
      }
      const text = result.value
      if (!view) {
        if (!host.current) return
        latest.current = text
        view = new EditorView({
          parent: host.current,
          state: EditorState.create({
            doc: text,
            extensions: markdownExtension({
              label: title,
              onChange: (value) => {
                latest.current = value
                void window.neoscenar.writeProjectText(name, value).then((written) => {
                  if (!written.ok) showResearchError(written.error)
                })
              },
              onBold: (v) => applyInline(v, '**'),
              onItalic: (v) => applyInline(v, '*')
            })
          })
        })
        viewRef.current = view
        setReady(true)
      } else if (text !== latest.current) {
        // Modifié ailleurs (Obsidian…) : le texte du disque remplace celui de l'écran.
        latest.current = text
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: text },
          annotations: externalChange.of(true)
        })
      }
    }

    void load()
    const reload = (): void => void load()
    window.addEventListener('focus', reload)
    return () => {
      cancelled = true
      window.removeEventListener('focus', reload)
      view?.destroy()
      viewRef.current = null
    }
  }, [name, title])

  const run = (action: (view: EditorView) => void): void => {
    if (viewRef.current) action(viewRef.current)
  }

  return (
    <article className="sheet research-form md-document" aria-label={title}>
      <header className="research-sheet-header">
        <h2>{title}</h2>
      </header>
      <p className="field-help md-pdf-title">{t.pdfTitle(PDF_TITLES[name])}</p>
      <div className="md-toolbar" role="toolbar" aria-label={t.toolbar}>
        {([1, 2, 3] as const).map((level) => (
          <button
            key={level}
            type="button"
            className="tool-button md-tool"
            disabled={!ready}
            title={t.heading(level)}
            aria-label={t.heading(level)}
            // mouseDown : le texte garde sa sélection.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => run((view) => applyHeading(view, level))}
          >
            {`T${level}`}
          </button>
        ))}
        <button
          type="button"
          className="tool-button md-tool md-tool-bold"
          disabled={!ready}
          title={t.bold}
          aria-label={t.bold}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run((view) => applyInline(view, '**'))}
        >
          G
        </button>
        <button
          type="button"
          className="tool-button md-tool md-tool-italic"
          disabled={!ready}
          title={t.italic}
          aria-label={t.italic}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run((view) => applyInline(view, '*'))}
        >
          I
        </button>
        <button
          type="button"
          className="tool-button md-tool"
          disabled={!ready}
          title={t.rule}
          aria-label={t.rule}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run(applyRule)}
        >
          ―
        </button>
      </div>
      <div className="md-editor-host" ref={host} />
      <span className="field-help">{t.hint}</span>
    </article>
  )
}
