import { formatDuration } from '../../shared/decoupage'
import { formatVersionDate } from '../../shared/versions/versions'
import { Dialog } from '../components/Dialog'
import { fr } from '../i18n/fr'
import { ScriptViewer } from './ScriptViewer'
import { useVersionScript } from './useVersionScript'

const t = fr.versions

/** « Consulter » : le scénario d'une version, en lecture seule, dans la mise en page de l'éditeur. */
export function VersionConsult({ folder, onBack }: { folder: string; onBack(): void }) {
  const load = useVersionScript(folder)
  const version = load.state === 'ready' ? load.script.version : null

  return (
    <Dialog
      title={version && !version.broken ? t.consultTitle(version.name) : t.consult}
      onClose={onBack}
      className="versions-large"
      actions={<button onClick={onBack}>{t.back}</button>}
    >
      {version && !version.broken && (
        <p className="muted versions-consult-info">
          {t.consultInfo(
            formatVersionDate(new Date(version.createdAt)),
            t.pages(version.pages),
            formatDuration(version.seconds)
          )}
          {version.note !== '' && ` — ${version.note}`}
        </p>
      )}
      {load.state === 'loading' && <p className="muted">{t.loading}</p>}
      {load.state === 'error' && <p className="error-text">{load.message}</p>}
      {load.state === 'ready' && <ScriptViewer text={load.script.text} label={t.consultLabel} />}
    </Dialog>
  )
}
