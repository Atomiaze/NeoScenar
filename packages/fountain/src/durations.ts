// Durée estimée : une page ≈ une minute, au prorata des lignes occupées.

import type { Pagination } from './paginate.ts'
import { getScenes } from './queries.ts'
import { getSectionRanges } from './structure.ts'
import type { FountainDocument } from './types.ts'

export interface DurationEstimate {
  /** Lignes comptées pour chaque élément : lignes vides avant lui et lignes imprimées. */
  elementLines: number[]
  totalSeconds: number
  /** Une entrée par scène, dans l'ordre de getScenes ; index = index de l'en-tête. */
  scenes: { order: number; index: number; seconds: number }[]
  /** Une entrée par section (acte, séquence) ; index = index de l'élément section. */
  sections: { index: number; level: number; seconds: number }[]
}

const SECONDS_PER_PAGE = 60

export function estimateDurations(doc: FountainDocument, pagination: Pagination): DurationEstimate {
  const elementLines = pagination.layouts.map((layout) =>
    layout.lines.length === 0 ? 0 : layout.spaceBefore + layout.lines.length
  )
  const counted = overlapRemoved(pagination, elementLines)
  const secondsPerLine = SECONDS_PER_PAGE / pagination.linesPerPage
  const seconds = (start: number, end: number): number => {
    let lines = 0
    for (let i = start; i < end; i++) lines += counted[i]
    return lines * secondsPerLine
  }

  return {
    elementLines,
    totalSeconds: seconds(0, elementLines.length),
    scenes: getScenes(doc).map((scene) => ({
      order: scene.order,
      index: scene.index,
      seconds: seconds(scene.index, scene.index + 1 + scene.elements.length)
    })),
    sections: getSectionRanges(doc).map((range) => ({
      index: range.index,
      level: range.level,
      seconds: seconds(range.index, range.end)
    }))
  }
}

/**
 * Lignes comptées dans les durées : deux dialogues simultanés durent comme la plus longue colonne.
 * La colonne de droite ne compte que ce qui dépasse la colonne de gauche (sur son personnage).
 * `elementLines` reste inchangé : le temps de parole de chaque personnage garde toutes ses lignes.
 */
function overlapRemoved(pagination: Pagination, elementLines: number[]): number[] {
  const counted = [...elementLines]
  const { layouts } = pagination
  for (let i = 0; i < layouts.length; i++) {
    if (layouts[i].dual !== 'right' || layouts[i].type !== 'character') continue
    let left = 0
    for (let j = i - 1; j >= 0; j--) {
      if (layouts[j].lines.length === 0) continue
      if (layouts[j].dual !== 'left') break
      // Sans la ligne vide qui précède le groupe : elle n'est comptée qu'une fois, à gauche.
      left += layouts[j].lines.length
      if (layouts[j].type === 'character') break
    }
    let right = 0
    const members: number[] = []
    for (let j = i; j < layouts.length; j++) {
      if (layouts[j].lines.length === 0) continue
      if (layouts[j].dual !== 'right' || (j > i && layouts[j].type === 'character')) break
      right += elementLines[j]
      members.push(j)
    }
    for (const member of members) counted[member] = 0
    counted[i] = Math.max(0, right - left)
  }
  return counted
}
