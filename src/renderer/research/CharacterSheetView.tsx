import type { ReactNode } from 'react'
import { isHexColor, SHEET_COLORS } from '../../shared/research/sheetNames'
import { CHARACTER_ROLES, SHEET_SCHEMAS, type Sheet } from '../../shared/research/types'
import { fr } from '../i18n/fr'
import { SheetGallery } from './SheetGallery'
import { SheetNameHeading } from './SheetNameHeading'
import { updateSheet } from './researchStore'

const t = fr.research

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-help">{hint}</span>}
    </label>
  )
}

/** Fiche d'un personnage : propriétés, textes libres et galerie d'images. */
export function CharacterSheetView({ sheet }: { sheet: Sheet }) {
  const prop = (key: string): string => sheet.props[key] ?? ''
  const setProp = (key: string, value: string): void =>
    updateSheet(sheet.fileName, { props: { [key]: value } })
  const role = prop('role')
  // Un rôle écrit ailleurs (« antagoniste ») reste proposé tel quel.
  const roles = ['', ...CHARACTER_ROLES, ...(role && !roleKnown(role) ? [role] : [])]
  const color = prop('couleur')

  return (
    <article className="sheet research-form" aria-label={sheet.nom}>
      <header className="research-sheet-header">
        <span
          className="sheet-dot large"
          style={isHexColor(color) ? { background: color } : undefined}
          aria-hidden="true"
        />
        <SheetNameHeading key={sheet.fileName} sheet={sheet} />
      </header>
      {sheet.unreadable && <p className="warning-text">{t.unreadable}</p>}
      <fieldset className="research-fields" disabled={sheet.unreadable}>
        <div className="research-row">
          <Field label={t.fields.interprete}>
            <input
              type="text"
              value={prop('interprete')}
              onChange={(event) => setProp('interprete', event.target.value)}
            />
          </Field>
          <Field label={t.fields.age}>
            <input
              type="text"
              className="research-age"
              value={prop('age')}
              onChange={(event) => setProp('age', event.target.value)}
            />
          </Field>
          <Field label={t.fields.role}>
            <select value={role} onChange={(event) => setProp('role', event.target.value)}>
              {roles.map((value) => (
                <option key={value} value={value}>
                  {t.roles[value] ?? value}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={t.fields.resume} hint={t.resumeHint}>
          <input
            type="text"
            value={prop('resume')}
            onChange={(event) => setProp('resume', event.target.value.replace(/[\r\n]+/g, ' '))}
          />
        </Field>
        <div className="field">
          <span className="field-label">{t.fields.couleur}</span>
          <div className="research-colors" role="group" aria-label={t.fields.couleur}>
            {SHEET_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                className={`swatch${color.toUpperCase() === hex ? ' current' : ''}`}
                style={{ background: hex }}
                aria-label={hex}
                aria-pressed={color.toUpperCase() === hex}
                onClick={() => setProp('couleur', hex)}
              />
            ))}
            <input
              type="color"
              title={t.otherColor}
              aria-label={t.otherColor}
              value={isHexColor(color) ? color.toLowerCase() : '#000000'}
              onChange={(event) => setProp('couleur', event.target.value.toUpperCase())}
            />
          </div>
        </div>
        {SHEET_SCHEMAS.personnages.sections.map(([key]) => (
          <Field key={key} label={t.fields[key]}>
            <textarea
              rows={key === 'description' ? 8 : 4}
              value={sheet.sections[key] ?? ''}
              onChange={(event) =>
                updateSheet(sheet.fileName, { sections: { [key]: event.target.value } })
              }
            />
          </Field>
        ))}
        <SheetGallery sheet={sheet} />
      </fieldset>
    </article>
  )
}

function roleKnown(role: string): boolean {
  return (CHARACTER_ROLES as readonly string[]).includes(role)
}
