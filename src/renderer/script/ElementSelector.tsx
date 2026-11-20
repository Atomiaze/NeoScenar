import type { ElementType } from '@neoscenar/fountain'
import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'
import { ELEMENT_CHOICES } from './elementChoices'
import { chooseElementType, scriptStore } from './scriptStore'

/** Liste déroulante : type de l'élément sous le curseur ; en choisir un autre change la ligne. */
export function ElementSelector() {
  const current = useStore(scriptStore, (state) => state.cursorType)
  const t = fr.script
  return (
    <label className="element-selector" title={t.elementSelector}>
      <span className="visually-hidden">{t.elementSelector}</span>
      <select
        value={current}
        onChange={(event) => chooseElementType(event.target.value as ElementType)}
      >
        {/* Un texte mis de côté n'est pas proposé, mais il peut se trouver sous le curseur. */}
        {!ELEMENT_CHOICES.includes(current) && (
          <option value={current}>{t.elements[current]}</option>
        )}
        {ELEMENT_CHOICES.map((type) => {
          const shortcut = t.elementShortcuts[type]
          return (
            <option key={type} value={type}>
              {shortcut ? `${t.elements[type]}  ${shortcut}` : t.elements[type]}
            </option>
          )
        })}
      </select>
    </label>
  )
}
