import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { fr } from '../../i18n/fr'
import type { NavigatorScene } from './buildNavigator'
import { toggleDraft } from './draftActions'

const t = fr.script.navigator

export interface NavigatorMenuState {
  x: number
  y: number
  scene: NavigatorScene
}

/** Menu du clic droit sur une scène du navigateur (18C-13). */
export function NavigatorMenu({ menu, onClose }: { menu: NavigatorMenuState; onClose(): void }) {
  const element = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)

  // Le menu reste entièrement dans la fenêtre, même ouvert près d'un bord.
  useLayoutEffect(() => {
    if (!element.current) return
    const { width, height } = element.current.getBoundingClientRect()
    setPosition({
      left: Math.min(menu.x, window.innerWidth - width - 8),
      top: Math.min(menu.y, window.innerHeight - height - 8)
    })
    element.current.querySelector<HTMLButtonElement>('button')?.focus()
  }, [menu])

  useEffect(() => {
    const onMouseDown = (event: MouseEvent): void => {
      if (!element.current?.contains(event.target as Node)) onClose()
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('blur', onClose)
    window.addEventListener('wheel', onClose)
    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('blur', onClose)
      window.removeEventListener('wheel', onClose)
    }
  }, [onClose])

  const { scene } = menu
  return (
    <div
      ref={element}
      className="context-menu"
      role="menu"
      style={position ?? { left: menu.x, top: menu.y, visibility: 'hidden' }}
    >
      <button
        role="menuitem"
        onClick={() => {
          onClose()
          toggleDraft(scene.from, !scene.draft)
        }}
      >
        {scene.draft ? t.unmarkDraft : t.markDraft}
      </button>
    </div>
  )
}
