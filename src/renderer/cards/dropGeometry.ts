// Calcul de l'endroit où un élément glissé sera déposé, à partir de la position des cartes à
// l'écran. Fonctions pures (aucun accès à la page), testées.

export interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

export interface Point {
  x: number
  y: number
}

/**
 * Position d'insertion parmi des cartes rangées en lignes (qui passent à la ligne) : avant la
 * première carte située après le pointeur dans l'ordre de lecture.
 */
export function insertionIndex(cards: readonly Box[], point: Point): number {
  for (let index = 0; index < cards.length; index++) {
    const card = cards[index]
    // Au-dessus de la ligne de cette carte : on s'insère avant elle.
    if (point.y < card.top) return index
    // Sur la même ligne, à gauche de son milieu.
    if (point.y <= card.bottom && point.x < (card.left + card.right) / 2) return index
  }
  return cards.length
}

/** Rangée (scène) sous le pointeur ; entre deux rangées ou au-delà, la plus proche. */
export function rowAt(rows: readonly Box[], y: number): number {
  let best = 0
  let bestDistance = Infinity
  rows.forEach((row, index) => {
    const distance = y < row.top ? row.top - y : y > row.bottom ? y - row.bottom : 0
    if (distance < bestDistance) {
      best = index
      bestDistance = distance
    }
  })
  return best
}

/** Position d'insertion d'une scène : nombre de rangées dont le milieu est au-dessus du pointeur. */
export function sceneInsertionIndex(rows: readonly Box[], y: number): number {
  return rows.filter((row) => (row.top + row.bottom) / 2 < y).length
}

/**
 * Convertit une position dans la liste complète en position dans la liste une fois les éléments
 * déplacés retirés (c'est ce qu'attendent moveShots et moveScene).
 */
export function remainingIndex(
  ids: readonly string[],
  moved: ReadonlySet<string>,
  fullIndex: number
): number {
  return ids.slice(0, fullIndex).filter((id) => !moved.has(id)).length
}

const MARKER = 4

/** Barre verticale du repère de dépôt d'un plan, dans l'espace entre deux cartes. */
export function shotMarker(cards: readonly Box[], index: number, row: Box, gap: number): Box {
  if (cards.length === 0) {
    return { left: row.left, top: row.top, right: row.left + MARKER, bottom: row.bottom }
  }
  const card = index < cards.length ? cards[index] : cards[cards.length - 1]
  const x = index < cards.length ? card.left - gap / 2 : card.right + gap / 2
  return { left: x - MARKER / 2, top: card.top, right: x + MARKER / 2, bottom: card.bottom }
}

/** Barre horizontale du repère de dépôt d'une scène, entre deux rangées. */
export function sceneMarker(rows: readonly Box[], index: number, gap: number): Box {
  const first = rows[0]
  const y = index < rows.length ? rows[index].top - gap / 2 : rows[rows.length - 1].bottom + gap / 2
  return { left: first.left, top: y - MARKER / 2, right: first.right, bottom: y + MARKER / 2 }
}
