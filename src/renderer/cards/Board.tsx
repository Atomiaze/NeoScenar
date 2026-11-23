import {
  memo,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type DragEvent,
  type MouseEvent
} from 'react'
import { useDraggable } from '@dnd-kit/core'
import type { ItemRef } from '../../shared/decoupage'
import type { Size } from '../../shared/imageFormat'
import type { Decoupage, Scene, Shot } from '../../shared/projectTypes'
import {
  thumbnailBadge,
  thumbnailPaths,
  type ThumbnailBadge,
  type ThumbnailSizes
} from '../../shared/thumbnail/status'
import { fr } from '../i18n/fr'
import { SceneCard, ShotCard } from './Cards'
import { EMPTY_SELECTION, selectOnClick, single, type Selection } from './selection'
import { cardsStore, openContextMenu, requestNameFocus, setSelection } from './cardsStore'
import { requestSizes, sizesStore } from './thumbnails/sizesStore'
import { importDroppedFile, isFileDrag } from './thumbnails/fileDrop'
import { addScene } from './actions'
import { Icon } from '../components/Icon'
import { useStore } from '../state/createStore'
import { dragStore } from './dragStore'
import { useIsDraft } from '../script/draft/useDraftKeys'

interface BoardProps {
  decoupage: Decoupage
  selection: Selection
}

/** Carte visée par un clic (l'élément porte data-card-id), ou null pour un clic dans le vide. */
export function cardFromEvent(event: { target: EventTarget | null }): ItemRef | null {
  const element = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-card-id]')
  const id = element?.dataset['cardId']
  const kind = element?.dataset['cardKind']
  if (!id || (kind !== 'scene' && kind !== 'shot')) return null
  return { kind, id }
}

/** Tableau : une rangée par scène, la carte scène en tête puis ses plans. */
export function Board({ decoupage, selection }: BoardProps) {
  const selectedIds = useMemo(() => new Set(selection.ids), [selection.ids])
  // Ne change qu'au début et à la fin d'un glissement.
  const draggingIds = useStore(dragStore, (state) => state.draggingIds)
  const locked = decoupage.numbersLocked
  const container = useRef<HTMLDivElement>(null)
  const showThumbnails = useStore(cardsStore, (state) => state.showThumbnails)
  const resolution = useStore(cardsStore, (state) => state.settings.resolution)
  const sizes = useStore(sizesStore, (state) => state.sizes)
  // Un seul objet, stable tant que rien ne change : les rangées mémorisées ne sont pas redessinées.
  const thumbnails = useMemo<ThumbnailView>(
    () => ({ show: showThumbnails, sizes, project: resolution }),
    [showThumbnails, sizes, resolution]
  )

  // Dimensions des vignettes, pour les badges « À recadrer ».
  useEffect(() => {
    void requestSizes(thumbnailPaths(decoupage))
  }, [decoupage])

  // La carte atteinte (clic, flèches, nouvel élément) reste visible à l'écran.
  useEffect(() => {
    const id = selection.anchor?.id
    if (!id) return
    const element = container.current?.querySelector(`[data-card-id="${CSS.escape(id)}"]`)
    element?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [selection.anchor])

  const onClick = (event: MouseEvent): void => {
    const ref = cardFromEvent(event)
    if (!ref) {
      setSelection(EMPTY_SELECTION)
      return
    }
    setSelection(
      selectOnClick(decoupage, selection, ref, {
        toggle: event.metaKey || event.ctrlKey,
        range: event.shiftKey
      })
    )
  }

  // Double-clic : ouvre la fiche, curseur dans le champ « Nom ».
  const onDoubleClick = (event: MouseEvent): void => {
    const ref = cardFromEvent(event)
    if (!ref) return
    setSelection(single(ref))
    requestNameFocus()
  }

  // Clic droit : la carte visée rejoint la sélection (seule, si elle n'en faisait pas partie).
  const onContextMenu = (event: MouseEvent): void => {
    const ref = cardFromEvent(event)
    if (!ref) return
    event.preventDefault()
    if (!selectedIds.has(ref.id)) setSelection(single(ref))
    openContextMenu({ x: event.clientX, y: event.clientY, target: ref })
  }

  // Image glissée depuis le Finder : déposée sur une carte plan, elle devient sa vignette.
  const fileDropTarget = useRef<Element | null>(null)
  const markFileDrop = (element: Element | null): void => {
    if (fileDropTarget.current === element) return
    fileDropTarget.current?.classList.remove('file-drop-target')
    element?.classList.add('file-drop-target')
    fileDropTarget.current = element
  }
  const shotCardOf = (event: DragEvent): Element | null =>
    (event.target as Element | null)?.closest('[data-card-kind="shot"]') ?? null
  const onDragOver = (event: DragEvent): void => {
    if (!isFileDrag(event)) return
    const card = shotCardOf(event)
    markFileDrop(card)
    if (!card) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }
  const onDrop = (event: DragEvent): void => {
    const card = shotCardOf(event)
    markFileDrop(null)
    if (!isFileDrag(event) || !card) return
    event.preventDefault()
    const shotId = card.getAttribute('data-card-id')
    if (!shotId) return
    setSelection(single({ kind: 'shot', id: shotId }))
    void importDroppedFile(shotId, event)
  }

  if (decoupage.scenes.length === 0) {
    return (
      <div className="board empty-board">
        <p className="muted">{fr.cards.emptyBoard}</p>
        <button className="primary big-add" onClick={addScene}>
          <Icon name="plus" size={24} />
          {fr.cards.addScene}
        </button>
      </div>
    )
  }

  return (
    <div
      className="board"
      ref={container}
      style={{ '--thumb-aspect': `${resolution.width} / ${resolution.height}` } as CSSProperties}
      role="listbox"
      aria-multiselectable="true"
      aria-label={fr.cards.boardLabel}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
      onDragOver={onDragOver}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) markFileDrop(null)
      }}
      onDrop={onDrop}
      // Maj + clic ne doit pas sélectionner le texte des cartes.
      onMouseDown={(event) => event.shiftKey && event.preventDefault()}
    >
      {decoupage.scenes.map((scene) => (
        <SceneRow
          key={scene.id}
          scene={scene}
          selectedIds={selectedIds}
          draggingIds={draggingIds}
          locked={locked}
          thumbnails={thumbnails}
        />
      ))}
    </div>
  )
}

/** Affichage des vignettes sur les cartes plan. */
interface ThumbnailView {
  show: boolean
  sizes: ThumbnailSizes
  project: Size
}

interface SceneRowProps {
  scene: Scene
  selectedIds: ReadonlySet<string>
  draggingIds: ReadonlySet<string> | null
  locked: boolean
  thumbnails: ThumbnailView
}

const SceneRow = memo(function SceneRow({
  scene,
  selectedIds,
  draggingIds,
  locked,
  thumbnails
}: SceneRowProps) {
  return (
    <div className={scene.orphan ? 'scene-row orphan' : 'scene-row'} data-scene-row-id={scene.id}>
      <DraggableScene
        scene={scene}
        selected={selectedIds.has(scene.id)}
        dimmed={draggingIds?.has(scene.id) ?? false}
        locked={locked}
      />
      <div className="shot-list">
        {scene.shots.map((shot) => (
          <DraggableShot
            key={shot.id}
            shot={shot}
            sceneHeading={scene.heading}
            selected={selectedIds.has(shot.id)}
            dimmed={draggingIds?.has(shot.id) ?? false}
            locked={locked}
            showThumbnail={thumbnails.show}
            badge={thumbnailBadge(shot, thumbnails.sizes, thumbnails.project)}
          />
        ))}
      </div>
    </div>
  )
})

// Ces petits composants se redessinent pendant un glissement (dnd-kit les prévient à chaque
// mouvement), mais la carte elle-même, mémorisée, ne se redessine que si ses données changent.

interface DraggableProps {
  selected: boolean
  dimmed: boolean
  locked: boolean
}

function DraggableScene({ scene, ...props }: DraggableProps & { scene: Scene }) {
  const { setNodeRef, listeners } = useDraggable({
    id: scene.id,
    data: { kind: 'scene' },
    disabled: props.locked
  })
  const draft = useIsDraft(scene)
  return (
    <SceneCard
      scene={scene}
      draft={draft}
      selected={props.selected}
      dimmed={props.dimmed}
      dragRef={setNodeRef}
      listeners={listeners}
      title={props.locked ? fr.cards.lockedDrag : undefined}
    />
  )
}

function DraggableShot({
  shot,
  sceneHeading,
  showThumbnail,
  badge,
  ...props
}: DraggableProps & {
  shot: Shot
  sceneHeading: string
  showThumbnail: boolean
  badge: ThumbnailBadge | null
}) {
  const { setNodeRef, listeners } = useDraggable({
    id: shot.id,
    data: { kind: 'shot' },
    disabled: props.locked
  })
  return (
    <ShotCard
      shot={shot}
      sceneHeading={sceneHeading}
      showThumbnail={showThumbnail}
      badge={badge}
      selected={props.selected}
      dimmed={props.dimmed}
      dragRef={setNodeRef}
      listeners={listeners}
      title={props.locked ? fr.cards.lockedDrag : undefined}
    />
  )
}
