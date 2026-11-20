import { useEffect, useState } from 'react'
import type { BlenderLaunchStatus, BlendTarget } from '../../shared/api'
import { exportSummary } from '../../shared/blender/exchange'
import { lockNumbersNow } from '../cards/actions'
import { cardsStore } from '../cards/cardsStore'
import { Dialog } from '../components/Dialog'
import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'
import { BlenderDoneStep } from './BlenderDoneStep'
import { closeBlenderExport } from './exportStore'

const t = fr.blender

type Step = 'lock' | 'form' | 'done'

/** Fenêtre « Exporter vers Blender » : verrouillage proposé, réglages de l'export, résultat. */
export function BlenderExportDialog() {
  const decoupage = useStore(cardsStore, (state) => state.history?.present ?? null)
  // La question du verrouillage n'est posée qu'à l'ouverture de la fenêtre.
  const [step, setStep] = useState<Step>(() =>
    cardsStore.get().history?.present.numbersLocked === false ? 'lock' : 'form'
  )
  const [status, setStatus] = useState<BlenderLaunchStatus | null>(null)

  if (!decoupage) return null

  if (step === 'lock') {
    return (
      <Dialog
        title={t.lockTitle}
        onClose={closeBlenderExport}
        actions={
          <>
            <button onClick={closeBlenderExport}>{fr.common.cancel}</button>
            <button onClick={() => setStep('form')}>{t.lockSkip}</button>
            <button
              className="primary"
              onClick={() => {
                lockNumbersNow()
                setStep('form')
              }}
            >
              {t.lockConfirm}
            </button>
          </>
        }
      >
        <p>{t.lockMessage}</p>
      </Dialog>
    )
  }

  if (step === 'done' && status) return <BlenderDoneStep initialStatus={status} />

  return (
    <ExportForm
      onExported={(result) => {
        setStatus(result)
        setStep('done')
      }}
      summary={exportSummary(decoupage)}
    />
  )
}

function ExportForm({
  summary,
  onExported
}: {
  summary: ReturnType<typeof exportSummary>
  onExported(status: BlenderLaunchStatus): void
}) {
  const [loaded, setLoaded] = useState(false)
  const [target, setTarget] = useState<BlendTarget | null>(null)
  const [blenderPath, setBlenderPath] = useState<string | null>(null)
  const [openAfter, setOpenAfter] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.neoscenar.getBlenderExportInfo().then((result) => {
      setLoaded(true)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setTarget(result.value.target)
      setBlenderPath(result.value.blenderPath)
    })
  }, [])

  const chooseTarget = async (): Promise<void> => {
    const result = await window.neoscenar.chooseBlendTarget(target?.path ?? null)
    if (!result) return
    if (result.ok) {
      setTarget(result.value)
      setError(null)
    } else setError(result.error)
  }

  const chooseBlender = async (): Promise<void> => {
    const result = await window.neoscenar.chooseBlender()
    if (!result) return
    if (result.ok) {
      setBlenderPath(result.value)
      setError(null)
    } else setError(result.error)
  }

  const submit = async (): Promise<void> => {
    if (!target || busy) return
    setBusy(true)
    setError(null)
    const result = await window.neoscenar.exportToBlender({
      blendPath: target.path,
      openInBlender: openAfter
    })
    setBusy(false)
    if (result.ok) onExported(result.value)
    else setError(result.error)
  }

  return (
    <Dialog
      title={t.title}
      onClose={closeBlenderExport}
      actions={
        <>
          <button onClick={closeBlenderExport}>{fr.common.cancel}</button>
          <button className="primary" disabled={!target || busy} onClick={submit}>
            {busy ? t.exporting : t.export}
          </button>
        </>
      }
    >
      <div className="form">
        <div className="field">
          <span className="field-label">{t.blendLabel}</span>
          <div className="location-row">
            <span className="location-path" title={target?.relativePath}>
              {target?.relativePath ?? ''}
            </span>
            <button type="button" onClick={chooseTarget} disabled={!loaded}>
              {t.choose}
            </button>
          </div>
          {loaded && !target && !error && <span className="field-error">{t.noBlenderFolder}</span>}
        </div>
        {target?.replacedExisting && (
          <p className="warning-text" role="alert">
            {t.alreadyExists} {t.freeNameProposed(target.relativePath.split('/').pop() ?? '')}
          </p>
        )}

        <label className="checkbox">
          <input
            type="checkbox"
            checked={openAfter}
            onChange={(event) => setOpenAfter(event.target.checked)}
          />
          {t.openAfter}
        </label>
        <div className="field">
          <span className="field-label">{t.blenderLabel}</span>
          <div className="location-row">
            <span className="location-path" title={blenderPath ?? undefined}>
              {blenderPath ?? t.blenderAuto}
            </span>
            <button type="button" onClick={chooseBlender}>
              {t.blenderChange}
            </button>
          </div>
        </div>

        <p>{t.summary(summary.scenes, summary.shots, summary.thumbnails)}</p>
        {summary.shotsWithoutDuration > 0 && (
          <p className="warning-text">{t.noDuration(summary.shotsWithoutDuration)}</p>
        )}
        {summary.orphans.length > 0 && <p className="warning-text">{t.orphans(summary.orphans)}</p>}
        {error && <p className="error-text">{error}</p>}
      </div>
    </Dialog>
  )
}
