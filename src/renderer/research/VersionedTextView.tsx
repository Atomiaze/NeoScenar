import { useEffect, useRef, useState } from 'react'
import { parseVersions, writeVersions } from '../../shared/versionedTexts'
import type { VersionedTextName } from '../../shared/projectTexts'
import { Icon } from '../components/Icon'
import { Dialog } from '../components/Dialog'
import { fr } from '../i18n/fr'
import { showResearchError } from './researchStore'

const t = fr.research.versions

/** Une version à l'écran : l'identifiant garde le champ stable quand on en supprime une autre. */
interface Entry {
  id: number
  text: string
  retained: boolean
}

let nextId = 1
const toEntries = (source: string): Entry[] =>
  parseVersions(source).map((version) => ({ ...version, id: nextId++ }))
const serialize = (entries: Entry[]): string => writeVersions(entries)

/**
 * Log line ou tag line : plusieurs versions, une seule retenue pour la page de titre du PDF.
 * Enregistré automatiquement, relu au retour dans l'application si le fichier a changé ailleurs.
 */
export function VersionedTextView({ name }: { name: VersionedTextName }) {
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [toDelete, setToDelete] = useState<number | null>(null)
  // Dernier contenu connu du fichier : sert à repérer une modification extérieure.
  const latest = useRef<string | null>(null)
  const title = fr.research.comingSoonViews[name].title

  useEffect(() => {
    let cancelled = false
    const load = async (): Promise<void> => {
      const result = await window.neoscenar.readProjectText(name)
      if (cancelled) return
      if (!result.ok) {
        showResearchError(result.error)
        return
      }
      if (result.value === latest.current) return
      latest.current = result.value
      setEntries(toEntries(result.value))
    }
    void load()
    const reload = (): void => void load()
    window.addEventListener('focus', reload)
    return () => {
      cancelled = true
      window.removeEventListener('focus', reload)
    }
  }, [name])

  const update = (next: Entry[]): void => {
    setEntries(next)
    const source = serialize(next)
    latest.current = source
    void window.neoscenar.writeProjectText(name, source).then((written) => {
      if (!written.ok) showResearchError(written.error)
    })
  }

  if (!entries) return <p className="panel-empty">{fr.research.loading}</p>

  const change = (id: number, patch: Partial<Entry>): void =>
    update(
      entries.map((entry) => {
        if (entry.id === id) return { ...entry, ...patch }
        // Une seule version retenue : en cocher une décoche les autres.
        return patch.retained ? { ...entry, retained: false } : entry
      })
    )
  const remove = (id: number): void => update(entries.filter((entry) => entry.id !== id))
  const askRemove = (entry: Entry): void =>
    entry.text.trim() === '' ? remove(entry.id) : setToDelete(entry.id)

  return (
    <article className="sheet research-form versions-view" aria-label={title}>
      <header className="research-sheet-header">
        <h2>{title}</h2>
        <button
          type="button"
          className="tool-button"
          title={t.add}
          aria-label={t.add}
          onClick={() => update([...entries, { id: nextId++, text: '', retained: false }])}
        >
          <Icon name="plus" size={18} />
        </button>
      </header>
      <p className="muted">{t[name].intro}</p>
      {entries.length === 0 && <p className="panel-empty">{t.empty}</p>}
      {entries.map((entry, index) => (
        <section key={entry.id} className="version-block" aria-label={t.version(index + 1)}>
          <div className="version-head">
            <h3>{t.version(index + 1)}</h3>
            <label className="version-retained">
              <input
                type="checkbox"
                checked={entry.retained}
                onChange={(event) => change(entry.id, { retained: event.target.checked })}
              />
              {t.retained}
            </label>
            <button
              type="button"
              className="tool-button"
              title={t.remove}
              aria-label={t.remove}
              onClick={() => askRemove(entry)}
            >
              <Icon name="trash" size={18} />
            </button>
          </div>
          <textarea
            rows={3}
            spellCheck
            value={entry.text}
            aria-label={t.version(index + 1)}
            onChange={(event) => change(entry.id, { text: event.target.value })}
          />
        </section>
      ))}
      <span className="field-help">{t.hint}</span>
      {toDelete !== null && (
        <Dialog
          title={t.deleteTitle}
          role="alertdialog"
          onClose={() => setToDelete(null)}
          actions={
            <>
              <button onClick={() => setToDelete(null)}>{fr.research.cancel}</button>
              <button
                className="danger"
                onClick={() => {
                  remove(toDelete)
                  setToDelete(null)
                }}
              >
                {fr.research.confirmDelete}
              </button>
            </>
          }
        >
          <p>{t.deleteMessage}</p>
        </Dialog>
      )}
    </article>
  )
}
