// Modifications du planning : fonctions pures, l'original n'est jamais modifié. Elles servent à
// l'interface (15B) et à l'annulation ; le disque n'en sait rien.

import type { IdSource } from '../decoupage/factories'
import { FALLBACK_PHASE_COLOR, isIsoDate, renumberPhases } from './planningData'
import type { Phase, Planning, Task } from './types'

export type PlanningProblem = 'not-found' | 'invalid' | 'duplicate-name'

/** Date que la règle « le début ne dépasse pas l'échéance » a dû recopier sur l'autre. */
export type AdjustedDate = 'debut' | 'echeance'

export type PlanningResult =
  | { ok: true; planning: Planning; createdId?: string; adjusted?: AdjustedDate }
  | { ok: false; problem: PlanningProblem }

function ok(planning: Planning, createdId?: string, adjusted?: AdjustedDate): PlanningResult {
  return {
    ok: true,
    planning,
    ...(createdId === undefined ? {} : { createdId }),
    ...(adjusted === undefined ? {} : { adjusted })
  }
}

function fail(problem: PlanningProblem): PlanningResult {
  return { ok: false, problem }
}

/** Comparaison des noms de phase : accents en NFC, sans casse. */
function nameKey(name: string): string {
  return name.normalize('NFC').trim().toLocaleLowerCase('fr')
}

function nameTaken(planning: Planning, name: string, exceptId?: string): boolean {
  const key = nameKey(name)
  return planning.phases.some((phase) => phase.id !== exceptId && nameKey(phase.nom) === key)
}

// ---------------------------------------------------------------------------------------------
// Phases

export function addPhase(
  planning: Planning,
  name: string,
  color: string | undefined,
  ids: IdSource
): PlanningResult {
  const nom = name.normalize('NFC').trim()
  if (nom === '') return fail('invalid')
  if (nameTaken(planning, nom)) return fail('duplicate-name')
  const id = ids.newId()
  const phase: Phase = {
    id,
    nom,
    couleur: color ?? FALLBACK_PHASE_COLOR,
    ordre: planning.phases.length + 1
  }
  return ok({ ...planning, phases: [...planning.phases, phase] }, id)
}

export function renamePhase(planning: Planning, phaseId: string, name: string): PlanningResult {
  const nom = name.normalize('NFC').trim()
  if (!planning.phases.some((phase) => phase.id === phaseId)) return fail('not-found')
  if (nom === '') return fail('invalid')
  if (nameTaken(planning, nom, phaseId)) return fail('duplicate-name')
  return ok({
    ...planning,
    phases: planning.phases.map((phase) => (phase.id === phaseId ? { ...phase, nom } : phase))
  })
}

export function recolorPhase(planning: Planning, phaseId: string, color: string): PlanningResult {
  if (!planning.phases.some((phase) => phase.id === phaseId)) return fail('not-found')
  return ok({
    ...planning,
    phases: planning.phases.map((phase) =>
      phase.id === phaseId ? { ...phase, couleur: color } : phase
    )
  })
}

/** Déplace une phase à un rang (1 = première) ; le rang est borné. */
export function movePhase(planning: Planning, phaseId: string, rank: number): PlanningResult {
  const phases = renumberPhases(planning.phases)
  const from = phases.findIndex((phase) => phase.id === phaseId)
  if (from < 0) return fail('not-found')
  const [moved] = phases.splice(from, 1)
  const to = Math.min(Math.max(Math.round(rank) - 1, 0), phases.length)
  phases.splice(to, 0, moved)
  return ok({ ...planning, phases: phases.map((phase, index) => ({ ...phase, ordre: index + 1 })) })
}

/** Nombre de tâches d'une phase : l'interface demande confirmation s'il n'est pas nul. */
export function phaseTaskCount(planning: Planning, phaseId: string): number {
  return planning.taches.filter((task) => task.phase === phaseId).length
}

/** Supprime la phase et ses tâches (l'interface a déjà demandé confirmation). */
export function removePhase(planning: Planning, phaseId: string): PlanningResult {
  if (!planning.phases.some((phase) => phase.id === phaseId)) return fail('not-found')
  return ok({
    ...planning,
    phases: renumberPhases(planning.phases.filter((phase) => phase.id !== phaseId)),
    taches: planning.taches.filter((task) => task.phase !== phaseId)
  })
}

// ---------------------------------------------------------------------------------------------
// Tâches

export type TaskFields = Partial<Omit<Task, 'id'>>

function validFields(fields: TaskFields): boolean {
  if (fields.debut != null && !isIsoDate(fields.debut)) return false
  if (fields.echeance != null && !isIsoDate(fields.echeance)) return false
  return true
}

export function addTask(
  planning: Planning,
  phaseId: string,
  fields: TaskFields,
  ids: IdSource
): PlanningResult {
  if (!planning.phases.some((phase) => phase.id === phaseId)) return fail('not-found')
  if (!validFields(fields)) return fail('invalid')
  const id = ids.newId()
  const task: Task = {
    titre: '',
    debut: null,
    echeance: null,
    faite: false,
    personnes: [],
    validee: false,
    note: '',
    ...fields,
    id,
    phase: phaseId
  } as Task
  if (task.validee) task.faite = true
  return ok({ ...planning, taches: [...planning.taches, task] }, id)
}

/**
 * Un début ne dépasse jamais l'échéance : la date qu'on vient de saisir l'emporte et elle est
 * recopiée sur l'autre (début après échéance → l'échéance prend la date du début, et inversement).
 * Si les deux sont saisis ensemble et se contredisent, l'échéance prend la date du début.
 */
function reconcileDates(
  task: Task,
  fields: TaskFields
): { fields: TaskFields; adjusted?: AdjustedDate } {
  const debut = fields.debut !== undefined ? fields.debut : task.debut
  const echeance = fields.echeance !== undefined ? fields.echeance : task.echeance
  if (debut == null || echeance == null || debut <= echeance) return { fields }
  if (fields.echeance !== undefined && fields.debut === undefined)
    return { fields: { ...fields, debut: echeance }, adjusted: 'debut' }
  return { fields: { ...fields, echeance: debut }, adjusted: 'echeance' }
}

/**
 * Valider une tâche la coche aussi « faite » ; décocher « faite » retire la validation. Tout
 * se passe dans la même modification : une seule étape d'annulation.
 */
function reconcileDone(fields: TaskFields): TaskFields {
  if (fields.validee === true) return { ...fields, faite: true }
  if (fields.faite === false) return { ...fields, validee: false }
  return fields
}

/** Modifie des champs d'une tâche ; `phase` la déplace dans une autre phase (glisser-déposer). */
export function updateTask(planning: Planning, taskId: string, fields: TaskFields): PlanningResult {
  const current = planning.taches.find((task) => task.id === taskId)
  if (!current) return fail('not-found')
  if (!validFields(fields)) return fail('invalid')
  if (fields.phase !== undefined && !planning.phases.some((phase) => phase.id === fields.phase))
    return fail('not-found')
  const reconciled = reconcileDates(current, reconcileDone(fields))
  return ok(
    {
      ...planning,
      taches: planning.taches.map((task) =>
        task.id === taskId ? { ...task, ...reconciled.fields } : task
      )
    },
    undefined,
    reconciled.adjusted
  )
}

export function removeTask(planning: Planning, taskId: string): PlanningResult {
  if (!planning.taches.some((task) => task.id === taskId)) return fail('not-found')
  return ok({ ...planning, taches: planning.taches.filter((task) => task.id !== taskId) })
}
