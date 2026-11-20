import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'
import { closeRestoreBanner, restoreBannerText, undoRestore, versionsStore } from './versionsStore'

/** « Version X restaurée » avec « Annuler » (étape 13C), visible dans tous les modules. */
export function RestoreBanner() {
  const banner = useStore(versionsStore, (state) => state.banner)
  if (!banner) return null
  const canUndo = banner.beforeFolder !== null && !banner.undoImpossible
  return (
    <div className="link-banner" role="status">
      <ul>
        <li>{restoreBannerText(banner)}</li>
      </ul>
      {canUndo && (
        <button className="primary" onClick={() => void undoRestore()}>
          {fr.versions.undo}
        </button>
      )}
      <button onClick={closeRestoreBanner}>{fr.versions.closeBanner}</button>
    </div>
  )
}
