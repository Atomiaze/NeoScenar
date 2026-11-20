import type { PaginationOptions } from '@neoscenar/fountain'
import { createStore } from '../../state/createStore'

// Règles facultatives de la pagination (étape 13D), les mêmes pour l'écran, les statistiques et le PDF :
// (SUITE) est une préférence de l'application, « nouvelle page à chaque acte » une option du projet
// (choisie dans la fenêtre PDF du scénario). Aucune des deux n'écrit quoi que ce soit dans le Fountain.

export const paginationSettings = createStore<Required<PaginationOptions>>({
  continued: false,
  newPageForActs: false
})

let continuedLoaded: Promise<void> | null = null

/** Préférence (SUITE), lue une fois. */
export function loadContinuedMarks(): Promise<void> {
  continuedLoaded ??= window.neoscenar
    .getContinuedMarks()
    .then((continued) => paginationSettings.set({ continued }))
  return continuedLoaded
}

/** Réglages > (SUITE) : appliqué tout de suite (écran et PDF), mémorisé. */
export async function setContinuedMarks(continued: boolean): Promise<void> {
  paginationSettings.set({ continued })
  await window.neoscenar.setContinuedMarks(continued)
}

/** Option « nouvelle page à chaque acte » du projet ouvert (lue dans projet.json). */
export async function loadProjectPagination(): Promise<void> {
  const result = await window.neoscenar.getPdfOptions()
  paginationSettings.set({ newPageForActs: result.ok && result.value.nouvellePageParActe })
}

export function setNewPageForActs(newPageForActs: boolean): void {
  if (paginationSettings.get().newPageForActs !== newPageForActs)
    paginationSettings.set({ newPageForActs })
}
