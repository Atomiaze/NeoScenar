import { useEffect, useRef, useState } from 'react'
import { isIsoDate } from '../../shared/planning/planningData'
import { registerFieldFlusher } from './planningStore'

interface CommitFieldProps {
  kind: 'text' | 'date' | 'note'
  /** Valeur enregistrée dans le planning. */
  value: string
  label?: string
  placeholder?: string
  /** Sélectionne le contenu à l'apparition (titre d'une tâche qui vient d'être créée). */
  selectOnMount?: boolean
  onCommit(value: string): void
}

/**
 * Champ du panneau d'une tâche : la saisie reste ici, et n'est enregistrée que lorsqu'on quitte le
 * champ ou avec Entrée (une étape d'annulation par champ modifié). Une date complète est
 * enregistrée tout de suite ; l'effacer attend que l'on quitte le champ. Le panneau peut aussi
 * demander l'enregistrement (fermeture, changement de module).
 */
export function CommitField({
  kind,
  value,
  label,
  placeholder,
  selectOnMount,
  onCommit
}: CommitFieldProps) {
  // Une valeur qui change ailleurs (annulation, relecture) remplace la saisie.
  const [shown, setShown] = useState({ value, text: value })
  if (shown.value !== value) setShown({ value, text: value })
  const text = shown.text
  const setText = (next: string): void => setShown({ value: shown.value, text: next })
  const latest = useRef({ text, value, onCommit })
  useEffect(() => {
    latest.current = { text, value, onCommit }
  })
  const input = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!selectOnMount) return
    input.current?.focus()
    input.current?.select()
  }, [selectOnMount])

  const commit = (): void => {
    const current = latest.current
    if (current.text !== current.value) current.onCommit(current.text)
  }
  useEffect(() => registerFieldFlusher(commit), [])

  const common = {
    ref: input,
    'aria-label': label,
    placeholder,
    value: text,
    onBlur: commit
  }
  if (kind === 'note')
    return <textarea {...common} rows={4} onChange={(event) => setText(event.target.value)} />
  return (
    <input
      {...common}
      type={kind === 'date' ? 'date' : 'text'}
      onChange={(event) => {
        setText(event.target.value)
        // Une date complète est prise tout de suite (le sélecteur de date n'a pas de « quitter »).
        if (kind === 'date' && isIsoDate(event.target.value)) onCommit(event.target.value)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          commit()
        }
      }}
    />
  )
}
