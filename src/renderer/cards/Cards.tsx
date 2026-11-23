import { memo, type CSSProperties } from 'react'
import type { DraggableSyntheticListeners } from '@dnd-kit/core'
import { formatDuration, sceneDuration } from '../../shared/decoupage'
import { formatSceneNumber, formatShotNumber } from '../../shared/numbering'
import type { Scene, Shot } from '../../shared/projectTypes'
import { cardMutedTextColor, cardTextColor } from '../../shared/palette'
import { previewImageUrl } from '../../shared/thumbnail/files'
import type { ThumbnailBadge } from '../../shared/thumbnail/status'
import { Icon } from '../components/Icon'
import { fr } from '../i18n/fr'

// Cartes du tableau. Elles ne reçoivent que des données immuables : React ne les redessine que
// si leur scène ou leur plan a réellement changé (important avec 300 plans).

/**
 * Couleur choisie par l'élève, avec un texte foncé ou blanc selon le fond. Sans couleur, la carte
 * garde l'apparence par défaut du thème.
 */
function colorStyle(color: string | null): CSSProperties | undefined {
  if (!color) return undefined
  return {
    background: color,
    color: cardTextColor(color),
    '--card-muted': cardMutedTextColor(color)
  } as CSSProperties
}

function cardClass(
  base: string,
  selected: boolean,
  color: string | null,
  dimmed: boolean | undefined
): string {
  return [base, selected && 'selected', color && 'colored', dimmed && 'dimmed']
    .filter(Boolean)
    .join(' ')
}

/** Ce qu'il faut à une carte pour être glissée (fourni par dnd-kit). */
export interface DragHandle {
  dragRef?: (element: HTMLElement | null) => void
  listeners?: DraggableSyntheticListeners
  /** Carte en cours de glissement : affichée estompée à sa place d'origine. */
  dimmed?: boolean
  /** Infobulle quand le glissement est impossible (numéros verrouillés). */
  title?: string
}

interface SceneCardProps extends DragHandle {
  scene: Scene
  selected: boolean
  /** Scène brouillon dans le scénario (18C-13) : grisée, avec son étiquette. */
  draft?: boolean
}

export const SceneCard = memo(function SceneCard({
  scene,
  selected,
  dragRef,
  listeners,
  dimmed,
  title,
  draft
}: SceneCardProps) {
  const summary = fr.cards.sceneSummary(scene.shots.length, formatDuration(sceneDuration(scene)))
  return (
    <div
      ref={dragRef}
      {...listeners}
      title={title}
      className={`${cardClass('card scene-card', selected, scene.color, dimmed)}${draft ? ' draft' : ''}`}
      style={colorStyle(scene.color)}
      data-card-id={scene.id}
      data-card-kind="scene"
      role="option"
      aria-selected={selected}
    >
      <span className="card-number">{formatSceneNumber(scene.number, scene.letter)}</span>
      <span className="card-name">{scene.name}</span>
      <span className="card-heading">{scene.heading}</span>
      {scene.orphan && <span className="orphan-label">{fr.cards.orphanLabel}</span>}
      {draft && (
        <span className="draft-tag" title={fr.script.navigator.draftHint}>
          {fr.script.navigator.draft}
        </span>
      )}
      <span className="card-summary">{summary}</span>
    </div>
  )
})

interface ShotCardProps extends DragHandle {
  shot: Shot
  /** En-tête de la scène, rappelé en petit sur chaque plan. */
  sceneHeading: string
  selected: boolean
  /** Mode « avec vignettes » : l'image (ou un cadre vide) au-dessus du texte. */
  showThumbnail?: boolean
  badge?: ThumbnailBadge | null
}

/** Petit badge orange « À recadrer » ou « À vérifier », avec son explication en infobulle. */
export function ThumbnailBadgeLabel({ badge }: { badge: ThumbnailBadge }) {
  return (
    <span className="thumbnail-badge" title={fr.cards.badgeHelp[badge]}>
      {fr.cards.badge[badge]}
    </span>
  )
}

export const ShotCard = memo(function ShotCard({
  shot,
  sceneHeading,
  selected,
  showThumbnail,
  badge,
  dragRef,
  listeners,
  dimmed,
  title
}: ShotCardProps) {
  return (
    <div
      ref={dragRef}
      {...listeners}
      title={title}
      className={cardClass('card shot-card', selected, shot.color, dimmed)}
      style={colorStyle(shot.color)}
      data-card-id={shot.id}
      data-card-kind="shot"
      role="option"
      aria-selected={selected}
    >
      {showThumbnail && (
        <div className="card-thumb">
          {shot.thumbnail ? (
            // Aperçu réduit, chargé seulement quand la carte approche de l'écran.
            <img
              src={previewImageUrl(shot.thumbnail)}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          ) : (
            <Icon name="image" size={22} />
          )}
        </div>
      )}
      <span className="card-number">{formatShotNumber(shot.number, shot.letter)}</span>
      <span className="card-name">{shot.name}</span>
      <span className="card-heading shot-heading">{sceneHeading}</span>
      {badge && <ThumbnailBadgeLabel badge={badge} />}
    </div>
  )
})
