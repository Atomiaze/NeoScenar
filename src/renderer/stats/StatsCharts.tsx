import { formatDuration } from '../../shared/decoupage'
import type { ScriptStats } from '../../shared/stats/computeStats'
import { fr } from '../i18n/fr'

interface Handlers {
  onOpenScene(line: number): void
  onOpenCharacter(name: string): void
}

/** Barres horizontales : une par personnage, triées du temps de parole le plus long au plus court. */
export function SpeechBars({
  stats,
  onOpenCharacter
}: { stats: ScriptStats } & Pick<Handlers, 'onOpenCharacter'>) {
  if (stats.speech.length === 0) return <p className="muted">{fr.stats.speech.none}</p>
  const longest = Math.max(...stats.speech.map((item) => item.seconds), 1)
  return (
    <ul className="stats-speech">
      {stats.speech.map((item) => (
        <li key={item.name}>
          <button
            className="stats-link"
            title={fr.stats.speech.openSheet(item.name)}
            onClick={() => onOpenCharacter(item.name)}
          >
            {item.name}
          </button>
          <svg className="stats-bar" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden>
            <rect className="stats-bar-bg" x="0" y="0" width="100" height="10" rx="2" />
            <rect
              className="stats-bar-fill"
              x="0"
              y="0"
              width={Math.max((item.seconds / longest) * 100, 1)}
              height="10"
              rx="2"
            />
          </svg>
          <span className="stats-figure">{formatDuration(item.seconds)}</span>
          <span className="muted stats-detail">
            {fr.stats.speech.detail(item.replies, item.words)}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Grille scènes (colonnes) × personnages (lignes). */
export function ActivityGrid({
  stats,
  onOpenScene,
  onOpenCharacter
}: { stats: ScriptStats } & Handlers) {
  if (stats.activity.length === 0) return <p className="muted">{fr.stats.speech.none}</p>
  const lines = stats.scenes.map((scene) => scene.line)
  return (
    <div className="stats-scroll">
      <table className="stats-grid">
        <thead>
          <tr>
            <th />
            {stats.activityScenes.map((scene, column) => (
              <th key={scene.index} title={scene.label}>
                {column + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stats.activity.map((row) => (
            <tr key={row.name}>
              <th scope="row">
                <button
                  className="stats-link"
                  title={fr.stats.speech.openSheet(row.name)}
                  onClick={() => onOpenCharacter(row.name)}
                >
                  {row.name}
                </button>
              </th>
              {row.cells.map((cell, column) => {
                const label = stats.activityScenes[column].label
                const state =
                  cell === 'speaks'
                    ? fr.stats.activity.speaks
                    : cell === 'named'
                      ? fr.stats.activity.named
                      : fr.stats.activity.absent
                return (
                  <td key={column}>
                    <button
                      className={`stats-cell ${cell ?? 'absent'}`}
                      data-state={cell ?? 'absent'}
                      title={fr.stats.activity.cell(row.name, label, state)}
                      aria-label={fr.stats.activity.cell(row.name, label, state)}
                      onClick={() => onOpenScene(lines[column])}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const BAR_WIDTH = 10
const BAR_GAP = 3
const CHART_HEIGHT = 120
const STRIP = 8

/** Une barre par scène : hauteur = durée, couleur = acte ; repères INT/EXT et JOUR/NUIT dessous. */
export function DynamicsChart({
  stats,
  actColors,
  onOpenScene
}: {
  stats: ScriptStats
  actColors: ReadonlyMap<number, string>
} & Pick<Handlers, 'onOpenScene'>) {
  const longest = Math.max(...stats.scenes.map((scene) => scene.seconds), 1)
  const width = stats.scenes.length * (BAR_WIDTH + BAR_GAP)
  const height = CHART_HEIGHT + 2 * (STRIP + 3)
  return (
    <div className="stats-scroll">
      <svg
        className="stats-dynamics"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={fr.stats.dynamics.title}
      >
        {stats.scenes.map((scene, column) => {
          const x = column * (BAR_WIDTH + BAR_GAP)
          const barHeight = Math.max((scene.seconds / longest) * CHART_HEIGHT, 2)
          const color = scene.actIndex === null ? undefined : actColors.get(scene.actIndex)
          const title = fr.stats.dynamics.bar(
            scene.label,
            scene.heading,
            formatDuration(scene.seconds)
          )
          return (
            <g
              key={scene.index}
              className="stats-scene"
              data-scene={scene.label}
              role="button"
              tabIndex={0}
              aria-label={fr.stats.openScene(scene.label)}
              onClick={() => onOpenScene(scene.line)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onOpenScene(scene.line)
                }
              }}
            >
              <title>{title}</title>
              <rect
                x={x - BAR_GAP / 2}
                y="0"
                width={BAR_WIDTH + BAR_GAP}
                height={height}
                fill="transparent"
              />
              <rect
                className={`stats-scene-bar${color ? '' : ' no-act'}`}
                x={x}
                y={CHART_HEIGHT - barHeight}
                width={BAR_WIDTH}
                height={barHeight}
                rx="1.5"
                style={color ? { fill: color } : undefined}
              />
              <rect
                className={`stats-int-ext ${scene.intExt}`}
                x={x}
                y={CHART_HEIGHT + 3}
                width={BAR_WIDTH}
                height={STRIP}
              />
              <rect
                className={`stats-day-night ${scene.dayNight}`}
                x={x}
                y={CHART_HEIGHT + 6 + STRIP}
                width={BAR_WIDTH}
                height={STRIP}
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function DynamicsLegend({
  stats,
  actTitles,
  actColors
}: {
  stats: ScriptStats
  actTitles: ReadonlyMap<number, string>
  actColors: ReadonlyMap<number, string>
}) {
  const used = [...new Set(stats.scenes.map((scene) => scene.actIndex))]
  const text = fr.stats.dynamics
  return (
    <div className="stats-legend">
      <p>
        {used.map((act) => (
          <span key={act ?? 'none'} className="stats-legend-item">
            <i
              className="stats-swatch"
              style={
                act !== null ? { background: actColors.get(act) } : { background: 'var(--muted)' }
              }
            />
            {act === null ? text.noAct : (actTitles.get(act) ?? '')}
          </span>
        ))}
      </p>
      <p>
        <strong>{text.intExt} :</strong>{' '}
        {(['int', 'ext', 'mixed'] as const).map((kind) => (
          <span key={kind} className="stats-legend-item">
            <i className={`stats-swatch stats-int-ext ${kind}`} />
            {text[kind]}
          </span>
        ))}
      </p>
      <p>
        <strong>{text.dayNight} :</strong>{' '}
        {(['day', 'night', 'other'] as const).map((kind) => (
          <span key={kind} className="stats-legend-item">
            <i className={`stats-swatch stats-day-night ${kind}`} />
            {text[kind]}
          </span>
        ))}
      </p>
    </div>
  )
}

/** Lieux : nombre de scènes et durée totale, le plus long en premier. */
export function PlaceBars({ stats }: { stats: ScriptStats }) {
  if (stats.locations.length === 0) return <p className="muted">{fr.stats.places.none}</p>
  const longest = Math.max(...stats.locations.map((place) => place.seconds), 1)
  return (
    <ul className="stats-speech">
      {stats.locations.map((place) => (
        <li key={place.name}>
          <span className="stats-name">{place.name}</span>
          <svg className="stats-bar" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden>
            <rect className="stats-bar-bg" x="0" y="0" width="100" height="10" rx="2" />
            <rect
              className="stats-bar-fill"
              x="0"
              y="0"
              width={Math.max((place.seconds / longest) * 100, 1)}
              height="10"
              rx="2"
            />
          </svg>
          <span className="stats-figure">{formatDuration(place.seconds)}</span>
          <span className="muted stats-detail">{fr.stats.places.detail(place.scenes)}</span>
        </li>
      ))}
    </ul>
  )
}
