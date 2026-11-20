import { useState, type DragEvent } from 'react'
import type { DayView } from '../../../shared/planning/shootingTypes'
import { formatEighths } from '../../../shared/planning/shootingView'
import { Icon } from '../../components/Icon'
import { fr } from '../../i18n/fr'
import { CommitField } from '../CommitField'
import {
  askDeleteShootingDay,
  dropSceneOnDay,
  saveShootingDay,
  unplanScene
} from '../shootingStore'
import { SCENE_DRAG_TYPE, ShootingSceneCard, readSceneDrag } from './ShootingSceneCard'

const t = fr.shooting

interface ShootingDayColumnProps {
  view: DayView
  /** Rang du jour (1, 2, 3…) dans l'ordre des dates. */
  rank: number
  twice: ReadonlySet<string>
  selectedCardId: string | null
  focused: boolean
}

/** Place visée sous le pointeur : avant ou après la scène survolée, sinon à la fin. */
function hoverIndexOf(event: DragEvent<HTMLElement>, count: number): number {
  const item = (event.target as Element).closest<HTMLElement>('[data-index]')
  if (!item) return count
  const box = item.getBoundingClientRect()
  const index = Number(item.dataset.index)
  return event.clientY < box.top + box.height / 2 ? index : index + 1
}

/** Un jour de tournage : date, intitulé, total, lieux, interprètes convoqués, scènes, note. */
export function ShootingDayColumn({
  view,
  rank,
  twice,
  selectedCardId,
  focused
}: ShootingDayColumnProps) {
  const { day } = view
  const [dropAt, setDropAt] = useState<number | null>(null)
  const name = day.titre !== '' ? day.titre : t.dayDefaultName(rank)

  return (
    <section
      className={`shooting-day${focused ? ' focused' : ''}${dropAt !== null ? ' drop-target' : ''}`}
      data-day-id={day.id}
      data-day={day.date ?? ''}
      aria-label={name}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(SCENE_DRAG_TYPE)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        setDropAt(hoverIndexOf(event, day.scenes.length))
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropAt(null)
      }}
      onDrop={(event) => {
        const drag = readSceneDrag(event.dataTransfer)
        const index = hoverIndexOf(event, day.scenes.length)
        setDropAt(null)
        if (!drag) return
        event.preventDefault()
        dropSceneOnDay(drag.cardId, drag.fromDayId, day.id, index)
      }}
    >
      <header className="shooting-day-head">
        <div className="shooting-day-line">
          <CommitField
            key={`${day.id}-date`}
            kind="date"
            label={t.dayDate}
            value={day.date ?? ''}
            onCommit={(value) => saveShootingDay(day.id, { date: value === '' ? null : value })}
          />
          <button
            className="icon-button"
            title={t.deleteDay}
            aria-label={t.deleteDay}
            onClick={() => askDeleteShootingDay(day.id)}
          >
            <Icon name="eraser" size={16} />
          </button>
        </div>
        <CommitField
          key={`${day.id}-titre`}
          kind="text"
          label={t.dayTitle}
          placeholder={t.dayTitle}
          value={day.titre}
          onCommit={(value) => saveShootingDay(day.id, { titre: value })}
        />
        <div className="shooting-day-total" data-total>
          {t.dayTotal(formatEighths(view.eighths))}
        </div>
        {view.locations.length > 0 && (
          <div className="shooting-day-info">
            <span className="muted">{t.dayLocations} : </span>
            {view.locations.join(', ')}
          </div>
        )}
        {view.called.length > 0 && (
          <div className="shooting-day-info" data-called>
            <span className="muted">{t.dayCalled} : </span>
            {view.called
              .map((item) => `${item.interprete} (${item.personnages.join(', ')})`)
              .join(', ')}
          </div>
        )}
        {view.withoutInterpreter.length > 0 && (
          <div className="shooting-day-info warning">
            <span>{t.dayNoInterpreter} : </span>
            {view.withoutInterpreter.join(', ')}
          </div>
        )}
      </header>

      <ol className="shooting-day-scenes">
        {view.entries.map((entry, index) => (
          <li
            key={entry.cardId}
            data-index={index}
            className={dropAt === index ? 'drop-before' : undefined}
          >
            <ShootingSceneCard
              scene={entry.scene}
              entry={entry}
              fromDayId={day.id}
              twice={twice.has(entry.cardId)}
              selected={selectedCardId === entry.cardId}
              onRemove={() => unplanScene(day.id, entry.cardId)}
            />
          </li>
        ))}
        <li className={`shooting-day-end${dropAt === view.entries.length ? ' drop-before' : ''}`}>
          {view.entries.length === 0 && <span className="muted">{t.dayEmpty}</span>}
        </li>
      </ol>

      <CommitField
        key={`${day.id}-note`}
        kind="note"
        label={t.dayNote}
        placeholder={t.dayNote}
        value={day.note}
        onCommit={(value) => saveShootingDay(day.id, { note: value })}
      />
    </section>
  )
}
