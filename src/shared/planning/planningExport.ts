// Ce que les exports du planning contiennent (étape 15E) : données des deux PDF et événements du
// calendrier, calculées à partir du planning, du dépouillement et des cartes. Calculs purs.
// Décidé le 20 nov. : les exports ignorent les filtres de l'écran (tâches faites comprises, marquées)
// ; seul le filtre « Tâches de : » est proposé ; les jours de tournage sont toujours inclus.

import type {
  PdfPhase,
  PdfShootingDay,
  PdfShootingScene,
  PdfTask,
  PlanningPdfInput,
  ShootingPdfInput
} from '@neoscenar/pdf-planning'
import { fr } from '../../renderer/i18n/fr'
import type { Scene } from '../projectTypes'
import { personKey } from './crew'
import type { IcsCalendar, IcsEvent } from './ics'
import { sortTasks, taskState } from './planningState'
import { readShooting } from './shootingData'
import { removeVanishedScenes } from './shootingEdit'
import type { BreakdownScene, DayView, SceneCharacter } from './shootingTypes'
import { dayViews, formatEighths, unplannedScenes } from './shootingView'
import { shootingRowAfter } from './shootingLayout'
import { dayNumber, isoFromDay } from './timeline'
import type { IsoDate, Planning, Task } from './types'

const t = fr.planningExport

// ---------------------------------------------------------------------------------------------
// Étendue de la ligne du temps

/**
 * Année scolaire en cours : 1er septembre → 30 juin. En juillet et en août, l'année qui commence en
 * septembre (celle qu'on prépare).
 */
export function schoolYear(today: IsoDate): { start: IsoDate; end: IsoDate } {
  const year = Number(today.slice(0, 4))
  const month = Number(today.slice(5, 7))
  const first = month >= 7 ? year : year - 1
  return { start: `${first}-09-01`, end: `${first + 1}-06-30` }
}

function firstOfMonth(iso: IsoDate): IsoDate {
  return `${iso.slice(0, 7)}-01`
}

function lastOfMonth(iso: IsoDate): IsoDate {
  const [year, month] = iso.split('-').map(Number)
  const next =
    month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`
  return isoFromDay(dayNumber(next) - 1)
}

/** Année scolaire en cours, agrandie au mois entier si des dates en sortent (décidé le 20 nov.). */
export function exportRange(
  today: IsoDate,
  dates: readonly IsoDate[]
): { start: IsoDate; end: IsoDate } {
  const range = schoolYear(today)
  for (const date of dates) {
    if (date < range.start) range.start = firstOfMonth(date)
    if (date > range.end) range.end = lastOfMonth(date)
  }
  return range
}

// ---------------------------------------------------------------------------------------------
// Tâches

/** Toutes les tâches, ou celles d'une personne (même comparaison que le filtre de l'écran). */
export function exportedTasks(planning: Planning, person: string | null): Task[] {
  if (person === null) return planning.taches
  const key = personKey(person)
  return planning.taches.filter((task) => task.personnes.some((name) => personKey(name) === key))
}

function pdfTask(task: Task, today: IsoDate): PdfTask {
  const state = taskState(task, today)
  return {
    title: task.titre,
    start: task.debut,
    due: task.echeance,
    state: state === 'faite' ? 'done' : state === 'en-retard' ? 'late' : 'todo',
    validated: task.validee,
    people: task.personnes,
    note: task.note
  }
}

// ---------------------------------------------------------------------------------------------
// Plan de tournage

/** Jours du plan de tournage, après le retrait des scènes dont la carte n'existe plus (15D-3). */
export function exportedDays(
  planning: Planning,
  scenes: readonly BreakdownScene[],
  cards: readonly Scene[]
): { days: DayView[]; unplanned: number } {
  const cleaned = removeVanishedScenes(planning, new Set(cards.map((card) => card.id))).planning
  const shooting = readShooting(cleaned)
  return {
    days: dayViews(shooting, scenes, cards),
    unplanned: unplannedScenes(scenes, shooting).length
  }
}

function personOf(character: SceneCharacter): string {
  return character.interprete === null
    ? t.personWithoutInterpreter(character.nom, character.muet, character.sansFiche)
    : t.person(character.interprete, character.nom, character.muet)
}

function shootingScene(entry: DayView['entries'][number]): PdfShootingScene {
  const scene = entry.scene
  if (entry.status === 'missing' || !scene)
    return {
      label: entry.label ?? '',
      status: 'missing',
      location: entry.heading,
      intExt: 'unknown',
      dayNight: 'unknown',
      eighths: null,
      people: []
    }
  return {
    label: scene.label,
    status: entry.status,
    location: scene.location,
    intExt: scene.intExt,
    dayNight: scene.dayNight,
    eighths: scene.eighths,
    people: scene.characters.map(personOf)
  }
}

function shootingDay(view: DayView): PdfShootingDay {
  return {
    date: view.day.date,
    title: view.day.titre,
    note: view.day.note,
    scenes: view.entries.map(shootingScene),
    eighths: view.eighths,
    locations: view.locations,
    called: view.called.map((c) => t.called(c.interprete, c.personnages)),
    withoutInterpreter: view.withoutInterpreter,
    presents: view.day.presents.map((p) => t.present(p.nom, p.role))
  }
}

// ---------------------------------------------------------------------------------------------
// Données des PDF (sans titre ni polices, ajoutés par l'exporteur)

export type PlanningPdfData = Omit<PlanningPdfInput, 'title' | 'fonts'>
export type ShootingPdfData = Omit<ShootingPdfInput, 'title' | 'fonts'>

export function planningPdfData(
  planning: Planning,
  days: readonly DayView[],
  options: { today: IsoDate; person: string | null }
): PlanningPdfData {
  const tasks = exportedTasks(planning, options.person)
  const phases: PdfPhase[] = [...planning.phases]
    .sort((a, b) => a.ordre - b.ordre)
    .map((phase) => ({
      name: phase.nom,
      color: phase.couleur,
      tasks: sortTasks(tasks.filter((task) => task.phase === phase.id)).map((task) =>
        pdfTask(task, options.today)
      )
    }))
  const shootingDays = days.map((view) => view.day.date).filter((d): d is string => d !== null)
  const taskDates = tasks.flatMap((task) =>
    [task.debut, task.echeance].filter((d): d is string => d !== null)
  )
  return {
    exportDate: options.today,
    person: options.person,
    range: exportRange(options.today, [...taskDates, ...shootingDays]),
    phases,
    shootingDays,
    shootingRowAfter: shootingRowAfter([...planning.phases].sort((a, b) => a.ordre - b.ordre))
  }
}

export function shootingPdfData(
  days: readonly DayView[],
  unplanned: number,
  today: IsoDate
): ShootingPdfData {
  return { exportDate: today, days: days.map(shootingDay), unplanned }
}

// ---------------------------------------------------------------------------------------------
// Calendrier

function taskEvent(task: Task, phaseName: string): IcsEvent | null {
  if (task.echeance === null) return null
  const description = [
    phaseName ? t.ics.phase(phaseName) : '',
    task.personnes.length > 0 ? t.ics.people(task.personnes) : '',
    task.debut !== null ? t.ics.start(task.debut) : '',
    task.validee ? t.ics.stateValidated : task.faite ? t.ics.stateDone : '',
    task.note.trim() ? `\n${task.note.trim()}` : ''
  ].filter(Boolean)
  return {
    uid: `${task.id}@neoscenar`,
    date: task.echeance,
    summary: `${task.faite || task.validee ? t.ics.done : ''}${task.titre}`,
    description: description.join('\n'),
    categories: phaseName ? [phaseName] : []
  }
}

function sceneLine(entry: DayView['entries'][number]): string {
  const scene = entry.scene
  if (entry.status === 'missing' || !scene)
    return t.ics.scene(entry.label ?? '', entry.heading, [t.ics.sceneMissing])
  if (entry.status === 'to-write') return t.ics.scene(scene.label, '', [t.ics.sceneToWrite])
  const details = [
    fr.shooting.intExt[scene.intExt],
    fr.shooting.dayNight[scene.dayNight],
    scene.eighths === null ? '' : fr.shooting.pages(formatEighths(scene.eighths))
  ].filter((d) => d !== '' && d !== '—')
  return t.ics.scene(scene.label, scene.location, details)
}

function dayEvent(view: DayView, rank: number): IcsEvent | null {
  if (view.day.date === null) return null
  const parts: string[] = []
  if (view.entries.length > 0) parts.push([t.ics.scenes, ...view.entries.map(sceneLine)].join('\n'))
  const facts = [
    view.eighths > 0 ? t.ics.total(formatEighths(view.eighths)) : '',
    view.called.length > 0
      ? t.ics.called(view.called.map((c) => t.called(c.interprete, c.personnages)))
      : '',
    view.withoutInterpreter.length > 0 ? t.ics.withoutInterpreter(view.withoutInterpreter) : '',
    view.day.presents.length > 0
      ? t.ics.presents(view.day.presents.map((p) => t.present(p.nom, p.role)))
      : ''
  ].filter(Boolean)
  if (facts.length > 0) parts.push(facts.join('\n'))
  if (view.locations.length > 0) parts.push(t.ics.locations(view.locations))
  if (view.day.note.trim()) parts.push(view.day.note.trim())
  return {
    uid: `${view.day.id}@neoscenar`,
    date: view.day.date,
    summary: t.ics.shootingSummary(rank, view.day.titre.trim()),
    description: parts.join('\n\n'),
    location: view.locations.join(', ')
  }
}

/**
 * Calendrier : échéances (tâches d'une personne si `person`), puis jours de tournage datés, toujours
 * tous (décidé le 20 nov.). Une tâche sans échéance n'y figure pas.
 */
export function planningCalendar(
  planning: Planning,
  days: readonly DayView[],
  options: { title: string; person: string | null; stamp: Date; modifiedAt: Date }
): IcsCalendar {
  const phaseNames = new Map(planning.phases.map((phase) => [phase.id, phase.nom]))
  const taskEvents = sortTasks(exportedTasks(planning, options.person))
    .map((task) => taskEvent(task, phaseNames.get(task.phase) ?? ''))
    .filter((event): event is IcsEvent => event !== null)
  const dayEvents = days
    .map((view, index) => dayEvent(view, index + 1))
    .filter((event): event is IcsEvent => event !== null)
  return {
    name: t.ics.calendarName(options.title.trim()),
    events: [...taskEvents, ...dayEvents],
    stamp: options.stamp,
    modifiedAt: options.modifiedAt
  }
}
