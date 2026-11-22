import { useEffect, useRef, useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { fr } from '../../i18n/fr'
import { useStore } from '../../state/createStore'
import { REVISION_COLORS } from '../../../shared/revision/revisionMarks'
import {
  applyColor,
  askClearAll,
  cancelClearAll,
  cancelComment,
  clearAll,
  closeRevisionPopups,
  editCommentAtCursor,
  goToRevision,
  revisionStore,
  saveComment,
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
  useEffect(() => watchRevisionList(), [])
  return (
    <aside className="revision-side-panel" aria-label={tp.label}>
      <div className="revision-side-title">{tp.title(items.length)}</div>
      {items.length === 0 ? (
        <p className="revision-side-empty muted">{tp.empty}</p>
      ) : (
        <ul className="revision-side-list">
          {items.map((item, position) => (
            <li key={`${item.from}-${position}`}>
              <button
                className={`revision-side-row rev-${item.color}`}
                title={item.comment || tp.rowTitle(t.colors[item.color])}
                onMouseDown={keepSelection}
                onClick={() => goToRevision(position)}
              >
                <span className="revision-side-head">
                  <span className="revision-side-dot" aria-label={t.colors[item.color]} />
                  <span
                    className="revision-side-scene"
                    title={item.scene ? undefined : tp.noSceneTitle}
                  >
                    {item.scene ?? tp.noScene}
                  </span>
                </span>
                <span className="revision-side-excerpt">{item.excerpt}</span>
                {item.comment && <span className="revision-side-comment">{item.comment}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
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
  const input = useRef<HTMLInputElement>(null)
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
        <input
          ref={input}
          value={draft}
          placeholder={t.commentPlaceholder}
          onChange={(event) => setDraft(event.target.value)}
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
