import { createStore } from '../state/createStore'

// Ouverture de la fenêtre « Exporter le planning… », depuis le menu Fichier ou le module Planification.

export const planningExportStore = createStore({ open: false })

export function openPlanningExport(): void {
  planningExportStore.set({ open: true })
}

export function closePlanningExport(): void {
  planningExportStore.set({ open: false })
}
