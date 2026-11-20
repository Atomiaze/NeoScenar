import { BRUSH_PRESETS, MAX_BRUSH_SIZE, MIN_BRUSH_SIZE } from '../../shared/drawing/brush'
import { Icon, type IconName } from '../components/Icon'
import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'
import { chooseTool, drawingTools, setToolSize, sizedTool, type DrawingTool } from './toolsStore'

const TOOLS: { tool: DrawingTool; icon: IconName; key: string }[] = [
  { tool: 'brush', icon: 'brush', key: 'B' },
  { tool: 'eraser', icon: 'eraser', key: 'E' },
  { tool: 'fill', icon: 'bucket', key: 'G' }
]

/** Barre de gauche : outils, puis tailles de l'outil actif. */
export function DrawingToolbar() {
  const tool = useStore(drawingTools, (state) => state.tool)
  const sizes = useStore(drawingTools, (state) => state.sizes)
  const t = fr.drawing
  const size = sizes[sizedTool(tool)]
  // Le pot de peinture n'a pas de taille.
  const hasSize = tool !== 'fill'

  return (
    <aside className="drawing-tools" aria-label={t.tools}>
      {TOOLS.map((item) => (
        <button
          key={item.tool}
          className={`drawing-tool${tool === item.tool ? ' active' : ''}`}
          title={t.toolTitle(t.toolNames[item.tool], item.key)}
          aria-label={t.toolNames[item.tool]}
          aria-pressed={tool === item.tool}
          onClick={() => chooseTool(item.tool)}
        >
          <Icon name={item.icon} size={22} />
        </button>
      ))}
      <hr />
      <div className="drawing-sizes" role="group" aria-label={t.size} aria-disabled={!hasSize}>
        {BRUSH_PRESETS.map((preset) => (
          <button
            key={preset}
            className={`drawing-size${hasSize && size === preset ? ' active' : ''}`}
            title={t.sizeValue(preset)}
            aria-label={t.sizeValue(preset)}
            disabled={!hasSize}
            onClick={() => setToolSize(preset)}
          >
            <span style={{ width: 4 + preset * 0.5, height: 4 + preset * 0.5 }} />
          </button>
        ))}
        <input
          type="range"
          className="drawing-size-slider"
          min={MIN_BRUSH_SIZE}
          max={MAX_BRUSH_SIZE}
          value={size}
          disabled={!hasSize}
          aria-label={t.size}
          title={t.sizeShortcut}
          onChange={(event) => setToolSize(Number(event.target.value))}
        />
        <span className="drawing-size-value">{hasSize ? t.sizeValue(size) : '—'}</span>
      </div>
    </aside>
  )
}
