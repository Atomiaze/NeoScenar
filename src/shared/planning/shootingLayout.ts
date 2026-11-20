// Vue « Tournage » et rangée des jours dans le Gantt (étape 15D-2) : petits calculs purs.

import type { Phase } from './types'
import type { ShootingDay } from './shootingTypes'
import { dayNumber, isoFromDay } from './timeline'

/** Nom comparé sans casse ni accents (« tournage », « TOURNAGE », « Tôurnage »). */
function foldedName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLocaleUpperCase('fr')
}

/**
 * Place de la rangée « Jours de tournage » : rang de la phase après laquelle elle s'insère (la phase
 * nommée « Tournage », décidé le 20 nov.), ou -1 = en bas, après toutes les phases.
 */
export function shootingRowAfter(phases: readonly Pick<Phase, 'nom'>[]): number {
  return phases.findIndex((phase) => foldedName(phase.nom) === 'TOURNAGE')
}

/** Date d'un nouveau jour : le lendemain du dernier jour daté, sinon aujourd'hui. */
export function nextShootingDate(
  days: readonly Pick<ShootingDay, 'date'>[],
  today: string
): string {
  const dates = days.map((day) => day.date).filter((date): date is string => date !== null)
  if (dates.length === 0) return today
  const last = dates.reduce((a, b) => (a > b ? a : b))
  return isoFromDay(dayNumber(last) + 1)
}

/**
 * Rang d'arrivée pour `moveSceneToDay` (place une fois la scène retirée de son jour de départ).
 * `hoverIndex` = place visée dans la liste telle qu'elle est affichée (0 = avant la première scène,
 * `scenes.length` = à la fin).
 */
export function dropIndex(
  scenes: readonly string[],
  cardId: string,
  hoverIndex: number,
  sameDay: boolean
): number {
  const at = Math.min(Math.max(hoverIndex, 0), scenes.length)
  if (!sameDay) return at
  const current = scenes.indexOf(cardId)
  return current !== -1 && current < at ? at - 1 : at
}

/** Vrai si déposer là ne change rien (même jour, même place). */
export function dropChangesNothing(
  scenes: readonly string[],
  cardId: string,
  hoverIndex: number
): boolean {
  const current = scenes.indexOf(cardId)
  return current !== -1 && dropIndex(scenes, cardId, hoverIndex, true) === current
}
