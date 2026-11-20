// A4 paysage pour les deux PDF, en points (1 pt = 1/72 de pouce).

export const MM = 72 / 25.4

export const PAGE = { width: 297 * MM, height: 210 * MM }

export const MARGIN = { left: 36, right: 36, top: 30, bottom: 28 }

export const CONTENT = {
  left: MARGIN.left,
  right: PAGE.width - MARGIN.right,
  width: PAGE.width - MARGIN.left - MARGIN.right
}

/** En-tête de page (titre du film, type de document, date d'export) et pied (numéro de page). */
export const HEADER = {
  titleSize: 13,
  infoSize: 8.5,
  titleBaseline: 44,
  infoBaseline: 57,
  rule: 64
}
export const FOOTER = { size: 7.5, baseline: PAGE.height - 14 }

/** Zone du contenu, sous l'en-tête et au-dessus du pied. */
export const BODY = { top: 74, bottom: PAGE.height - MARGIN.bottom }

/** Couleurs fixes (jamais celles du thème). */
export const INK = {
  text: '#000000',
  muted: '#6b6b6b',
  rule: '#bdbdbd',
  grid: '#e2e2e2',
  late: '#c62828',
  validated: '#00757f',
  shooting: '#3a3a3a',
  headerFill: '#f2f2f2'
} as const
