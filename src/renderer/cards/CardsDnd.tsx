import { useRef, useState, type ReactNode } from 'react'
import {
  AutoScrollActivator,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent
} from '@dnd-kit/core'
import type { Decoupage } from '../../shared/projectTypes'
import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'
import { moveSceneTo, moveShotsTo } from './actions'
import { SceneCard, ShotCard } from './Cards'
import { cardsStore, setSelection } from './cardsStore'
import { dragStore } from './dragStore'
import {
  insertionIndex,
  remainingIndex,
  rowAt,
  sceneInsertionIndex,
  sceneMarker,
  shotMarker,
  type Box,
  type Point
} from './dropGeometry'
import { single } from './selection'

/** Endroit du dépôt, calculé à chaque mouvement de la souris. */
type Drop =
  | { kind: 'shot'; sceneId: string; index: number; marker: Box }
  | { kind: 'scene'; index: number; marker: Box }

function boxOf(element: Element): Box {
  const { left, top, right, bottom } = element.getBoundingClientRect()
  return { left, top, right, bottom }
}

function gapOf(element: Element | null, property: 'columnGap' | 'rowGap'): number {
  return element ? parseFloat(getComputedStyle(element)[property]) || 0 : 0
}

/** Lit la position des rangées et des cartes à l'écran pour trouver l'endroit du dépôt. */
function computeDrop(
  kind: 'shot' | 'scene',
  moved: ReadonlySet<string>,
  point: Point
): Drop | null {
  const board = document.querySelector('.board')
  const rows = [...(board?.querySelectorAll<HTMLElement>('[data-scene-row-id]') ?? [])]
  if (!board || rows.length === 0) return null
  const rowBoxes = rows.map(boxOf)

  if (kind === 'scene') {
    const full = sceneInsertionIndex(rowBoxes, point.y)
    const sceneIds = rows.map((row) => row.dataset['sceneRowId'] ?? '')
    return {
      kind: 'scene',
      index: remainingIndex(sceneIds, moved, full),
      marker: sceneMarker(rowBoxes, full, gapOf(board, 'rowGap'))
    }
  }

  const row = rows[rowAt(rowBoxes, point.y)]
  const list = row.querySelector('.shot-list')
  const cards = [...row.querySelectorAll<HTMLElement>('[data-card-kind="shot"]')]
  const boxes = cards.map(boxOf)
  const full = insertionIndex(boxes, point)
  const shotIds = cards.map((card) => card.dataset['cardId'] ?? '')
  const listBox = list ? boxOf(list) : boxOf(row)
  return {
    kind: 'shot',
    sceneId: row.dataset['sceneRowId'] ?? '',
    index: remainingIndex(shotIds, moved, full),
    marker: shotMarker(
      boxes,
      full,
      { ...listBox, bottom: boxOf(row).bottom },
      gapOf(list, 'columnGap')
    )
  }
}

/** Plans glissés : la sélection si on saisit un plan sélectionné, sinon ce seul plan. */
function shotsToDrag(decoupage: Decoupage, grabbedId: string): string[] {
  const { selection } = cardsStore.get()
  if (!selection.ids.includes(grabbedId)) {
    setSelection(single({ kind: 'shot', id: grabbedId }))
    return [grabbedId]
  }
  const selected = new Set(selection.ids)
  return decoupage.scenes.flatMap((scene) =>
    scene.shots.filter((shot) => selected.has(shot.id)).map((shot) => shot.id)
  )
}

interface CardsDndProps {
  decoupage: Decoupage
  children: ReactNode
}

/** Glisser-déposer du tableau (plans, plusieurs plans, scènes entières). */
export function CardsDnd({ decoupage, children }: CardsDndProps) {
  // Une petite distance avant de commencer : un simple clic reste un clic.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const [overlay, setOverlay] = useState<{ kind: 'shot' | 'scene'; ids: string[] } | null>(null)
  const drop = useRef<Drop | null>(null)
  const pointer = useRef<Point>({ x: 0, y: 0 })
  const stopTracking = useRef<() => void>(() => undefined)

  const update = (): void => {
    const { draggingIds, kind } = dragStore.get()
    if (!draggingIds || !kind) return
    drop.current = computeDrop(kind, draggingIds, pointer.current)
    dragStore.set({ marker: drop.current?.marker ?? null })
  }

  const onDragStart = (event: DragStartEvent): void => {
    const kind = event.active.data.current?.['kind'] === 'scene' ? 'scene' : 'shot'
    const id = String(event.active.id)
    const ids = kind === 'scene' ? [id] : shotsToDrag(decoupage, id)
    if (kind === 'scene') setSelection(single({ kind: 'scene', id }))
    const start = event.activatorEvent as PointerEvent
    pointer.current = { x: start.clientX, y: start.clientY }
    dragStore.set({ draggingIds: new Set(ids), kind, marker: null })
    setOverlay({ kind, ids })

    // Le repère suit la souris, et aussi le défilement automatique du tableau.
    const onMove = (move: PointerEvent): void => {
      pointer.current = { x: move.clientX, y: move.clientY }
      update()
    }
    const board = document.querySelector('.board')
    window.addEventListener('pointermove', onMove)
    board?.addEventListener('scroll', update)
    stopTracking.current = () => {
      window.removeEventListener('pointermove', onMove)
      board?.removeEventListener('scroll', update)
    }
    update()
  }

  const finish = (): Drop | null => {
    stopTracking.current()
    const result = drop.current
    drop.current = null
    dragStore.set({ draggingIds: null, kind: null, marker: null })
    setOverlay(null)
    return result
  }

  const onDragEnd = (): void => {
    const ids = [...(dragStore.get().draggingIds ?? [])]
    const result = finish()
    if (!result) return
    if (result.kind === 'scene') moveSceneTo(ids[0], result.index)
    else moveShotsTo(ids, { sceneId: result.sceneId, index: result.index })
  }

  return (
    <DndContext
      sensors={sensors}
      autoScroll={{ activator: AutoScrollActivator.Pointer, threshold: { x: 0, y: 0.12 } }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={finish}
    >
      {children}
      <DropMarker />
      <DragOverlay dropAnimation={null}>
        {overlay && <DragPreview decoupage={decoupage} {...overlay} />}
      </DragOverlay>
    </DndContext>
  )
}

/** Barre bleue qui montre l'endroit exact du dépôt. */
function DropMarker() {
  const marker = useStore(dragStore, (state) => state.marker)
  if (!marker) return null
  return (
    <div
      className="drop-marker"
      style={{
        left: marker.left,
        top: marker.top,
        width: marker.right - marker.left,
        height: marker.bottom - marker.top
      }}
    />
  )
}

/** Image de ce qu'on glisse : la carte, avec le nombre de plans s'il y en a plusieurs. */
function DragPreview({
  decoupage,
  kind,
  ids
}: {
  decoupage: Decoupage
  kind: 'shot' | 'scene'
  ids: string[]
}) {
  if (kind === 'scene') {
    const scene = decoupage.scenes.find((item) => item.id === ids[0])
    return scene ? (
      <div className="drag-preview">
        <SceneCard scene={scene} selected />
      </div>
    ) : null
  }
  const scene = decoupage.scenes.find((item) => item.shots.some((shot) => shot.id === ids[0]))
  const shot = scene?.shots.find((item) => item.id === ids[0])
  if (!scene || !shot) return null
  return (
    <div className={`drag-preview${ids.length > 1 ? ' stack' : ''}`}>
      <ShotCard shot={shot} sceneHeading={scene.heading} selected />
      {ids.length > 1 && <span className="drag-count">{fr.cards.dragCount(ids.length)}</span>}
    </div>
  )
}
