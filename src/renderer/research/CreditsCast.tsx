import { castOverview, type CastRow } from '../../shared/credits/assembleCredits'
import { setDisplayName } from '../../shared/credits/creditsEdit'
import { nameKey } from '../../shared/research/sheetNames'
import type { CreditsData } from '../../shared/credits/types'
import { fr } from '../i18n/fr'
import { changeCredits } from './creditsStore'
import { researchStore, showSheet } from './researchStore'

const t = fr.research.credits.cast

function openSheet(name: string): void {
  const key = nameKey(name)
  const sheet = researchStore.get().sheets.personnages.find((s) => nameKey(s.nom) === key)
  if (sheet) showSheet('personnages', sheet.fileName)
}

function CastLine({ row, data }: { row: CastRow; data: CreditsData }) {
  return (
    <tr>
      <td>
        <button
          type="button"
          className="link-button"
          title={t.openSheet(row.nom)}
          onClick={() => openSheet(row.nom)}
        >
          {row.nom}
        </button>
      </td>
      <td>
        {row.etat === 'sans-interprete' ? (
          <span className="credits-missing" title={t.noActorHelp}>
            ⚠ {t.noActor}
          </span>
        ) : (
          <>
            {row.interprete}
            {row.etat === 'figurant' && <span className="muted"> ({t.extra})</span>}
          </>
        )}
      </td>
      <td>
        {row.etat !== 'sans-interprete' && (
          <input
            type="text"
            aria-label={`${t.displayedName} — ${row.nom}`}
            value={data.acteurs.nomsAffiches[row.key] ?? ''}
            placeholder={row.personnage}
            onChange={(event) =>
              changeCredits((current) => setDisplayName(current, row.key, event.target.value))
            }
          />
        )}
      </td>
    </tr>
  )
}

/** Bloc Distribution : liste lue des fiches, avertissements et ordre des acteurs. */
export function CreditsCast({
  data,
  sources
}: {
  data: CreditsData
  sources: Parameters<typeof castOverview>[0]
}) {
  const { rows } = castOverview(sources)
  const missing = rows.filter((row) => row.etat === 'sans-interprete').length
  const setOrder = (ordreActeurs: 'importance' | 'apparition'): void =>
    changeCredits((current) => ({ ...current, options: { ...current.options, ordreActeurs } }))

  return (
    <div className="field">
      <span className="field-label">{t.order}</span>
      <div className="credits-radio" role="radiogroup" aria-label={t.order}>
        <label className="field-inline">
          <input
            type="radio"
            name="credits-order"
            checked={data.options.ordreActeurs === 'importance'}
            onChange={() => setOrder('importance')}
          />
          <span>{t.byImportance}</span>
        </label>
        <label className="field-inline">
          <input
            type="radio"
            name="credits-order"
            checked={data.options.ordreActeurs === 'apparition'}
            onChange={() => setOrder('apparition')}
          />
          <span>{t.byAppearance}</span>
        </label>
      </div>
      {rows.length === 0 ? (
        <p className="field-help">{t.empty}</p>
      ) : (
        <table className="credits-cast">
          <thead>
            <tr>
              <th>{t.character}</th>
              <th>{t.actor}</th>
              <th>{t.displayedName}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <CastLine key={row.key} row={row} data={data} />
            ))}
          </tbody>
        </table>
      )}
      {missing > 0 && <p className="warning-text">{t.missingSummary(missing)}</p>}
      <span className="field-help">{t.help}</span>
    </div>
  )
}
