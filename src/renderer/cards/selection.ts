import type { ItemRef } from '../../shared/decoupage'
import type { Decoupage } from '../../shared/projectTypes'

// Sélection des cartes : fonctions pures, testées sans interface.

export interface Selection {
  /** Identifiants des scènes et plans sélectionnés. */
  ids: readonly string[]
  /** Dernière carte cliquée ou atteinte au clavier : point de départ de Maj + clic et des flèches. */
  anchor: ItemRef | null
}

export const EMPTY_SELECTION: Selection = { ids: [], anchor: null }

export interface ClickModifiers {
  /** Cmd (Mac) ou Ctrl : ajoute ou retire la carte de la sélection. */
  toggle: boolean
  /** Maj : sélectionne la plage de plans entre l'ancre et la carte cliquée. */
  range: boolean
}

export function single(ref: ItemRef): Selection {
  return { ids: [ref.id], anchor: ref }
}

/** Tous les plans dans l'ordre du film, toutes scènes confondues. */
function allShotIds(decoupage: Decoupage): string[] {
  return decoupage.scenes.flatMap((scene) => scene.shots.map((shot) => shot.id))
}

export function selectOnClick(
  decoupage: Decoupage,
  selection: Selection,
  ref: ItemRef,
  modifiers: ClickModifiers
): Selection {
  if (modifiers.range && ref.kind === 'shot' && selection.anchor?.kind === 'shot') {
    const shots = allShotIds(decoupage)
    const from = shots.indexOf(selection.anchor.id)
    const to = shots.indexOf(ref.id)
    if (from >= 0 && to >= 0) {
      const [start, end] = from <= to ? [from, to] : [to, from]
      // L'ancre reste la même : un second Maj + clic redéfinit la plage depuis le même point.
      return { ids: shots.slice(start, end + 1), anchor: selection.anchor }
    }
  }
  if (modifiers.toggle) {
    const ids = selection.ids.includes(ref.id)
      ? selection.ids.filter((id) => id !== ref.id)
      : [...selection.ids, ref.id]
    return { ids, anchor: ref }
  }
  return single(ref)
}

export type Direction = 'left' | 'right' | 'up' | 'down'

/** Toutes les cartes dans l'ordre de lecture : chaque scène suivie de ses plans. */
export function cardOrder(decoupage: Decoupage): ItemRef[] {
  return decoupage.scenes.flatMap((scene): ItemRef[] => [
    { kind: 'scene', id: scene.id },
    ...scene.shots.map((shot): ItemRef => ({ kind: 'shot', id: shot.id }))
  ])
}

/** Position d'une carte : rangée (scène) et colonne (0 = carte scène, 1 = premier plan…). */
function positionOf(decoupage: Decoupage, ref: ItemRef): { row: number; column: number } | null {
  for (let row = 0; row < decoupage.scenes.length; row++) {
    const scene = decoupage.scenes[row]
    if (ref.kind === 'scene' && scene.id === ref.id) return { row, column: 0 }
    const shotIndex = scene.shots.findIndex((shot) => shot.id === ref.id)
    if (ref.kind === 'shot' && shotIndex >= 0) return { row, column: shotIndex + 1 }
  }
  return null
}

function refAt(decoupage: Decoupage, row: number, column: number): ItemRef {
  const scene = decoupage.scenes[row]
  const shot = scene.shots[Math.min(column, scene.shots.length) - 1]
  return column === 0 || !shot ? { kind: 'scene', id: scene.id } : { kind: 'shot', id: shot.id }
}

/**
 * Flèches : gauche/droite passent à la carte précédente/suivante ; haut/bas à la rangée voisine,
 * à la même place si possible (sinon sur le dernier plan). Sans sélection : première carte.
 */
export function moveWithArrow(
  decoupage: Decoupage,
  selection: Selection,
  direction: Direction
): Selection {
  const order = cardOrder(decoupage)
  if (order.length === 0) return EMPTY_SELECTION
  const position = selection.anchor ? positionOf(decoupage, selection.anchor) : null
  if (!selection.anchor || !position) return single(order[0])

  if (direction === 'left' || direction === 'right') {
    const index = order.findIndex((ref) => ref.id === selection.anchor?.id)
    const next = direction === 'left' ? index - 1 : index + 1
    return single(order[Math.max(0, Math.min(order.length - 1, next))])
  }
  const row = position.row + (direction === 'up' ? -1 : 1)
  if (row < 0 || row >= decoupage.scenes.length) return single(selection.anchor)
  return single(refAt(decoupage, row, position.column))
}

/** Retire de la sélection ce qui n'existe plus (après une suppression ou une annulation). */
export function pruneSelection(decoupage: Decoupage, selection: Selection): Selection {
  const existing = new Set(cardOrder(decoupage).map((ref) => ref.id))
  const ids = selection.ids.filter((id) => existing.has(id))
  const anchor = selection.anchor && existing.has(selection.anchor.id) ? selection.anchor : null
  if (ids.length === selection.ids.length && anchor === selection.anchor) return selection
  return { ids, anchor }
}
