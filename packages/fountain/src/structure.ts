// Structure du scénario pour l'affichage : étendue des sections (actes, séquences), bandeaux « FIN DE … »,
// numéros de scène affichés.

import { getScenes } from './queries.ts'
import type { FountainDocument } from './types.ts'

export interface SectionRange {
  /** Index de l'élément section dans document.elements. */
  index: number
  level: number
  /** Titre complet : « ACTE 1 - INTRO » (repris dans « FIN DE ACTE 1 - INTRO »). */
  title: string
  /** Index du premier élément qui n'appartient plus à la section (elements.length si elle va jusqu'à la fin). */
  end: number
}

/** Bandeau « FIN DE … » ajouté à l'affichage seulement. */
export interface SectionEnd {
  sectionIndex: number
  level: number
  title: string
  /** Le bandeau se place avant cet élément ; null : à la fin du scénario. */
  beforeElement: number | null
}

/** Une section s'étend jusqu'à la section suivante de même niveau ou de niveau supérieur (moins de #). */
export function getSectionRanges(doc: FountainDocument): SectionRange[] {
  const ranges: SectionRange[] = []
  const open: SectionRange[] = []
  doc.elements.forEach((element, index) => {
    if (element.type !== 'section') return
    const level = element.section?.level ?? 1
    while (open.length > 0 && open[open.length - 1].level >= level) open.pop()!.end = index
    const range = { index, level, title: element.text.trim(), end: doc.elements.length }
    ranges.push(range)
    open.push(range)
  })
  return ranges
}

/**
 * Bandeaux « FIN DE … », dans l'ordre d'affichage. Quand plusieurs sections se terminent au même endroit,
 * la plus profonde se ferme d'abord (FIN DE SÉQUENCE avant FIN DE ACTE).
 */
export function getSectionEnds(doc: FountainDocument): SectionEnd[] {
  return getSectionRanges(doc)
    .sort((a, b) => a.end - b.end || b.level - a.level || b.index - a.index)
    .map((range) => ({
      sectionIndex: range.index,
      level: range.level,
      title: range.title,
      beforeElement: range.end < doc.elements.length ? range.end : null
    }))
}

/** Numéro affiché devant chaque en-tête : le numéro forcé #…# s'il existe, sinon l'ordre (1, 2, 3…). */
export function getSceneNumbers(doc: FountainDocument): string[] {
  return getScenes(doc).map((scene) => scene.info.number ?? String(scene.order))
}
