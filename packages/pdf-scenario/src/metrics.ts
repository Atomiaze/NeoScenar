// Position des lignes sur la page, en points.

import type { ResolvedLayout } from '@neoscenar/fountain'

/**
 * Hauteur des majuscules de Courier Prime (1187 / 2048 de la taille). Les hauteurs du profil
 * (`topPt`) désignent le haut des majuscules : la ligne de base est donc un peu plus bas.
 * Écart mesuré avec le PDF de KIT : environ 1 pt.
 */
const CAP_HEIGHT_RATIO = 1187 / 2048

export function capHeight(layout: ResolvedLayout): number {
  return layout.profile.font.sizePt * CAP_HEIGHT_RATIO
}

/** Ligne de base de la ligne `row` (0 à 57) de la zone de texte, depuis le haut de la page. */
export function rowBaseline(layout: ResolvedLayout, row: number): number {
  const { text, font } = layout.profile
  return text.topPt + capHeight(layout) + row * font.lineHeightPt
}

/** Bord gauche d'une colonne (en caractères depuis la marge gauche du texte). */
export function columnX(layout: ResolvedLayout, column: number): number {
  return layout.profile.text.leftPt + column * layout.profile.font.charWidthPt
}

/** Largeur d'un texte en points (police à chasse fixe). */
export function textWidth(layout: ResolvedLayout, text: string): number {
  return text.length * layout.profile.font.charWidthPt
}
