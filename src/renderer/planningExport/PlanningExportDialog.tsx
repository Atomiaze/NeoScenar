import { useEffect, useMemo, useRef, useState } from 'react'
import type { PdfSavedFile } from '../../shared/pdfExport'
import {
  DEFAULT_PLANNING_EXPORT_OPTIONS,
  type PlanningExportKind,
  type PlanningExportOptions,
  type PlanningExportPreview
} from '../../shared/planningExport'
import { cardsStore } from '../cards/cardsStore'
import { Dialog } from '../components/Dialog'
import { fr } from '../i18n/fr'
import { localIsoDate } from '../../shared/planning/planningView'
import { scriptText } from '../script/scriptStore'
import {
  buildPlanningExportRequest,
  emptyExportReason,
  exportablePeople,
  type PlanningExportSources
} from './planningExportData'
import { closePlanningExport } from './planningExportStore'

const t = fr.planningExport

/** Délai avant de refaire l'aperçu. */
const PREVIEW_DELAY_MS = 300

type Loaded = { sources: PlanningExportSources; options: PlanningExportOptions }

/** Lit le planning, les fiches, les cartes et le scénario tels qu'ils sont maintenant. */
async function loadSources(): Promise<{ sources: PlanningExportSources } | { error: string }> {
  const [planning, sheets] = await Promise.all([
    window.neoscenar.getPlanning(),
    window.neoscenar.listSheets('personnages')
  ])
  if (!planning.ok) return { error: planning.error }
  if (!sheets.ok) return { error: sheets.error }
  const history = cardsStore.get().history
  // Sans les cartes, toutes les scènes planifiées sembleraient disparues : on n'exporte pas.
  if (!history) return { error: t.cardsNotReady }
  let text = scriptText()
  if (text === null) {
    const script = await window.neoscenar.getScenario()
    if (!script.ok) return { error: script.error }
    text = script.value
  }
  return {
    sources: {
      planning: planning.value.planning,
      crew: planning.value.crew,
      sheets: sheets.value.map((sheet) => ({
        nom: sheet.nom,
        interprete: sheet.props.interprete ?? ''
      })),
      cards: history.present.scenes,
      scriptText: text,
      today: localIsoDate(new Date())
    }
  }
}

/** Fenêtre « Exporter le planning… » : PDF Planning, PDF Plan de tournage ou calendrier .ics. */
export function PlanningExportDialog({ title }: { title: string }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [options, setOptions] = useState<PlanningExportOptions>(DEFAULT_PLANNING_EXPORT_OPTIONS)
  const [previewState, setPreview] = useState<{
    url: string | null
    info: PlanningExportPreview
  } | null>(null)
  const shownUrl = useRef<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<PdfSavedFile | null>(null)

  useEffect(() => {
    void (async () => {
      const [info, sources] = await Promise.all([
        window.neoscenar.getPlanningExportInfo(),
        loadSources()
      ])
      if ('error' in sources) {
        setError(sources.error)
        return
      }
      const remembered = info.ok ? info.value.options : DEFAULT_PLANNING_EXPORT_OPTIONS
      const people = exportablePeople(sources.sources).map((name) => name.normalize('NFC'))
      // Une personne qui n'est plus nulle part (tâches, générique) ne filtre plus.
      const person =
        remembered.person !== null && people.includes(remembered.person.normalize('NFC'))
          ? remembered.person
          : null
      setOptions({ kind: remembered.kind, person })
      setLoaded({ sources: sources.sources, options: remembered })
    })()
  }, [])

  const people = useMemo(() => (loaded ? exportablePeople(loaded.sources) : []), [loaded])
  const request = useMemo(
    () => (loaded ? buildPlanningExportRequest(options, loaded.sources, title) : null),
    [loaded, options, title]
  )
  const empty = request ? emptyExportReason(request) : null
  const isCalendar = options.kind === 'calendrier'

  // Aperçu régénéré après un court délai ; une réponse tardive est ignorée.
  useEffect(() => {
    if (!request || empty) return
    let cancelled = false
    const timer = setTimeout(() => {
      window.neoscenar.previewPlanningExport(request).then((result) => {
        if (cancelled) return
        if (!result.ok) {
          setError(result.error)
          return
        }
        setError(null)
        let url: string | null = null
        if (result.value.bytes) {
          const blob = new Blob([result.value.bytes as BlobPart], { type: 'application/pdf' })
          url = URL.createObjectURL(blob)
        }
        // L'ancien fichier n'est libéré qu'un peu plus tard : la visionneuse peut encore le charger.
        const previous = shownUrl.current
        if (previous) setTimeout(() => URL.revokeObjectURL(previous), 2000)
        shownUrl.current = url
        setPreview({ url, info: result.value })
      })
    }, PREVIEW_DELAY_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [request, empty])

  useEffect(
    () => () => {
      if (shownUrl.current) URL.revokeObjectURL(shownUrl.current)
    },
    []
  )

  // Un aperçu qui ne correspond plus au genre choisi ne s'affiche pas.
  const preview = empty || !previewState ? null : previewState
  const ready =
    preview !== null && (isCalendar ? preview.info.bytes === null : preview.url !== null)
  const canSave = !!request && !busy && !empty && ready

  const save = async (mode: 'project' | 'choose'): Promise<void> => {
    if (!request || !canSave) return
    setBusy(true)
    setError(null)
    const result = await window.neoscenar.savePlanningExport(request, mode)
    setBusy(false)
    if (!result) return
    if (result.ok) setSaved(result.value)
    else setError(result.error)
  }

  const act = async (action: 'open' | 'reveal'): Promise<void> => {
    const result = await window.neoscenar.openSavedPdf(action)
    if (!result.ok) setError(result.error)
  }

  if (saved) {
    return (
      <Dialog
        title={t.savedTitle}
        onClose={closePlanningExport}
        actions={
          <>
            <button data-reveal onClick={() => void act('reveal')}>
              {t.reveal}
            </button>
            {!isCalendar && <button onClick={() => void act('open')}>{t.open}</button>}
            <button className="primary" onClick={closePlanningExport}>
              {fr.common.close}
            </button>
          </>
        }
      >
        <p data-saved-path>{t.savedIn(saved.relativePath)}</p>
        {error && <p className="error-text">{error}</p>}
      </Dialog>
    )
  }

  const kinds: { kind: PlanningExportKind; label: string; hint: string }[] = [
    { kind: 'planning', label: t.kindPlanning, hint: t.kindPlanningHint },
    { kind: 'tournage', label: t.kindShooting, hint: t.kindShootingHint },
    { kind: 'calendrier', label: t.kindCalendar, hint: t.kindCalendarHint }
  ]
  const hint = kinds.find((k) => k.kind === options.kind)?.hint

  return (
    <Dialog
      title={t.title}
      className="pdf-dialog storyboard-dialog planning-export-dialog"
      onClose={closePlanningExport}
      actions={
        <>
          <button onClick={closePlanningExport}>{fr.common.cancel}</button>
          <button disabled={!canSave} onClick={() => void save('choose')}>
            {t.saveAs}
          </button>
          <button
            className="primary"
            data-save
            disabled={!canSave}
            onClick={() => void save('project')}
          >
            {busy ? t.saving : t.save}
          </button>
        </>
      }
    >
      <div className="pdf-export">
        <div className="pdf-preview" data-preview-kind={options.kind}>
          {!isCalendar && preview?.url ? (
            <iframe title={t.previewLabel} src={`${preview.url}#navpanes=0&view=FitH`} />
          ) : isCalendar && preview ? (
            <div className="planning-export-calendar" role="status">
              <p>{t.calendarSummary}</p>
              <p className="pdf-page-count">{t.eventCount(preview.info.eventCount)}</p>
            </div>
          ) : (
            <p className="muted">
              {empty === 'events'
                ? t.noEvents
                : empty === 'shooting'
                  ? t.nothingToExportShooting
                  : empty === 'nothing'
                    ? t.nothingToExport
                    : loaded
                      ? t.generating
                      : t.loading}
            </p>
          )}
        </div>
        <div className="form pdf-options storyboard-options">
          {loaded && (
            <>
              <fieldset>
                <legend>{t.kindLabel}</legend>
                {kinds.map((choice) => (
                  <label className="checkbox" key={choice.kind}>
                    <input
                      type="radio"
                      name="planning-export-kind"
                      value={choice.kind}
                      checked={options.kind === choice.kind}
                      onChange={() => setOptions({ ...options, kind: choice.kind })}
                    />
                    {choice.label}
                  </label>
                ))}
                <p className="muted">{hint}</p>
              </fieldset>
              {options.kind !== 'tournage' && (
                <label className="planning-filter planning-export-person">
                  <span>{t.personLabel}</span>
                  <select
                    name="planning-export-person"
                    value={options.person ?? ''}
                    onChange={(event) =>
                      setOptions({
                        ...options,
                        person: event.target.value === '' ? null : event.target.value
                      })
                    }
                  >
                    <option value="">{t.everyone}</option>
                    {people.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {options.kind !== 'tournage' && <p className="muted">{t.personHint}</p>}
            </>
          )}
          {preview && (
            <div role="status" className="storyboard-summary">
              {!isCalendar && (
                <p className="pdf-page-count">{t.pageCount(preview.info.pageCount)}</p>
              )}
              <p className="muted" data-destination>
                {t.destination(preview.info.folder, preview.info.fileName)}
              </p>
            </div>
          )}
          {error && <p className="error-text">{error}</p>}
        </div>
      </div>
    </Dialog>
  )
}
