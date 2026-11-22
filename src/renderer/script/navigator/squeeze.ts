// Panneau des révisions (18C-8) : quand la page A4 ne tient plus, le navigateur de scènes se masque
// tout seul, sans toucher à la préférence, et revient dès qu'il y a de nouveau la place.

export interface EditorWidths {
  /** Largeur visible de la zone de défilement de l'éditeur. */
  clientWidth: number
  /** Largeur de la page (le contenu de l’éditeur, de largeur fixe). */
  pageWidth: number
}

/** Largeur rendue à l'éditeur quand le navigateur se masque (260 px + sa bordure). */
export const NAVIGATOR_WIDTH = 261

/** Navigateur masqué automatiquement après cette mesure ? */
export function nextAutoHidden(autoHidden: boolean, widths: EditorWidths): boolean {
  if (!autoHidden) return widths.pageWidth > widths.clientWidth
  // Masqué : il revient seulement si la page tient encore une fois le navigateur rendu.
  return widths.clientWidth - NAVIGATOR_WIDTH < widths.pageWidth
}
