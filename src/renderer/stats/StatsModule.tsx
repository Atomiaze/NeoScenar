import { useMemo } from 'react'
import { paginate, parse } from '@neoscenar/fountain'
import { formatDuration } from '../../shared/decoupage'
import { withoutDrafts } from '../../shared/scriptLink/draftScene'
import { computeStats, shotSecondsByNumber } from '../../shared/stats/computeStats'
import { cardsStore } from '../cards/cardsStore'
import { fr } from '../i18n/fr'
import { sectionColorsOf } from '../script/editor/analysis'
import { scriptLayout } from '../script/layoutProfile'
import { paginationSettings } from '../script/editor/paginationSettings'
import { scriptText } from '../script/scriptStore'
import { useStore } from '../state/createStore'
import { ActivityGrid, DynamicsChart, DynamicsLegend, PlaceBars, SpeechBars } from './StatsCharts'
import './stats.css'

interface StatsModuleProps {
  onOpenScene(line: number): void
  onOpenCharacter(name: string): void
}

/** Module Statistiques : tout est recalculé à l'ouverture, à partir du texte du scénario. */
export function StatsModule({ onOpenScene, onOpenCharacter }: StatsModuleProps) {
  const cards = useStore(cardsStore, (state) => state.history)
  // Le module n'existe que pendant qu'il est affiché : un calcul par ouverture.
  const computed = useMemo(() => {
    const text = scriptText()
    if (text === null) return null
    // Les scènes brouillon ne comptent pas (18C-13) : ni pages, ni scènes, ni personnages, ni lieux.
    const doc = withoutDrafts(parse(text, { titlePage: false }))
    const shots = shotSecondsByNumber(cards?.present.scenes ?? [])
    const stats = computeStats(doc, paginate(doc, scriptLayout, paginationSettings.get()), shots)
    const actTitles = new Map(
      doc.elements.flatMap((element, index) =>
        element.type === 'section' ? [[index, element.text.trim()] as const] : []
      )
    )
    return { stats, actColors: sectionColorsOf(doc), actTitles }
  }, [cards])

  if (!computed) return <p className="cards-message muted">{fr.stats.loading}</p>
  const { stats, actColors, actTitles } = computed
  const text = fr.stats

  return (
    <div className="stats-module">
      <h1>{text.title}</h1>
      {stats.sceneCount === 0 ? (
        <p className="muted">{text.empty}</p>
      ) : (
        <>
          <section aria-labelledby="stats-summary">
            <h2 id="stats-summary">{text.summary.title}</h2>
            <dl className="stats-tiles">
              <Tile label={text.summary.pages} value={String(stats.pages)} id="pages" />
              <Tile
                label={text.summary.duration}
                value={formatDuration(stats.seconds)}
                id="duration"
              />
              <Tile
                label={text.summary.shotsDuration}
                value={stats.shotSeconds === null ? '—' : formatDuration(stats.shotSeconds)}
                note={stats.shotSeconds === null ? text.summary.shotsDurationNone : undefined}
                id="shots-duration"
              />
              <Tile label={text.summary.scenes} value={String(stats.sceneCount)} id="scenes" />
              <Tile
                label={text.summary.characters}
                value={String(stats.speakingCharacters)}
                id="characters"
              />
              <Tile label={text.summary.places} value={String(stats.locationCount)} id="places" />
            </dl>
          </section>
          <section aria-labelledby="stats-speech">
            <h2 id="stats-speech">{text.speech.title}</h2>
            <p className="muted">{text.speech.hint}</p>
            <SpeechBars stats={stats} onOpenCharacter={onOpenCharacter} />
          </section>
          <section aria-labelledby="stats-activity">
            <h2 id="stats-activity">{text.activity.title}</h2>
            <p className="muted">{text.activity.hint}</p>
            <ActivityGrid
              stats={stats}
              onOpenScene={onOpenScene}
              onOpenCharacter={onOpenCharacter}
            />
            <p className="stats-legend">
              <span className="stats-legend-item">
                <i className="stats-swatch stats-cell speaks" />
                {text.activity.speaks}
              </span>
              <span className="stats-legend-item">
                <i className="stats-swatch stats-cell named" />
                {text.activity.named}
              </span>
            </p>
          </section>
          <section aria-labelledby="stats-dynamics">
            <h2 id="stats-dynamics">{text.dynamics.title}</h2>
            <p className="muted">{text.dynamics.hint}</p>
            <DynamicsChart stats={stats} actColors={actColors} onOpenScene={onOpenScene} />
            <DynamicsLegend stats={stats} actTitles={actTitles} actColors={actColors} />
          </section>
          <section aria-labelledby="stats-places">
            <h2 id="stats-places">{text.places.title}</h2>
            <PlaceBars stats={stats} />
          </section>
        </>
      )}
    </div>
  )
}

function Tile({
  label,
  value,
  note,
  id
}: {
  label: string
  value: string
  note?: string
  id: string
}) {
  return (
    <div className="stats-tile" data-tile={id}>
      <dt>{label}</dt>
      <dd>{value}</dd>
      {note && <small className="muted">{note}</small>}
    </div>
  )
}
