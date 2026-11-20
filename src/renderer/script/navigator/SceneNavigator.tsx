import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
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
import { highlightedPosition, visibleRows, type NavigatorRow } from './rows'
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

function NavigatorList({
  rows,
  highlighted
}: {
  rows: NavigatorRow[]
  highlighted: number | null
}) {
  const [focused, setFocused] = useState<number | null>(null)
  const list = useRef<HTMLDivElement>(null)

  // La ligne mise en évidence reste visible, sans faire défiler si elle l'est déjà.
  useEffect(() => {
    if (highlighted === null) return
    list.current
      ?.querySelector(`[data-position="${highlighted}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [highlighted])

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

  return (
    <div
      className="navigator-list"
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
        />
      ))}
    </div>
  )
}

function Row({
  row,
  highlighted,
  focused
}: {
  row: NavigatorRow
  highlighted: boolean
  focused: boolean
}) {
  const { item } = row
  const className = `navigator-row${highlighted ? ' current' : ''}${focused ? ' focused' : ''}`
  const style = { '--depth': row.depth } as React.CSSProperties
  const go = (): void => goToItemAt(row.position)

  if (item.kind === 'section') {
    return (
      <div
        className={`${className} section`}
        style={style}
        data-position={row.position}
        role="treeitem"
        aria-expanded={!row.collapsed}
        onClick={go}
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

  return (
    <div
      className={`${className} scene`}
      style={style}
      data-position={row.position}
      role="treeitem"
      title={item.firstLine ? `${item.heading}\n${item.firstLine}` : item.heading}
      onClick={go}
    >
      <span
        className={`navigator-icon${item.hasNote ? ' has-note' : ''}`}
        title={item.hasNote ? t.hasNote : undefined}
      >
        <Icon name="script" size={15} />
      </span>
      <span className="navigator-number">{item.number}</span>
      <span className="navigator-heading-cell">
        <span className="navigator-heading">{item.heading}</span>
        <RevisionCount count={item.revisionCount} />
      </span>
      <SceneDuration seconds={item.seconds} numberKey={item.numberKey} />
      <span className="navigator-first-line">{item.firstLine}</span>
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
