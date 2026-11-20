import { createStore } from '../state/createStore'

// Ouverture de la fenêtre « Exporter le scénario en PDF », depuis le menu Fichier ou la barre d'outils.

export const pdfExportStore = createStore({ open: false })

export function openPdfExport(): void {
  pdfExportStore.set({ open: true })
}

export function closePdfExport(): void {
  pdfExportStore.set({ open: false })
}
