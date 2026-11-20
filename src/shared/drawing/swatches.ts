import { CARD_PALETTE } from '../palette'

// Nuancier de l'éditeur : les 36 couleurs de la palette des cartes (même source, même ordre),
// plus le noir et le blanc.

export const DRAWING_BLACK = '#000000'
export const DRAWING_WHITE = '#ffffff'

export const DRAWING_SWATCHES: readonly string[] = [
  ...CARD_PALETTE.map((color) => color.hex),
  DRAWING_BLACK,
  DRAWING_WHITE
]

/** Couleur active à l'ouverture de l'éditeur. */
export const DEFAULT_DRAWING_COLOR = DRAWING_BLACK
