// Fenêtre d'un brouillon ouverte depuis la recherche (⌘ + F) : le texte cherché y est surligné, comme
// dans l'éditeur principal, et la première occurrence est sélectionnée. Le panneau de recherche n'y
// est pas ouvert (Échap y fermerait toute la fenêtre).

import type { SearchQuery } from '@codemirror/search'
import { EditorSelection, StateField, type EditorState, type Extension } from '@codemirror/state'
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view'

const match = Decoration.mark({ class: 'cm-searchMatch' })

/** Occurrences de la recherche dans le texte, dans l'ordre. */
export function matchesOf(state: EditorState, query: SearchQuery): { from: number; to: number }[] {
  const result: { from: number; to: number }[] = []
  const cursor = query.getCursor(state)
  for (let next = cursor.next(); !next.done; next = cursor.next()) {
    if (next.value.to > next.value.from) result.push({ from: next.value.from, to: next.value.to })
  }
  return result
}

/** Surlignage des occurrences ; il suit les modifications du texte. */
export function searchMatches(query: SearchQuery): Extension {
  const field = StateField.define<DecorationSet>({
    create: (state) =>
      Decoration.set(matchesOf(state, query).map((m) => match.range(m.from, m.to))),
    update: (value, tr) => value.map(tr.changes),
    provide: (f) => EditorView.decorations.from(f)
  })
  return field
}

/** Sélectionne la première occurrence et l'amène à l'écran. */
export function selectFirstMatch(view: EditorView, query: SearchQuery): boolean {
  const first = matchesOf(view.state, query)[0]
  if (!first) return false
  view.dispatch({
    selection: EditorSelection.single(first.from, first.to),
    scrollIntoView: true
  })
  return true
}
