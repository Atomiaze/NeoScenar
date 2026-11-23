import { paginate, parse } from '@neoscenar/fountain'
import type { IdSource } from '../../shared/decoupage/factories'
import { breakdownScenes } from '../../shared/planning/breakdown'
import { readShooting } from '../../shared/planning/shootingData'
import {
  addDayPresent,
  addMuteCharacter,
  addSceneToDay,
  addShootingDay,
  moveSceneToDay,
  rememberSceneMarks,
  removeDayPresent,
  removeMuteCharacter,
  removeSceneFromDay,
  removeShootingDay,
  removeVanishedScenes,
  updateDayPresent,
  updateShootingDay,
  type MarkSource
} from '../../shared/planning/shootingEdit'
import type { PlanningResult } from '../../shared/planning/planningEdit'
import { sceneLabel } from '../../shared/scriptLink/sceneNumber'
import { draftNumberKeys } from '../../shared/scriptLink/draftScene'
import { numberKey } from '../../shared/decoupage/order'
import { cardsStore } from '../cards/cardsStore'
import {
  dropChangesNothing,
  dropIndex,
  nextShootingDate
} from '../../shared/planning/shootingLayout'
import type { BreakdownScene, CharacterSheetInfo } from '../../shared/planning/shootingTypes'
import type { SceneFilter } from '../../shared/planning/shootingView'
import type { Planning } from '../../shared/planning/types'
import type { Scene } from '../../shared/projectTypes'
import { scriptLayout } from '../script/layoutProfile'
import { paginationSettings } from '../script/editor/paginationSettings'
import { scriptText } from '../script/scriptStore'
import { createStore } from '../state/createStore'
import {
  applyPlanningChange,
  keptVanishedScenes,
  openDialog,
  planningStore,
  replacePlanningQuietly,
  setView,
  showShootingRemoval
} from './planningStore'

// Vue « Tournage » du module Planification (étape 15D-2). Les jours sont dans le planning (même
// historique d'annulation et même enregistrement que les tâches) ; ce magasin garde seulement ce
// qui sert à l'affichage : fiches Personnages, filtres, scène ouverte, jour à montrer.

interface ShootingState {
  /** Fiches Personnages (nom + interprète) ; null tant qu'elles ne sont pas lues. */
  sheets: CharacterSheetInfo[] | null
  filter: SceneFilter
  /** « Regrouper par lieu » dans la colonne des scènes à planifier. */
  grouped: boolean
  /** Identifiant de la carte dont la scène est ouverte dans le panneau. */
  scenePanel: string | null
  /** Jour à faire défiler à l'écran (clic sur un jour dans le Gantt). */
  focusDayId: string | null
  /**
   * Augmente après chaque enregistrement du scénario et chaque retour dans NeoScenar (une fois le
   * fichier relu et les fiches rapprochées) : le dépouillement est alors recalculé (étape 15D-3).
   */
  scriptRevision: number
}

const initial: ShootingState = {
  sheets: null,
  filter: {},
  grouped: false,
  scenePanel: null,
  focusDayId: null,
  scriptRevision: 0
}

export const shootingStore = createStore<ShootingState>(initial)

const ids: IdSource = { newId: () => crypto.randomUUID() }

/** Change à chaque projet quitté : une lecture tardive de l'ancien projet est ignorée. */
let generation = 0

export function unloadShooting(): void {
  generation++
  shootingStore.set({ ...initial })
}

/** Relit les fiches Personnages (interprètes, muets possibles). */
export async function loadShootingSheets(): Promise<void> {
  const mine = generation
  const result = await window.neoscenar.listSheets('personnages')
  if (mine !== generation || !result.ok) return
  shootingStore.set({
    sheets: result.value.map((sheet) => ({
      nom: sheet.nom,
      interprete: sheet.props.interprete ?? ''
    }))
  })
}

/**
 * Le scénario vient d'être enregistré ou relu (retour dans NeoScenar) : longueurs, personnages et
 * interprètes sont relus. Les fiches ne sont relues que si la vue les a déjà chargées.
 */
export function refreshShootingAfterScript(): void {
  shootingStore.set((state) => ({ scriptRevision: state.scriptRevision + 1 }))
  if (shootingStore.get().sheets !== null) void loadShootingSheets()
}

function markSources(cards: readonly Scene[]): MarkSource[] {
  return cards.map((card) => ({ id: card.id, label: sceneLabel(card), heading: card.heading }))
}

/**
 * Plan de tournage et cartes (ouverture du module, cartes modifiées, planning relu) : les scènes dont
 * la carte n'existe plus du tout sont retirées de leur jour (une étape d'annulation + bandeau qui les
 * nomme) ; les repères (numéro, en-tête) suivent les cartes, sans étape d'annulation.
 */
export function syncShootingWithCards(cards: readonly Scene[]): void {
  const planning = planningStore.get().planning
  if (planning === null) return
  const existing = new Set([...cards.map((card) => card.id), ...keptVanishedScenes()])
  const cleaned = removeVanishedScenes(planning, existing)
  const next = rememberSceneMarks(cleaned.planning, markSources(cards))
  if (cleaned.removed.length > 0) {
    applyPlanningChange(() => ({ ok: true, planning: next }))
    showShootingRemoval(cleaned.removed, planning)
  } else if (next !== planning) replacePlanningQuietly(next)
}

/** Modification du plan de tournage : les repères des scènes placées suivent dans la même étape. */
function applyShootingChange(
  change: (planning: Planning) => PlanningResult
): PlanningResult | null {
  const cards = cardsStore.get().history?.present.scenes ?? []
  return applyPlanningChange((planning) => {
    const result = change(planning)
    return result.ok
      ? { ...result, planning: rememberSceneMarks(result.planning, markSources(cards)) }
      : result
  })
}

/**
 * Dépouillement du scénario tel qu'il est maintenant : même texte et même pagination que l'éditeur.
 * Null tant que le scénario n'est pas chargé.
 */
export function computeBreakdown(
  cards: readonly Scene[],
  sheets: readonly CharacterSheetInfo[],
  planning: Planning,
  text: string | null = scriptText()
): BreakdownScene[] | null {
  if (text === null) return null
  const doc = parse(text, { titlePage: false })
  const pagination = paginate(doc, scriptLayout, paginationSettings.get())
  return breakdownScenes(doc, pagination, cards, sheets, readShooting(planning).muets)
}

// ---------------------------------------------------------------------------------------------
// Affichage

export function setSceneFilter(filter: Partial<SceneFilter>): void {
  shootingStore.set((state) => ({ filter: { ...state.filter, ...filter } }))
}

export function clearSceneFilter(): void {
  shootingStore.set({ filter: {} })
}

export function setGrouped(grouped: boolean): void {
  shootingStore.set({ grouped })
}

export function openScenePanel(cardId: string): void {
  shootingStore.set({ scenePanel: cardId })
}

export function closeScenePanel(): void {
  shootingStore.set({ scenePanel: null })
}

/** Clic sur un jour dans le Gantt : la vue Tournage s'ouvre sur ce jour. */
export function showShootingDay(dayId: string): void {
  setView('shooting')
  shootingStore.set({ focusDayId: dayId })
}

export function clearFocusDay(): void {
  shootingStore.set({ focusDayId: null })
}

// ---------------------------------------------------------------------------------------------
// Modifications (toutes annulables avec Cmd + Z)

function currentShooting(): ReturnType<typeof readShooting> | null {
  const planning = planningStore.get().planning
  return planning ? readShooting(planning) : null
}

/** « Nouveau jour » : daté du lendemain du dernier jour daté, sinon d'aujourd'hui. */
export function createShootingDay(today: string): void {
  const shooting = currentShooting()
  if (!shooting) return
  const date = nextShootingDate(shooting.jours, today)
  const result = applyShootingChange((planning) => addShootingDay(planning, { date }, ids))
  if (result?.ok && result.createdId) shootingStore.set({ focusDayId: result.createdId })
}

export function saveShootingDay(
  dayId: string,
  patch: { date?: string | null; titre?: string; note?: string }
): void {
  if (currentShooting()?.jours.some((day) => day.id === dayId))
    applyShootingChange((planning) => updateShootingDay(planning, dayId, patch))
}

/** Un jour sans scène est supprimé sans question (Cmd + Z le ramène) ; sinon, confirmation. */
export function askDeleteShootingDay(dayId: string): void {
  const day = currentShooting()?.jours.find((item) => item.id === dayId)
  if (!day) return
  if (day.scenes.length === 0) deleteShootingDay(dayId)
  else openDialog({ kind: 'deleteShootingDay', dayId })
}

export function deleteShootingDay(dayId: string): void {
  applyShootingChange((planning) => removeShootingDay(planning, dayId))
  openDialog(null)
}

/** La carte est-elle celle d'une scène brouillon du scénario ? */
function isDraftCard(cardId: string): boolean {
  const card = cardsStore.get().history?.present.scenes.find((scene) => scene.id === cardId)
  const text = scriptText()
  return !!card && text !== null && draftNumberKeys(text).has(numberKey(card))
}

/**
 * Dépôt d'une scène dans un jour. `fromDayId` null = elle vient des scènes à planifier.
 * `hoverIndex` = place visée dans la liste affichée du jour d'arrivée.
 */
export function dropSceneOnDay(
  cardId: string,
  fromDayId: string | null,
  toDayId: string,
  hoverIndex: number
): void {
  const target = currentShooting()?.jours.find((day) => day.id === toDayId)
  if (!target) return
  if (fromDayId === toDayId) {
    if (dropChangesNothing(target.scenes, cardId, hoverIndex)) return
    applyShootingChange((planning) =>
      moveSceneToDay(
        planning,
        cardId,
        toDayId,
        toDayId,
        dropIndex(target.scenes, cardId, hoverIndex, true)
      )
    )
    return
  }
  // Déjà dans le jour d'arrivée : rien à faire (le refus afficherait un message inutile).
  if (target.scenes.includes(cardId)) return
  // Une scène brouillon ne se planifie pas (18C-13) ; la carte n'est d'ailleurs pas glissable.
  if (fromDayId === null && isDraftCard(cardId)) return
  const index = dropIndex(target.scenes, cardId, hoverIndex, false)
  applyShootingChange((planning) =>
    fromDayId === null
      ? addSceneToDay(planning, toDayId, cardId, index)
      : moveSceneToDay(planning, cardId, fromDayId, toDayId, index)
  )
}

/** Retire une scène d'un jour (bouton « Retirer », ou dépôt dans les scènes à planifier). */
export function unplanScene(dayId: string, cardId: string): void {
  applyShootingChange((planning) => removeSceneFromDay(planning, dayId, cardId))
}

export function addMute(cardId: string, name: string): void {
  applyShootingChange((planning) => addMuteCharacter(planning, cardId, name))
}

export function removeMute(cardId: string, name: string): void {
  applyShootingChange((planning) => removeMuteCharacter(planning, cardId, name))
}

// « Présents en plus » d'un jour (étape 18C-6) : figurants, doublures, interprètes sans fiche.

export function addPresent(dayId: string, nom: string, role: string): void {
  applyShootingChange((planning) => addDayPresent(planning, dayId, { nom, role }, ids))
}

export function savePresent(
  dayId: string,
  presentId: string,
  patch: { nom?: string; role?: string }
): void {
  applyShootingChange((planning) => updateDayPresent(planning, dayId, presentId, patch))
}

export function deletePresent(dayId: string, presentId: string): void {
  applyShootingChange((planning) => removeDayPresent(planning, dayId, presentId))
}
