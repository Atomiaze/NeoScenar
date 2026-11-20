import { Icon } from '../components/Icon'
import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'
import { elementBarItems } from './elementChoices'
import { chooseElementType, scriptStore } from './scriptStore'

/**
 * Barre des éléments, entre le navigateur et la page : un bouton par élément, comme le sélecteur de la
 * barre d'outils (même fonction). Le bouton de l'élément sous le curseur est mis en évidence.
 */
export function ElementBar() {
  const current = useStore(scriptStore, (state) => state.cursorType)
  return (
    <div
      className="element-bar"
      role="toolbar"
      aria-orientation="vertical"
      aria-label={fr.script.elementBar}
    >
      {elementBarItems(current).map((item, index) =>
        item.kind === 'separator' ? (
          <hr key={`separator-${index}`} className="element-bar-separator" />
        ) : (
          <button
            key={item.type}
            className={item.active ? 'element-bar-button active' : 'element-bar-button'}
            title={item.title}
            aria-label={item.title}
            aria-pressed={item.active}
            // Le bouton ne prend pas le focus : le curseur reste dans le texte.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => chooseElementType(item.type)}
          >
            <Icon name={item.icon} size={20} />
          </button>
        )
      )}
    </div>
  )
}
