import { useEffect } from 'react'
import { SaveIndicator } from '../components/SaveIndicator'
import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'
import { ElementBar } from './ElementBar'
import { ElementSelector } from './ElementSelector'
import { ScriptEditor } from './ScriptEditor'
import {
  exitFocusMode,
  loadElementBarShown,
  loadScenario,
  openTitlePage,
  scriptStore
} from './scriptStore'
import { openPdfExport } from '../pdfExport/pdfExportStore'
import { Icon } from '../components/Icon'
import { SceneNavigator } from './navigator/SceneNavigator'
import { PageIndicator } from './PageIndicator'
import {
  loadNavigatorShown,
  navigatorStore,
  navigatorVisible,
  toggleNavigatorShown
} from './navigator/navigatorStore'
import { useNavigatorSqueeze } from './navigator/useNavigatorSqueeze'
import { RevisionPalette, RevisionPopups, RevisionSidePanel } from './revision/RevisionPanel'
import {
  loadRevisionPanelShown,
  resetRevisionFilter,
  revisionStore,
  togglePalette
} from './revision/revisionStore'
import './script.css'

/** Module Scénario : barre d'outils, navigateur de scènes et éditeur du scénario. */
export function ScriptModule({ projectId }: { projectId: string }) {
  const parts = useStore(scriptStore, (state) => state.parts)
  const version = useStore(scriptStore, (state) => state.version)
  const status = useStore(scriptStore, (state) => state.status)
  const loadError = useStore(scriptStore, (state) => state.loadError)
  const sendError = useStore(scriptStore, (state) => state.sendError)
  const notice = useStore(scriptStore, (state) => state.notice)
  const navigatorShown = useStore(navigatorStore, navigatorVisible)
  const focusMode = useStore(scriptStore, (state) => state.focusMode)
  const elementBarShown = useStore(scriptStore, (state) => state.elementBarShown)
  const paletteShown = useStore(revisionStore, (state) => state.paletteShown)
  const revisionPanelShown = useStore(revisionStore, (state) => state.panelShown)
  const sidePanelShown = paletteShown && revisionPanelShown && !focusMode && parts !== null
  useNavigatorSqueeze(paletteShown, sidePanelShown, version)

  // Échap quitte le mode concentration, sauf s'il vient de fermer une liste d'autocomplétion ou le
  // panneau de recherche (CodeMirror marque alors la touche comme traitée).
  useEffect(() => {
    if (!focusMode) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !event.defaultPrevented) exitFocusMode()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusMode])

  useEffect(() => {
    void loadScenario(projectId)
    void loadRevisionPanelShown()
    resetRevisionFilter()
  }, [projectId])
  useEffect(() => {
    void loadNavigatorShown()
    void loadElementBarShown()
  }, [])

  return (
    <div className={focusMode ? 'script-module focus-mode' : 'script-module'}>
      {!focusMode && (
        <div className="toolbar" role="toolbar">
          <div className="toolbar-group">
            <button
              className="tool-button icon-only"
              title={fr.script.navigator.toggle}
              aria-label={fr.script.navigator.toggle}
              aria-pressed={navigatorShown}
              onClick={() => void toggleNavigatorShown()}
            >
              <Icon name="sidebar" size={18} />
            </button>
            <ElementSelector />
            <button className="tool-button" onClick={openTitlePage}>
              {fr.script.titlePage.button}
            </button>
            <button
              className="tool-button"
              title={fr.pdfExport.toolbarTitle}
              onClick={openPdfExport}
            >
              {fr.pdfExport.toolbar}
            </button>
            <button
              className="tool-button"
              title={fr.script.revision.buttonTitle}
              aria-pressed={paletteShown}
              onClick={togglePalette}
            >
              {fr.script.revision.button}
            </button>
          </div>
          <div className="toolbar-group toolbar-status">
            <PageIndicator />
            {notice && (
              <span className="script-notice" role="status">
                {notice}
              </span>
            )}
            <SaveIndicator status={status} />
          </div>
        </div>
      )}
      {!focusMode && paletteShown && parts && <RevisionPalette />}
      {status.state === 'error' && (
        <div className="banner error" role="alert">
          {fr.script.errorBanner(status.message)}
        </div>
      )}
      {sendError && (
        <div className="banner error" role="alert">
          {fr.save.rejectedBanner(sendError)}
        </div>
      )}
      {loadError && <p className="cards-message error-text">{loadError}</p>}
      {!loadError && !parts && <p className="cards-message muted">{fr.script.loading}</p>}
      {parts && (
        <div className="script-body">
          {navigatorShown && <SceneNavigator />}
          {elementBarShown && !focusMode && <ElementBar />}
          <ScriptEditor key={version} version={version} />
          {/* Après l'éditeur : il est attaché quand le panneau lit le texte pour la première fois. */}
          {sidePanelShown && <RevisionSidePanel key={`revisions-${version}`} />}
        </div>
      )}
      <RevisionPopups />
    </div>
  )
}
