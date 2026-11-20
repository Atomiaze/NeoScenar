import { useState } from 'react'
import type { BlenderLaunchStatus } from '../../shared/api'
import { Dialog } from '../components/Dialog'
import { fr } from '../i18n/fr'
import { closeBlenderExport } from './exportStore'

const t = fr.blender

const NEED_CHOICE_MESSAGES = {
  none: t.notFound,
  several: t.severalFound,
  'store-only': t.storeOnly,
  'flatpak-only': t.flatpakOnly
} as const

function statusMessage(status: BlenderLaunchStatus): string | null {
  switch (status.state) {
    case 'launched':
      return t.launched
    case 'need-choice':
      return NEED_CHOICE_MESSAGES[status.reason]
    case 'failed':
      return status.message
    default:
      return null
  }
}

/** Fin de l'export : le paquet est écrit ; Blender est lancé, ou l'élève doit le choisir. */
export function BlenderDoneStep({ initialStatus }: { initialStatus: BlenderLaunchStatus }) {
  const [status, setStatus] = useState(initialStatus)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const chooseAndLaunch = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    const chosen = await window.neoscenar.chooseBlender()
    if (chosen && !chosen.ok) setError(chosen.error)
    if (chosen?.ok) {
      const launched = await window.neoscenar.launchBlender()
      if (launched.ok) setStatus(launched.value)
      else setError(launched.error)
    }
    setBusy(false)
  }

  const message = statusMessage(status)
  return (
    <Dialog
      title={t.doneTitle}
      onClose={closeBlenderExport}
      actions={
        <>
          {status.state === 'need-choice' && (
            <button disabled={busy} onClick={chooseAndLaunch}>
              {t.chooseBlender}
            </button>
          )}
          <button className="primary" onClick={closeBlenderExport}>
            {fr.common.close}
          </button>
        </>
      }
    >
      <div className="form">
        <p>{t.done}</p>
        {message && (
          <p className={status.state === 'launched' ? undefined : 'warning-text'}>{message}</p>
        )}
        {status.state === 'launched' && status.untestedVersion && (
          <p className="warning-text">{t.untestedVersion(status.untestedVersion)}</p>
        )}
        {status.state === 'need-choice' && <p>{t.manualImport}</p>}
        {error && <p className="error-text">{error}</p>}
      </div>
    </Dialog>
  )
}
