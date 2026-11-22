import { useEffect, useState } from 'react'
import { APP_AUTHOR, APP_CREDITS, APP_LICENSE } from '../../shared/appInfo'
import { fr } from '../i18n/fr'
import { Dialog } from './Dialog'

/** Fenêtre « À propos de NeoScenar » : auteur, version, licence, lien vers le dépôt. */
export function AboutDialog({ onClose }: { onClose(): void }) {
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    void window.neoscenar.getAppVersion().then(setVersion)
  }, [])

  const t = fr.about
  return (
    <Dialog
      title={t.title}
      onClose={onClose}
      className="about-dialog"
      actions={
        <button className="primary" onClick={onClose} autoFocus>
          {fr.common.close}
        </button>
      }
    >
      <p className="about-name">{fr.app.name}</p>
      <p className="muted">{version ? t.version(version) : fr.home.versionLoading}</p>
      <p>{t.tagline}</p>
      <p className="about-credits">
        {t.createdBy(APP_AUTHOR)}
        {APP_CREDITS.map((credit) => (
          <span key={credit.role} className="about-credit-line">
            {t.credit(credit.role, credit.name)}
          </span>
        ))}
      </p>
      <p>{t.license(APP_LICENSE)}</p>
      <p className="muted">{t.licenseNote}</p>
      <p>
        <button
          className="link-button about-repository"
          onClick={() => void window.neoscenar.openRepository()}
        >
          {t.repository}
        </button>
        <span className="muted"> — {t.repositoryHint}</span>
      </p>
    </Dialog>
  )
}
