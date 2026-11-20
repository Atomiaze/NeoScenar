import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { formatFullShotId } from '../../shared/numbering'
import { neighborShot } from '../../shared/decoupage'
import {
  DRAWING_HISTORY_LIMIT,
  EMPTY_DRAWING_HISTORY,
  recordStep,
  redoStep,
  undoStep,
  type DrawingHistory
} from '../../shared/drawing/history'
import {
  copyRaster,
  createRaster,
  fillRaster,
  hexToRgb,
  isBlank,
  type PixelRect,
  type Raster
} from '../../shared/drawing/raster'
import { Icon } from '../components/Icon'
import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'
import { cardsStore, closeDrawing, drawingUndo, openDialog, openDrawing } from '../cards/cardsStore'
import { DrawingCanvas, type DrawingCanvasHandle, type StrokeEnd } from './DrawingCanvas'
import { DrawingPalette } from './DrawingPalette'
import { DrawingToolbar } from './DrawingToolbar'
import { blankRaster, loadImageInto, saveDrawing } from './drawingFiles'
import {
  chooseTool,
  currentScale,
  drawingTools,
  sizedTool,
  stepToolSize,
  toggleGrid
} from './toolsStore'

/** Marge autour de la toile ajustée à la fenêtre. */
const STAGE_MARGIN = 24

function findShot(shotId: string) {
  for (const scene of cardsStore.get().history?.present.scenes ?? []) {
    const shot = scene.shots.find((item) => item.id === shotId)
    if (shot) return { scene, shot }
  }
  return null
}

/** Touches des outils (sans Cmd, Ctrl ni Alt). */
const TOOL_KEYS: Record<string, () => void> = {
  b: () => chooseTool('brush'),
  e: () => chooseTool('eraser'),
  g: () => chooseTool('fill'),
  '[': () => stepToolSize(-1),
  ']': () => stepToolSize(1)
}

/** Éditeur de dessin, par-dessus toute la fenêtre de NeoScenar. */
export function DrawingEditor({ shotId }: { shotId: string }) {
  const project = useStore(cardsStore, (state) => state.settings.resolution)
  const tools = useStore(drawingTools, (state) => state)
  const located = findShot(shotId)
  const [raster, setRaster] = useState<Raster | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // Historique de l'éditeur : la référence est à jour immédiatement, le compteur redessine.
  const history = useRef<DrawingHistory>(EMPTY_DRAWING_HISTORY)
  const [steps, setSteps] = useState({ past: 0, future: 0 })
  // Des étapes anciennes ont été oubliées (au-delà de 50) : le dessin reste modifié.
  const [lostStart, setLostStart] = useState(false)
  const [panning, setPanning] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const canvasHandle = useRef<DrawingCanvasHandle>(null)
  const scale = currentScale(tools)
  const paint = {
    tool: tools.tool,
    color: hexToRgb(tools.color),
    size: tools.sizes[sizedTool(tools.tool)]
  }

  // Le menu Affichage agit sur la toile tant que l'éditeur est ouvert.
  useEffect(() => {
    void window.neoscenar.setDrawingOpen(true)
    return () => void window.neoscenar.setDrawingOpen(false)
  }, [])

  // Toile de départ : blanche, ou la vignette actuelle du plan (lue une seule fois).
  useEffect(() => {
    let cancelled = false
    const start = blankRaster(project)
    const thumbnail = findShot(shotId)?.shot.thumbnail
    void (async () => {
      const error = thumbnail ? await loadImageInto(start, thumbnail) : null
      if (cancelled) return
      if (error) setNotice(fr.drawing.loadFailed(error))
      setRaster(error ? blankRaster(project) : start)
    })()
    return () => {
      cancelled = true
    }
    // Le format et la vignette de départ sont ceux du moment de l'ouverture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shotId])

  // Agrandissement qui ajuste la toile à la place disponible.
  useLayoutEffect(() => {
    const element = stage.current
    if (!element || !raster) return
    const fit = (): void => {
      const width = element.clientWidth - STAGE_MARGIN * 2
      const height = element.clientHeight - STAGE_MARGIN * 2
      const fitScale = Math.max(0.05, Math.min(width / raster.width, height / raster.height))
      drawingTools.set({ fitScale })
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(element)
    return () => observer.disconnect()
  }, [raster])

  // En zoomant, le centre de la vue reste au même endroit du dessin.
  const lastScale = useRef(scale)
  useLayoutEffect(() => {
    const element = stage.current
    const ratio = scale / lastScale.current
    lastScale.current = scale
    if (!element || ratio === 1) return
    element.scrollLeft =
      (element.scrollLeft + element.clientWidth / 2) * ratio - element.clientWidth / 2
    element.scrollTop =
      (element.scrollTop + element.clientHeight / 2) * ratio - element.clientHeight / 2
  }, [scale])

  const modified = steps.past > 0 || lostStart

  /** Enregistre une étape (trait, remplissage, tout effacer…) dans l'historique de l'éditeur. */
  const record = (before: Raster, rect: PixelRect): void => {
    if (!raster) return
    if (history.current.past.length >= DRAWING_HISTORY_LIMIT) setLostStart(true)
    history.current = recordStep(history.current, before, raster, rect)
    setSteps({ past: history.current.past.length, future: history.current.future.length })
  }

  const onStroke = (stroke: StrokeEnd): void => record(stroke.before, stroke.rect)

  const travel = (step: typeof undoStep): void => {
    // Pendant l'enregistrement, le dessin ne doit plus changer.
    if (!raster || saving) return
    const result = step(history.current, raster)
    history.current = result.history
    canvasHandle.current?.repaint(result.rect)
    setSteps({ past: history.current.past.length, future: history.current.future.length })
  }
  const undo = (): void => travel(undoStep)
  const redo = (): void => travel(redoStep)
  // Cmd + Z et Cmd + Maj + Z (menu Édition) arrivent ici tant que l'éditeur est ouvert.
  useEffect(() => {
    drawingUndo.undo = undo
    drawingUndo.redo = redo
  })

  const snapshot = (source: Raster): Raster => ({
    ...source,
    data: new Uint8ClampedArray(source.data)
  })

  /** « Tout effacer » : la toile redevient blanche (annulable). */
  const clearAll = (): void => {
    if (!raster || saving) return
    const before = snapshot(raster)
    const rect = fillRaster(raster)
    canvasHandle.current?.repaint(rect)
    record(before, rect)
  }

  const decoupage = useStore(cardsStore, (state) => state.history?.present)
  const previousShot = decoupage ? neighborShot(decoupage, shotId, -1) : null
  const nextShot = decoupage ? neighborShot(decoupage, shotId, 1) : null

  /** Copie la vignette du plan précédent dans la toile (une étape d'annulation). */
  const startFromPrevious = (): void => {
    const path = previousShot?.thumbnail
    if (!raster || !path || saving) return
    const run = async (): Promise<void> => {
      const image = createRaster(raster.width, raster.height)
      const error = await loadImageInto(image, path)
      if (error) {
        setNotice(fr.drawing.loadFailed(error))
        return
      }
      const before = snapshot(raster)
      const rect = copyRaster(raster, image)
      canvasHandle.current?.repaint(rect)
      record(before, rect)
    }
    if (isBlank(raster)) {
      void run()
      return
    }
    openDialog({
      kind: 'confirm',
      title: fr.drawing.replaceWithPreviousTitle,
      message: fr.drawing.replaceWithPreviousMessage,
      confirmLabel: fr.drawing.replaceWithPreviousConfirm,
      onConfirm: () => void run()
    })
  }

  /** Enregistre le dessin s'il a été modifié. Vrai si l'on peut continuer. */
  const saveIfModified = async (): Promise<boolean> => {
    if (!raster || saving) return false
    if (!modified) return true
    setSaving(true)
    const error = await saveDrawing(shotId, raster)
    setSaving(false)
    // En cas d'échec, le dessin reste affiché : rien n'est perdu.
    if (error) setNotice(fr.drawing.saveFailed(error))
    return error === null
  }

  /** ◀ ▶ : enregistre ce plan, puis ouvre le plan voisin dans l'éditeur. */
  const goTo = async (direction: 1 | -1): Promise<void> => {
    const target = direction > 0 ? nextShot : previousShot
    if (target && (await saveIfModified())) openDrawing(target.id)
  }

  const finish = async (): Promise<void> => {
    if (await saveIfModified()) closeDrawing()
  }

  const cancel = (): void => {
    if (!modified) {
      closeDrawing()
      return
    }
    openDialog({
      kind: 'confirm',
      title: fr.drawing.discardTitle,
      confirmLabel: fr.drawing.discard,
      danger: true,
      onConfirm: closeDrawing
    })
  }

  // Raccourcis de l'éditeur (les fenêtres de confirmation gardent leurs propres touches).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (cardsStore.get().dialog) return
      const command = event.metaKey || event.ctrlKey
      if (event.key === 'Enter' && command) {
        event.preventDefault()
        void finish()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        cancel()
      } else if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault()
        void goTo(event.key === 'ArrowLeft' ? -1 : 1)
      } else if (event.key === ' ') {
        // Barre d'espace maintenue : déplacer la vue en glissant.
        event.preventDefault()
        if (!event.repeat) setPanning(true)
      } else if (!command && !event.altKey) {
        const action = TOOL_KEYS[event.key.toLowerCase()]
        if (action) {
          event.preventDefault()
          action()
        }
      }
    }
    const onKeyUp = (event: KeyboardEvent): void => {
      if (event.key === ' ') setPanning(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  })

  // Déplacement de la vue (barre d'espace + glisser).
  const pan = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const onStagePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!panning || !stage.current) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pan.current = {
      x: event.clientX,
      y: event.clientY,
      left: stage.current.scrollLeft,
      top: stage.current.scrollTop
    }
  }
  const onStagePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!pan.current || !stage.current) return
    stage.current.scrollLeft = pan.current.left - (event.clientX - pan.current.x)
    stage.current.scrollTop = pan.current.top - (event.clientY - pan.current.y)
  }

  const title = located ? formatFullShotId(located.scene, located.shot) : ''

  return (
    <div
      className="drawing-editor"
      role="dialog"
      aria-modal="true"
      aria-label={fr.drawing.title(title)}
    >
      <header className="drawing-topbar">
        <button
          className="drawing-icon-button"
          title={fr.drawing.previousShot}
          aria-label={fr.drawing.previousShot}
          disabled={!previousShot || saving}
          onClick={() => void goTo(-1)}
        >
          <Icon name="chevronLeft" size={18} />
        </button>
        <span className="drawing-shot">{title}</span>
        <button
          className="drawing-icon-button"
          title={fr.drawing.nextShot}
          aria-label={fr.drawing.nextShot}
          disabled={!nextShot || saving}
          onClick={() => void goTo(1)}
        >
          <Icon name="chevronRight" size={18} />
        </button>
        <span className="drawing-separator" />
        <button
          className="drawing-icon-button"
          title={fr.drawing.undo}
          aria-label={fr.drawing.undo}
          disabled={steps.past === 0 || saving}
          onClick={undo}
        >
          <Icon name="undo" size={18} />
        </button>
        <button
          className="drawing-icon-button"
          title={fr.drawing.redo}
          aria-label={fr.drawing.redo}
          disabled={steps.future === 0 || saving}
          onClick={redo}
        >
          <Icon name="redo" size={18} />
        </button>
        <span className="drawing-separator" />
        <button onClick={clearAll} disabled={!raster || saving}>
          {fr.drawing.clearAll}
        </button>
        <button
          onClick={startFromPrevious}
          disabled={!raster || saving || !previousShot?.thumbnail}
          title={previousShot?.thumbnail ? undefined : fr.drawing.noPreviousImage}
        >
          {fr.drawing.startFromPrevious}
        </button>
        <button
          className={`drawing-toggle${tools.grid ? ' active' : ''}`}
          aria-pressed={tools.grid}
          onClick={toggleGrid}
        >
          {fr.drawing.grid}
        </button>
        <span className="drawing-zoom" title={fr.drawing.zoomHelp}>
          {fr.drawing.zoomValue(Math.round(scale * 100))}
        </span>
        <span className="drawing-spacer" />
        <button onClick={cancel} disabled={saving}>
          {fr.drawing.cancel}
        </button>
        <button className="primary" onClick={() => void finish()} disabled={saving || !raster}>
          {saving ? fr.drawing.saving : fr.drawing.finish}
        </button>
      </header>
      {notice && (
        <div className="banner error" role="alert">
          {notice}
        </div>
      )}
      <div className="drawing-body">
        <DrawingToolbar />
        <div
          className={`drawing-stage${panning ? ' panning' : ''}`}
          ref={stage}
          onPointerDown={onStagePointerDown}
          onPointerMove={onStagePointerMove}
          onPointerUp={() => (pan.current = null)}
        >
          <div className="drawing-scroll">
            {raster ? (
              <DrawingCanvas
                raster={raster}
                paint={paint}
                scale={scale}
                onStroke={onStroke}
                handle={canvasHandle}
                grid={tools.grid}
                panning={panning}
                locked={saving}
              />
            ) : (
              <p className="muted">{fr.drawing.loading}</p>
            )}
          </div>
        </div>
      </div>
      <DrawingPalette />
    </div>
  )
}
