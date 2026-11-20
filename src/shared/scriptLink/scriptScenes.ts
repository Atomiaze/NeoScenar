import { parse, type FountainDocument } from '@neoscenar/fountain'
import type { ItemNumber } from '../projectTypes'
import { parseSceneNumber } from './sceneNumber'

// Scènes du scénario telles que le rapprochement les voit : en-tête, numéro écrit entre #, et
// positions utiles pour réécrire le numéro ou déplacer tout le bloc de la scène.

/** En-tête provisoire inséré par les cartes quand la carte n'a pas d'en-tête : `.SCÈNE À ÉCRIRE #25#`. */
export const PLACEHOLDER_HEADING = 'SCÈNE À ÉCRIRE'

/** Portion du texte : de `from` (inclus) à `to` (exclu), en caractères. */
export interface TextRange {
  from: number
  to: number
}

export interface ScriptScene {
  /** En-tête sans le numéro, sans le point de forçage ni les notes ; vide pour l'en-tête provisoire. */
  heading: string
  /** Numéro tel qu'écrit entre les # (« 30A », « 3.1 »), ou null s'il n'y en a pas. */
  rawNumber: string | null
  /** Numéro valide, ou null (absent ou invalide). */
  number: ItemNumber | null
  /** Ligne de l'en-tête, sans sa fin de ligne. */
  line: TextRange
  /** Marqueur « #30# » avec les espaces qui le précèdent, ou null s'il n'y en a pas. */
  marker: TextRange | null
  /** Fin du texte utile de la ligne (avant les espaces finaux) : là où l'on ajoute un marqueur. */
  contentEnd: number
  /**
   * Bloc de la scène : de son en-tête jusqu'au prochain en-tête ou à la prochaine section (exclus),
   * sinon jusqu'à la fin du texte. Il comprend les lignes vides qui le terminent.
   */
  block: TextRange
}

// Même règle que l'analyseur Fountain : un numéro entre # tout à la fin de la ligne.
const MARKER = /\s*#[\p{L}\p{N}.-]+#\s*$/u
const MARKED_TEXT = /\[\[[\s\S]*?\]\]|\/\*[\s\S]*?\*\//g

function lineEnd(text: string, from: number): number {
  const match = /\r\n|\r|\n/.exec(text.slice(from))
  return match ? from + match.index : text.length
}

/** En-tête affiché sur la carte : sans notes ni espaces superflus ; vide pour l'en-tête provisoire. */
function cardHeading(text: string): string {
  const heading = text.replace(MARKED_TEXT, '').replace(/\s+/g, ' ').trim()
  return heading === PLACEHOLDER_HEADING ? '' : heading
}

/**
 * Scènes du corps du scénario (sans la page de titre), dans l'ordre du texte. `parsed` : analyse de
 * ce même texte déjà faite (par l'éditeur), pour ne pas la refaire.
 */
export function readScriptScenes(text: string, parsed?: FountainDocument): ScriptScene[] {
  const elements = (parsed ?? parse(text, { titlePage: false })).elements
  // Début du prochain en-tête ou de la prochaine section, pour chaque élément.
  const boundaries: number[] = []
  let boundary = text.length
  for (let i = elements.length - 1; i >= 0; i--) {
    boundaries[i] = boundary
    const { type, position } = elements[i]
    if (position && (type === 'scene_heading' || type === 'section'))
      boundary = position.startOffset
  }
  const scenes: ScriptScene[] = []
  elements.forEach((element, index) => {
    if (element.type !== 'scene_heading' || !element.position) return
    const from = element.position.startOffset
    const to = lineEnd(text, from)
    const lineText = text.slice(from, to)
    const contentEnd = from + lineText.trimEnd().length
    const marker = MARKER.exec(lineText)
    const rawNumber = element.scene?.number ?? null
    scenes.push({
      heading: cardHeading(element.text),
      rawNumber,
      number: rawNumber === null ? null : parseSceneNumber(rawNumber),
      line: { from, to },
      marker: marker && rawNumber !== null ? { from: from + marker.index, to: contentEnd } : null,
      contentEnd,
      block: { from, to: boundaries[index] }
    })
  })
  return scenes
}

/**
 * Scène qui contient la position `pos` (le curseur) : celle dont le bloc la contient, comme la
 * scène mise en évidence dans le navigateur. Null avant la première scène, ou dans le texte d'une
 * section (acte) qui précède sa première scène.
 */
export function sceneAt(
  scenes: readonly ScriptScene[],
  pos: number,
  textLength: number
): ScriptScene | null {
  return (
    scenes.find(
      (scene) =>
        pos >= scene.block.from &&
        (pos < scene.block.to || (scene.block.to === textLength && pos === textLength))
    ) ?? null
  )
}
