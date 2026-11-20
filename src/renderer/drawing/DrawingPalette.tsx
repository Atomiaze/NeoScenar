import { CARD_PALETTE, COLOR_SHADES } from '../../shared/palette'
import { DRAWING_BLACK, DRAWING_WHITE } from '../../shared/drawing/swatches'
import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'
import { chooseColor, drawingTools } from './toolsStore'

/**
 * Nuancier : les 36 couleurs des cartes, rangées comme dans la fiche (une ligne par nuance, une
 * colonne par teinte), plus le noir et le blanc.
 */
export function DrawingPalette() {
  const color = useStore(drawingTools, (state) => state.color)
  const swatch = (hex: string, name: string) => (
    <button
      key={hex}
      className={`drawing-swatch${color === hex ? ' active' : ''}`}
      style={{ background: hex }}
      title={name}
      aria-label={name}
      aria-pressed={color === hex}
      onClick={() => chooseColor(hex)}
    />
  )
  return (
    <footer className="drawing-palette" aria-label={fr.drawing.palette}>
      <div className="drawing-swatches">
        {COLOR_SHADES.map((shade) =>
          CARD_PALETTE.filter((item) => item.shade === shade).map((item) =>
            swatch(item.hex, fr.colorName(item.hue, item.shade))
          )
        )}
      </div>
      <div className="drawing-swatches black-white">
        {swatch(DRAWING_BLACK, fr.drawing.black)}
        {swatch(DRAWING_WHITE, fr.drawing.white)}
      </div>
      <span
        className="drawing-current"
        style={{ background: color }}
        title={fr.drawing.currentColor}
      />
    </footer>
  )
}
