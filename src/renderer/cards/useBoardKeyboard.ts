import { useEffect } from 'react'
import { deleteSelection } from './actions'
import { cardsStore, requestNameFocus, setSelection } from './cardsStore'
import { EMPTY_SELECTION, moveWithArrow, type Direction } from './selection'
import { isTypingTarget } from './typingTarget'
import { isDragging } from './dragStore'

const ARROWS: Record<string, Direction> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down'
}

/** Raccourcis clavier du tableau (flèches, Échap, Entrée, Suppr), actifs hors des champs de saisie. */
export function useBoardKeyboard(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return
      const { history, selection, dialog, contextMenu, drawing } = cardsStore.get()
      // Pendant un glissement, Échap annule le glissement (géré par dnd-kit), pas la sélection.
      if (!history || dialog || contextMenu || drawing || isDragging()) return
      const direction = ARROWS[event.key]
      if (direction) {
        event.preventDefault()
        setSelection(moveWithArrow(history.present, selection, direction))
      } else if (event.key === 'Escape') {
        setSelection(EMPTY_SELECTION)
      } else if (event.key === 'Enter' && selection.ids.length === 1) {
        event.preventDefault()
        requestNameFocus()
      } else if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault()
        deleteSelection()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
