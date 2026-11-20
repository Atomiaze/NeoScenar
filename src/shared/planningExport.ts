// Exports du planning (étape 15E-2) : échanges entre la fenêtre « Exporter le planning… » et le
// processus principal. L'interface choisit et prépare les données (mêmes calculs que l'écran, voir
// `planning/planningExport.ts`) ; le processus principal dessine le PDF ou écrit le calendrier.

import type { IcsCalendar } from './planning/ics'
import type { PlanningPdfData, ShootingPdfData } from './planning/planningExport'

export const PLANNING_EXPORT_KINDS = ['planning', 'tournage', 'calendrier'] as const
export type PlanningExportKind = (typeof PLANNING_EXPORT_KINDS)[number]

/** Options mémorisées dans projet.json (`exportPlanning`). */
export interface PlanningExportOptions {
  kind: PlanningExportKind
  /** « Tâches de : » ; null = tout le monde. Sans effet sur le Plan de tournage. */
  person: string | null
}

export const DEFAULT_PLANNING_EXPORT_OPTIONS: PlanningExportOptions = {
  kind: 'planning',
  person: null
}

/** Calendrier sans les dates que le processus principal ajoute (export et modification du fichier). */
export type CalendarContent = Omit<IcsCalendar, 'stamp' | 'modifiedAt'>

/** Ce que la fenêtre envoie : le genre d'export, la personne et les données déjà calculées. */
export type PlanningExportRequest =
  | { kind: 'planning'; person: string | null; data: PlanningPdfData }
  | { kind: 'tournage'; person: string | null; data: ShootingPdfData }
  | { kind: 'calendrier'; person: string | null; data: CalendarContent }

export interface PlanningExportPreview {
  /** Octets du PDF réel ; null pour le calendrier. */
  bytes: Uint8Array | null
  pageCount: number
  /** Événements du calendrier (0 pour un PDF). */
  eventCount: number
  /** Dossier où le fichier sera écrit, relatif au dossier du film (avec « / »). */
  folder: string
  /** Nom du fichier proposé. */
  fileName: string
}

/** Ce que la fenêtre reçoit à l'ouverture : les options mémorisées. */
export interface PlanningExportInfo {
  options: PlanningExportOptions
}
