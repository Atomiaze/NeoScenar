import { createStore } from '../state/createStore'

// Ouverture de la fenêtre d'export vers Blender, depuis le menu Fichier ou la barre d'outils.

export const blenderExportStore = createStore({ open: false })

export function openBlenderExport(): void {
  blenderExportStore.set({ open: true })
}

export function closeBlenderExport(): void {
  blenderExportStore.set({ open: false })
}
