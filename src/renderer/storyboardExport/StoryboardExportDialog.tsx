import { useEffect, useRef, useState } from 'react'
import type { PdfSavedFile } from '../../shared/pdfExport'
import {
  DEFAULT_STORYBOARD_OPTIONS,
  type StoryboardExportOptions,
  type StoryboardPreview,
  type StoryboardSceneInfo
} from '../../shared/storyboardExport'
import { Dialog } from '../components/Dialog'
import { fr } from '../i18n/fr'
import { closeStoryboardExport } from './storyboardExportStore'

const t = fr.storyboardExport

/** Délai avant de refaire l'aperçu : on coche plusieurs scènes sans tout recalculer à chaque case. */
const PREVIEW_DELAY_MS = 300

/** Fenêtre « Exporter le storyboard en PDF » : aperçu du vrai PDF, options, enregistrement. */
export function StoryboardExportDialog() {
  const [options, setOptions] = useState<StoryboardExportOptions | null>(null)
  const [scenes, setScenes] = useState<StoryboardSceneInfo[]>([])
  const [previewState, setPreview] = useState<{
    url: string | null
    info: StoryboardPreview
  } | null>(null)
  const shownUrl = useRef<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<PdfSavedFile | null>(null)

  useEffect(() => {
    window.neoscenar.getStoryboardInfo().then((result) => {
      if (result.ok) {
        setOptions(result.value.options)
        setScenes(result.value.scenes)
      } else {
        setOptions(DEFAULT_STORYBOARD_OPTIONS)
        setError(result.error)
      }
    })
  }, [])

  const nothingChecked = options?.scope === 'scenes' && options.sceneNumbers.length === 0
  // Sans scène cochée, l'ancien aperçu ne doit plus s'afficher.
  const preview = nothingChecked ? null : previewState

  // Aperçu régénéré après un court délai ; une réponse tardive est ignorée.
  useEffect(() => {
    if (!options) return
    if (nothingChecked) return
    let cancelled = false
    const timer = setTimeout(() => {
      window.neoscenar.previewStoryboard(options).then((result) => {
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
  }, [options, nothingChecked])

  useEffect(
    () => () => {
      if (shownUrl.current) URL.revokeObjectURL(shownUrl.current)
    },
    []
  )

  const toggleScene = (number: string, checked: boolean): void => {
    if (!options) return
    const chosen = new Set(options.sceneNumbers)
    if (checked) chosen.add(number)
    else chosen.delete(number)
    // Dans l'ordre du film, pour un projet.json stable.
    setOptions({
      ...options,
      sceneNumbers: scenes.map((s) => s.number).filter((n) => chosen.has(n))
    })
  }

  const checkAll = (checked: boolean): void => {
    if (!options) return
    setOptions({ ...options, sceneNumbers: checked ? scenes.map((s) => s.number) : [] })
  }

  const noShots = !nothingChecked && preview !== null && preview.info.shotCount === 0
  const canSave = !!options && !busy && !nothingChecked && preview?.url != null && !noShots

  const save = async (mode: 'project' | 'choose'): Promise<void> => {
    if (!options || !canSave) return
    setBusy(true)
    setError(null)
    const result = await window.neoscenar.saveStoryboard(options, mode)
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
        onClose={closeStoryboardExport}
        actions={
          <>
            <button onClick={() => void act('reveal')}>{t.reveal}</button>
            <button onClick={() => void act('open')}>{t.open}</button>
            <button className="primary" onClick={closeStoryboardExport}>
              {fr.common.close}
            </button>
          </>
        }
      >
        <p>{t.savedIn(saved.relativePath)}</p>
        {error && <p className="error-text">{error}</p>}
      </Dialog>
    )
  }

  return (
    <Dialog
      title={t.title}
      className="pdf-dialog storyboard-dialog"
      onClose={closeStoryboardExport}
      actions={
        <>
          <button onClick={closeStoryboardExport}>{fr.common.cancel}</button>
          <button disabled={!canSave} onClick={() => void save('choose')}>
            {t.saveAs}
          </button>
          <button className="primary" disabled={!canSave} onClick={() => void save('project')}>
            {busy ? t.saving : t.save}
          </button>
        </>
      }
    >
      <div className="pdf-export">
        <div className="pdf-preview">
          {preview?.url ? (
            <iframe title={t.previewLabel} src={`${preview.url}#navpanes=0&view=FitH`} />
          ) : (
            <p className="muted">
              {nothingChecked ? t.noSceneChecked : noShots ? t.noShots : t.generating}
            </p>
          )}
        </div>
        <div className="form pdf-options storyboard-options">
          {options && (
            <>
              <fieldset>
                <legend>{t.kindLabel}</legend>
                <label className="checkbox">
                  <input
                    type="radio"
                    name="storyboard-kind"
                    checked={options.kind === 'planches'}
                    onChange={() => setOptions({ ...options, kind: 'planches' })}
                  />
                  {t.kindPlanches}
                </label>
                <label className="checkbox">
                  <input
                    type="radio"
                    name="storyboard-kind"
                    checked={options.kind === 'storyboard'}
                    onChange={() => setOptions({ ...options, kind: 'storyboard' })}
                  />
                  {t.kindStoryboard}
                </label>
                <p className="muted">
                  {options.kind === 'planches' ? t.kindPlanchesHint : t.kindStoryboardHint}
                </p>
              </fieldset>
              <fieldset>
                <legend>{t.scopeLabel}</legend>
                <label className="checkbox">
                  <input
                    type="radio"
                    name="storyboard-scope"
                    checked={options.scope === 'all'}
                    onChange={() => setOptions({ ...options, scope: 'all' })}
                  />
                  {t.scopeAll}
                </label>
                <label className="checkbox">
                  <input
                    type="radio"
                    name="storyboard-scope"
                    checked={options.scope === 'scenes'}
                    onChange={() => setOptions({ ...options, scope: 'scenes' })}
                  />
                  {t.scopeScenes}
                </label>
                {options.scope === 'scenes' && (
                  <div className="storyboard-scenes">
                    {scenes.length > 0 && (
                      <div className="storyboard-check-all">
                        <button type="button" onClick={() => checkAll(true)}>
                          {t.checkAll}
                        </button>
                        <button type="button" onClick={() => checkAll(false)}>
                          {t.uncheckAll}
                        </button>
                      </div>
                    )}
                    {scenes.length === 0 && <p className="muted">{t.noScenes}</p>}
                    {scenes.map((scene) => (
                      <label className="checkbox" key={scene.number}>
                        <input
                          type="checkbox"
                          data-scene={scene.number}
                          checked={options.sceneNumbers.includes(scene.number)}
                          onChange={(event) => toggleScene(scene.number, event.target.checked)}
                        />
                        {t.sceneItem(scene.number, scene.heading, scene.shotCount)}
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
              <label className="checkbox">
                <input
                  type="checkbox"
                  name="storyboard-new-page"
                  checked={options.newPagePerScene}
                  onChange={(event) =>
                    setOptions({ ...options, newPagePerScene: event.target.checked })
                  }
                />
                {t.newPagePerScene}
              </label>
            </>
          )}
          {preview && preview.info.shotCount > 0 && (
            <div role="status" className="storyboard-summary">
              <p className="pdf-page-count">{t.pageCount(preview.info.pageCount)}</p>
              {options?.kind === 'storyboard' && (
                <p className="storyboard-thumbs">
                  {t.thumbnailCount(preview.info.thumbnailCount, preview.info.shotCount)}
                </p>
              )}
            </div>
          )}
          {options?.kind === 'storyboard' && preview && preview.info.unreadable.length > 0 && (
            <div className="storyboard-unreadable">
              <p>{t.unreadableTitle}</p>
              <ul>
                {preview.info.unreadable.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            </div>
          )}
          {error && <p className="error-text">{error}</p>}
        </div>
      </div>
    </Dialog>
  )
}
