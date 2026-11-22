import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { Annotation, type Extension, type Range } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  keymap,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate
} from '@codemirror/view'
import { inlineSpans, lineKind, type EditResult } from '../../shared/markdown/markdownLite'

// Habillage « aperçu en direct » léger : les titres sont plus grands, le gras et l'italique sont
// rendus, la ligne « --- » devient un trait. Les marques (#, **, *, ---) restent dans le texte,
// atténuées. Rien ne modifie le texte.

/** Marque un remplacement du texte venu du disque (modifié dans Obsidian) : il n'est pas réécrit. */
export const externalChange = Annotation.define<boolean>()

const MARK = Decoration.mark({ class: 'md-mark' })
const BOLD = Decoration.mark({ class: 'md-bold' })
const ITALIC = Decoration.mark({ class: 'md-italic' })
const HEADING_LINES = [1, 2, 3].map((level) => Decoration.line({ class: `md-h${level}` }))
const RULE_LINE = Decoration.line({ class: 'md-rule' })

function build(view: EditorView): DecorationSet {
  const ranges: Range<Decoration>[] = []
  const caretLine = view.state.doc.lineAt(view.state.selection.main.head).number
  for (const { from, to } of view.visibleRanges) {
    let position = from
    while (position <= to) {
      const line = view.state.doc.lineAt(position)
      const kind = lineKind(line.text)
      if (kind.kind === 'heading') {
        ranges.push(HEADING_LINES[kind.level - 1].range(line.from))
        ranges.push(MARK.range(line.from, line.from + kind.markerLength))
      } else if (kind.kind === 'rule') {
        // Le texte « --- » n'est montré que sur la ligne du curseur.
        ranges.push(RULE_LINE.range(line.from))
        if (line.number !== caretLine && line.length > 0) {
          ranges.push(Decoration.mark({ class: 'md-hidden' }).range(line.from, line.to))
        }
      }
      if (kind.kind !== 'rule') {
        for (const span of inlineSpans(line.text, line.from)) {
          ranges.push((span.kind === 'bold' ? BOLD : ITALIC).range(span.from, span.to))
          ranges.push(MARK.range(span.from, span.from + span.markerLength))
          ranges.push(MARK.range(span.to - span.markerLength, span.to))
        }
      }
      position = line.to + 1
    }
  }
  return Decoration.set(ranges, true)
}

const decorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = build(view)
    }
    update(update: ViewUpdate): void {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = build(update.view)
      }
    }
  },
  { decorations: (plugin) => plugin.decorations }
)

/** Applique le résultat d'une fonction pure de `markdownLite` à l'éditeur. */
export function applyEdit(view: EditorView, result: EditResult): void {
  view.dispatch({
    changes: result.changes,
    selection: { anchor: result.anchor, head: result.head },
    scrollIntoView: true
  })
  view.focus()
}

export interface MarkdownExtensionOptions {
  label: string
  onChange(text: string): void
  /** Raccourcis Cmd/Ctrl+B et Cmd/Ctrl+I. */
  onBold(view: EditorView): void
  onItalic(view: EditorView): void
}

/** Éditeur de texte Markdown des documents du projet. */
export function markdownExtension(options: MarkdownExtensionOptions): Extension {
  return [
    history(),
    keymap.of([
      {
        key: 'Mod-b',
        run: (view) => {
          options.onBold(view)
          return true
        }
      },
      {
        key: 'Mod-i',
        run: (view) => {
          options.onItalic(view)
          return true
        }
      },
      ...defaultKeymap,
      ...historyKeymap
    ]),
    EditorView.lineWrapping,
    decorations,
    EditorView.contentAttributes.of({
      'aria-label': options.label,
      spellcheck: 'true',
      lang: 'fr',
      autocorrect: 'off',
      autocapitalize: 'off'
    }),
    EditorView.updateListener.of((update) => {
      // Les remplacements venus du disque portent l'annotation « external » et ne sont pas renvoyés.
      if (update.docChanged && !update.transactions.some((tr) => tr.annotation(externalChange))) {
        options.onChange(update.state.doc.toString())
      }
    })
  ]
}
