import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent
} from '@dnd-kit/core'
import { formatDuration } from '../../../shared/decoupage'
import { cardsStore } from '../../cards/cardsStore'
import { cutSeconds } from './cutDuration'
import { cardTextColor } from '../../../shared/palette'
import { Icon } from '../../components/Icon'
import { fr } from '../../i18n/fr'
import { useStore } from '../../state/createStore'
import { currentItem, flattenNavigator, type NavigatorItem } from './buildNavigator'
import {
  beginSynopsis,
  endSynopsis,
  goToItemAt,
  navigatorStore,
  toggleCollapsed,
  updateSynopsis
} from './navigatorStore'
import { moveNavigatorScene } from './moveScene'
import { NavigatorMenu, type NavigatorMenuState } from './NavigatorMenu'
import { dropTarget, highlightedPosition, visibleRows, type NavigatorRow } from './rows'
import './navigator.css'

const t = fr.script.navigator

/** Navigateur de scènes, à gauche de l'éditeur : actes, scènes, durées, description. */
export function SceneNavigator() {
  const tree = useStore(navigatorStore, (state) => state.tree)
  const cursorLine = useStore(navigatorStore, (state) => state.cursorLine)
  const collapsed = useStore(navigatorStore, (state) => state.collapsed)

  const items = useMemo(() => tree?.items ?? [], [tree])
  const flat = useMemo(() => flattenNavigator(items), [items])
  const rows = useMemo(() => visibleRows(items, collapsed), [items, collapsed])
  const current = currentItem(items, cursorLine)
  const currentPosition = current ? flat.indexOf(current) : null
  const highlighted = highlightedPosition(items, collapsed, currentPosition)

  return (
    <aside className="scene-navigator" aria-label={t.label}>
      <p className="navigator-summary">
        {tree ? t.summary(tree.sceneCount, formatDuration(tree.totalSeconds)) : '…'}
      </p>
      {tree && tree.sceneCount === 0 && items.length === 0 ? (
        <p className="navigator-empty muted">{t.empty}</p>
      ) : (
        <NavigatorList rows={rows} highlighted={highlighted} />
      )}
      <Description item={current} />
    </aside>
  )
}

/** Glissement en cours : rang de la ligne déplacée, espace visé et hauteur du repère d'insertion. */
interface Drag {
  moved: number
  gap: number | null
  markerTop: number
}

/** Fin du dernier glissement : le clic qui le termine ne doit pas déplacer le curseur. */
let lastDragEnd = 0
const CLICK_AFTER_DRAG_MS = 300

function NavigatorList({
  rows,
  highlighted
}: {
  rows: NavigatorRow[]
  highlighted: number | null
}) {
  const [focused, setFocused] = useState<number | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [menu, setMenu] = useState<NavigatorMenuState | null>(null)
  const closeMenu = useCallback(() => setMenu(null), [])
  const dragRef = useRef<Drag | null>(null)
  const list = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // La ligne mise en évidence reste visible, sans faire défiler si elle l'est déjà.
  useEffect(() => {
    if (highlighted === null) return
    list.current
      ?.querySelector(`[data-position="${highlighted}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [highlighted])

  const moveTo = (moved: number, gap: number | null): void => {
    const row = rows[moved]
    if (gap === null || !row || row.item.kind !== 'scene') return
    const target = dropTarget(rows, moved, gap)
    if (target === undefined) return
    moveNavigatorScene(row.item.from, target)
  }

  const focusedRow = rows.findIndex((row) => row.position === focused)
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (rows.length === 0) return
    const index =
      focusedRow >= 0
        ? focusedRow
        : Math.max(
            0,
            rows.findIndex((row) => row.position === highlighted)
          )
    const row = rows[index]
    const move = (to: number): void => {
      const next = rows[Math.max(0, Math.min(rows.length - 1, to))]
      setFocused(next.position)
      list.current
        ?.querySelector(`[data-position="${next.position}"]`)
        ?.scrollIntoView({ block: 'nearest' })
    }
    switch (event.key) {
      case 'ArrowDown':
        move(focusedRow >= 0 ? index + 1 : index)
        break
      case 'ArrowUp':
        move(focusedRow >= 0 ? index - 1 : index)
        break
      case 'Enter':
        goToItemAt(row.position)
        break
      case 'ArrowLeft':
      case 'ArrowRight':
        if (row.key !== '') toggleCollapsed(row.key, event.key === 'ArrowLeft')
        break
      default:
        return
    }
    event.preventDefault()
  }

  /** Espace entre deux lignes le plus proche du pointeur, et la hauteur du repère. */
  const gapAt = (y: number): { gap: number; markerTop: number } | null => {
    const elements = Array.from(
      list.current?.querySelectorAll<HTMLElement>('.navigator-row[data-position]') ?? []
    )
    if (elements.length === 0) return null
    const index = elements.findIndex((element) => {
      const box = element.getBoundingClientRect()
      return y < box.top + box.height / 2
    })
    if (index >= 0) return { gap: index, markerTop: elements[index].offsetTop }
    const last = elements[elements.length - 1]
    return { gap: elements.length, markerTop: last.offsetTop + last.offsetHeight }
  }

  // Les événements de la souris peuvent arriver plus vite que l'affichage : l'état du glissement
  // est lu dans une référence, toujours à jour, et la place finale est recalculée au relâchement.
  const update = (next: Drag | null): void => {
    dragRef.current = next
    setDrag(next)
  }
  const placeAt = (current: Drag, deltaY: number): Drag => {
    const found = gapAt(startY.current + deltaY)
    const gap = found && dropTarget(rows, current.moved, found.gap) !== undefined ? found.gap : null
    return { ...current, gap, markerTop: found?.markerTop ?? 0 }
  }
  const onDragStart = (event: DragStartEvent): void => {
    const moved = rows.findIndex((row) => row.position === event.active.data.current?.position)
    if (moved < 0) return
    startY.current = (event.activatorEvent as PointerEvent).clientY
    update({ moved, gap: null, markerTop: 0 })
  }
  const onDragMove = (event: DragMoveEvent): void => {
    const current = dragRef.current
    if (!current) return
    const next = placeAt(current, event.delta.y)
    if (next.gap !== current.gap || next.markerTop !== current.markerTop) update(next)
  }
  const onDragEnd = (event: DragEndEvent): void => {
    lastDragEnd = Date.now()
    const current = dragRef.current
    update(null)
    if (current) moveTo(current.moved, placeAt(current, event.delta.y).gap)
  }
  const onDragCancel = (): void => {
    lastDragEnd = Date.now()
    update(null)
  }
  const dragged = drag ? rows[drag.moved]?.item : undefined

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div
        className={`navigator-list${drag ? ' dragging' : ''}`}
        ref={list}
        role="tree"
        aria-label={t.label}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onBlur={() => setFocused(null)}
      >
        {rows.map((row) => (
          <Row
            key={`${row.position}-${row.key}`}
            row={row}
            highlighted={row.position === highlighted}
            focused={row.position === focused}
            onMenu={setMenu}
          />
        ))}
        {drag && drag.gap !== null && (
          <div className="navigator-drop-marker" style={{ top: drag.markerTop }} aria-hidden />
        )}
      </div>
      <DragOverlay dropAnimation={null}>
        {dragged && dragged.kind === 'scene' ? (
          <div className="navigator-drag-overlay">
            <span className="navigator-number">{dragged.number}</span>
            <span className="navigator-heading">{dragged.heading}</span>
          </div>
        ) : null}
      </DragOverlay>
      {menu && <NavigatorMenu menu={menu} onClose={closeMenu} />}
    </DndContext>
  )
}

interface RowProps {
  row: NavigatorRow
  highlighted: boolean
  focused: boolean
  onMenu(menu: NavigatorMenuState): void
}

function Row(props: RowProps) {
  return props.row.item.kind === 'section' ? <SectionRow {...props} /> : <SceneRow {...props} />
}

function rowClass({ highlighted, focused }: RowProps): string {
  return `navigator-row${highlighted ? ' current' : ''}${focused ? ' focused' : ''}`
}

function goFrom(row: NavigatorRow): () => void {
  return () => {
    if (Date.now() - lastDragEnd < CLICK_AFTER_DRAG_MS) return
    // Une scène brouillon n'est pas dans l'éditeur : le curseur n'y va pas.
    if (row.item.kind === 'scene' && row.item.draft) return
    goToItemAt(row.position)
  }
}

function SectionRow(props: RowProps) {
  const { row } = props
  const item = row.item
  if (item.kind !== 'section') return null
  return (
    <div
      className={`${rowClass(props)} section`}
      style={{ '--depth': row.depth } as React.CSSProperties}
      data-position={row.position}
      role="treeitem"
      aria-expanded={!row.collapsed}
      onClick={goFrom(row)}
    >
      <button
        className="navigator-toggle"
        title={row.collapsed ? t.expand : t.collapse}
        aria-label={row.collapsed ? t.expand : t.collapse}
        tabIndex={-1}
        onClick={(event) => {
          // Replier ou déplier ne déplace pas le curseur.
          event.stopPropagation()
          toggleCollapsed(row.key)
        }}
      >
        <Icon name={row.collapsed ? 'chevronRight' : 'chevronDown'} size={14} />
      </button>
      <span
        className="navigator-band"
        style={{ background: item.color, color: cardTextColor(item.color) }}
        title={item.title}
      >
        {item.hasNote && <NoteMark />}
        <span className="navigator-title">{item.title}</span>
        <RevisionCount count={item.revisionCount} />
      </span>
      <span className="navigator-duration">{formatDuration(item.seconds)}</span>
    </div>
  )
}

function SceneRow(props: RowProps) {
  const { row } = props
  const item = row.item
  const scene = item.kind === 'scene' ? item : null
  // Une scène sans numéro (en cours de frappe) n'a pas encore de carte : elle ne se déplace pas.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `navigator-${row.position}`,
    data: { position: row.position },
    disabled: !scene?.numberKey
  })
  if (!scene) return null
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      tabIndex={undefined}
      role="treeitem"
      className={`${rowClass(props)} scene${isDragging ? ' drag-source' : ''}${scene.draft ? ' draft' : ''}`}
      style={{ '--depth': row.depth } as React.CSSProperties}
      data-position={row.position}
      title={[scene.heading, scene.firstLine, scene.draft ? t.draftHint : '', t.dragHint]
        .filter((part) => part !== '')
        .join('\n')}
      onClick={goFrom(row)}
      onContextMenu={(event) => {
        event.preventDefault()
        props.onMenu({ x: event.clientX, y: event.clientY, scene })
      }}
    >
      <span
        className={`navigator-icon${scene.hasNote ? ' has-note' : ''}`}
        title={scene.hasNote ? t.hasNote : undefined}
      >
        <Icon name="script" size={15} />
      </span>
      <span className="navigator-number">{scene.number}</span>
      <span className="navigator-heading-cell">
        <span className="navigator-heading">{scene.heading}</span>
        {scene.draft && <span className="navigator-draft-tag">{t.draft}</span>}
        <RevisionCount count={scene.revisionCount} />
      </span>
      {scene.draft ? (
        <span className="navigator-duration" />
      ) : (
        <SceneDuration seconds={scene.seconds} numberKey={scene.numberKey} />
      )}
      <span className="navigator-first-line">{scene.firstLine}</span>
    </div>
  )
}

/** Durée estimée, et à côté la durée du découpage quand des plans de la scène en ont une. */
function SceneDuration({ seconds, numberKey }: { seconds: number; numberKey: string | null }) {
  const cut = useStore(cardsStore, (state) => cutSeconds(state.history?.present ?? null, numberKey))
  if (cut === null) return <span className="navigator-duration">{formatDuration(seconds)}</span>
  return (
    <span className="navigator-duration" title={fr.scriptLink.durationsHint}>
      {fr.scriptLink.durations(formatDuration(seconds), formatDuration(cut))}
    </span>
  )
}

/** Nombre de marques de révision : petite pastille jaune, à part de l'icône des notes (étape 13E). */
function RevisionCount({ count }: { count: number }) {
  if (count === 0) return null
  const label = fr.script.revision.navigatorCount(count)
  return (
    <span className="navigator-revision-count" title={label} aria-label={label}>
      {count}
    </span>
  )
}

function NoteMark() {
  return <span className="navigator-note-mark" title={t.hasNote} aria-label={t.hasNote} />
}

/** Description (synopsis) de la scène ou de l'acte courant, modifiable ici. */
function Description({ item }: { item: NavigatorItem | null }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const shown = item ? item.synopsis.join('\n') : ''

  // Si le champ est quitté pendant que le module se ferme, la séance est terminée proprement.
  useEffect(() => endSynopsis, [])

  return (
    <label className="navigator-description">
      <span>{t.description}</span>
      <textarea
        value={editing ? draft : shown}
        disabled={!item}
        placeholder={item ? '' : t.descriptionDisabled}
        rows={4}
        spellCheck
        lang="fr"
        onFocus={() => {
          if (!item) return
          setDraft(shown)
          setEditing(true)
          beginSynopsis(item)
        }}
        onChange={(event) => {
          setDraft(event.target.value)
          updateSynopsis(event.target.value)
        }}
        onBlur={() => {
          setEditing(false)
          endSynopsis()
        }}
      />
    </label>
  )
}
