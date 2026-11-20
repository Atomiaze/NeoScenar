// Contrôle (mode développement) : l'écran coupe-t-il les lignes aux mêmes endroits que la pagination ?
// Pour chaque ligne source visible, on compare le nombre de lignes affichées par le navigateur au nombre
// calculé par wrapLine. Les lignes qui contiennent une note (affichée mais non imprimée) et la ligne du
// curseur (marqueurs visibles) sont laissées de côté.

import type { EditorView } from '@codemirror/view'
import { flushPageLayout, pageLayoutField } from './pageLayout'

export interface WrapDifference {
  line: number
  text: string
  screen: number
  printed: number
}

/**
 * Nombre de lignes d'affichage d'une ligne source, d'après la position de chacun de ses caractères
 * (les éléments ajoutés à l'affichage, comme le numéro de scène dans la marge, ne comptent pas).
 */
function screenLineCount(view: EditorView, from: number): number {
  const { node } = view.domAtPos(from)
  const element = (node instanceof HTMLElement ? node : node.parentElement)?.closest('.cm-line')
  if (!element) return 0
  const tops: number[] = []
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  for (let text = walker.nextNode() as Text | null; text; text = walker.nextNode() as Text | null) {
    if (text.parentElement?.closest('[contenteditable="false"]')) continue
    for (let i = 0; i < text.length; i++) {
      const range = document.createRange()
      range.setStart(text, i)
      range.setEnd(text, i + 1)
      const rect = range.getBoundingClientRect()
      if (rect.width === 0) continue
      if (!tops.some((top) => Math.abs(top - rect.top) < 4)) tops.push(rect.top)
    }
  }
  return Math.max(1, tops.length)
}

export function checkWrapping(view: EditorView): {
  checked: number
  differences: WrapDifference[]
} {
  flushPageLayout(view)
  const layout = view.state.field(pageLayoutField)
  if (!layout) return { checked: 0, differences: [] }
  const printed = new Map<number, number>()
  for (const element of layout.pagination.layouts) {
    for (const line of element.lines) {
      if (line.sourceLine !== undefined)
        printed.set(line.sourceLine, (printed.get(line.sourceLine) ?? 0) + 1)
    }
  }
  const cursorLine = view.state.doc.lineAt(view.state.selection.main.head).number
  const differences: WrapDifference[] = []
  let checked = 0
  for (const { from, to } of view.visibleRanges) {
    for (let n = view.state.doc.lineAt(from).number; n <= view.state.doc.lineAt(to).number; n++) {
      const line = view.state.doc.line(n)
      const expected = printed.get(n)
      if (expected === undefined || n === cursorLine || line.text.includes('[[')) continue
      checked++
      const screen = screenLineCount(view, line.from)
      if (screen !== expected)
        differences.push({ line: n, text: line.text, screen, printed: expected })
    }
  }
  return { checked, differences }
}
