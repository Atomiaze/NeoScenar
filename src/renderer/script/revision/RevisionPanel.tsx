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
  revisionStore,
  saveComment,
  type CommentEdit
} from './revisionStore'
import './revision.css'

const t = fr.script.revision

/** Les boutons de la palette ne prennent pas le focus : la sélection de l'éditeur reste en place. */
const keepSelection = (event: React.MouseEvent): void => event.preventDefault()

/** Palette du mode révision, sous la barre d'outils du Scénario. */
export function RevisionPalette() {
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
