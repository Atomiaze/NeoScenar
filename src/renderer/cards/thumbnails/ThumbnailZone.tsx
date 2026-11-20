import { formatShotNumber } from '../../../shared/numbering'
import type { Shot } from '../../../shared/projectTypes'
import { projectImageUrl } from '../../../shared/thumbnail/files'
import { fr } from '../../i18n/fr'
import { useStore } from '../../state/createStore'
import { cardsStore, openDialog } from '../cardsStore'
import { openDrawingEditor } from '../../drawing/toolsStore'
import { ThumbnailBadgeLabel } from '../Cards'
import { thumbnailBadge } from '../../../shared/thumbnail/status'
import { sizesStore } from './sizesStore'
import { importDroppedFile, isFileDrag } from './fileDrop'
import { useState } from 'react'
import { chooseThumbnail, recropThumbnail, removeThumbnail } from './thumbnailActions'

/** Zone vignette en haut de la fiche plan, aux proportions du projet. */
export function ThumbnailZone({ shot }: { shot: Shot }) {
  const { width, height } = useStore(cardsStore, (state) => state.settings.resolution)
  const busy = useStore(cardsStore, (state) => state.busyShotId === shot.id)
  const t = fr.thumbnail
  const sizes = useStore(sizesStore, (state) => state.sizes)
  const badge = thumbnailBadge(shot, sizes, { width, height })
  const title = t.alt(formatShotNumber(shot.number, shot.letter))
  const [dropping, setDropping] = useState(false)

  return (
    <div className="field thumbnail-field">
      <span className="field-label">{t.label}</span>
      <div
        className={`thumbnail-frame${dropping ? ' file-drop-target' : ''}`}
        style={{ aspectRatio: `${width} / ${height}` }}
        onDragOver={(event) => {
          if (!isFileDrag(event)) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
          setDropping(true)
        }}
        onDragLeave={() => setDropping(false)}
        onDrop={(event) => {
          if (!isFileDrag(event)) return
          event.preventDefault()
          setDropping(false)
          void importDroppedFile(shot.id, event)
        }}
      >
        {busy ? (
          <span className="muted">{t.working}</span>
        ) : shot.thumbnail ? (
          <button
            type="button"
            className="thumbnail-open"
            title={t.enlarge}
            onClick={() => openDialog({ kind: 'image', title, path: shot.thumbnail as string })}
          >
            <img src={projectImageUrl(shot.thumbnail)} alt={title} draggable={false} />
          </button>
        ) : (
          <div className="thumbnail-empty">
            <button type="button" onClick={() => void chooseThumbnail(shot.id)}>
              {t.import}
            </button>
            <span className="muted">{t.dropHint}</span>
          </div>
        )}
        {badge && !busy && <ThumbnailBadgeLabel badge={badge} />}
      </div>
      <div className="thumbnail-actions">
        {shot.thumbnail ? (
          <>
            <button type="button" disabled={busy} onClick={() => void chooseThumbnail(shot.id)}>
              {t.replace}
            </button>
            {shot.thumbnailSource && (
              <button type="button" disabled={busy} onClick={() => void recropThumbnail(shot.id)}>
                {t.recrop}
              </button>
            )}
            <button type="button" disabled={busy} onClick={() => removeThumbnail(shot.id)}>
              {t.remove}
            </button>
            <button type="button" disabled={busy} onClick={() => openDrawingEditor(shot.id)}>
              {t.draw}
            </button>
          </>
        ) : (
          <button type="button" disabled={busy} onClick={() => openDrawingEditor(shot.id)}>
            {t.draw}
          </button>
        )}
      </div>
    </div>
  )
}
