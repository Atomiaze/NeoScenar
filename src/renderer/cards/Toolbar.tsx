import type { SaveStatus } from '../../shared/api'
import { CARD_ZOOM } from '../../shared/cardZoom'
import { formatDuration, totalDuration } from '../../shared/decoupage'
import { formatAspect } from '../../shared/imageFormat'
import type { Decoupage, ProjectSettings } from '../../shared/projectTypes'
import { Icon, type IconName } from '../components/Icon'
import { SaveIndicator } from '../components/SaveIndicator'
import { fr } from '../i18n/fr'
import { cardsStore, openDialog, setZoom, toggleThumbnails } from './cardsStore'
import { useStore } from '../state/createStore'
import { addScene, addShot, toggleLock } from './actions'
import { openBlenderExport } from '../blender/exportStore'
import { openStoryboardExport } from '../storyboardExport/storyboardExportStore'

interface ToolbarProps {
  decoupage: Decoupage
  zoom: number
  saveStatus: SaveStatus
  settings: ProjectSettings
}

interface ToolButtonProps {
  icon: IconName
  label: string
  onClick(): void
  disabled?: boolean
  /** Infobulle, si elle diffère du libellé (raison d'une indisponibilité…). */
  title?: string
}

function ToolButton({ icon, label, onClick, disabled, title }: ToolButtonProps) {
  return (
    <button className="tool-button" title={title ?? label} disabled={disabled} onClick={onClick}>
      <Icon name={icon} size={18} />
      <span>{label}</span>
    </button>
  )
}

export function Toolbar({ decoupage, zoom, saveStatus, settings }: ToolbarProps) {
  const { width, height } = settings.resolution
  const showThumbnails = useStore(cardsStore, (state) => state.showThumbnails)
  const locked = decoupage.numbersLocked
  const noScene = decoupage.scenes.length === 0
  return (
    <div className="toolbar" role="toolbar">
      <div className="toolbar-group">
        <ToolButton icon="plus" label={fr.cards.addScene} onClick={addScene} />
        <ToolButton
          icon="plus"
          label={fr.cards.addShot}
          onClick={addShot}
          disabled={noScene}
          title={noScene ? fr.addMany.noSceneForShots : undefined}
        />
        <ToolButton
          icon="plusMany"
          label={fr.cards.addMany}
          onClick={() => openDialog({ kind: 'add-many' })}
        />
        <ToolButton
          icon="renumber"
          label={fr.cards.renumber}
          onClick={() => openDialog({ kind: 'renumber' })}
          disabled={locked || noScene}
          title={locked ? fr.numbering.renumberUnavailable : undefined}
        />
        <button
          className="tool-button icon-only"
          title={locked ? fr.cards.unlock : fr.cards.lock}
          aria-label={locked ? fr.cards.unlock : fr.cards.lock}
          aria-pressed={locked}
          onClick={toggleLock}
        >
          <Icon name={locked ? 'lockClosed' : 'lockOpen'} size={18} />
        </button>
        <button
          className="tool-button"
          title={fr.cards.showThumbnails}
          aria-pressed={showThumbnails}
          onClick={toggleThumbnails}
        >
          <Icon name="image" size={18} />
          <span>{fr.cards.thumbnailsButton}</span>
        </button>
        <ToolButton
          icon="export"
          label={fr.blender.toolbar}
          title={fr.blender.toolbarTitle}
          onClick={openBlenderExport}
        />
        <ToolButton
          icon="export"
          label={fr.storyboardExport.toolbar}
          title={fr.storyboardExport.toolbarTitle}
          onClick={openStoryboardExport}
        />
      </div>

      <div className="toolbar-group toolbar-status">
        <span className="format-summary" title={fr.format.summaryTitle}>
          {fr.format.summary(formatAspect(settings.resolution), width, height, settings.fps)}
        </span>
        <label className="zoom-control" title={fr.cards.zoom}>
          <span className="visually-hidden">{fr.cards.zoom}</span>
          <Icon name="cards" size={14} />
          <input
            type="range"
            min={CARD_ZOOM.min}
            max={CARD_ZOOM.max}
            step={CARD_ZOOM.step}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
          <Icon name="cards" size={20} />
        </label>
        <span className="total-duration" title={fr.cards.totalDuration}>
          {formatDuration(totalDuration(decoupage))}
        </span>
        <SaveIndicator status={saveStatus} />
      </div>
    </div>
  )
}
