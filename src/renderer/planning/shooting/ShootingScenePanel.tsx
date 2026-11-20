import type {
  BreakdownScene,
  CharacterSheetInfo,
  DayView
} from '../../../shared/planning/shootingTypes'
import { nameKey } from '../../../shared/research/sheetNames'
import { fr } from '../../i18n/fr'
import { formatDate } from '../dates'
import { addMute, closeScenePanel, removeMute, showShootingDay } from '../shootingStore'
import { lengthOf } from './ShootingSceneCard'

const t = fr.shooting

interface ShootingScenePanelProps {
  cardId: string
  scene: BreakdownScene | null
  days: DayView[]
  sheets: readonly CharacterSheetInfo[]
}

/** Détail d'une scène : longueur, personnages et interprètes, jours, personnages muets. */
export function ShootingScenePanel({ cardId, scene, days, sheets }: ShootingScenePanelProps) {
  const plannedIn = days.filter((view) => view.day.scenes.includes(cardId))
  const entry = plannedIn[0]?.entries.find((item) => item.cardId === cardId)
  const label = scene?.label ?? entry?.label ?? t.missingNoCard
  const heading = scene?.heading || entry?.heading || ''
  const present = new Set(scene?.characters.map((c) => nameKey(c.nom)) ?? [])
  const candidates = sheets
    .map((sheet) => sheet.nom)
    .filter((name) => !present.has(nameKey(name)))
    .sort((a, b) => a.localeCompare(b, 'fr'))

  return (
    <aside
      className="planning-panel shooting-panel"
      aria-label={t.panelTitle}
      data-scene-panel={label}
      onKeyDown={(event) => {
        if (event.key === 'Escape') closeScenePanel()
      }}
    >
      <div className="planning-panel-head">
        <h2>
          {t.panelTitle} {label}
        </h2>
        <button onClick={closeScenePanel}>{fr.planning.close}</button>
      </div>
      {heading !== '' && <p className="shooting-panel-heading">{heading}</p>}

      {scene === null ? (
        <p className="banner info">{t.panelMissing}</p>
      ) : (
        <>
          <p>
            <span className="muted">{t.panelLength} : </span>
            {lengthOf(scene)}
            {scene.eighths !== null && (
              <span className="muted">
                {' '}
                · {t.intExt[scene.intExt]} · {t.dayNight[scene.dayNight]}
              </span>
            )}
          </p>

          <h3 className="field-label">{t.panelCharacters}</h3>
          {scene.characters.length === 0 && <p className="muted">{t.panelNoCharacter}</p>}
          <ul className="shooting-panel-characters">
            {scene.characters.map((character) => (
              <li key={character.nom} data-character={character.nom}>
                <span>
                  {character.nom}
                  {character.muet && <span className="muted"> ({t.mute})</span>}
                </span>
                <span className={character.interprete === null ? 'shooting-warning-text' : 'muted'}>
                  {character.interprete ?? (character.sansFiche ? t.noSheet : t.noInterpreter)}
                </span>
                {character.muet && (
                  <button
                    className="icon-button"
                    title={t.removeMute(character.nom)}
                    aria-label={t.removeMute(character.nom)}
                    onClick={() => removeMute(cardId, character.nom)}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>

          <label className="field">
            <span className="field-label">{t.addMute}</span>
            {candidates.length === 0 ? (
              <span className="muted">{t.addMuteNone}</span>
            ) : (
              <select
                value=""
                data-add-mute
                onChange={(event) => {
                  if (event.target.value !== '') addMute(cardId, event.target.value)
                }}
              >
                <option value="">{t.addMuteChoose}</option>
                {candidates.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}
          </label>
          <p className="muted shooting-panel-hint">{t.addMuteHint}</p>
        </>
      )}

      <h3 className="field-label">{t.plannedOn}</h3>
      {plannedIn.length === 0 ? (
        <p className="muted">{t.notPlanned}</p>
      ) : (
        <ul className="shooting-panel-days">
          {plannedIn.map((view) => (
            <li key={view.day.id}>
              <button className="link-button" onClick={() => showShootingDay(view.day.id)}>
                {view.day.date ? formatDate(view.day.date) : t.noDate}
                {view.day.titre !== '' ? ` — ${view.day.titre}` : ''}
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
