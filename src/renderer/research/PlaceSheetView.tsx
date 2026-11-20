import { fr } from '../i18n/fr'
import type { Sheet } from '../../shared/research/types'
import { SheetGallery } from './SheetGallery'
import { SheetNameHeading } from './SheetNameHeading'
import { updateSheet } from './researchStore'

const t = fr.research

/** Fiche d'un lieu : résumé, description, repérage et galerie d'images. */
export function PlaceSheetView({ sheet }: { sheet: Sheet }) {
  return (
    <article className="sheet research-form" aria-label={sheet.nom}>
      <header className="research-sheet-header">
        <SheetNameHeading key={sheet.fileName} sheet={sheet} />
      </header>
      {sheet.unreadable && <p className="warning-text">{t.unreadable}</p>}
      <fieldset className="research-fields" disabled={sheet.unreadable}>
        <label className="field">
          <span className="field-label">{t.fields.resume}</span>
          <input
            type="text"
            value={sheet.props.resume ?? ''}
            onChange={(event) =>
              updateSheet(sheet.fileName, {
                props: { resume: event.target.value.replace(/[\r\n]+/g, ' ') }
              })
            }
          />
          <span className="field-help">{t.resumeHint}</span>
        </label>
        {(['description', 'reperage'] as const).map((key) => (
          <label key={key} className="field">
            <span className="field-label">{t.fields[key]}</span>
            <textarea
              rows={key === 'description' ? 8 : 6}
              value={sheet.sections[key] ?? ''}
              onChange={(event) =>
                updateSheet(sheet.fileName, { sections: { [key]: event.target.value } })
              }
            />
          </label>
        ))}
        <SheetGallery sheet={sheet} />
      </fieldset>
    </article>
  )
}
