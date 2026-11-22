// Modifications du plan de tournage : fonctions pures qui rendent un nouveau planning (même
// historique d'annulation que le reste du module). Les scènes sont des identifiants de cartes.

import type { IdSource } from '../decoupage/factories'
import { nameKey } from '../research/sheetNames'
import type { PlanningResult } from './planningEdit'
import { isIsoDate } from './planningData'
import { readShooting, withShooting } from './shootingData'
import type { ExtraPresent, SceneMark, Shooting, ShootingDay } from './shootingTypes'
import type { Planning } from './types'

const invalid: PlanningResult = { ok: false, problem: 'invalid' }
const notFound: PlanningResult = { ok: false, problem: 'not-found' }

function done(planning: Planning, shooting: Shooting, createdId?: string): PlanningResult {
  return {
    ok: true,
    planning: withShooting(planning, shooting),
    ...(createdId === undefined ? {} : { createdId })
  }
}

function mapDay(
  shooting: Shooting,
  dayId: string,
  change: (day: ShootingDay) => ShootingDay
): Shooting {
  return { ...shooting, jours: shooting.jours.map((d) => (d.id === dayId ? change(d) : d)) }
}

export function addShootingDay(
  planning: Planning,
  fields: { date?: string | null; titre?: string },
  ids: IdSource
): PlanningResult {
  if (fields.date != null && !isIsoDate(fields.date)) return invalid
  const shooting = readShooting(planning)
  const day: ShootingDay = {
    id: ids.newId(),
    date: fields.date ?? null,
    titre: (fields.titre ?? '').trim(),
    scenes: [],
    note: '',
    presents: []
  }
  return done(planning, { ...shooting, jours: [...shooting.jours, day] }, day.id)
}

export function updateShootingDay(
  planning: Planning,
  dayId: string,
  patch: { date?: string | null; titre?: string; note?: string }
): PlanningResult {
  const shooting = readShooting(planning)
  if (!shooting.jours.some((d) => d.id === dayId)) return notFound
  if (patch.date != null && !isIsoDate(patch.date)) return invalid
  return done(
    planning,
    mapDay(shooting, dayId, (day) => ({
      ...day,
      ...(patch.date === undefined ? {} : { date: patch.date }),
      ...(patch.titre === undefined ? {} : { titre: patch.titre.trim() }),
      ...(patch.note === undefined ? {} : { note: patch.note })
    }))
  )
}

export function removeShootingDay(planning: Planning, dayId: string): PlanningResult {
  const shooting = readShooting(planning)
  if (!shooting.jours.some((d) => d.id === dayId)) return notFound
  return done(planning, { ...shooting, jours: shooting.jours.filter((d) => d.id !== dayId) })
}

function insertAt(list: readonly string[], cardId: string, index: number | undefined): string[] {
  const at = index === undefined ? list.length : Math.min(Math.max(index, 0), list.length)
  return [...list.slice(0, at), cardId, ...list.slice(at)]
}

/** Planifie une scène dans un jour (à `index`, sinon à la fin). Déjà dans ce jour : refusé. */
export function addSceneToDay(
  planning: Planning,
  dayId: string,
  cardId: string,
  index?: number
): PlanningResult {
  const shooting = readShooting(planning)
  const day = shooting.jours.find((d) => d.id === dayId)
  if (!day) return notFound
  if (cardId === '' || day.scenes.includes(cardId)) return invalid
  return done(
    planning,
    mapDay(shooting, dayId, (d) => ({ ...d, scenes: insertAt(d.scenes, cardId, index) }))
  )
}

/**
 * Déplace une scène d'un jour à un autre, ou change son rang dans le même jour. `index` = place dans
 * la liste d'arrivée une fois la scène retirée du départ.
 */
export function moveSceneToDay(
  planning: Planning,
  cardId: string,
  fromDayId: string,
  toDayId: string,
  index?: number
): PlanningResult {
  const shooting = readShooting(planning)
  const from = shooting.jours.find((d) => d.id === fromDayId)
  const to = shooting.jours.find((d) => d.id === toDayId)
  if (!from || !to || !from.scenes.includes(cardId)) return notFound
  if (fromDayId !== toDayId && to.scenes.includes(cardId)) return invalid
  const removed = mapDay(shooting, fromDayId, (d) => ({
    ...d,
    scenes: d.scenes.filter((id) => id !== cardId)
  }))
  return done(
    planning,
    mapDay(removed, toDayId, (d) => ({ ...d, scenes: insertAt(d.scenes, cardId, index) }))
  )
}

export function removeSceneFromDay(
  planning: Planning,
  dayId: string,
  cardId: string
): PlanningResult {
  const shooting = readShooting(planning)
  const day = shooting.jours.find((d) => d.id === dayId)
  if (!day || !day.scenes.includes(cardId)) return notFound
  return done(
    planning,
    mapDay(shooting, dayId, (d) => ({ ...d, scenes: d.scenes.filter((id) => id !== cardId) }))
  )
}

function cleanLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** « Présents en plus » : ajoute une ligne (nom obligatoire, rôle facultatif) à un jour. */
export function addDayPresent(
  planning: Planning,
  dayId: string,
  fields: { nom: string; role?: string },
  ids: IdSource
): PlanningResult {
  const nom = cleanLine(fields.nom)
  if (nom === '') return invalid
  const shooting = readShooting(planning)
  if (!shooting.jours.some((d) => d.id === dayId)) return notFound
  const present: ExtraPresent = { id: ids.newId(), nom, role: cleanLine(fields.role ?? '') }
  return done(
    planning,
    mapDay(shooting, dayId, (d) => ({ ...d, presents: [...d.presents, present] })),
    present.id
  )
}

export function updateDayPresent(
  planning: Planning,
  dayId: string,
  presentId: string,
  patch: { nom?: string; role?: string }
): PlanningResult {
  const shooting = readShooting(planning)
  const day = shooting.jours.find((d) => d.id === dayId)
  if (!day?.presents.some((p) => p.id === presentId)) return notFound
  if (patch.nom !== undefined && cleanLine(patch.nom) === '') return invalid
  return done(
    planning,
    mapDay(shooting, dayId, (d) => ({
      ...d,
      presents: d.presents.map((p) =>
        p.id === presentId
          ? {
              ...p,
              ...(patch.nom === undefined ? {} : { nom: cleanLine(patch.nom) }),
              ...(patch.role === undefined ? {} : { role: cleanLine(patch.role) })
            }
          : p
      )
    }))
  )
}

export function removeDayPresent(
  planning: Planning,
  dayId: string,
  presentId: string
): PlanningResult {
  const shooting = readShooting(planning)
  const day = shooting.jours.find((d) => d.id === dayId)
  if (!day?.presents.some((p) => p.id === presentId)) return notFound
  return done(
    planning,
    mapDay(shooting, dayId, (d) => ({
      ...d,
      presents: d.presents.filter((p) => p.id !== presentId)
    }))
  )
}

/** Ajoute un personnage muet à une scène (nom d'une fiche Personnage). Déjà ajouté : refusé. */
export function addMuteCharacter(planning: Planning, cardId: string, name: string): PlanningResult {
  const nom = name.replace(/\s+/g, ' ').trim()
  if (nom === '' || cardId === '') return invalid
  const shooting = readShooting(planning)
  const current = shooting.muets[cardId] ?? []
  if (current.some((n) => nameKey(n) === nameKey(nom))) return invalid
  return done(planning, { ...shooting, muets: { ...shooting.muets, [cardId]: [...current, nom] } })
}

export function removeMuteCharacter(
  planning: Planning,
  cardId: string,
  name: string
): PlanningResult {
  const shooting = readShooting(planning)
  const current = shooting.muets[cardId] ?? []
  const kept = current.filter((n) => nameKey(n) !== nameKey(name))
  if (kept.length === current.length) return notFound
  const muets = { ...shooting.muets }
  if (kept.length === 0) delete muets[cardId]
  else muets[cardId] = kept
  return done(planning, { ...shooting, muets })
}

/** Carte, réduite à ce qui nomme sa scène. */
export interface MarkSource {
  id: string
  /** « S_0030 ». */
  label: string
  heading: string
}

/**
 * Repères (numéro + en-tête) des scènes placées dans un jour, d'après les cartes actuelles. Une scène
 * dont la carte n'existe plus garde son dernier repère ; une scène qui n'est plus dans aucun jour perd
 * le sien. Rend le même planning si rien ne change (aucune écriture inutile).
 */
export function rememberSceneMarks(planning: Planning, cards: readonly MarkSource[]): Planning {
  const shooting = readShooting(planning)
  const byId = new Map(cards.map((card) => [card.id, card]))
  const reperes: Record<string, SceneMark> = {}
  for (const cardId of new Set(shooting.jours.flatMap((day) => day.scenes))) {
    const card = byId.get(cardId)
    const mark = card ? { numero: card.label, entete: card.heading } : shooting.reperes[cardId]
    if (mark) reperes[cardId] = mark
  }
  if (JSON.stringify(reperes) === JSON.stringify(shooting.reperes)) return planning
  return withShooting(planning, { ...shooting, reperes })
}

/** Scène retirée d'un jour parce que sa carte n'existe plus du tout, avec son dernier repère. */
export interface RemovedScene {
  dayId: string
  cardId: string
  /** Null si la scène n'a jamais été vue avec un numéro (fichier écrit à la main). */
  mark: SceneMark | null
}

/**
 * Retire des jours (et des muets) les scènes dont la carte n'existe plus du tout. Une carte orpheline
 * existe encore : sa scène reste dans son jour (décidé le 20 nov.), marquée « disparue ».
 */
export function removeVanishedScenes(
  planning: Planning,
  existingCardIds: ReadonlySet<string>
): { planning: Planning; removed: RemovedScene[] } {
  const shooting = readShooting(planning)
  const removed: RemovedScene[] = []
  const jours = shooting.jours.map((day) => {
    const kept = day.scenes.filter((cardId) => {
      if (existingCardIds.has(cardId)) return true
      removed.push({ dayId: day.id, cardId, mark: shooting.reperes[cardId] ?? null })
      return false
    })
    return kept.length === day.scenes.length ? day : { ...day, scenes: kept }
  })
  const muets = Object.fromEntries(
    Object.entries(shooting.muets).filter(([cardId]) => existingCardIds.has(cardId))
  )
  const reperes = Object.fromEntries(
    Object.entries(shooting.reperes).filter(([cardId]) => existingCardIds.has(cardId))
  )
  const changed =
    removed.length > 0 ||
    Object.keys(muets).length !== Object.keys(shooting.muets).length ||
    Object.keys(reperes).length !== Object.keys(shooting.reperes).length
  return changed
    ? { planning: withShooting(planning, { jours, muets, reperes }), removed }
    : { planning, removed }
}
