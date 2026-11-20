import type { ElementType } from '@neoscenar/fountain'
import type { IconName } from '../components/Icon'
import { fr } from '../i18n/fr'

/**
 * Éléments proposés par le sélecteur de la barre d'outils et par la barre des éléments, dans l'ordre
 * de KIT : les six éléments courants, puis les autres.
 */
export const ELEMENT_GROUPS: readonly (readonly ElementType[])[] = [
  ['scene_heading', 'action', 'character', 'parenthetical', 'dialogue', 'transition'],
  ['lyrics', 'note', 'section', 'synopsis', 'centered', 'page_break']
]

export const ELEMENT_CHOICES: readonly ElementType[] = ELEMENT_GROUPS.flat()

export const ELEMENT_ICONS: Partial<Record<ElementType, IconName>> = {
  scene_heading: 'elementHeading',
  action: 'elementAction',
  character: 'elementCharacter',
  parenthetical: 'elementParenthetical',
  dialogue: 'elementDialogue',
  transition: 'elementTransition',
  lyrics: 'elementLyrics',
  note: 'elementNote',
  section: 'elementSection',
  synopsis: 'elementSynopsis',
  centered: 'elementCentered',
  page_break: 'elementPageBreak'
}

/** Bulle d'un élément : « Personnage — ⌘U », ou le nom seul sans raccourci. */
export function elementTitle(type: ElementType): string {
  const name = fr.script.elements[type]
  const shortcut = fr.script.elementShortcuts[type]
  return shortcut ? `${name} — ${shortcut}` : name
}

export type ElementBarItem =
  | { kind: 'button'; type: ElementType; icon: IconName; title: string; active: boolean }
  | { kind: 'separator' }

/** Boutons de la barre des éléments ; celui de l'élément sous le curseur est mis en évidence. */
export function elementBarItems(cursorType: ElementType): ElementBarItem[] {
  return ELEMENT_GROUPS.flatMap((group, index) => [
    ...(index > 0 ? [{ kind: 'separator' as const }] : []),
    ...group.map((type) => ({
      kind: 'button' as const,
      type,
      icon: ELEMENT_ICONS[type] as IconName,
      title: elementTitle(type),
      active: type === cursorType
    }))
  ])
}
