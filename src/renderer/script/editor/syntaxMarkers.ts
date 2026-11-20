import type { ElementType } from '@neoscenar/fountain'

/** Morceau de ligne (positions relatives au début de la ligne). */
export interface LineRange {
  from: number
  to: number
}

const LEADING: Partial<Record<ElementType, RegExp>> = {
  action: /^\s*!/,
  character: /^\s*@\s*/,
  scene_heading: /^\s*\.(?=[\p{L}\p{N}])/u,
  transition: /^\s*>\s*/,
  centered: /^\s*>\s*/,
  lyrics: /^\s*~/,
  synopsis: /^\s*=\s*/,
  section: /^\s*#+\s*/
}
const CENTERED_END = /\s*<\s*$/
const SCENE_NUMBER = /\s*#[\p{L}\p{N}.-]+#\s*$/u

/**
 * Marqueurs de syntaxe Fountain d'une ligne, masqués à l'affichage quand le curseur n'y est pas :
 * forçage (!, @, ., >, ~), fin de texte centré (<), synopsis (=), section (#), numéro de scène (#12#).
 * Une action n'a de marqueur que si elle est forcée : « !SILENCE. » et pas « !» au milieu d'une phrase.
 */
export function syntaxMarkers(
  type: ElementType,
  forced: boolean,
  line: string,
  firstLine: boolean
): LineRange[] {
  if (!firstLine) return []
  const ranges: LineRange[] = []
  const leading = LEADING[type]
  const needsForce = type === 'action' || type === 'scene_heading' || type === 'transition'
  const match = leading && (!needsForce || forced) ? leading.exec(line) : null
  if (match && match[0].trim() !== '') ranges.push({ from: 0, to: match[0].length })
  if (type === 'centered') {
    const end = CENTERED_END.exec(line)
    if (end) ranges.push({ from: end.index, to: line.length })
  }
  if (type === 'scene_heading') {
    const number = SCENE_NUMBER.exec(line)
    if (number) ranges.push({ from: number.index, to: line.length })
  }
  return ranges
}
