import { useEffect } from 'react'
import type { ProjectSettings } from '../../shared/projectTypes'
import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'
import { Board } from './Board'
import { cardsStore, loadProject, loadShowThumbnails, loadVocabulary, loadZoom } from './cardsStore'
import { resetSizes } from './thumbnails/sizesStore'
import { CardsDnd } from './CardsDnd'
import { ContextMenu } from './ContextMenu'
import { DetailPanel } from './DetailPanel'
import { Toolbar } from './Toolbar'
import { useBoardKeyboard } from './useBoardKeyboard'
import { useImagePaste } from './thumbnails/useImagePaste'
import { DrawingEditor } from '../drawing/DrawingEditor'

/** Module Cartes : barre d'outils, tableau des cartes et panneau de fiche. */
export function CardsModule({
  projectId,
  settings
}: {
  projectId: string
  settings: ProjectSettings
}) {
  const history = useStore(cardsStore, (state) => state.history)
  const selection = useStore(cardsStore, (state) => state.selection)
  const zoom = useStore(cardsStore, (state) => state.zoom)
  const panelOpen = useStore(cardsStore, (state) => state.panelOpen)
  const saveStatus = useStore(cardsStore, (state) => state.saveStatus)
  const syncError = useStore(cardsStore, (state) => state.syncError)
  const loadError = useStore(cardsStore, (state) => state.loadError)
  const importProgress = useStore(cardsStore, (state) => state.importProgress)
  const drawing = useStore(cardsStore, (state) => state.drawing)

  useEffect(() => {
    resetSizes()
    void loadProject(projectId)
  }, [projectId])
  useEffect(() => {
    cardsStore.set({ settings })
  }, [settings])
  useEffect(() => {
    void loadZoom()
    void loadShowThumbnails()
    void loadVocabulary()
  }, [])
  useBoardKeyboard()
  useImagePaste()

  if (loadError) return <p className="cards-message error-text">{loadError}</p>
  if (!history) return <p className="cards-message muted">{fr.cards.loading}</p>
  const decoupage = history.present

  return (
    <div className="cards-module">
      {/* La taille des cartes s'applique au tableau et à l'image glissée. */}
      <div className="cards-main" style={{ '--zoom': zoom } as React.CSSProperties}>
        <Toolbar decoupage={decoupage} zoom={zoom} saveStatus={saveStatus} settings={settings} />
        {saveStatus.state === 'error' && (
          <div className="banner error" role="alert">
            {fr.save.errorBanner(saveStatus.message)}
          </div>
        )}
        {importProgress && (
          <div className="banner info" role="status">
            {fr.thumbnail.progress(importProgress.done, importProgress.total)}
          </div>
        )}
        {syncError && (
          <div className="banner error" role="alert">
            {fr.save.rejectedBanner(syncError)}
          </div>
        )}
        <CardsDnd decoupage={decoupage}>
          <Board decoupage={decoupage} selection={selection} />
        </CardsDnd>
      </div>
      <DetailPanel decoupage={decoupage} selection={selection} open={panelOpen} />
      <ContextMenu />
      {drawing && <DrawingEditor key={drawing.shotId} shotId={drawing.shotId} />}
    </div>
  )
}
