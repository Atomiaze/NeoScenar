// Dimensions de la planche Saint Luc (A4 portrait), en points (1 pt = 1/72 de pouce).
// Mesurées sur `Documentation/exemple StoryBoard.jpg`, puis resserrées pour laisser la place
// aux marques d'angle et au QR code tout en gardant trois blocs vides par page.

export const MM = 72 / 25.4

export const PAGE = { width: 210 * MM, height: 297 * MM }

/** Marques d'angle : carrés noirs pleins à 6 mm des bords (zone imprimable de toute imprimante). */
export const MARK = { size: 12, inset: 17 }

/** Bords gauche et droit du contenu. */
export const CONTENT = { left: 48, right: PAGE.width - 48 }
export const CONTENT_WIDTH = CONTENT.right - CONTENT.left

/** En-tête de page : cadre « Titre » / « N° de page », QR code à sa droite. */
export const HEADER = {
  top: 32,
  minHeight: 40,
  paddingX: 10,
  lineHeight: 15,
  size: 12,
  qrSize: 40,
  qrGap: 8,
  frameThickness: 1.2
}

/** Espace entre l'en-tête et le premier bloc, et limite basse des blocs. */
export const BLOCKS = { gapAfterHeader: 6, bottom: PAGE.height - 26, gap: 8 }

/** Ligne « Scène / Plan / Verso ». */
export const TOP_ROW = { size: 11, lineHeight: 15, planX: 100, versoBox: 9, gapBelow: 3 }

/** En-tête de scène en petit gris au-dessus du premier plan de chaque scène. */
export const SCENE_HEADING = { size: 7.5, lineHeight: 10 }

/** Zone de la case dessin (à gauche) et colonne des champs (à droite). */
export const ZONE = { width: 242, gapToFields: 12 }
export const FIELDS = { size: 9.5, lineHeight: 14.5 }
export const DESCRIPTION = { size: 9.5, lineHeight: 17.5, gapAbove: 5 }

/** Épaisseur du cadre de la case dessin, des lignes à écrire, et ligne « (suite) ». */
export const CELL_FRAME = 1.2
export const RULE_THICKNESS = 0.5
export const CONTINUATION = { size: 9.5, lineHeight: 16 }

/** Écart entre un libellé et le début de sa ligne à écrire. */
export const LABEL_GAP = 4

/** Hauteur minimale de la colonne de droite : 4 champs d'une ligne, 3 lignes de sons, 2 d'angle. */
export const MIN_FIELD_LINES = 4 + 3 + 2
export const ZONE_HEIGHT = MIN_FIELD_LINES * FIELDS.lineHeight

/** Format plus haut que large (9:16…) : zone dessin de hauteur double, 2 plans au plus par page. */
export function isPortrait(format: { width: number; height: number }): boolean {
  return format.width < format.height
}

export function zoneHeight(format: { width: number; height: number }): number {
  return isPortrait(format) ? 2 * ZONE_HEIGHT : ZONE_HEIGHT
}

export function maxShotsPerPage(format: { width: number; height: number }): number {
  return isPortrait(format) ? 2 : 3
}

export const FIELDS_X = CONTENT.left + ZONE.width + ZONE.gapToFields

/** Centres des quatre marques d'angle, en points depuis le coin haut gauche. */
export function markCenters(): { x: number; y: number }[] {
  const near = MARK.inset + MARK.size / 2
  const farX = PAGE.width - near
  const farY = PAGE.height - near
  return [
    { x: near, y: near },
    { x: farX, y: near },
    { x: near, y: farY },
    { x: farX, y: farY }
  ]
}
