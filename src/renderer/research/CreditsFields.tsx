import { useState } from 'react'
import { namesFromText, namesToText } from '../../shared/credits/creditsEdit'

/** Zone « un nom par ligne » : le texte tapé est gardé tel quel, les données reçoivent les noms. */
export function NamesField({
  names,
  label,
  onChange
}: {
  names: readonly string[]
  label: string
  onChange(names: string[]): void
}) {
  const [text, setText] = useState(() => namesToText(names))
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <textarea
        value={text}
        rows={Math.max(3, text.split('\n').length)}
        onChange={(event) => {
          setText(event.target.value)
          onChange(namesFromText(event.target.value))
        }}
      />
    </label>
  )
}

export function Check({
  label,
  checked,
  onChange
}: {
  label: string
  checked: boolean
  onChange(checked: boolean): void
}) {
  return (
    <label className="field-inline">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

export function TextField({
  label,
  value,
  placeholder,
  hint,
  onChange
}: {
  label: string
  value: string
  placeholder?: string
  hint?: string
  onChange(value: string): void
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint && <span className="field-help">{hint}</span>}
    </label>
  )
}
