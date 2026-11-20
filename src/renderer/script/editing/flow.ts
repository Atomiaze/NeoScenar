// Enchaînement des éléments au clavier, repris de KIT Scenarist.
// C'est LE fichier à ajuster après les essais en classe : rien d'autre ne décide de l'élément suivant.

import type { ElementType } from '@neoscenar/fountain'

export interface KeyFlow {
  /** Entrée en fin de ligne : élément de la nouvelle ligne. */
  enter: ElementType
  /** Tab sur une ligne vide : nouveau type de la ligne (null : rien). */
  tabOnEmpty: ElementType | null
  /** Tab sur une ligne écrite : élément de la nouvelle ligne (null : rien). */
  tabOnFilled: ElementType | null
}

export const KEY_FLOW: Partial<Record<ElementType, KeyFlow>> = {
  scene_heading: { enter: 'action', tabOnEmpty: null, tabOnFilled: 'action' },
  action: { enter: 'action', tabOnEmpty: 'character', tabOnFilled: 'character' },
  character: { enter: 'dialogue', tabOnEmpty: 'parenthetical', tabOnFilled: 'dialogue' },
  parenthetical: { enter: 'dialogue', tabOnEmpty: null, tabOnFilled: 'dialogue' },
  dialogue: { enter: 'action', tabOnEmpty: 'parenthetical', tabOnFilled: 'character' },
  transition: { enter: 'scene_heading', tabOnEmpty: null, tabOnFilled: 'scene_heading' }
}

/** Les autres éléments (paroles, texte centré, notes…) enchaînent sur une action. */
const DEFAULT_FLOW: KeyFlow = { enter: 'action', tabOnEmpty: null, tabOnFilled: null }

export function keyFlow(type: ElementType): KeyFlow {
  return KEY_FLOW[type] ?? DEFAULT_FLOW
}

const DIALOGUE_BLOCK: ReadonlySet<ElementType> = new Set([
  'character',
  'parenthetical',
  'dialogue',
  'lyrics'
])

/**
 * Lignes vides à placer entre deux éléments dans le texte Fountain : aucune à l'intérieur d'un bloc
 * de dialogue (personnage, didascalie, réplique, paroles), une partout ailleurs. La deuxième ligne vide
 * avant un en-tête de scène n'existe qu'à l'affichage.
 */
export function blankLinesBetween(previous: ElementType | null, next: ElementType): 0 | 1 {
  if (previous === null) return 0
  const inBlock = next === 'parenthetical' || next === 'dialogue' || next === 'lyrics'
  return inBlock && DIALOGUE_BLOCK.has(previous) ? 0 : 1
}
