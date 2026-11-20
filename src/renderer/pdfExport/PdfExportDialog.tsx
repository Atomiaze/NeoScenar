import { useEffect, useRef, useState } from 'react'
import {
  DEFAULT_PDF_OPTIONS,
  type PdfExportOptions,
  type PdfSavedFile
} from '../../shared/pdfExport'
import { Dialog } from '../components/Dialog'
import { useStore } from '../state/createStore'
import { fr } from '../i18n/fr'
import { fullScriptText } from '../script/scriptStore'
import { closePdfExport } from './pdfExportStore'
import { paginationSettings, setNewPageForActs } from '../script/editor/paginationSettings'

const t = fr.pdfExport

/** Fenêtre « Exporter le scénario en PDF » : aperçu du vrai PDF, deux options, enregistrement. */
export function PdfExportDialog() {
  const [options, setOptions] = useState<PdfExportOptions | null>(null)
  const [preview, setPreview] = useState<{ url: string; pageCount: number } | null>(null)
  const shownUrl = useRef<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<PdfSavedFile | null>(null)
  // Le texte est figé à l'ouverture : l'aperçu et le fichier montrent la même chose.
  const [text] = useState(() => fullScriptText() ?? '')
  const continued = useStore(paginationSettings, (state) => state.continued)

  useEffect(() => {
    window.neoscenar.getPdfOptions().then((result) => {
      setOptions(result.ok ? result.value : DEFAULT_PDF_OPTIONS)
      if (!result.ok) setError(result.error)
    })
  }, [])

  // L'aperçu est regénéré à chaque changement d'option ; une réponse tardive est ignorée.
  useEffect(() => {
    if (!options) return
    let cancelled = false
    window.neoscenar.previewPdf({ text, options, continued }).then((result) => {
      if (cancelled) return
      if (!result.ok) {
        setError(result.error)
        return
      }
      setError(null)
      const blob = new Blob([result.value.bytes as BlobPart], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      // L'ancien fichier n'est libéré qu'un peu plus tard : la visionneuse peut encore le charger.
      const previous = shownUrl.current
      if (previous) setTimeout(() => URL.revokeObjectURL(previous), 2000)
      shownUrl.current = url
      setPreview({ url, pageCount: result.value.pageCount })
    })
    return () => {
      cancelled = true
    }
  }, [options, text, continued])

  useEffect(
    () => () => {
      if (shownUrl.current) URL.revokeObjectURL(shownUrl.current)
    },
    []
  )

  const save = async (mode: 'project' | 'choose'): Promise<void> => {
    if (!options || busy) return
    setBusy(true)
    setError(null)
    const result = await window.neoscenar.savePdf({ text, options, continued }, mode)
    setBusy(false)
    if (!result) return
    if (result.ok) {
      // L'option est mémorisée dans le projet à l'enregistrement : l'écran suit le PDF.
      setNewPageForActs(options.nouvellePageParActe)
      setSaved(result.value)
    } else setError(result.error)
  }

  const act = async (action: 'open' | 'reveal'): Promise<void> => {
    const result = await window.neoscenar.openSavedPdf(action)
    if (!result.ok) setError(result.error)
  }

  if (saved) {
    return (
      <Dialog
        title={t.savedTitle}
        onClose={closePdfExport}
        actions={
          <>
            <button onClick={() => void act('reveal')}>{t.reveal}</button>
            <button onClick={() => void act('open')}>{t.open}</button>
            <button className="primary" onClick={closePdfExport}>
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
      className="pdf-dialog"
      onClose={closePdfExport}
      actions={
        <>
          <button onClick={closePdfExport}>{fr.common.cancel}</button>
          <button disabled={!options || busy} onClick={() => void save('choose')}>
            {t.saveAs}
          </button>
          <button
            className="primary"
            disabled={!options || busy}
            onClick={() => void save('project')}
          >
            {busy ? t.saving : t.save}
          </button>
        </>
      }
    >
      <div className="pdf-export">
        <div className="pdf-preview">
          {preview ? (
            <iframe title={t.previewLabel} src={`${preview.url}#navpanes=0&view=FitH`} />
          ) : (
            <p className="muted">{t.generating}</p>
          )}
        </div>
        <div className="form pdf-options">
          {options && (
            <>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={options.pageDeTitre}
                  onChange={(event) =>
                    setOptions({ ...options, pageDeTitre: event.target.checked })
                  }
                />
                {t.includeTitlePage}
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={options.numerotation === 'continue'}
                  onChange={(event) =>
                    setOptions({
                      ...options,
                      numerotation: event.target.checked ? 'continue' : 'fountain'
                    })
                  }
                />
                {t.numberScenes}
              </label>
              <p className="muted">{t.numberScenesHint}</p>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={options.nouvellePageParActe}
                  onChange={(event) =>
                    setOptions({ ...options, nouvellePageParActe: event.target.checked })
                  }
                />
                {t.newPageForActs}
              </label>
              <p className="muted">{t.newPageForActsHint}</p>
            </>
          )}
          {preview && (
            <p className="pdf-page-count" role="status">
              {t.pageCount(preview.pageCount)}
            </p>
          )}
          {error && <p className="error-text">{error}</p>}
        </div>
      </div>
    </Dialog>
  )
}
