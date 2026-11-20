import { useId } from 'react'
import { aspectRatio, formatAspect, type FormatCatalog, type Size } from '../../shared/imageFormat'
import { fr } from '../i18n/fr'
import {
  checkDraft,
  chooseFormat,
  CUSTOM_FORMAT,
  frameRateChoices,
  type FormatDraft
} from './formatDraft'

interface FormatFieldsProps {
  catalog: FormatCatalog
  draft: FormatDraft
  onChange(draft: FormatDraft): void
}

/** Format de l'image (préréglage ou personnalisé) et cadence, avec un aperçu de la forme. */
export function FormatFields({ catalog, draft, onChange }: FormatFieldsProps) {
  const id = useId()
  const check = checkDraft(draft)
  const t = fr.format
  const problem = check.widthProblem ?? check.heightProblem
  return (
    <fieldset className="field format-fields">
      <legend className="field-label">{t.label}</legend>
      <div className="format-row">
        <div className="format-inputs">
          <select
            aria-label={t.preset}
            value={draft.choice}
            onChange={(event) => onChange(chooseFormat(catalog, draft, event.target.value))}
          >
            {catalog.presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {t.presetOption(preset.name, preset, formatAspect(preset))}
              </option>
            ))}
            <option value={CUSTOM_FORMAT}>{t.custom}</option>
          </select>

          {draft.choice === CUSTOM_FORMAT && (
            <div className="format-custom">
              <label>
                <span>{t.width}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={draft.width}
                  aria-invalid={check.widthProblem !== null}
                  onChange={(event) => onChange({ ...draft, width: event.target.value })}
                />
              </label>
              <span aria-hidden="true">×</span>
              <label>
                <span>{t.height}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={draft.height}
                  aria-invalid={check.heightProblem !== null}
                  onChange={(event) => onChange({ ...draft, height: event.target.value })}
                />
              </label>
              <span className="muted">{t.pixels}</span>
            </div>
          )}
          {problem && <span className="field-error">{t.dimensionProblem[problem]}</span>}

          <label className="format-fps" htmlFor={`${id}-fps`}>
            <span>{t.frameRate}</span>
            <select
              id={`${id}-fps`}
              value={draft.fps}
              onChange={(event) => onChange({ ...draft, fps: Number(event.target.value) })}
            >
              {frameRateChoices(catalog, draft.fps).map((fps) => (
                <option key={fps} value={fps}>
                  {t.fpsOption(fps)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <FormatPreview size={check.size} />
      </div>
    </fieldset>
  )
}

const PREVIEW_BOX = 96

/** Petit rectangle à la forme de l'image, avec ses proportions. */
function FormatPreview({ size }: { size: Size | null }) {
  if (!size) return <div className="format-preview" />
  // Aperçu borné : un format très allongé reste visible (au moins 4 pixels).
  const ratio = aspectRatio(size)
  const width = Math.max(4, ratio >= 1 ? PREVIEW_BOX : PREVIEW_BOX * ratio)
  const height = Math.max(4, ratio >= 1 ? PREVIEW_BOX / ratio : PREVIEW_BOX)
  return (
    <div className="format-preview" aria-label={fr.format.aspect(formatAspect(size))}>
      <div className="format-preview-frame" style={{ width, height }} />
      <span className="muted">{formatAspect(size)}</span>
    </div>
  )
}
