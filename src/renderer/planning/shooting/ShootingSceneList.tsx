import { useState } from 'react'
import type { DayNight, IntExt } from '../../../shared/stats/computeStats'
import type { BreakdownScene } from '../../../shared/planning/shootingTypes'
import {
  filterChoices,
  filterScenes,
  groupByLocation,
  type SceneFilter
} from '../../../shared/planning/shootingView'
import { fr } from '../../i18n/fr'
import { clearSceneFilter, setGrouped, setSceneFilter, unplanScene } from '../shootingStore'
import { SCENE_DRAG_TYPE, ShootingSceneCard, readSceneDrag } from './ShootingSceneCard'

const t = fr.shooting

interface ShootingSceneListProps {
  /** Toutes les scènes du scénario (pour les choix des filtres). */
  all: BreakdownScene[]
  /** Scènes qui ne sont dans aucun jour. */
  unplanned: BreakdownScene[]
  filter: SceneFilter
  grouped: boolean
  selectedCardId: string | null
}

/** Colonne « Scènes à planifier » : filtres, regroupement par lieu ; on y redépose une scène pour la retirer de son jour. */
export function ShootingSceneList({
  all,
  unplanned,
  filter,
  grouped,
  selectedCardId
}: ShootingSceneListProps) {
  const [dropTarget, setDropTarget] = useState(false)
  const choices = filterChoices(all)
  const shown = filterScenes(unplanned, filter)
  const filtered = Object.values(filter).some((value) => value)

  const card = (scene: BreakdownScene) => (
    <li key={scene.cardId}>
      <ShootingSceneCard
        scene={scene}
        fromDayId={null}
        selected={selectedCardId === scene.cardId}
      />
    </li>
  )

  return (
    <aside
      className={`shooting-unplanned${dropTarget ? ' drop-target' : ''}`}
      aria-label={t.toPlan}
      data-shooting="unplanned"
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(SCENE_DRAG_TYPE)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        setDropTarget(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(false)
      }}
      onDrop={(event) => {
        setDropTarget(false)
        const drag = readSceneDrag(event.dataTransfer)
        if (!drag || drag.fromDayId === null) return
        event.preventDefault()
        unplanScene(drag.fromDayId, drag.cardId)
      }}
    >
      <h2>{t.toPlan}</h2>
      <p className="muted shooting-count" data-unplanned-count={unplanned.length}>
        {t.toPlanCount(unplanned.length)}
      </p>

      <div className="shooting-filters">
        <label>
          <span>{t.filterLocation}</span>
          <select
            value={filter.location ?? ''}
            onChange={(event) => setSceneFilter({ location: event.target.value || undefined })}
          >
            <option value="">{t.filterAll}</option>
            {choices.locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t.filterIntExt}</span>
          <select
            value={filter.intExt ?? ''}
            onChange={(event) =>
              setSceneFilter({ intExt: (event.target.value || undefined) as IntExt | undefined })
            }
          >
            <option value="">{t.filterAll}</option>
            {(['int', 'ext', 'mixed'] as const).map((value) => (
              <option key={value} value={value}>
                {t.intExt[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t.filterDayNight}</span>
          <select
            value={filter.dayNight ?? ''}
            onChange={(event) =>
              setSceneFilter({
                dayNight: (event.target.value || undefined) as DayNight | undefined
              })
            }
          >
            <option value="">{t.filterAll}</option>
            {(['day', 'night', 'other'] as const).map((value) => (
              <option key={value} value={value}>
                {t.dayNight[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t.filterCharacter}</span>
          <select
            value={filter.character ?? ''}
            onChange={(event) => setSceneFilter({ character: event.target.value || undefined })}
          >
            <option value="">{t.filterAll}</option>
            {choices.characters.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <div className="shooting-filter-actions">
          <label className="planning-check">
            <input
              type="checkbox"
              checked={grouped}
              onChange={(event) => setGrouped(event.target.checked)}
            />
            <span>{t.groupByLocation}</span>
          </label>
          {filtered && (
            <button className="link-button" onClick={clearSceneFilter}>
              {t.clearFilters}
            </button>
          )}
        </div>
      </div>

      {all.length === 0 && <p className="muted">{t.noScene}</p>}
      {all.length > 0 && unplanned.length > 0 && shown.length === 0 && (
        <p className="muted">{t.noMatch}</p>
      )}
      {grouped ? (
        groupByLocation(shown).map((group) => (
          <section
            key={group.location || '—'}
            className="shooting-group"
            data-group={group.location}
          >
            <h3>{group.location || t.noLocation}</h3>
            <ul className="shooting-list">{group.scenes.map(card)}</ul>
          </section>
        ))
      ) : (
        <ul className="shooting-list">{shown.map(card)}</ul>
      )}
      {unplanned.length < all.length && (
        <p className="muted shooting-drop-hint">{t.dropToUnplan}</p>
      )}
    </aside>
  )
}
