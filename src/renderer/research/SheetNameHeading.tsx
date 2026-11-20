import { useRef, useState } from 'react'
import type { Sheet } from '../../shared/research/types'
import { fr } from '../i18n/fr'
import { requestRename } from './sheetRename'

const t = fr.research

/**
 * Nom en haut de la fiche. Un clic le rend modifiable : Entrée (ou un clic ailleurs) renomme,
 * Échap annule. Le remplacement dans le scénario est demandé dans une fenêtre (étape 10D).
 */
export function SheetNameHeading({ sheet }: { sheet: Sheet }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(sheet.nom)
  const [error, setError] = useState<string | null>(null)
  // La fenêtre de confirmation prend le focus : le champ perd alors le sien pendant la demande.
  const busy = useRef(false)

  const start = (): void => {
    setValue(sheet.nom)
    setError(null)
    setEditing(true)
  }

  const submit = async (): Promise<void> => {
    if (busy.current) return
    busy.current = true
    const message = await requestRename(sheet.fileName, value)
    busy.current = false
    setError(message)
    if (message === null) setEditing(false)
  }

  if (!editing) {
    return (
      <h2>
        <button
          type="button"
          className="sheet-name-button"
          title={t.renameHint}
          disabled={sheet.unreadable}
          onClick={start}
        >
          {sheet.nom}
        </button>
      </h2>
    )
  }
  return (
    <div className="sheet-name-edit">
      <input
        type="text"
        className="sheet-name-input"
        aria-label={t.fields.nom}
        autoFocus
        value={value}
        aria-invalid={error !== null}
        onChange={(event) => {
          setValue(event.target.value)
          setError(null)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            void submit()
          } else if (event.key === 'Escape') {
            event.preventDefault()
            setEditing(false)
          }
        }}
        onBlur={() => void submit()}
      />
      {error && <span className="field-error">{error}</span>}
    </div>
  )
}
