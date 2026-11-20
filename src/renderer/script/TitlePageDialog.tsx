import { useEffect, useState } from 'react'
import {
  readTitlePage,
  TITLE_PAGE_FIELDS,
  type TitlePageField,
  type TitlePageValues
} from '@neoscenar/fountain'
import { Dialog } from '../components/Dialog'
import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'
import { closeTitlePage, loadScenario, saveTitlePage, scriptStore } from './scriptStore'

const t = fr.script.titlePage

/** Champs sur plusieurs lignes ; les autres tiennent sur une ligne. */
const MULTILINE: ReadonlySet<TitlePageField> = new Set(['Author', 'Contact', 'Notes'])
/** Champs où le correcteur orthographique est utile (pas les adresses ni les champs d'une ligne). */
const SPELLCHECKED: ReadonlySet<TitlePageField> = new Set(['Author', 'Notes'])

/**
 * Fenêtre « Page de titre… » : les valeurs sont affichées telles qu'elles sont dans le fichier
 * (marqueurs de mise en forme compris). Rien n'est écrit avant « Valider ».
 */
export function TitlePageDialog({
  projectId,
  projectTitle
}: {
  projectId: string
  projectTitle: string
}) {
  const parts = useStore(scriptStore, (state) => state.parts)

  useEffect(() => {
    void loadScenario(projectId)
  }, [projectId])

  if (!parts) {
    return (
      <Dialog title={t.title} onClose={closeTitlePage} className="title-page-dialog" actions={null}>
        <p className="muted">{t.loading}</p>
      </Dialog>
    )
  }
  // Sans titre dans le scénario, celui du projet est proposé.
  const read = readTitlePage(parts.titlePage)
  return <TitlePageForm initial={{ ...read, Title: read.Title || projectTitle }} />
}

function TitlePageForm({ initial }: { initial: TitlePageValues }) {
  const [values, setValues] = useState(initial)
  const [saving, setSaving] = useState(false)
  const set = (field: TitlePageField, value: string): void =>
    setValues((current) => ({ ...current, [field]: value }))

  return (
    <Dialog
      title={t.title}
      onClose={closeTitlePage}
      className="title-page-dialog"
      actions={
        <>
          <button onClick={closeTitlePage}>{t.cancel}</button>
          <button
            className="primary"
            disabled={saving}
            onClick={() => {
              setSaving(true)
              void saveTitlePage(values).finally(() => setSaving(false))
            }}
          >
            {t.validate}
          </button>
        </>
      }
    >
      <div className="title-page-fields">
        {TITLE_PAGE_FIELDS.map((field) => (
          <label key={field} className="title-page-field">
            <span>{t.fields[field]}</span>
            {MULTILINE.has(field) ? (
              <textarea
                spellCheck={SPELLCHECKED.has(field)}
                rows={3}
                value={values[field]}
                onChange={(event) => set(field, event.target.value)}
              />
            ) : (
              <input
                type="text"
                spellCheck={false}
                value={values[field]}
                autoFocus={field === 'Title'}
                onChange={(event) => set(field, event.target.value)}
              />
            )}
            {t.help[field] && <small className="muted">{t.help[field]}</small>}
          </label>
        ))}
      </div>
    </Dialog>
  )
}
