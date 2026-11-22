// Panneau des révisions (étape 18C-8) : une ligne par marque, dans l'ordre du texte. Calcul pur, tiré
// du document déjà analysé par l'éditeur : rien n'est enregistré dans le projet.

import { getScenes, type FountainDocument } from '@neoscenar/fountain'
import { parseSceneNumber, sceneLabel } from '../scriptLink'
import type { RevisionColor, RevisionMark } from './revisionMarks'

export interface RevisionListItem {
  color: RevisionColor
  /** Numéro affiché de la scène (« S_0030 »), ou null : avant la première scène ou sans numéro. */
  scene: string | null
  /** Début du texte surligné, sans les notes qu'il contient, sur une ligne. */
  excerpt: string
  comment: string
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
    from: mark.open.to,
    to: mark.close.from
  }))
}
