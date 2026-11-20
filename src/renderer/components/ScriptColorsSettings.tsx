import { useState } from 'react'
import { cardTextColor } from '../../shared/palette'
import {
  SCRIPT_ELEMENTS,
  hasScriptColors,
  lowContrast,
  resolveScriptColors,
  scriptCssVariables,
  withScriptColor,
  withoutScriptColors,
  type ScriptColors,
  type ScriptElement
} from '../../shared/themes/scriptColors'
import { PALETTES, cssVariables, type PaletteId } from '../../shared/themes/themes'
import { fr } from '../i18n/fr'
import { changeScriptColors, currentScriptColors } from '../theme/applyTheme'

const t = fr.appSettings.scriptColors

/** Exemple de bandeau d'acte automatique (une teinte pastel, comme la palette des cartes). */
const PREVIEW_ACT_COLOR = '#c9def2'

/** Nom du jeu réglé : « Par défaut (sombre) » ou le nom du thème. */
function paletteLabel(id: PaletteId): string {
  if (id === 'defaut-clair') return `${fr.appSettings.themes.defaut} (${t.toneLight})`
  if (id === 'defaut-sombre') return `${fr.appSettings.themes.defaut} (${t.toneDark})`
  return fr.appSettings.themes[id]
}

/**
 * Section « Couleurs du scénario » des Réglages : un sélecteur par élément, aperçu mis à jour à
 * chaque événement `input`, réglages gardés pour le seul jeu de couleurs affiché.
 */
export function ScriptColorsSettings({ paletteId }: { paletteId: PaletteId }) {
  const [all, setAll] = useState<ScriptColors>(() => currentScriptColors())
  const palette = PALETTES[paletteId]
  const resolved = resolveScriptColors(paletteId, all)
  const overrides = all[paletteId] ?? {}

  const update = (next: ScriptColors): void => {
    setAll(next)
    changeScriptColors(next)
  }

  const shownValue = (element: ScriptElement): string => {
    const value = resolved[element]
    if (value !== null) return value
    if (element === 'actBackground') return PREVIEW_ACT_COLOR
    return cardTextColor(resolved.actBackground ?? PREVIEW_ACT_COLOR)
  }

  const previewStyle = {
    ...cssVariables(palette),
    ...scriptCssVariables(resolved),
    '--section-color': PREVIEW_ACT_COLOR,
    '--section-text': cardTextColor(PREVIEW_ACT_COLOR)
  } as React.CSSProperties

  return (
    <fieldset className="settings-group" data-testid="script-colors">
      <legend>{t.title}</legend>
      <small className="muted" data-testid="script-colors-palette">
        {t.forTheme(paletteLabel(paletteId))}
      </small>
      <div className="script-colors-sticky">
        <small className="muted">{t.preview}</small>
        <div
          className="script-colors-preview"
          style={previewStyle}
          data-testid="script-colors-preview"
        >
          <p className="pv-act">{t.previewAct}</p>
          <p className="pv-heading">
            <span className="pv-scene-number">10</span>
            {t.previewHeading}
          </p>
          <p>
            {t.previewAction} <span className="pv-note">{t.previewNote}</span>
          </p>
          <p className="pv-character">{t.previewCharacter}</p>
          <p className="pv-parenthetical">{t.previewParenthetical}</p>
          <p className="pv-dialogue">
            <span className="pv-selection">{t.previewSelected}</span> {t.previewDialogue}
          </p>
          <p className="pv-active-line">{t.previewActiveLine}</p>
          <p className="pv-transition">{t.previewTransition}</p>
          <div className="pv-page-break" />
          <span className="pv-page-number">2.</span>
        </div>
      </div>
      {SCRIPT_ELEMENTS.map((element) => {
        const modified = overrides[element] !== undefined
        const warn = lowContrast(element, resolved, palette.colors)
        const isAct = element === 'actBackground' || element === 'actText'
        return (
          <div key={element} className="script-colors-row">
            <label htmlFor={`script-color-${element}`}>
              {t.elements[element]}
              {resolved[element] === null && <small className="muted"> ({t.automatic})</small>}
            </label>
            <input
              id={`script-color-${element}`}
              data-element={element}
              type="color"
              value={shownValue(element)}
              onInput={(event) =>
                update(withScriptColor(all, paletteId, element, event.currentTarget.value))
              }
              onChange={() => undefined}
            />
            <button
              className="script-colors-reset"
              title={t.resetOne}
              aria-label={`${t.resetOne} : ${t.elements[element]}`}
              style={{ visibility: modified ? 'visible' : 'hidden' }}
              disabled={!modified}
              onClick={() => update(withScriptColor(all, paletteId, element, null))}
            >
              ↺
            </button>
            {warn && (
              <span className="script-colors-warning" role="status" data-warning={element}>
                {isAct ? t.lowContrast : t.lowContrastOnBackground}
              </span>
            )}
          </div>
        )
      })}
      <div>
        <button
          data-testid="script-colors-reset-all"
          disabled={!hasScriptColors(all, paletteId)}
          onClick={() => update(withoutScriptColors(all, paletteId))}
        >
          {t.resetAll}
        </button>
      </div>
      <small className="muted">{t.note}</small>
    </fieldset>
  )
}
