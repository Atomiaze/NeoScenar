import { useState } from 'react'
import type { ExtraPresent } from '../../../shared/planning/shootingTypes'
import { fr } from '../../i18n/fr'
import { CommitField } from '../CommitField'
import { addPresent, deletePresent, savePresent } from '../shootingStore'

const t = fr.shooting

/** « Présents en plus » d'un jour : lignes libres (nom + rôle facultatif), ajoutées à la main. */
export function ShootingDayPresents({
  dayId,
  presents
}: {
  dayId: string
  presents: readonly ExtraPresent[]
}) {
  const [nom, setNom] = useState('')
  const [role, setRole] = useState('')

  const add = (): void => {
    if (nom.trim() === '') return
    addPresent(dayId, nom, role)
    setNom('')
    setRole('')
  }
  const onEnter = (event: React.KeyboardEvent): void => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    add()
  }

  return (
    <div className="shooting-day-presents" data-presents>
      <h4 className="field-label">{t.dayPresents}</h4>
      <ul>
        {presents.map((present) => (
          <li key={present.id} data-present={present.nom}>
            <CommitField
              key={`${present.id}-nom`}
              kind="text"
              label={t.presentName}
              value={present.nom}
              onCommit={(value) => savePresent(dayId, present.id, { nom: value })}
            />
            <CommitField
              key={`${present.id}-role`}
              kind="text"
              label={t.presentRole}
              placeholder={t.presentRole}
              value={present.role}
              onCommit={(value) => savePresent(dayId, present.id, { role: value })}
            />
            <button
              className="icon-button"
              title={t.presentDelete(present.nom)}
              aria-label={t.presentDelete(present.nom)}
              onClick={() => deletePresent(dayId, present.id)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="shooting-day-presents-add">
        <input
          type="text"
          data-present-new="nom"
          aria-label={t.presentName}
          placeholder={t.presentName}
          value={nom}
          onChange={(event) => setNom(event.target.value)}
          onKeyDown={onEnter}
        />
        <input
          type="text"
          data-present-new="role"
          aria-label={t.presentRole}
          placeholder={t.presentRole}
          value={role}
          onChange={(event) => setRole(event.target.value)}
          onKeyDown={onEnter}
        />
        <button
          className="icon-button"
          data-present-add
          title={t.presentAdd}
          aria-label={t.presentAdd}
          disabled={nom.trim() === ''}
          onClick={add}
        >
          +
        </button>
      </div>
      <p className="muted shooting-panel-hint">{t.dayPresentsHint}</p>
    </div>
  )
}
