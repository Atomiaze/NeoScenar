import { useEffect, useState } from 'react'
import { THEMES, paletteId, type ThemeChoice } from '../../shared/themes/themes'
import { ScriptColorsSettings } from './ScriptColorsSettings'
import { loadHighlightActiveLine, scriptStore, setHighlightActiveLine } from '../script/scriptStore'
import { useStore } from '../state/createStore'
import {
  loadContinuedMarks,
  paginationSettings,
  setContinuedMarks
} from '../script/editor/paginationSettings'
import { WELCOME_IMAGE_EVENT } from './HomeScreen'
import { fr } from '../i18n/fr'
import { Dialog } from './Dialog'

const t = fr.appSettings

/**
 * Fenêtre « Réglages… » (préférences de l'application, pas du projet). Pour l'instant, le thème ;
 * chaque choix est appliqué tout de suite.
 */
export function SettingsDialog({ onClose }: { onClose(): void }) {
  const [theme, setTheme] = useState<ThemeChoice | null>(null)
  const [welcomeError, setWelcomeError] = useState<string | null>(null)
  const highlight = useStore(scriptStore, (state) => state.highlightActiveLine)
  const continued = useStore(paginationSettings, (state) => state.continued)

  useEffect(() => {
    void loadHighlightActiveLine()
    void loadContinuedMarks()
    void window.neoscenar.getTheme().then(setTheme)
  }, [])

  const choose = (choice: ThemeChoice): void => {
    setTheme(choice)
    void window.neoscenar.setTheme(choice)
  }

  const chooseWelcome = async (): Promise<void> => {
    const result = await window.neoscenar.chooseWelcomeImage()
    if (result === null) return
    setWelcomeError(result.ok ? null : result.error)
    if (result.ok) window.dispatchEvent(new Event(WELCOME_IMAGE_EVENT))
  }

  const resetWelcome = async (): Promise<void> => {
    await window.neoscenar.resetWelcomeImage()
    setWelcomeError(null)
    window.dispatchEvent(new Event(WELCOME_IMAGE_EVENT))
  }

  return (
    <Dialog
      title={t.title}
      onClose={onClose}
      actions={
        <button className="primary" onClick={onClose}>
          {t.close}
        </button>
      }
    >
      <fieldset className="settings-group">
        <legend>{t.theme}</legend>
        {THEMES.map((choice) => (
          <label key={choice} className="settings-choice">
            <input
              type="radio"
              name="theme"
              value={choice}
              checked={theme === choice}
              disabled={theme === null}
              onChange={() => choose(choice)}
            />
            <span>{t.themes[choice]}</span>
            {choice === 'defaut' && <small className="muted">{t.defaultHint}</small>}
          </label>
        ))}
        <small className="muted">{t.themeNote}</small>
      </fieldset>
      <fieldset className="settings-group">
        <legend>{t.editor}</legend>
        <label className="settings-choice">
          <input
            type="checkbox"
            checked={highlight}
            onChange={(event) => void setHighlightActiveLine(event.target.checked)}
          />
          <span>{t.highlightActiveLine}</span>
        </label>
        <label className="settings-choice">
          <input
            type="checkbox"
            checked={continued}
            onChange={(event) => void setContinuedMarks(event.target.checked)}
          />
          <span>{t.continuedMarks}</span>
          <small className="muted">{t.continuedMarksHint}</small>
        </label>
      </fieldset>
      <fieldset className="settings-group">
        <legend>{t.welcomeImage.title}</legend>
        <div className="settings-choice">
          <span>{t.welcomeImage.label}</span>
          <button onClick={() => void chooseWelcome()}>{t.welcomeImage.choose}</button>
          <button onClick={() => void resetWelcome()}>{t.welcomeImage.reset}</button>
        </div>
        {welcomeError && (
          <small role="alert" className="settings-welcome-error">
            {welcomeError}
          </small>
        )}
        <small className="muted">{t.welcomeImage.note}</small>
      </fieldset>
      {theme !== null && (
        <ScriptColorsSettings
          key={paletteId(theme, window.matchMedia('(prefers-color-scheme: dark)').matches)}
          paletteId={paletteId(theme, window.matchMedia('(prefers-color-scheme: dark)').matches)}
        />
      )}
    </Dialog>
  )
}
