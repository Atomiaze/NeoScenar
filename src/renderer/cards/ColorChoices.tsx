import { CARD_PALETTE, COLOR_SHADES } from '../../shared/palette'
import { fr } from '../i18n/fr'

interface ColorChoicesProps {
  onChoose(color: string | null): void
  /** Couleur actuelle, mise en évidence (undefined : aucune, par exemple sélection mélangée). */
  current?: string | null
  /** Affichée dans un menu (menu contextuel) plutôt que dans la fiche. */
  asMenu?: boolean
}

/** Palette (12 teintes en pastel, vif et foncé) + couleur par défaut. */
export function ColorChoices({ onChoose, current, asMenu = false }: ColorChoicesProps) {
  const itemRole = asMenu ? 'menuitem' : undefined
  return (
    <div className="color-choices" role={asMenu ? 'menu' : 'group'} aria-label={fr.panel.color}>
      {/* Une ligne par nuance (pastel, vif, foncé), une colonne par teinte. */}
      <div className="swatches">
        {COLOR_SHADES.map((shade) =>
          CARD_PALETTE.filter((color) => color.shade === shade).map((color) => {
            const name = fr.colorName(color.hue, color.shade)
            return (
              <button
                key={color.hex}
                type="button"
                role={itemRole}
                className={`swatch${current === color.hex ? ' current' : ''}`}
                style={{ background: color.hex }}
                title={name}
                aria-label={name}
                aria-pressed={asMenu ? undefined : current === color.hex}
                onClick={() => onChoose(color.hex)}
              />
            )
          })
        )}
      </div>
      <button
        type="button"
        role={itemRole}
        className={`default-color${current === null ? ' current' : ''}`}
        aria-pressed={asMenu ? undefined : current === null}
        onClick={() => onChoose(null)}
      >
        <span className="swatch default" aria-hidden="true" />
        {fr.contextMenu.defaultColor}
      </button>
    </div>
  )
}
