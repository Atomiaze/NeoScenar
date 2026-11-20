import { createStore } from '../state/createStore'

// Ouverture de la fenêtre « Exporter le générique », depuis le menu Fichier ou la vue Générique.

export const creditsExportStore = createStore({ open: false })

export function openCreditsExport(): void {
  creditsExportStore.set({ open: true })
}

export function closeCreditsExport(): void {
  creditsExportStore.set({ open: false })
}
