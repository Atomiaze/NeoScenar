import type { IdSource } from '../../shared/decoupage/factories'
import type { SaveStatus } from '../../shared/api'
import {
  addPhase,
  addTask,
  removePhase,
  removeTask,
  renamePhase,
  updateTask,
  type PlanningResult,
  type TaskFields
} from '../../shared/planning/planningEdit'
import {
  EMPTY_HISTORY,
  NO_FILTER,
  canRedo,
  canUndo,
  recordChange,
  redoStep,
  undoStep,
  type PlanningHistory,
  type TaskFilter
} from '../../shared/planning/planningView'
import { isUntouchedTask } from '../../shared/planning/planningView'
import { CARD_PALETTE } from '../../shared/palette'
import type { CrewMember, Planning } from '../../shared/planning/types'
import type { RemovedScene } from '../../shared/planning/shootingEdit'
import { isTypingTarget } from '../cards/typingTarget'
import { fr } from '../i18n/fr'
import {
  PIXELS_PER_DAY,
  clampPixelsPerDay,
  type TimelineZoom
} from '../../shared/planning/timeline'
import { createStore } from '../state/createStore'

// État du module Planification. Le planning est relu sur le disque à l'ouverture du module et à
// chaque retour dans NeoScenar ; chaque modification est envoyée au processus principal, qui
// l'enregistre automatiquement. L'historique d'annulation est propre au module et au projet.

/** Tâche ouverte dans le panneau ; `fresh` : elle vient d'être créée (le titre est sélectionné). */
export interface PlanningPanel {
  taskId: string
  fresh: boolean
}

export type PlanningDialog =
  | { kind: 'deleteTask'; taskId: string }
  | { kind: 'deletePhase'; phaseId: string }
  | { kind: 'deleteShootingDay'; dayId: string }
  | null

/**
 * Scènes retirées du plan de tournage parce que leur carte n'existe plus (étape 15D-3). `before` =
 * planning juste avant le retrait : « Annuler » n'agit que s'il est encore la dernière étape.
 */
export interface ShootingRemoval {
  scenes: RemovedScene[]
  before: Planning
}

/** Liste, ligne du temps ou plan de tournage. */
export type PlanningViewKind = 'list' | 'timeline' | 'shooting'

interface PlanningState {
  /** Le module est affiché (le menu Annuler agit alors sur le planning). */
  active: boolean
  loaded: boolean
  planning: Planning | null
  /** Équipe du générique, recalculée à chaque lecture. */
  crew: CrewMember[]
  history: PlanningHistory
  filter: TaskFilter
  /** Vue affichée (mémorisée le temps de la session). */
  view: PlanningViewKind
  zoom: TimelineZoom
  /** Échelle de la ligne du temps : celle du préréglage, ou celle du zoom libre (« Personnalisé »). */
  pixelsPerDay: number
  /** Phases repliées (identifiants). */
  collapsed: string[]
  panel: PlanningPanel | null
  dialog: PlanningDialog
  notice: string | null
  error: string | null
  status: SaveStatus
  /** Augmente à chaque planning lu sur le disque (ouverture, fichier modifié ailleurs). */
  revision: number
  removal: ShootingRemoval | null
}

const initial: PlanningState = {
  active: false,
  loaded: false,
  planning: null,
  crew: [],
  history: EMPTY_HISTORY,
  filter: NO_FILTER,
  view: 'list',
  zoom: 'month',
  pixelsPerDay: PIXELS_PER_DAY.month,
  collapsed: [],
  panel: null,
  dialog: null,
  notice: null,
  error: null,
  status: { state: 'saved' },
  revision: 0,
  removal: null
}

export const planningStore = createStore<PlanningState>(initial)

const ids: IdSource = { newId: () => crypto.randomUUID() }

/** Change à chaque projet quitté : une lecture tardive de l'ancien projet est ignorée. */
let generation = 0

/** Tâche à rouvrir au retour dans Planification (après « Ajouter quelqu'un au générique… »). */
let resumeTaskId: string | null = null

/**
 * Cartes supprimées dont le retrait a été annulé : elles restent dans leur jour (« scène supprimée »)
 * jusqu'au prochain projet ouvert, au lieu d'être retirées de nouveau au prochain changement de cartes.
 */
const keptVanished = new Set<string>()

export function keptVanishedScenes(): ReadonlySet<string> {
  return keptVanished
}

/** Mémorise la tâche ouverte : le changement de module ferme le panneau, le retour le rouvre. */
export function rememberOpenTask(): void {
  resumeTaskId = planningStore.get().panel?.taskId ?? null
}

export function setPlanningActive(active: boolean): void {
  planningStore.set({ active })
}

/** Retire tout du module (fermeture ou changement de projet) : historique compris. */
export function unloadPlanning(): void {
  generation++
  creation = null
  resumeTaskId = null
  keptVanished.clear()
  planningStore.set({ ...initial })
}

export function dismissPlanningMessages(): void {
  planningStore.set({ notice: null, error: null, removal: null })
}

/**
 * Relit le planning et l'équipe du générique (ouverture du module, retour dans l'application).
 * Le planning affiché n'est remplacé que si le fichier a été modifié ailleurs, ou s'il n'est pas
 * encore chargé : l'historique d'annulation est alors repartie de zéro.
 */
export async function loadPlanning(): Promise<void> {
  const mine = generation
  const result = await window.neoscenar.getPlanning()
  if (mine !== generation) return
  if (!result.ok) {
    planningStore.set({ error: result.error })
    return
  }
  const { planning, crew, changed } = result.value
  planningStore.set((state) => {
    if (state.planning === null || changed) {
      return {
        loaded: true,
        planning,
        crew,
        history: EMPTY_HISTORY,
        panel: null,
        dialog: null,
        notice: state.planning !== null ? fr.planning.reloadedNotice : null,
        error: null,
        revision: state.revision + 1,
        removal: null
      }
    }
    return { loaded: true, crew }
  })
  // Retour du générique : la tâche qui était ouverte se rouvre (si elle existe encore).
  if (resumeTaskId !== null) {
    const taskId = resumeTaskId
    resumeTaskId = null
    openTaskPanel(taskId)
  }
}

function send(planning: Planning): void {
  void window.neoscenar.updatePlanning(planning).then((result) => {
    if (!result.ok) planningStore.set({ error: result.error })
  })
}

/**
 * Applique une modification : elle entre dans l'historique et part vers l'enregistrement. Le plan de
 * tournage passe aussi par ici (même historique d'annulation que les tâches).
 */
export function applyPlanningChange(
  change: (planning: Planning) => PlanningResult
): PlanningResult | null {
  const before = planningStore.get().planning
  if (before === null) return null
  const result = change(before)
  if (!result.ok) {
    planningStore.set({
      error:
        result.problem === 'duplicate-name' ? fr.planning.duplicatePhaseName : fr.planning.refused
    })
    return result
  }
  planningStore.set((state) => ({
    planning: result.planning,
    history: recordChange(state.history, before),
    error: null,
    removal: null,
    notice:
      result.adjusted === 'debut'
        ? fr.planning.startAdjusted
        : result.adjusted === 'echeance'
          ? fr.planning.dueAdjusted
          : null
  }))
  send(result.planning)
  return result
}

// ---------------------------------------------------------------------------------------------
// Annuler / Rétablir

/**
 * Annuler / Rétablir dans le module Planification. Dans un champ de saisie, c'est la frappe qui
 * est annulée ; ailleurs, la dernière modification du planning. Vrai si le module est affiché.
 */
export function handlePlanningUndo(command: 'undo' | 'redo'): boolean {
  const state = planningStore.get()
  if (!state.active) return false
  if (isTypingTarget(document.activeElement)) {
    document.execCommand(command)
    return true
  }
  if (state.planning === null) return true
  const step =
    command === 'undo'
      ? undoStep(state.history, state.planning)
      : redoStep(state.history, state.planning)
  if (step === null) return true
  applyStep(step)
  return true
}

function applyStep(step: { planning: Planning; history: PlanningHistory }): void {
  // Cmd + Z sur le retrait des scènes sans carte : elles restent ensuite dans leur jour.
  const removal = planningStore.get().removal
  if (removal && step.planning === removal.before)
    removal.scenes.forEach((scene) => keptVanished.add(scene.cardId))
  planningStore.set({
    planning: step.planning,
    history: step.history,
    error: null,
    notice: null,
    removal: null
  })
  send(step.planning)
}

/** Remplace le planning sans étape d'annulation (repères des scènes recalculés, étape 15D-3). */
export function replacePlanningQuietly(planning: Planning): void {
  if (planningStore.get().planning === null) return
  planningStore.set({ planning })
  send(planning)
}

/** Annonce les scènes retirées (le retrait vient d'entrer dans l'historique, juste après `before`). */
export function showShootingRemoval(scenes: RemovedScene[], before: Planning): void {
  planningStore.set({ removal: { scenes, before } })
}

/** « Annuler » du bandeau : seulement si le retrait est encore la dernière modification. */
export function undoShootingRemoval(): void {
  const { removal, history, planning } = planningStore.get()
  if (!removal || !planning || history.past[history.past.length - 1] !== removal.before) {
    planningStore.set({ removal: null })
    return
  }
  const step = undoStep(history, planning)
  if (step) applyStep(step)
}

export function planningCanUndo(): boolean {
  return canUndo(planningStore.get().history)
}

export function planningCanRedo(): boolean {
  return canRedo(planningStore.get().history)
}

// ---------------------------------------------------------------------------------------------
// Filtres, repli, panneau, fenêtres

export function setFilter(filter: Partial<TaskFilter>): void {
  planningStore.set((state) => ({ filter: { ...state.filter, ...filter } }))
}

export function setView(view: PlanningViewKind): void {
  // La vue Tournage n'a pas le panneau des tâches : la tâche ouverte est enregistrée et fermée.
  if (view === 'shooting') closePanel()
  planningStore.set({ view })
}

/** Choisit un préréglage du menu (la vue se recentre sur « Aujourd'hui »). */
export function setZoom(zoom: Exclude<TimelineZoom, 'custom'>): void {
  planningStore.set({ zoom, pixelsPerDay: PIXELS_PER_DAY[zoom] })
}

/** Zoom libre (molette, pincement) : le menu affiche « Personnalisé ». */
export function setCustomZoom(pixelsPerDay: number): void {
  planningStore.set({ zoom: 'custom', pixelsPerDay: clampPixelsPerDay(pixelsPerDay) })
}

export function toggleCollapsed(phaseId: string): void {
  planningStore.set((state) => ({
    collapsed: state.collapsed.includes(phaseId)
      ? state.collapsed.filter((id) => id !== phaseId)
      : [...state.collapsed, phaseId]
  }))
}

// Champs du panneau : chacun garde sa saisie et l'enregistre quand on le quitte ou avec Entrée.
// Fermer le panneau (ou changer de module) enregistre d'abord ceux qui sont en cours.
const flushers = new Set<() => void>()

export function registerFieldFlusher(flush: () => void): () => void {
  flushers.add(flush)
  return () => flushers.delete(flush)
}

/** Planning juste avant la création de la tâche encore ouverte (pour effacer sa trace si elle reste vide). */
let creation: { taskId: string; before: Planning } | null = null

/** Quitte la tâche ouverte : champs enregistrés, puis tâche retirée si elle est restée « Sans titre » et vide. */
function leavePanel(): void {
  const panel = planningStore.get().panel
  if (!panel) return
  ;[...flushers].forEach((flush) => flush())
  const { planning, history } = planningStore.get()
  const task = planning?.taches.find((item) => item.id === panel.taskId)
  const created = creation?.taskId === panel.taskId ? creation : null
  creation = null
  if (!planning || !task || !isUntouchedTask(task, fr.planning.untitled)) return
  const result = removeTask(planning, task.id)
  if (!result.ok) return
  // La création n'a laissé qu'une étape d'historique : elle disparaît avec la tâche.
  const lastStep = history.past[history.past.length - 1]
  planningStore.set({
    planning: result.planning,
    history:
      created && lastStep === created.before
        ? { past: history.past.slice(0, -1), future: [] }
        : recordChange(history, planning)
  })
  send(result.planning)
}

/** Ouvre le panneau d'une tâche existante. */
export function openTaskPanel(taskId: string): void {
  if (planningStore.get().panel?.taskId === taskId) return
  leavePanel()
  if (!planningStore.get().planning?.taches.some((item) => item.id === taskId)) return
  planningStore.set({ panel: { taskId, fresh: false } })
}

/** « Nouvelle tâche » : une tâche « Sans titre » est créée tout de suite (dans la phase donnée, sinon la première). */
export function openNewTask(phaseId?: string, fields: TaskFields = {}): void {
  leavePanel()
  const before = planningStore.get().planning
  const target = phaseId ?? before?.phases[0]?.id
  if (!before || target === undefined) return
  const taskId = createTask(target, { titre: fr.planning.untitled, ...fields })
  if (taskId === null) return
  creation = { taskId, before }
  planningStore.set((state) => ({
    panel: { taskId, fresh: true },
    // Une phase repliée qui reçoit une tâche se déplie.
    collapsed: state.collapsed.filter((id) => id !== target)
  }))
}

export function closePanel(): void {
  leavePanel()
  planningStore.set({ panel: null })
}

/** Enregistre des champs d'une tâche, sans rien dire si elle n'existe plus (suppression, relecture). */
export function saveTaskFields(taskId: string, fields: TaskFields): void {
  if (planningStore.get().planning?.taches.some((task) => task.id === taskId))
    saveTask(taskId, fields)
}

export function openDialog(dialog: PlanningDialog): void {
  planningStore.set({ dialog })
}

// ---------------------------------------------------------------------------------------------
// Actions sur les tâches et les phases

export function createTask(phaseId: string, fields: TaskFields): string | null {
  const result = applyPlanningChange((planning) => addTask(planning, phaseId, fields, ids))
  return result?.ok ? (result.createdId ?? null) : null
}

export function saveTask(taskId: string, fields: TaskFields): boolean {
  return applyPlanningChange((planning) => updateTask(planning, taskId, fields))?.ok === true
}

export function toggleTaskDone(taskId: string): void {
  const task = planningStore.get().planning?.taches.find((item) => item.id === taskId)
  if (task) saveTask(taskId, { faite: !task.faite })
}

export function moveTaskToPhase(taskId: string, phaseId: string): void {
  const task = planningStore.get().planning?.taches.find((item) => item.id === taskId)
  if (!task || task.phase === phaseId) return
  saveTask(taskId, { phase: phaseId })
}

export function deleteTask(taskId: string): void {
  if (applyPlanningChange((planning) => removeTask(planning, taskId))?.ok) {
    if (creation?.taskId === taskId) creation = null
    planningStore.set((state) => ({
      dialog: null,
      ...(state.panel?.taskId === taskId ? { panel: null } : {})
    }))
  }
}

export function createPhase(name: string): void {
  const vivid = CARD_PALETTE.filter((color) => color.shade === 'vivid')
  applyPlanningChange((planning) => {
    const color = vivid[planning.phases.length % vivid.length]?.hex
    return addPhase(planning, name, color, ids)
  })
}

export function renamePlanningPhase(phaseId: string, name: string): boolean {
  return applyPlanningChange((planning) => renamePhase(planning, phaseId, name))?.ok === true
}

export function deletePhase(phaseId: string): void {
  if (applyPlanningChange((planning) => removePhase(planning, phaseId))?.ok) {
    planningStore.set((state) => {
      const gone =
        state.panel && !state.planning?.taches.some((task) => task.id === state.panel!.taskId)
      return gone ? { dialog: null, panel: null } : { dialog: null }
    })
  }
}
