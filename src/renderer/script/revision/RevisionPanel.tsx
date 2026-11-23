import { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { Icon } from '../../components/Icon'
import { fr } from '../../i18n/fr'
import { useStore } from '../../state/createStore'
import {
  REVISION_COLORS,
  displayedComment,
  type RevisionColor
} from '../../../shared/revision/revisionMarks'
import {
  countByColor,
  filterRevisionList,
  type RevisionListItem
} from '../../../shared/revision/revisionList'
import {
  applyColor,
  askClearAll,
  cancelClearAll,
  cancelComment,
  clearAll,
  closeRevisionPopups,
  consumePanelFocus,
  editCommentAtCursor,
  editCommentFromPanel,
  goToRevision,
  recolorFromPanel,
  removeFromPanel,
  revisionStore,
  saveComment,
  toggleFilterColor,
  toggleRevisionPanel,
  watchRevisionList,
  type CommentEdit
} from './revisionStore'
import './revision.css'

const t = fr.script.revision
const tp = t.panel

/** Les boutons de la palette ne prennent pas le focus : la sélection de l'éditeur reste en place. */
const keepSelection = (event: React.MouseEvent): void => event.preventDefault()

/** Palette du mode révision, sous la barre d'outils du Scénario. */
export function RevisionPalette() {
  const panelShown = useStore(revisionStore, (state) => state.panelShown)
  return (
    <div className="revision-palette" role="toolbar" aria-label={t.button}>
      <span className="revision-label">{t.paletteLabel}</span>
      {REVISION_COLORS.map((color) => (
        <button
          key={color}
          className={`revision-swatch rev-${color}`}
          title={t.colorTitle(t.colors[color])}
          aria-label={t.colorTitle(t.colors[color])}
          data-color={color}
          onMouseDown={keepSelection}
          onClick={() => applyColor(color)}
        />
      ))}
      <button
        className="tool-button"
        title={t.commentTitle}
        onMouseDown={keepSelection}
        onClick={editCommentAtCursor}
      >
        {t.comment}
      </button>
      <span className="revision-spacer" />
      <button className="tool-button" onMouseDown={keepSelection} onClick={askClearAll}>
        {t.clearAll}
      </button>
      <button
        className="tool-button"
        title={tp.toggleTitle}
        aria-pressed={panelShown}
        onMouseDown={keepSelection}
        onClick={toggleRevisionPanel}
      >
        {panelShown ? tp.hide : tp.show}
      </button>
    </div>
  )
}

/** Panneau des révisions, à droite du scénario : une ligne par marque, dans l'ordre du texte. */
export function RevisionSidePanel() {
  const items = useStore(revisionStore, (state) => state.items)
  const hidden = useStore(revisionStore, (state) => state.hiddenColors)
  const panelFocus = useStore(revisionStore, (state) => state.panelFocus)
  const shown = useMemo(() => filterRevisionList(items, hidden), [items, hidden])
  const counts = useMemo(() => countByColor(items), [items])
  // Menu des couleurs ouvert sur une ligne ; il se ferme tout seul si la liste change (frappe, Cmd + Z).
  const [colorMenu, setColorMenu] = useState<{ position: number; list: RevisionListItem[] } | null>(
    null
  )
  const openMenu = colorMenu?.list === shown ? colorMenu.position : null
  const aside = useRef<HTMLElement>(null)
  const list = useRef<HTMLUListElement>(null)
  useEffect(() => watchRevisionList(), [])

  // Après une action du panneau, le focus revient au bon bouton de la bonne ligne.
  useEffect(() => {
    if (!panelFocus) return
    consumePanelFocus()
    let index =
      panelFocus.start === undefined
        ? -1
        : shown.findIndex((item) => item.start === panelFocus.start)
    let part = panelFocus.part
    if (index < 0 && panelFocus.index !== undefined && shown.length > 0) {
      index = Math.min(panelFocus.index, shown.length - 1)
      part = 'row'
    }
    const row = index < 0 ? null : list.current?.children[index]
    const target = row?.querySelector<HTMLElement>(`[data-part="${part}"]`) ?? aside.current
    target?.focus()
  }, [panelFocus, shown])

  const filtered = shown.length !== items.length
  return (
    <aside className="revision-side-panel" aria-label={tp.label} ref={aside} tabIndex={-1}>
      <div className="revision-side-title">
        {filtered ? tp.titleFiltered(shown.length, items.length) : tp.title(items.length)}
      </div>
      <div className="revision-side-filter" role="group" aria-label={tp.filterLabel}>
        {REVISION_COLORS.map((color) => {
          const count = counts[color]
          const on = !hidden.includes(color)
          const name = t.colors[color]
          return (
            <button
              key={color}
              className={`revision-filter rev-${color}${on && count > 0 ? ' on' : ''}`}
              data-color={color}
              aria-pressed={on}
              disabled={count === 0}
              title={count === 0 ? tp.filterEmptyTitle(name) : tp.filterTitle(name, on)}
              onMouseDown={keepSelection}
              onClick={(event) => toggleFilterColor(color, event.altKey)}
            >
              <span className="revision-filter-dot" aria-hidden="true" />
              <span className="revision-filter-count">{count}</span>
              <span className="visually-hidden">{name}</span>
            </button>
          )
        })}
      </div>
      {items.length === 0 || shown.length === 0 ? (
        <p className="revision-side-empty muted">
          {items.length === 0 ? tp.empty : tp.emptyFiltered}
        </p>
      ) : (
        <ul className="revision-side-list" ref={list}>
          {shown.map((item, position) => (
            <RevisionRow
              key={`${item.start}-${position}`}
              item={item}
              position={position}
              menuOpen={openMenu === position}
              onMenu={(open) => setColorMenu(open ? { position, list: shown } : null)}
            />
          ))}
        </ul>
      )}
    </aside>
  )
}

function RevisionRow({
  item,
  position,
  menuOpen,
  onMenu
}: {
  item: RevisionListItem
  position: number
  menuOpen: boolean
  onMenu: (open: boolean) => void
}) {
  const comment = displayedComment(item.comment)
  const name = t.colors[item.color]
  return (
    <li className={`revision-side-item rev-${item.color}`}>
      <button
        className="revision-side-dot-button"
        data-part="color"
        title={tp.changeColor(name)}
        aria-label={tp.changeColor(name)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onMouseDown={keepSelection}
        onClick={() => onMenu(!menuOpen)}
      >
        <span className="revision-side-dot" />
      </button>
      <button
        className="revision-side-row"
        data-part="row"
        title={comment || tp.rowTitle(name)}
        onMouseDown={keepSelection}
        onClick={() => goToRevision(position)}
      >
        <span className="revision-side-scene" title={item.scene ? undefined : tp.noSceneTitle}>
          {item.scene ?? tp.noScene}
        </span>
        <span className="revision-side-excerpt">{item.excerpt}</span>
        {comment && <span className="revision-side-comment">{comment}</span>}
      </button>
      <span className="revision-side-actions">
        <button
          className="revision-side-action"
          data-part="edit"
          title={item.comment ? tp.editComment : tp.addComment}
          aria-label={item.comment ? tp.editComment : tp.addComment}
          onMouseDown={keepSelection}
          onClick={() => editCommentFromPanel(position)}
        >
          <Icon name="pencil" size={15} />
        </button>
        <button
          className="revision-side-action"
          data-part="trash"
          title={tp.remove}
          aria-label={tp.remove}
          onMouseDown={keepSelection}
          onClick={() => removeFromPanel(position)}
        >
          <Icon name="trash" size={15} />
        </button>
      </span>
      {menuOpen && (
        <ColorMenu
          current={item.color}
          onChoose={(color) => {
            onMenu(false)
            recolorFromPanel(position, color)
          }}
          onClose={() => onMenu(false)}
        />
      )}
    </li>
  )
}

/** Petit menu des 4 couleurs sous la pastille d'une ligne (couleur actuelle cochée). */
function ColorMenu({
  current,
  onChoose,
  onClose
}: {
  current: RevisionColor
  onChoose: (color: RevisionColor) => void
  onClose: () => void
}) {
  const menu = useRef<HTMLDivElement>(null)
  // À l'ouverture seulement : le focus va sur la couleur actuelle (clavier).
  useEffect(() => menu.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus(), [])
  useEffect(() => {
    const onMouseDown = (event: MouseEvent): void => {
      const target = event.target as Element
      if (!menu.current?.contains(target) && !target.closest?.('.revision-side-dot-button'))
        onClose()
    }
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('blur', onClose)
    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('blur', onClose)
    }
  }, [onClose])
  return (
    <div
      ref={menu}
      className="revision-color-menu"
      role="menu"
      aria-label={tp.colorMenu}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        event.preventDefault()
        event.stopPropagation()
        const dot = menu.current?.parentElement?.querySelector<HTMLElement>('[data-part="color"]')
        onClose()
        dot?.focus()
      }}
    >
      {REVISION_COLORS.map((color) => (
        <button
          key={color}
          role="menuitemradio"
          aria-checked={color === current}
          className={`revision-color-choice rev-${color}`}
          data-color={color}
          onMouseDown={keepSelection}
          onClick={() => onChoose(color)}
        >
          <span className="revision-side-dot" aria-hidden="true" />
          {t.colors[color]}
          {color === current && <Icon name="check" size={14} />}
        </button>
      ))}
    </div>
  )
}

/** Bulle de saisie du commentaire et confirmation de « Effacer toutes les marques ». */
export function RevisionPopups() {
  const comment = useStore(revisionStore, (state) => state.comment)
  const confirmClear = useStore(revisionStore, (state) => state.confirmClear)
  useEffect(() => closeRevisionPopups, [])
  return (
    <>
      {comment && <CommentBubble key={comment.start} edit={comment} />}
      {confirmClear !== null && (
        <Dialog
          title={t.confirmTitle}
          onClose={cancelClearAll}
          role="alertdialog"
          actions={
            <>
              <button onClick={cancelClearAll}>{t.cancel}</button>
              <button className="primary" onClick={clearAll}>
                {t.confirmButton}
              </button>
            </>
          }
        >
          <p>{t.confirmMessage(confirmClear)}</p>
        </Dialog>
      )}
    </>
  )
}

function CommentBubble({ edit }: { edit: CommentEdit }) {
  const [draft, setDraft] = useState(edit.initial)
  const input = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    input.current?.focus()
    input.current?.select()
  }, [])
  // La bulle reste dans la fenêtre, même pour une marque près du bord droit.
  const left = Math.max(8, Math.min(edit.left, window.innerWidth - 340))
  return (
    <form
      className="revision-bubble"
      style={{ left, top: edit.top }}
      role="dialog"
      aria-label={t.commentLabel}
      onSubmit={(event) => {
        event.preventDefault()
        saveComment(draft)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          cancelComment()
        }
      }}
    >
      <label>
        <span>{t.commentLabel}</span>
        <textarea
          ref={input}
          rows={3}
          value={draft}
          placeholder={t.commentPlaceholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Entrée valide, Maj + Entrée va à la ligne (comportement normal de la zone de texte).
            if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
            event.preventDefault()
            saveComment(draft)
          }}
        />
      </label>
      <p className="muted">{t.commentHint}</p>
      <div className="revision-bubble-actions">
        <button type="button" onClick={cancelComment}>
          {t.cancel}
        </button>
        <button type="submit" className="primary">
          {t.save}
        </button>
      </div>
    </form>
  )
}
