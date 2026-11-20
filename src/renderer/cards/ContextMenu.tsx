import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'
import {
  colorSelection,
  deleteSelection,
  duplicateSelection,
  insertSceneAfter,
  insertShotNextTo
} from './actions'
import { cardsStore, closeContextMenu } from './cardsStore'
import { openDrawingEditor } from '../drawing/toolsStore'
import { selectedShotsInOrder } from '../../shared/thumbnail/batch'
import { chooseThumbnail, importImagesForSelection } from './thumbnails/thumbnailActions'
import { ColorChoices } from './ColorChoices'

/** Menu du clic droit sur une carte. Il agit sur la carte visée et sur la sélection. */
export function ContextMenu() {
  const menu = useStore(cardsStore, (state) => state.contextMenu)
  // Plusieurs plans sélectionnés : « Importer des images… » (une par plan).
  const selectedShots = useStore(cardsStore, (state) =>
    state.history ? selectedShotsInOrder(state.history.present, state.selection.ids).length : 0
  )
  const element = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const [colorsOpen, setColorsOpen] = useState(false)

  // Le menu reste entièrement dans la fenêtre, même ouvert près d'un bord.
  useLayoutEffect(() => {
    if (!menu || !element.current) return
    const { width, height } = element.current.getBoundingClientRect()
    setPosition({
      left: Math.min(menu.x, window.innerWidth - width - 8),
      top: Math.min(menu.y, window.innerHeight - height - 8)
    })
    setColorsOpen(false)
  }, [menu])

  useEffect(() => {
    if (!menu) return
    const onMouseDown = (event: MouseEvent): void => {
      if (!element.current?.contains(event.target as Node)) closeContextMenu()
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        closeContextMenu()
      }
    }
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('blur', closeContextMenu)
    window.addEventListener('wheel', closeContextMenu)
    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('blur', closeContextMenu)
      window.removeEventListener('wheel', closeContextMenu)
    }
  }, [menu])

  if (!menu) return null
  const run = (action: () => void) => () => {
    closeContextMenu()
    action()
  }

  return (
    <div
      ref={element}
      className="context-menu"
      role="menu"
      style={position ?? { left: menu.x, top: menu.y, visibility: 'hidden' }}
    >
      <button role="menuitem" onClick={run(() => insertShotNextTo(menu.target, 'before'))}>
        {fr.contextMenu.insertShotBefore}
      </button>
      <button role="menuitem" onClick={run(() => insertShotNextTo(menu.target, 'after'))}>
        {fr.contextMenu.insertShotAfter}
      </button>
      <button role="menuitem" onClick={run(() => insertSceneAfter(menu.target))}>
        {fr.contextMenu.insertSceneAfter}
      </button>
      <button role="menuitem" onClick={run(duplicateSelection)}>
        {fr.contextMenu.duplicate}
      </button>
      {menu.target.kind === 'shot' && (
        <>
          <hr />
          <button role="menuitem" onClick={run(() => openDrawingEditor(menu.target.id))}>
            {fr.drawing.open}
          </button>
          {selectedShots > 1 ? (
            <button role="menuitem" onClick={run(() => void importImagesForSelection())}>
              {fr.thumbnail.importMany}
            </button>
          ) : (
            <button role="menuitem" onClick={run(() => void chooseThumbnail(menu.target.id))}>
              {fr.thumbnail.importOne}
            </button>
          )}
        </>
      )}
      <hr />
      <div
        className="context-submenu"
        onMouseEnter={() => setColorsOpen(true)}
        onMouseLeave={() => setColorsOpen(false)}
      >
        <button
          role="menuitem"
          aria-haspopup="true"
          aria-expanded={colorsOpen}
          onClick={() => setColorsOpen(!colorsOpen)}
        >
          {fr.contextMenu.color}
          <span className="submenu-arrow">▸</span>
        </button>
        {colorsOpen && (
          <ColorChoices asMenu onChoose={(color) => run(() => colorSelection(color))()} />
        )}
      </div>
      <hr />
      <button role="menuitem" className="danger-text" onClick={run(deleteSelection)}>
        {fr.contextMenu.delete}
      </button>
    </div>
  )
}
