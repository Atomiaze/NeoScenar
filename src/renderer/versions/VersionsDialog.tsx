import { useCallback, useState } from 'react'
import { formatDuration } from '../../shared/decoupage'
import { formatVersionDate, type VersionEntry } from '../../shared/versions/versions'
import { Dialog } from '../components/Dialog'
import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'
import {
  closeVersions,
  deleteVersion,
  duplicateVersion,
  restoreVersion,
  saveVersion,
  versionsStore
} from './versionsStore'
import { VersionCompare } from './VersionCompare'
import { VersionConsult } from './VersionConsult'
import './versions.css'

const t = fr.versions

type Step =
  | { kind: 'list' }
  | { kind: 'save' }
  | { kind: 'restore' }
  | { kind: 'remove' }
  | { kind: 'consult' }
  | { kind: 'compare' }

/** Fenêtre « Versions… » : liste des versions et actions sur la version choisie. */
export function VersionsDialog() {
  const list = useStore(versionsStore, (state) => state.list)
  const busy = useStore(versionsStore, (state) => state.busy)
  const error = useStore(versionsStore, (state) => state.error)
  const [selected, setSelected] = useState<string | null>(null)
  const [step, setStep] = useState<Step>({ kind: 'list' })
  const close = useCallback(() => closeVersions(), [])
  const back = useCallback(() => setStep({ kind: 'list' }), [])

  const entry = list?.versions.find((item) => item.folder === selected) ?? null
  const usable = entry !== null && !entry.broken

  if (step.kind === 'consult' && entry && !entry.broken)
    return <VersionConsult folder={entry.folder} onBack={back} />
  if (step.kind === 'compare' && entry && !entry.broken && list)
    return <VersionCompare versions={list.versions} initial={entry.folder} onBack={back} />
  if (step.kind === 'save')
    return <SaveVersionDialog suggested={list?.suggestedName ?? ''} onBack={back} />
  if (step.kind === 'restore' && entry && !entry.broken)
    return (
      <ConfirmDialog
        title={t.restoreTitle}
        message={t.restoreMessage(entry.name)}
        button={t.restoreButton}
        onCancel={back}
        onConfirm={() => void restoreVersion(entry)}
      />
    )
  if (step.kind === 'remove' && entry)
    return (
      <ConfirmDialog
        title={t.removeTitle}
        message={t.removeMessage(entry.broken ? entry.folder : entry.name)}
        button={t.removeButton}
        onCancel={back}
        onConfirm={() => {
          back()
          setSelected(null)
          void deleteVersion(entry)
        }}
      />
    )

  return (
    <Dialog
      title={t.title}
      onClose={close}
      className="versions-dialog"
      actions={
        <>
          <button disabled={busy || !entry} onClick={() => setStep({ kind: 'remove' })}>
            {t.remove}
          </button>
          <button disabled={busy || !usable} onClick={() => entry && void duplicateVersion(entry)}>
            {t.duplicate}
          </button>
          <button disabled={busy || !usable} onClick={() => setStep({ kind: 'consult' })}>
            {t.consult}
          </button>
          <button disabled={busy || !usable} onClick={() => setStep({ kind: 'compare' })}>
            {t.compare}
          </button>
          <button disabled={busy || !usable} onClick={() => setStep({ kind: 'restore' })}>
            {t.restore}
          </button>
          <span className="versions-spacer" />
          <button onClick={close}>{t.close}</button>
          <button className="primary" disabled={busy} onClick={() => setStep({ kind: 'save' })}>
            {t.save}
          </button>
        </>
      }
    >
      <p className="muted">{t.intro}</p>
      {error && <p className="error-text">{error}</p>}
      {list === null ? (
        <p className="muted">{t.loading}</p>
      ) : list.versions.length === 0 ? (
        <p className="muted">{t.empty}</p>
      ) : (
        <VersionTable versions={list.versions} selected={selected} onSelect={setSelected} />
      )}
    </Dialog>
  )
}

function VersionTable({
  versions,
  selected,
  onSelect
}: {
  versions: VersionEntry[]
  selected: string | null
  onSelect(folder: string): void
}) {
  return (
    <div className="versions-table-wrap">
      <table className="versions-table" role="grid">
        <thead>
          <tr>
            <th>{t.columns.name}</th>
            <th>{t.columns.date}</th>
            <th className="number">{t.columns.pages}</th>
            <th className="number">{t.columns.duration}</th>
            <th>{t.columns.note}</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((entry) => (
            <tr
              key={entry.folder}
              className={entry.folder === selected ? 'selected' : undefined}
              aria-selected={entry.folder === selected}
              onClick={() => onSelect(entry.folder)}
            >
              {entry.broken ? (
                <>
                  <td className="broken">{t.brokenLabel}</td>
                  <td colSpan={4} className="muted" title={t.brokenHint}>
                    {entry.folder}
                  </td>
                </>
              ) : (
                <>
                  <td>{entry.name}</td>
                  <td>{formatVersionDate(new Date(entry.createdAt))}</td>
                  <td className="number">{t.pages(entry.pages)}</td>
                  <td className="number">{formatDuration(entry.seconds)}</td>
                  <td className="note">{entry.note}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SaveVersionDialog({ suggested, onBack }: { suggested: string; onBack(): void }) {
  const busy = useStore(versionsStore, (state) => state.busy)
  const error = useStore(versionsStore, (state) => state.error)
  const [name, setName] = useState(suggested)
  const [note, setNote] = useState('')

  const submit = async (): Promise<void> => {
    if (busy || name.trim() === '') return
    if (await saveVersion(name, note)) onBack()
  }

  return (
    <Dialog
      title={t.saveTitle}
      onClose={onBack}
      actions={
        <>
          <button onClick={onBack}>{t.cancel}</button>
          <button
            className="primary"
            disabled={busy || name.trim() === ''}
            onClick={() => void submit()}
          >
            {t.saveButton}
          </button>
        </>
      }
    >
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <label className="field">
          <span className="field-label">{t.nameLabel}</span>
          <input
            type="text"
            autoFocus
            value={name}
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
          />
          {name.trim() === '' && <span className="field-error">{t.nameRequired}</span>}
        </label>
        <label className="field">
          <span className="field-label">{t.noteLabel}</span>
          <textarea
            className="versions-note"
            rows={3}
            value={note}
            placeholder={t.notePlaceholder}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        {error && <p className="error-text">{error}</p>}
      </form>
    </Dialog>
  )
}

function ConfirmDialog({
  title,
  message,
  button,
  onCancel,
  onConfirm
}: {
  title: string
  message: string
  button: string
  onCancel(): void
  onConfirm(): void
}) {
  return (
    <Dialog
      title={title}
      onClose={onCancel}
      role="alertdialog"
      actions={
        <>
          <button onClick={onCancel}>{t.cancel}</button>
          <button className="primary" onClick={onConfirm}>
            {button}
          </button>
        </>
      }
    >
      <p>{message}</p>
    </Dialog>
  )
}
