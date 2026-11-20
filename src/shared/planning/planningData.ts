// Lecture et réécriture de neoscenar/planning.json. La lecture est tolérante : un champ abîmé à la
// main reprend sa valeur par défaut au lieu de bloquer l'élève. La réécriture pose les champs
// connus par-dessus le fichier d'origine : ce qui a été ajouté ailleurs est conservé.

import type { IdSource } from '../decoupage/factories'
import { CARD_PALETTE } from '../palette'
import { PLANNING_FORMAT_VERSION, type Phase, type Planning, type Task } from './types'

type JsonObject = Record<string, unknown>

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asObject(value: unknown): JsonObject {
  return isObject(value) ? value : {}
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

/** Date AAAA-MM-JJ qui existe vraiment (le 30 février est refusé). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function dateOrNull(value: unknown): string | null {
  return isIsoDate(value) ? value : null
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

/** Couleur de la palette des cartes (version vive) pour une teinte. */
function vividHex(hue: string): string {
  return (
    CARD_PALETTE.find((color) => color.hue === hue && color.shade === 'vivid')?.hex ?? '#9e9e9e'
  )
}

/** Couleur d'une phase abîmée ou absente. */
export const FALLBACK_PHASE_COLOR = '#9e9e9e'

/** Les cinq phases d'un nouveau planning : le nom est celui affiché à l'élève. */
const DEFAULT_PHASES: readonly [string, string][] = [
  ['Écriture', 'violet'],
  ['Préproduction', 'orange'],
  ['Tournage', 'red'],
  ['Postproduction', 'blue'],
  ['Diffusion', 'green']
]

/** Planning d'un nouveau projet : les cinq phases par défaut, sans tâche. */
export function defaultPlanning(ids: IdSource): Planning {
  return {
    version: PLANNING_FORMAT_VERSION,
    phases: DEFAULT_PHASES.map(([nom, hue], index) => ({
      id: ids.newId(),
      nom,
      couleur: vividHex(hue),
      ordre: index + 1
    })),
    taches: [],
    tournage: {}
  }
}

function parsePhase(raw: unknown): Phase | null {
  if (!isObject(raw) || typeof raw.id !== 'string' || raw.id === '') return null
  const order = raw.ordre
  return {
    id: raw.id,
    nom: text(raw.nom),
    couleur:
      typeof raw.couleur === 'string' && HEX_COLOR.test(raw.couleur)
        ? raw.couleur
        : FALLBACK_PHASE_COLOR,
    ordre: typeof order === 'number' && Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER
  }
}

function parseTask(raw: unknown): (Omit<Task, 'phase'> & { phase: string }) | null {
  if (!isObject(raw) || typeof raw.id !== 'string' || raw.id === '') return null
  return {
    id: raw.id,
    phase: text(raw.phase),
    titre: text(raw.titre),
    debut: dateOrNull(raw.debut),
    echeance: dateOrNull(raw.echeance),
    // Une tâche validée est forcément faite, même si le fichier a été modifié à la main.
    faite: raw.faite === true || raw.validee === true,
    personnes: Array.isArray(raw.personnes)
      ? raw.personnes.filter((name): name is string => typeof name === 'string')
      : [],
    validee: raw.validee === true,
    note: text(raw.note)
  }
}

/** Retire les doublons d'identifiant en gardant le premier. */
function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)))
}

/** Ordre stable, puis rangs renumérotés 1, 2, 3… sans trou. */
export function renumberPhases(phases: readonly Phase[]): Phase[] {
  return phases
    .map((phase, index) => ({ phase, index }))
    .sort((a, b) => a.phase.ordre - b.phase.ordre || a.index - b.index)
    .map(({ phase }, index) => ({ ...phase, ordre: index + 1 }))
}

/**
 * Données lues dans le contenu brut de planning.json (déjà décodé du JSON).
 * Un fichier sans la clé `phases` reçoit les cinq phases par défaut ; une liste vide est respectée
 * (l'élève a pu tout supprimer). Une tâche dont la phase n'existe plus passe dans la première phase
 * plutôt que de disparaître ; sans aucune phase, elle ne peut plus être affichée et est ignorée.
 */
export function parsePlanning(raw: unknown, ids: IdSource): Planning {
  const value = asObject(raw)
  if (!Array.isArray(value.phases)) {
    const planning = defaultPlanning(ids)
    return { ...planning, tournage: asObject(value.tournage) }
  }
  const phases = renumberPhases(
    uniqueById(value.phases.map(parsePhase).filter((phase): phase is Phase => phase !== null))
  )
  const known = new Set(phases.map((phase) => phase.id))
  const tasks: Task[] = []
  for (const task of uniqueById(
    (Array.isArray(value.taches) ? value.taches : [])
      .map(parseTask)
      .filter((item): item is NonNullable<typeof item> => item !== null)
  )) {
    if (known.has(task.phase)) tasks.push(task)
    else if (phases.length > 0) tasks.push({ ...task, phase: phases[0].id })
  }
  return {
    version: PLANNING_FORMAT_VERSION,
    phases,
    taches: tasks,
    tournage: asObject(value.tournage)
  }
}

/** Version du format écrite dans le fichier (0 si absente) : un fichier plus récent n'est pas réécrit. */
export function planningFileVersion(raw: unknown): number {
  const version = asObject(raw).version
  return typeof version === 'number' ? version : 0
}

/** Éléments d'une liste, chacun posé sur l'élément d'origine qui a le même identifiant. */
function mergeById(original: unknown, items: readonly object[]): JsonObject[] {
  const previous = new Map<string, JsonObject>()
  if (Array.isArray(original))
    for (const item of original)
      if (isObject(item) && typeof item.id === 'string' && !previous.has(item.id))
        previous.set(item.id, item)
  return items.map((item) => {
    const id = (item as { id: string }).id
    return { ...previous.get(id), ...item }
  })
}

/** `tournage` : les jours posés sur les jours d'origine de même identifiant (clés ajoutées gardées). */
function mergeShooting(original: JsonObject, shooting: JsonObject): JsonObject {
  const merged: JsonObject = { ...original, ...shooting }
  if (Array.isArray(shooting.jours)) merged.jours = mergeById(original.jours, shooting.jours)
  return merged
}

/** Contenu à écrire : les données connues posées sur le contenu d'origine, clés inconnues conservées. */
export function mergePlanning(original: unknown, planning: Planning): JsonObject {
  const base = asObject(original)
  return {
    ...base,
    version: PLANNING_FORMAT_VERSION,
    phases: mergeById(base.phases, planning.phases),
    taches: mergeById(base.taches, planning.taches),
    tournage: mergeShooting(asObject(base.tournage), planning.tournage)
  }
}

/** Texte du fichier : JSON indenté, terminé par un retour à la ligne. */
export function serializePlanning(original: unknown, planning: Planning): string {
  return `${JSON.stringify(mergePlanning(original, planning), null, 2)}\n`
}
