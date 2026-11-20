// Palette des cartes, rangée par teinte : pour chaque teinte, une version pastel, une version vive
// et une version foncée. Le texte de la carte est foncé ou blanc selon la couleur, pour rester
// toujours lisible (vérifié par les tests).

/** Texte foncé sur une carte colorée (identique en thème clair et sombre). */
export const CARD_TEXT_COLOR = '#1f2328'
/** Texte clair, pour les couleurs trop foncées pour un texte foncé. */
export const CARD_TEXT_LIGHT = '#ffffff'
/** Texte secondaire (en-tête de scène, résumé) sur les couleurs claires. */
export const CARD_TEXT_MUTED = '#4a4f57'

/** Contraste minimal d'un texte sur une carte (norme WCAG AA). */
export const MIN_TEXT_CONTRAST = 4.5

export const COLOR_SHADES = ['pastel', 'vivid', 'dark'] as const
export type ColorShade = (typeof COLOR_SHADES)[number]

export interface PaletteColor {
  /** Teinte (clé du nom affiché dans fr.colors). */
  hue: string
  shade: ColorShade
  hex: string
}

/** Teintes, chacune en [pastel, vive, foncée], dans l'ordre d'affichage. */
const HUES: readonly [string, [string, string, string]][] = [
  ['red', ['#f4c7c3', '#ff4d4d', '#c62828']],
  ['orange', ['#f9d8b4', '#ff8a00', '#b85400']],
  ['yellow', ['#f8eaa6', '#ffe100', '#b38f00']],
  ['lime', ['#e6f2b0', '#9be000', '#4f7a00']],
  ['green', ['#d4ecc4', '#00c46a', '#00804a']],
  ['teal', ['#c4e8dc', '#00bfa5', '#007a6a']],
  ['cyan', ['#b8e6ec', '#00c8f0', '#00799e']],
  ['blue', ['#c8e1f5', '#2463eb', '#1a3fa8']],
  ['violet', ['#e2d0f0', '#7c3aed', '#5521b5']],
  ['magenta', ['#f0c4e0', '#d10080', '#8f005c']],
  ['pink', ['#f5cfe3', '#ff5cb8', '#c72a83']],
  ['grey', ['#dcdcdc', '#9e9e9e', '#5f6368']]
]

export const CARD_PALETTE: readonly PaletteColor[] = HUES.flatMap(([hue, hexes]) =>
  COLOR_SHADES.map((shade, index) => ({ hue, shade, hex: hexes[index] }))
)

/** Luminance relative d'une couleur « #rrggbb » (définition WCAG). */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Rapport de contraste WCAG entre deux couleurs (de 1 à 21). */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

/** Couleur de texte la plus lisible sur un fond donné (foncé ou blanc). */
export function cardTextColor(background: string): string {
  return contrastRatio(background, CARD_TEXT_COLOR) >= contrastRatio(background, CARD_TEXT_LIGHT)
    ? CARD_TEXT_COLOR
    : CARD_TEXT_LIGHT
}

/** Texte secondaire : gris s'il reste lisible sur ce fond, sinon la couleur du texte principal. */
export function cardMutedTextColor(background: string): string {
  return contrastRatio(background, CARD_TEXT_MUTED) >= MIN_TEXT_CONTRAST
    ? CARD_TEXT_MUTED
    : cardTextColor(background)
}
