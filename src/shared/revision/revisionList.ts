// Panneau des révisions (étape 18C-8) : une ligne par marque, dans l'ordre du texte. Calcul pur, tiré
// du document déjà analysé par l'éditeur : rien n'est enregistré dans le projet.

import { getScenes, type FountainDocument } from '@neoscenar/fountain'
import { parseSceneNumber, sceneLabel } from '../scriptLink'
import { REVISION_COLORS, type RevisionColor, type RevisionMark } from './revisionMarks'

export interface RevisionListItem {
  color: RevisionColor
  /** Numéro affiché de la scène (« S_0030 »), ou null : avant la première scène ou sans numéro. */
  scene: string | null
  /** Début du texte surligné, sans les notes qu'il contient, sur une ligne. */
  excerpt: string
  comment: string
  /** Début de la marque (note d'ouverture) : sert à la retrouver dans le texte actuel. */
  start: number
  /** Texte surligné (sans les marqueurs) : sélectionné au clic sur la ligne. */
  from: number
  to: number
}

export const EXCERPT_LENGTH = 40

/** Texte surligné sur une ligne, sans notes ; coupé à `length` caractères avec « … ». */
export function excerptOf(raw: string, length = EXCERPT_LENGTH): string {
  const plain = raw
    .replace(/\[\[[\s\S]*?\]\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length <= length ? plain : `${plain.slice(0, length - 1).trimEnd()}…`
}

/** Numéro de scène affiché pour chaque élément, d'après le `#30#` de l'en-tête qui le précède. */
function sceneOfElements(doc: FountainDocument): (string | null)[] {
  const result: (string | null)[] = new Array(doc.elements.length).fill(null)
  for (const scene of getScenes(doc)) {
    const raw = scene.info.number
    const number = raw === null ? null : parseSceneNumber(raw)
    const label = number ? sceneLabel(number) : null
    for (let index = scene.index; index <= scene.index + scene.elements.length; index++) {
      result[index] = label
    }
  }
  return result
}

export function buildRevisionList(
  text: string,
  doc: FountainDocument,
  marks: readonly RevisionMark[]
): RevisionListItem[] {
  const scenes = sceneOfElements(doc)
  return marks.map((mark) => ({
    color: mark.color,
    scene: scenes[mark.element] ?? null,
    excerpt: excerptOf(text.slice(mark.open.to, mark.close.from)),
    comment: mark.comment,
    start: mark.open.from,
    from: mark.open.to,
    to: mark.close.from
  }))
}

// Filtre par couleur du panneau (étape 18C-9) : il ne touche que la liste, jamais l'éditeur.

export type ColorCounts = Record<RevisionColor, number>

export function countByColor(items: readonly RevisionListItem[]): ColorCounts {
  const counts = Object.fromEntries(REVISION_COLORS.map((color) => [color, 0])) as ColorCounts
  for (const item of items) counts[item.color]++
  return counts
}

/** Lignes affichées : celles dont la couleur n'est pas cachée. */
export function filterRevisionList(
  items: readonly RevisionListItem[],
  hidden: readonly RevisionColor[]
): RevisionListItem[] {
  return hidden.length === 0 ? [...items] : items.filter((item) => !hidden.includes(item.color))
}

/**
 * Couleurs cachées après un clic sur une pastille du filtre. Clic : afficher / cacher cette couleur.
 * Alt + clic : n'afficher qu'elle ; si elle est déjà la seule affichée (parmi les couleurs qui ont
 * des marques), tout rallumer. Une couleur sans marque ne réagit pas.
 */
export function toggleColorFilter(
  hidden: readonly RevisionColor[],
  color: RevisionColor,
  alone: boolean,
  counts: ColorCounts
): RevisionColor[] {
  if (counts[color] === 0) return [...hidden]
  if (!alone) {
    return hidden.includes(color)
      ? hidden.filter((item) => item !== color)
      : REVISION_COLORS.filter((item) => item === color || hidden.includes(item))
  }
  const others = REVISION_COLORS.filter((item) => item !== color)
  const isolated =
    !hidden.includes(color) && others.every((item) => counts[item] === 0 || hidden.includes(item))
  return isolated ? [] : others
}
