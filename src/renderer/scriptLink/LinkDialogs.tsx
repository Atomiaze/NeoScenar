import { Dialog } from '../components/Dialog'
import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'
import { closeLinkReport, linkStore } from './linkStore'

const t = fr.scriptLink

/**
 * Fenêtres du lien à l'ouverture d'un projet : le résumé de la première liaison, ou l'échec de la
 * copie de sécurité (rien n'a alors été modifié).
 */
export function LinkDialogs() {
  const report = useStore(linkStore, (state) => state.report)
  const backupError = useStore(linkStore, (state) => state.backupError)

  if (backupError !== null) {
    return (
      <Dialog
        title={t.backupFailedTitle}
        role="alertdialog"
        onClose={closeLinkReport}
        actions={
          <button className="primary" onClick={closeLinkReport}>
            {t.ok}
          </button>
        }
      >
        <p className="warning-text">{t.backupFailed(backupError)}</p>
      </Dialog>
    )
  }
  if (!report) return null

  const mismatch = report.cardCount !== report.sceneCount
  return (
    <Dialog
      title={t.firstLinkTitle}
      className="first-link-dialog"
      onClose={closeLinkReport}
      actions={
        <button className="primary" autoFocus onClick={closeLinkReport}>
          {t.ok}
        </button>
      }
    >
      {mismatch && (
        <p className="warning-text" role="alert">
          {t.countMismatch(report.cardCount, report.sceneCount, report.backupFolder)}
        </p>
      )}
      <p>{t.firstLinkIntro}</p>
      {report.notes.map((note) => (
        <p key={note}>{note}</p>
      ))}
      <h3>{t.pairsTitle}</h3>
      {report.pairs.length === 0 ? (
        <p>{t.noScene}</p>
      ) : (
        <ul className="first-link-list">
          {report.pairs.map((pair) => (
            <li key={pair}>{pair}</li>
          ))}
        </ul>
      )}
      {report.differences.length > 0 && (
        <>
          <h3>{t.differencesTitle}</h3>
          <ul className="first-link-list">
            {report.differences.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      )}
      {!mismatch && <p className="first-link-backup">{t.backupNote(report.backupFolder)}</p>}
    </Dialog>
  )
}
