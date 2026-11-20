import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { sheetNameAtLine } from '../../../shared/research/scriptSheets'
import type { SheetKind } from '../../../shared/research/types'
import { analysisField } from './analysis'

export interface SheetTarget {
  kind: SheetKind
  name: string
}

/**
 * Cmd + clic (Ctrl + clic sous Windows et Linux) sur un nom de personnage ou sur le lieu d'un
 * en-tête de scène : ouvre sa fiche dans le module Recherches (étape 10C).
 */
export function sheetClick(onOpen: ((target: SheetTarget) => void) | undefined): Extension {
  if (!onOpen) return []
  return EditorView.domEventHandlers({
    mousedown(event, view) {
      if (event.button !== 0 || !(event.metaKey || event.ctrlKey)) return false
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (pos === null) return false
      const line = view.state.doc.lineAt(pos).number
      const target = sheetNameAtLine(view.state.field(analysisField).doc, line)
      if (!target) return false
      event.preventDefault()
      onOpen(target)
      return true
    }
  })
}
