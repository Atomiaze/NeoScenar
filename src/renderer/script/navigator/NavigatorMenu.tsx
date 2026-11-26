import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { fr } from '../../i18n/fr'
import type { NavigatorScene, NavigatorSection } from './buildNavigator'
import { ColorChoices } from '../../cards/ColorChoices'
import { chooseSectionColor, shiftSectionAt } from './sectionActions'
import { openSectionDialog, requestSectionDeletion } from './SectionDialogs'
import type { ShiftRefusal } from '../../../shared/scriptLink/sectionEdit'
import { toggleDraft } from './draftActions'
import { openDraftEditor } from '../draft/draftStore'
import { duplicateSceneByKey } from '../../cards/actions'

const t = fr.script.navigator

export type NavigatorMenuState = { x: number; y: number } & (
  { scene: NavigatorScene; section?: undefined } | { section: NavigatorSection; scene?: undefined }
)

/** Entrée du menu ; refusée = grisée, la raison en infobulle. */
function MenuItem({
  label,
  refusal = null,
  hint,
  onChoose
}: {
  label: string
  refusal?: ShiftRefusal
  hint?: string
  onChoose(): void
}) {
  return (
    <button
      role="menuitem"
      aria-disabled={refusal !== null || undefined}
      title={refusal ? t.refusal[refusal] : hint}
      onClick={() => {
        if (refusal === null) onChoose()
      }}
    >
      {label}
    </button>
  )
}

/** Menu du clic droit sur une scène (18C-13) ou une section (18C-14, 18C-15) du navigateur. */
export function NavigatorMenu({ menu, onClose }: { menu: NavigatorMenuState; onClose(): void }) {
  const element = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const [colorsOpen, setColorsOpen] = useState(false)

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

  const { scene, section } = menu
  const run = (action: () => void) => () => {
    onClose()
    action()
  }
  return (
    <div
      ref={element}
      className="context-menu"
      role="menu"
      style={position ?? { left: menu.x, top: menu.y, visibility: 'hidden' }}
    >
      <MenuItem
        label={t.insertSection}
        onChoose={run(() => openSectionDialog({ kind: 'insert', from: (scene ?? section).from }))}
      />
      {section && (
        <>
          <MenuItem
            label={t.renameSection}
            onChoose={run(() =>
              openSectionDialog({ kind: 'rename', from: section.from, title: section.title })
            )}
          />
          <MenuItem
            label={t.nestSection}
            refusal={section.nestRefusal}
            hint={t.nestHint}
            onChoose={run(() => shiftSectionAt(section.from, 1))}
          />
          <MenuItem
            label={t.unnestSection}
            refusal={section.unnestRefusal}
            hint={t.unnestHint}
            onChoose={run(() => shiftSectionAt(section.from, -1))}
          />
        </>
      )}
      {section && (
        <div
          className="context-submenu"
          onMouseEnter={() => setColorsOpen(true)}
          onMouseLeave={() => setColorsOpen(false)}
        >
          <button
            role="menuitem"
            aria-haspopup="true"
            aria-expanded={colorsOpen}
            onClick={() => setColorsOpen(true)}
          >
            {fr.contextMenu.color}
            <span className="submenu-arrow">▸</span>
          </button>
          {colorsOpen && (
            <ColorChoices
              asMenu
              current={section.chosenColor}
              defaultLabel={t.automaticColor}
              onChoose={(color) => {
                onClose()
                chooseSectionColor(section.from, color)
              }}
            />
          )}
        </div>
      )}
      {section && (
        <>
          <hr />
          <MenuItem
            label={t.deleteSection}
            onChoose={run(() => requestSectionDeletion(section.from, section.title))}
          />
        </>
      )}
      {scene?.numberKey && (
        <>
          <hr />
          <MenuItem
            label={fr.contextMenu.duplicateWithContent}
            hint={fr.contextMenu.duplicateWithContentHint}
            onChoose={run(() => duplicateSceneByKey(scene.numberKey!, true))}
          />
          <MenuItem
            label={fr.contextMenu.duplicateWithoutContent}
            hint={fr.contextMenu.duplicateWithoutContentHint}
            onChoose={run(() => duplicateSceneByKey(scene.numberKey!, false))}
          />
        </>
      )}
      {scene && <hr />}
      {scene && (
        <button
          role="menuitem"
          onClick={() => {
            onClose()
            toggleDraft(scene.from, !scene.draft)
          }}
        >
          {scene.draft ? t.unmarkDraft : t.markDraft}
        </button>
      )}
      {scene?.draft && (
        <button
          role="menuitem"
          onClick={() => {
            onClose()
            openDraftEditor(scene.from)
          }}
        >
          {t.editDraft}
        </button>
      )}
    </div>
  )
}
