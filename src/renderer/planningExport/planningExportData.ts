import { filterablePeople } from '../../shared/planning/planningView'
import {
  exportedDays,
  planningCalendar,
  planningPdfData,
  shootingPdfData
} from '../../shared/planning/planningExport'
import type { CharacterSheetInfo } from '../../shared/planning/shootingTypes'
import type { CrewMember, Planning } from '../../shared/planning/types'
import type { PlanningExportRequest, PlanningExportOptions } from '../../shared/planningExport'
import type { Scene } from '../../shared/projectTypes'
import { computeBreakdown } from '../planning/shootingStore'

// Données de l'export du planning, calculées comme à l'écran (mêmes fonctions que le plan de
// tournage), puis envoyées au processus principal qui dessine le PDF ou écrit le calendrier.

/** Ce que la fenêtre lit une fois à l'ouverture. */
export interface PlanningExportSources {
  planning: Planning
  crew: CrewMember[]
  sheets: CharacterSheetInfo[]
  cards: Scene[]
  /** Texte du scénario (celui de l'éditeur, même non enregistré). */
  scriptText: string
  /** Date du jour, AAAA-MM-JJ. */
  today: string
}

export function exportablePeople(sources: PlanningExportSources): string[] {
  return filterablePeople(sources.planning, sources.crew)
}

/** Demande complète pour le processus principal. */
export function buildPlanningExportRequest(
  options: PlanningExportOptions,
  sources: PlanningExportSources,
  title: string
): PlanningExportRequest {
  const { planning, cards, today } = sources
  const breakdown = computeBreakdown(cards, sources.sheets, planning, sources.scriptText) ?? []
  const { days, unplanned } = exportedDays(planning, breakdown, cards)
  if (options.kind === 'tournage') {
    return {
      kind: 'tournage',
      person: options.person,
      data: shootingPdfData(days, unplanned, today)
    }
  }
  if (options.kind === 'calendrier') {
    // Le moment de l'export et la date de planning.json sont ajoutés par le processus principal.
    const calendar = planningCalendar(planning, days, {
      title,
      person: options.person,
      stamp: new Date(0),
      modifiedAt: new Date(0)
    })
    const content = { name: calendar.name, events: calendar.events }
    return { kind: 'calendrier', person: options.person, data: content }
  }
  return {
    kind: 'planning',
    person: options.person,
    data: planningPdfData(planning, days, { today, person: options.person })
  }
}

/** Y a-t-il quelque chose à exporter ? Sinon, le message à montrer. */
export function emptyExportReason(
  request: PlanningExportRequest
): 'nothing' | 'shooting' | 'events' | null {
  if (request.kind === 'tournage') return request.data.days.length === 0 ? 'shooting' : null
  if (request.kind === 'calendrier') return request.data.events.length === 0 ? 'events' : null
  const tasks = request.data.phases.reduce((sum, phase) => sum + phase.tasks.length, 0)
  return tasks === 0 && request.data.shootingDays.length === 0 ? 'nothing' : null
}
