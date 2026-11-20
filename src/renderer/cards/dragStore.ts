import { createStore } from '../state/createStore'
import type { Box } from './dropGeometry'

// État du glissement en cours, séparé de l'état principal : le repère de dépôt change à chaque
// mouvement de la souris, et seul ce repère doit alors être redessiné (pas les 300 cartes).

export interface DragState {
  /** Éléments glissés (null : aucun glissement en cours). */
  draggingIds: ReadonlySet<string> | null
  kind: 'scene' | 'shot' | null
  /** Repère de dépôt, en coordonnées de la fenêtre. */
  marker: Box | null
}

export const dragStore = createStore<DragState>({ draggingIds: null, kind: null, marker: null })

export function isDragging(): boolean {
  return dragStore.get().draggingIds !== null
}
