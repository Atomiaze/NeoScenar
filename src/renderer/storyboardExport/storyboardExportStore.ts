import { createStore } from '../state/createStore'

// Ouverture de la fenêtre « Exporter le storyboard en PDF », depuis le menu Fichier ou les Cartes.

export const storyboardExportStore = createStore({ open: false })

export function openStoryboardExport(): void {
  storyboardExportStore.set({ open: true })
}

export function closeStoryboardExport(): void {
  storyboardExportStore.set({ open: false })
}
