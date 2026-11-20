import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { Size } from '../../../shared/imageFormat'
import type { ThumbnailCrop } from '../../../shared/projectTypes'
import {
  initialFrame,
  moveFrame,
  resizeFrame,
  rotate,
  rotatedSize,
  type Corner
} from '../../../shared/thumbnail/geometry'
import { Dialog } from '../../components/Dialog'
import { fr } from '../../i18n/fr'
import { useStore } from '../../state/createStore'
import { cardsStore, type CropRequest } from '../cardsStore'
import { bitmapSize, drawRotated, drawThumbnail } from './drawing'
import { cancelCrop, validateCrop } from './thumbnailActions'

/** Place disponible pour l'image dans la fenêtre. */
const STAGE = { width: 760, height: 470 }
const CORNERS: Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']

function fitInside(size: Size, box: Size): Size {
  const scale = Math.min(box.width / size.width, box.height / size.height)
  return { width: Math.round(size.width * scale), height: Math.round(size.height * scale) }
}

type Drag =
  | { kind: 'move'; startX: number; startY: number; frame: ThumbnailCrop['frame'] }
  | { kind: 'resize'; corner: Corner; frame: ThumbnailCrop['frame'] }

/**
 * Fenêtre de recadrage : l'image entière, un cadre aux proportions du projet (extérieur assombri),
 * rotation par quarts de tour, et « Ajuster sans recadrer » avec des bandes.
 */
export function CropDialog({ request }: { request: CropRequest }) {
  const target = useStore(cardsStore, (state) => state.settings.resolution)
  const [crop, setCrop] = useState(request.crop)
  const canvas = useRef<HTMLCanvasElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)

  const turned = rotatedSize(bitmapSize(request.image), crop.rotation)
  const fit = crop.mode === 'fit'
  // En mode « ajuster », on montre directement la vignette obtenue (avec ses bandes).
  const display = fitInside(fit ? target : turned, STAGE)
  const scale = display.width / turned.width

  const { width: displayWidth, height: displayHeight } = display
  useEffect(() => {
    const size = { width: displayWidth, height: displayHeight }
    const element = canvas.current
    const context = element?.getContext('2d')
    if (!element || !context) return
    const ratio = window.devicePixelRatio || 1
    element.width = Math.round(size.width * ratio)
    element.height = Math.round(size.height * ratio)
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    if (fit) drawThumbnail(context, request.image, crop, size)
    else drawRotated(context, request.image, crop.rotation, { x: 0, y: 0, ...size })
  }, [request.image, crop, fit, displayWidth, displayHeight])

  const onPointerDown = (event: PointerEvent, corner?: Corner): void => {
    event.preventDefault()
    event.stopPropagation()
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
    drag.current = corner
      ? { kind: 'resize', corner, frame: crop.frame }
      : { kind: 'move', startX: event.clientX, startY: event.clientY, frame: crop.frame }
  }

  const onPointerMove = (event: PointerEvent): void => {
    const current = drag.current
    if (!current) return
    if (current.kind === 'move') {
      const dx = (event.clientX - current.startX) / scale
      const dy = (event.clientY - current.startY) / scale
      setCrop({ ...crop, frame: moveFrame(current.frame, turned, dx, dy) })
      return
    }
    const box = stage.current?.getBoundingClientRect()
    if (!box) return
    const pointer = { x: (event.clientX - box.left) / scale, y: (event.clientY - box.top) / scale }
    setCrop({ ...crop, frame: resizeFrame(current.frame, turned, target, current.corner, pointer) })
  }

  const endDrag = (): void => {
    drag.current = null
  }

  const turn = (direction: 'left' | 'right'): void => {
    const rotation = rotate(crop.rotation, direction)
    const size = rotatedSize(bitmapSize(request.image), rotation)
    setCrop({ ...crop, rotation, frame: initialFrame(size, target) })
  }

  const frameStyle = {
    left: crop.frame.x * display.width,
    top: crop.frame.y * display.height,
    width: crop.frame.width * display.width,
    height: crop.frame.height * display.height
  }

  return (
    <Dialog
      title={fr.crop.title}
      className="crop-dialog"
      onClose={() => cancelCrop(request)}
      actions={
        <>
          <button onClick={() => cancelCrop(request)}>{fr.common.cancel}</button>
          <button className="primary" onClick={() => void validateCrop(request, crop)}>
            {fr.crop.validate}
          </button>
        </>
      }
    >
      <div className="crop-tools">
        <button type="button" onClick={() => turn('left')}>
          ↺ {fr.crop.rotateLeft}
        </button>
        <button type="button" onClick={() => turn('right')}>
          ↻ {fr.crop.rotateRight}
        </button>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={fit}
            onChange={(event) => setCrop({ ...crop, mode: event.target.checked ? 'fit' : 'crop' })}
          />
          {fr.crop.fit}
        </label>
        {fit && (
          <span className="crop-bands">
            {fr.crop.bands}
            {(['white', 'black'] as const).map((bands) => (
              <label key={bands} className="radio">
                <input
                  type="radio"
                  name="crop-bands"
                  checked={crop.bands === bands}
                  onChange={() => setCrop({ ...crop, bands })}
                />
                {fr.crop[bands]}
              </label>
            ))}
          </span>
        )}
      </div>
      <div className="crop-area">
        <div
          ref={stage}
          className="crop-stage"
          style={{ width: display.width, height: display.height }}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <canvas ref={canvas} style={{ width: display.width, height: display.height }} />
          {!fit && (
            // L'extérieur du cadre est assombri dans un calque coupé aux bords de l'image ;
            // le cadre et ses poignées restent entiers par-dessus.
            <div className="crop-shade" aria-hidden="true">
              <div className="crop-shade-hole" style={frameStyle} />
            </div>
          )}
          {!fit && (
            <div
              className="crop-frame"
              style={frameStyle}
              aria-label={fr.crop.frameLabel}
              onPointerDown={(event) => onPointerDown(event)}
            >
              {CORNERS.map((corner) => (
                <span
                  key={corner}
                  className={`crop-handle ${corner}`}
                  onPointerDown={(event) => onPointerDown(event, corner)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="muted crop-help">{fit ? fr.crop.fitHelp : fr.crop.help}</p>
    </Dialog>
  )
}
