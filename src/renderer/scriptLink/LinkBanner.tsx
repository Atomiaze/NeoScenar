import { fr } from '../i18n/fr'
import { createSheetAnyway, replaceWithSheet, undoReplace } from '../research/scriptSheetsLink'
import { undoRename } from '../research/sheetRename'
import { useStore } from '../state/createStore'
import { closeBanner, linkStore, type SheetLink, type SheetsBanner } from './linkStore'

const t = fr.scriptLink
const r = fr.research

/** Fiches créées, ressemblances à trancher, dernier remplacement (10C) ou renommage (10D). */
function SheetsLines({
  sheets,
  onOpenSheet
}: {
  sheets: SheetsBanner
  onOpenSheet(sheet: SheetLink): void
}) {
  return (
    <>
      {sheets.created.length > 0 && (
        <li>
          {r.newSheets(sheets.created.length)}{' '}
          {sheets.created.map((sheet, index) => (
            <span key={`${sheet.kind}/${sheet.fileName}`}>
              {index > 0 && ', '}
              <button
                className="link-button"
                title={r.openSheet(sheet.nom)}
                onClick={() => onOpenSheet(sheet)}
              >
                {sheet.nom}
              </button>
            </span>
          ))}
        </li>
      )}
      {sheets.resemblances.map((item) => (
        <li key={`${item.kind}/${item.name}`} className="link-banner-choice">
          <span>{r.resemblance(item.name, item.sheet)}</span>
          <button onClick={() => void createSheetAnyway(item)}>{r.createAnyway(item.name)}</button>
          <button onClick={() => replaceWithSheet(item)}>
            {r.replaceInScript(item.name, item.sheet)}
          </button>
        </li>
      ))}
      {sheets.replaced && (
        <li className="link-banner-choice">
          <span>
            {r.replaced(sheets.replaced.name, sheets.replaced.sheet, sheets.replaced.count)}
          </span>
          <button onClick={undoReplace}>{r.undoReplace}</button>
        </li>
      )}
      {sheets.renamed && (
        <li className="link-banner-choice">
          <span>
            {r.renamed(sheets.renamed.from, sheets.renamed.to, sheets.renamed.count)}
            {sheets.renamed.headings > 0 &&
              ` ${r.renameHeadings(sheets.renamed.headings, sheets.renamed.from)}`}
            {sheets.renamed.undoImpossible && ` ${r.undoRenameImpossible}`}
          </span>
          {!sheets.renamed.undoImpossible && (
            <button onClick={() => void undoRename()}>{r.undoRename}</button>
          )}
        </li>
      )}
    </>
  )
}

/**
 * Bandeau de résumé d'un rapprochement (ouverture du projet, scénario modifié dans un autre
 * logiciel), visible dans tous les modules. Si une carte vient de devenir orpheline, ou si un nom
 * ressemble à une fiche, il reste affiché jusqu'à ce qu'on le ferme ; sinon il disparaît seul.
 */
export function LinkBanner({
  onShowCard,
  onOpenSheet
}: {
  onShowCard(id: string): void
  onOpenSheet(sheet: SheetLink): void
}) {
  const banner = useStore(linkStore, (state) => state.banner)
  if (!banner) return null
  const orphanId = banner.orphanId
  const warning = orphanId !== null || (banner.sheets?.resemblances.length ?? 0) > 0
  return (
    <div
      className={warning ? 'link-banner warning' : 'link-banner'}
      role={warning ? 'alert' : 'status'}
    >
      <ul>
        {banner.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
        {banner.sheets && <SheetsLines sheets={banner.sheets} onOpenSheet={onOpenSheet} />}
      </ul>
      {orphanId && (
        <button className="primary" onClick={() => onShowCard(orphanId)}>
          {t.bannerShow}
        </button>
      )}
      <button onClick={closeBanner}>{t.bannerClose}</button>
    </div>
  )
}
