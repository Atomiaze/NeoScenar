import type { BreakdownScene, DayEntry } from '../../../shared/planning/shootingTypes'
import { formatEighths } from '../../../shared/planning/shootingView'
import { fr } from '../../i18n/fr'
import { openScenePanel } from '../shootingStore'

const t = fr.shooting

/** Type du glisser-déposer d'une scène (contenu : `SceneDrag` en JSON). */
export const SCENE_DRAG_TYPE = 'application/x-neoscenar-scene'

export interface SceneDrag {
  cardId: string
  /** Jour de départ ; null = colonne des scènes à planifier. */
  fromDayId: string | null
}

export function readSceneDrag(data: DataTransfer): SceneDrag | null {
  try {
    const value = JSON.parse(data.getData(SCENE_DRAG_TYPE)) as SceneDrag
    return typeof value.cardId === 'string' ? value : null
  } catch {
    return null
  }
}

/** « 1 3/8 p. » ou « à écrire ». */
export function lengthOf(scene: BreakdownScene): string {
  return scene.eighths === null ? t.toWrite : t.pages(formatEighths(scene.eighths))
}

interface ShootingSceneCardProps {
  /** Scène du scénario (absente pour une scène disparue). */
  scene: BreakdownScene | null
  /** Dans un jour : l'entrée du jour (statut, numéro d'une scène disparue). */
  entry?: DayEntry
  fromDayId: string | null
  twice?: boolean
  selected?: boolean
  onRemove?(): void
}

/** Une scène : numéro, INT/EXT, JOUR/NUIT, en-tête, longueur, personnages. Glissable, cliquable. */
export function ShootingSceneCard({
  scene,
  entry,
  fromDayId,
  twice,
  selected,
  onRemove
}: ShootingSceneCardProps) {
  const cardId = scene?.cardId ?? entry?.cardId ?? ''
  const label = scene?.label ?? entry?.label ?? t.missingNoCard
  const missing = entry?.status === 'missing'
  const heading = scene?.heading || entry?.heading || ''
  const classes = ['shooting-scene']
  if (missing) classes.push('missing')
  if (scene?.eighths === null) classes.push('to-write')
  if (selected) classes.push('selected')

  return (
    <div
      className={classes.join(' ')}
      data-scene={label}
      data-card-id={cardId}
      draggable
      onDragStart={(event) => {
        const drag: SceneDrag = { cardId, fromDayId }
        event.dataTransfer.setData(SCENE_DRAG_TYPE, JSON.stringify(drag))
        event.dataTransfer.effectAllowed = 'move'
      }}
      onClick={() => openScenePanel(cardId)}
    >
      <div className="shooting-scene-top">
        <strong className="shooting-scene-label">{label}</strong>
        {scene && scene.eighths !== null && (
          <span className="shooting-scene-tags muted">
            {t.intExt[scene.intExt]} · {t.dayNight[scene.dayNight]}
          </span>
        )}
        {scene && (
          <span className="shooting-scene-length" data-length>
            {lengthOf(scene)}
          </span>
        )}
        {onRemove && !missing && (
          <button
            className="shooting-remove-x"
            title={t.removeFromDay(label)}
            aria-label={t.removeFromDay(label)}
            onClick={(event) => {
              event.stopPropagation()
              onRemove()
            }}
          >
            ×
          </button>
        )}
      </div>
      {heading !== '' && <div className="shooting-scene-heading">{heading}</div>}
      {scene && scene.characters.length > 0 && (
        <div className="shooting-scene-characters muted">
          {scene.characters.map((c) => (c.muet ? `${c.nom} (${t.mute})` : c.nom)).join(', ')}
        </div>
      )}
      {(missing || twice) && (
        <div className="shooting-scene-flags">
          {missing && <span className="shooting-flag danger">{t.missing}</span>}
          {twice && <span className="shooting-flag">{t.twice}</span>}
          {missing && onRemove && (
            <button
              className="shooting-remove"
              onClick={(event) => {
                event.stopPropagation()
                onRemove()
              }}
              aria-label={t.removeFromDay(label)}
            >
              {t.remove}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
