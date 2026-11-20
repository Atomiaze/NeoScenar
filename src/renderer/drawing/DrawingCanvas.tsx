import { useEffect, useImperativeHandle, useLayoutEffect, useRef, type Ref } from 'react'
import { stamp, strokeSegment } from '../../shared/drawing/brush'
import { floodFill } from '../../shared/drawing/fill'
import {
  PAPER,
  unionRect,
  type PixelRect,
  type Raster,
  type Rgb
} from '../../shared/drawing/raster'
import type { DrawingTool } from './toolsStore'
import { fr } from '../i18n/fr'

// Toile affichée à l'écran. Elle ne fait que transmettre les gestes du pointeur aux fonctions de
// dessin (src/shared/drawing) et redessiner les zones modifiées.

export interface PaintSettings {
  tool: DrawingTool
  color: Rgb
  /** Taille du pinceau ou de la gomme. */
  size: number
}

/** Fin d'un geste : copie de la toile avant le geste, et zone modifiée. */
export interface StrokeEnd {
  before: Raster
  rect: PixelRect
}

export interface DrawingCanvasHandle {
  /** Redessine une zone après une modification faite ailleurs (annuler, tout effacer…). */
  repaint(rect: PixelRect | null): void
}

interface DrawingCanvasProps {
  raster: Raster
  paint: PaintSettings
  /** Agrandissement à l'écran (1 = un pixel de la toile par pixel de l'écran). */
  scale: number
  onStroke(stroke: StrokeEnd): void
  handle: Ref<DrawingCanvasHandle>
  /** Grille des tiers en surimpression (jamais dans l'image). */
  grid: boolean
  /** Barre d'espace enfoncée : on déplace la vue au lieu de dessiner. */
  panning: boolean
  /** Enregistrement en cours : la toile ne réagit plus (un trait serait perdu). */
  locked: boolean
}

type Point = { x: number; y: number }

export function DrawingCanvas({
  raster,
  paint,
  scale,
  onStroke,
  handle,
  grid,
  panning,
  locked
}: DrawingCanvasProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const cursor = useRef<HTMLDivElement>(null)
  const imageData = useRef<ImageData | null>(null)
  const pending = useRef<PixelRect | null>(null)
  const frame = useRef(0)
  // Geste en cours : copie d'avant, zone touchée, dernier point (pour relier sans trou).
  const stroke = useRef<{ before: Raster; rect: PixelRect | null } | null>(null)
  const last = useRef<Point | null>(null)

  const flush = (): void => {
    cancelAnimationFrame(frame.current)
    frame.current = 0
    const rect = pending.current
    pending.current = null
    const context = canvas.current?.getContext('2d')
    if (!rect || !context || !imageData.current) return
    context.putImageData(imageData.current, 0, 0, rect.x, rect.y, rect.width, rect.height)
  }

  /** Les zones modifiées sont regroupées et redessinées une fois par image affichée. */
  const queue = (rect: PixelRect | null): void => {
    if (!rect) return
    pending.current = unionRect(pending.current, rect)
    frame.current ||= requestAnimationFrame(flush)
  }

  /** Redessine tout de suite (fin de geste, annulation…), sans attendre l'image suivante. */
  const paintNow = (rect: PixelRect | null): void => {
    queue(rect)
    flush()
  }

  useImperativeHandle(handle, () => ({
    repaint: (rect) => paintNow(rect ?? { x: 0, y: 0, width: raster.width, height: raster.height })
  }))

  useLayoutEffect(() => {
    const element = canvas.current
    if (!element) return
    element.width = raster.width
    element.height = raster.height
    // L'image affichée partage les pixels de la toile : rien n'est recopié.
    imageData.current = new ImageData(
      raster.data as Uint8ClampedArray<ArrayBuffer>,
      raster.width,
      raster.height
    )
    element.getContext('2d')?.putImageData(imageData.current, 0, 0)
  }, [raster])

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const toCanvas = (event: { clientX: number; clientY: number }): Point => {
    const box = (canvas.current as HTMLCanvasElement).getBoundingClientRect()
    return {
      x: ((event.clientX - box.left) / box.width) * raster.width,
      y: ((event.clientY - box.top) / box.height) * raster.height
    }
  }

  const moveCursor = (event: { clientX: number; clientY: number }): void => {
    const element = cursor.current
    const box = canvas.current?.getBoundingClientRect()
    if (!element || !box) return
    // Le pot de peinture n'a pas de taille : croix du système au lieu du cercle.
    if (paint.tool === 'fill' || panning) {
      element.style.display = 'none'
      return
    }
    const diameter = Math.max(4, paint.size * scale)
    element.style.width = `${diameter}px`
    element.style.height = `${diameter}px`
    element.style.transform = `translate(${event.clientX - box.left - diameter / 2}px, ${event.clientY - box.top - diameter / 2}px)`
    element.style.display = 'block'
  }

  const draw = (from: Point | null, to: Point): void => {
    // La gomme peint avec la couleur du papier.
    const color = paint.tool === 'eraser' ? PAPER : paint.color
    const rect = from
      ? strokeSegment(raster, from, to, paint.size, color)
      : stamp(raster, to.x, to.y, paint.size, color)
    if (stroke.current) stroke.current.rect = unionRect(stroke.current.rect, rect)
    last.current = to
    queue(rect)
  }

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (event.button !== 0 || panning || locked) return
    const before = { ...raster, data: new Uint8ClampedArray(raster.data) }
    const point = toCanvas(event)
    if (paint.tool === 'fill') {
      const rect = floodFill(raster, point.x, point.y, paint.color)
      paintNow(rect)
      if (rect) onStroke({ before, rect })
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    stroke.current = { before, rect: null }
    // Maj + clic : ligne droite depuis le dernier point dessiné.
    draw(event.shiftKey && last.current ? last.current : null, point)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    moveCursor(event)
    if (!stroke.current) return
    // Tous les points reçus depuis la dernière image, même lors d'un mouvement très rapide.
    const events = event.nativeEvent.getCoalescedEvents?.() ?? []
    for (const item of events.length > 0 ? events : [event.nativeEvent]) {
      draw(last.current, toCanvas(item))
    }
  }

  const endStroke = (): void => {
    const current = stroke.current
    stroke.current = null
    flush()
    if (current?.rect) onStroke({ before: current.before, rect: current.rect })
  }

  return (
    <div className="drawing-canvas-wrap">
      <canvas
        ref={canvas}
        className={`drawing-canvas tool-${paint.tool}${panning ? ' panning' : ''}${locked ? ' locked' : ''}`}
        aria-label={fr.drawing.canvas}
        style={{ width: raster.width * scale, height: raster.height * scale }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onPointerLeave={() => {
          if (cursor.current) cursor.current.style.display = 'none'
        }}
      />
      {grid && (
        <div className="drawing-grid" aria-hidden="true">
          <span style={{ left: '33.333%' }} className="vertical" />
          <span style={{ left: '66.667%' }} className="vertical" />
          <span style={{ top: '33.333%' }} className="horizontal" />
          <span style={{ top: '66.667%' }} className="horizontal" />
        </div>
      )}
      <div ref={cursor} className="drawing-cursor" aria-hidden="true" />
    </div>
  )
}
