import { personKey } from '../../shared/planning/crew'
import { fr } from '../i18n/fr'
import { showCredits } from '../research/researchStore'
import { useStore } from '../state/createStore'
import { CommitField } from './CommitField'
import {
  closePanel,
  openDialog,
  planningStore,
  rememberOpenTask,
  saveTaskFields
} from './planningStore'

const t = fr.planning

/**
 * Panneau latéral d'une tâche. Tout s'enregistre au fil de l'eau : chaque champ modifié est une
 * étape d'annulation, et il n'y a ni bouton « Enregistrer » ni « Annuler ».
 */
export function TaskPanel() {
  const panel = useStore(planningStore, (state) => state.panel)
  const planning = useStore(planningStore, (state) => state.planning)
  const crew = useStore(planningStore, (state) => state.crew)
  const task = panel ? planning?.taches.find((item) => item.id === panel.taskId) : undefined
  if (!panel || !planning || !task) return null

  const save = (fields: Parameters<typeof saveTaskFields>[1]): void =>
    saveTaskFields(task.id, fields)

  // Noms de la tâche absents du générique : gardés, et signalés.
  const crewKeys = new Set(crew.map((member) => personKey(member.nom)))
  const orphans = task.personnes.filter((name) => !crewKeys.has(personKey(name)))
  const selected = new Set(task.personnes.map(personKey))
  const toggle = (name: string): void => {
    const key = personKey(name)
    save({
      personnes: selected.has(key)
        ? task.personnes.filter((item) => personKey(item) !== key)
        : [...task.personnes, name]
    })
  }

  return (
    <aside
      className="planning-panel"
      aria-label={t.panelTitle}
      onKeyDown={(event) => {
        if (event.key === 'Escape') closePanel()
      }}
    >
      <div className="planning-panel-head">
        <h2>{t.panelTitle}</h2>
        <button onClick={closePanel}>{t.close}</button>
      </div>

      <label className="field">
        <span className="field-label">{t.fieldTitle}</span>
        {/* Une tâche différente = un champ neuf (la clé), pour ne pas garder la saisie de l'autre. */}
        <CommitField
          key={`${task.id}-titre`}
          kind="text"
          value={task.titre}
          selectOnMount={panel.fresh}
          // Un titre effacé redevient « Sans titre » plutôt que vide.
          onCommit={(value) => save({ titre: value.trim() === '' ? t.untitled : value.trim() })}
        />
      </label>

      <label className="field">
        <span className="field-label">{t.fieldPhase}</span>
        <select value={task.phase} onChange={(event) => save({ phase: event.target.value })}>
          {planning.phases.map((phase) => (
            <option key={phase.id} value={phase.id}>
              {phase.nom}
            </option>
          ))}
        </select>
      </label>

      <div className="planning-dates">
        <label className="field">
          <span className="field-label">{t.fieldStart}</span>
          <CommitField
            key={`${task.id}-debut`}
            kind="date"
            value={task.debut ?? ''}
            onCommit={(value) => save({ debut: value === '' ? null : value })}
          />
        </label>
        <label className="field">
          <span className="field-label">{t.fieldDue}</span>
          <CommitField
            key={`${task.id}-echeance`}
            kind="date"
            value={task.echeance ?? ''}
            onCommit={(value) => save({ echeance: value === '' ? null : value })}
          />
        </label>
      </div>

      <label className="planning-check">
        <input
          type="checkbox"
          checked={task.faite}
          onChange={(event) => save({ faite: event.target.checked })}
        />
        <span>{t.fieldDone}</span>
      </label>
      <label className="planning-check">
        <input
          type="checkbox"
          checked={task.validee}
          onChange={(event) => save({ validee: event.target.checked })}
        />
        <span>{t.fieldValidated}</span>
      </label>

      <fieldset className="planning-people-field">
        <legend className="field-label">{t.fieldPeople}</legend>
        {crew.length === 0 && orphans.length === 0 && <p className="muted">{t.noPeople}</p>}
        {crew.map((member) => (
          <label key={member.nom} className="planning-check">
            <input
              type="checkbox"
              checked={selected.has(personKey(member.nom))}
              onChange={() => toggle(member.nom)}
            />
            <span>
              {member.nom} <span className="muted">· {member.rubriques.join(', ')}</span>
            </span>
          </label>
        ))}
        {orphans.map((name) => (
          <label key={name} className="planning-check">
            <input type="checkbox" checked onChange={() => toggle(name)} />
            <span>
              {name} <span className="muted">· {t.noLongerCredited}</span>
            </span>
          </label>
        ))}
        <button
          type="button"
          className="link-button"
          onClick={() => {
            rememberOpenTask()
            showCredits()
          }}
        >
          {t.addToCredits}
        </button>
      </fieldset>

      <label className="field">
        <span className="field-label">{t.fieldNote}</span>
        <CommitField
          key={`${task.id}-note`}
          kind="note"
          value={task.note}
          onCommit={(value) => save({ note: value })}
        />
      </label>

      <div className="planning-panel-actions">
        <button
          className="danger"
          onClick={() => openDialog({ kind: 'deleteTask', taskId: task.id })}
        >
          {t.deleteTask}
        </button>
      </div>
    </aside>
  )
}
