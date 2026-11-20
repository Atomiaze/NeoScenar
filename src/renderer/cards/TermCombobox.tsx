import { useId, useState, type KeyboardEvent } from 'react'
import type { VocabularyTerm } from '../../shared/vocabulary'
import { Icon } from '../components/Icon'
import { fr } from '../i18n/fr'

/** Comparaison sans majuscules ni accents : « plongee » trouve « Plongée ». */
function simplify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

interface TermComboboxProps {
  label: string
  value: string
  terms: readonly VocabularyTerm[]
  onChange(value: string): void
  onBlur(): void
}

/**
 * Champ qui propose les termes du cours (avec leur définition en infobulle) et accepte aussi
 * n'importe quel texte libre.
 */
export function TermCombobox({ label, value, terms, onChange, onBlur }: TermComboboxProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  // Texte tapé servant de filtre ; null quand la liste est ouverte en entier (bouton ▾).
  const [filter, setFilter] = useState<string | null>(null)
  const [active, setActive] = useState(-1)

  const shown = filter
    ? terms.filter((term) => simplify(term.label).includes(simplify(filter)))
    : terms
  const current = terms.find((term) => term.label === value)

  const choose = (term: VocabularyTerm): void => {
    onChange(term.label)
    setOpen(false)
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        setFilter(null)
        setActive(0)
        return
      }
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((index) => Math.max(0, Math.min(shown.length - 1, index + step)))
    } else if (event.key === 'Enter' && open && shown[active]) {
      event.preventDefault()
      choose(shown[active])
    } else if (event.key === 'Escape' && open) {
      event.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="combobox">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={fr.panel.termPlaceholder}
          title={current?.definition}
          value={value}
          onChange={(event) => {
            onChange(event.target.value)
            setFilter(event.target.value)
            setActive(0)
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            setOpen(false)
            onBlur()
          }}
        />
        <button
          type="button"
          className="combobox-toggle"
          tabIndex={-1}
          title={fr.panel.showList}
          aria-label={fr.panel.showList}
          // Le champ garde le focus : la liste ne se referme pas aussitôt.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setFilter(null)
            setActive(
              Math.max(
                0,
                terms.findIndex((term) => term.label === value)
              )
            )
            setOpen(!open)
          }}
        >
          <Icon name="chevronDown" size={16} />
        </button>
        {open && shown.length > 0 && (
          <ul className="combobox-list" id={`${id}-list`} role="listbox" aria-label={label}>
            {shown.map((term, index) => (
              <li
                key={term.label}
                role="option"
                aria-selected={index === active}
                className={index === active ? 'active' : undefined}
                title={term.definition}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(term)}
              >
                {term.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      {current && <p className="field-help">{current.definition}</p>}
    </div>
  )
}
