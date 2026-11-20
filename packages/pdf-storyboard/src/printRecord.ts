// Fichier d'impression (storyboard/impressions/<idImpression>.json) : pour chaque page, la case
// dessin de chaque plan, en millimètres depuis le centre de la marque d'angle en haut à gauche.
// Indispensable à l'import des scans (étape 12), puisque la mise en page varie avec le texte.

import { MARK, markCenters, MM, PAGE } from './geometry.ts'
import type { MmPoint, PrintRecord, StoryboardInput, StoryboardLayout } from './types.ts'

export const PRINT_RECORD_VERSION = 1

const round = (value: number): number => Math.round(value * 100) / 100
const toMm = (pt: number): number => round(pt / MM)

/** Contenu du QR code de chaque page : NEOSCENAR/1/<projet>/<impression>/<page>. */
export function qrPayload(projectId: string, printId: string, page: number): string {
  return `NEOSCENAR/${PRINT_RECORD_VERSION}/${projectId}/${printId}/${page}`
}

export function buildPrintRecord(
  input: Pick<StoryboardInput, 'kind' | 'projectId' | 'printId' | 'createdAt' | 'format'>,
  layout: StoryboardLayout
): PrintRecord {
  const [topLeft, topRight, bottomLeft, bottomRight] = markCenters()
  const point = (p: { x: number; y: number }): MmPoint => ({ x: toMm(p.x), y: toMm(p.y) })
  return {
    formatVersion: PRINT_RECORD_VERSION,
    printId: input.printId,
    projectId: input.projectId,
    kind: input.kind,
    createdAt: input.createdAt,
    format: { width: input.format.width, height: input.format.height },
    paper: { widthMm: toMm(PAGE.width), heightMm: toMm(PAGE.height) },
    marks: {
      sizeMm: toMm(MARK.size),
      centersMm: {
        topLeft: point(topLeft),
        topRight: point(topRight),
        bottomLeft: point(bottomLeft),
        bottomRight: point(bottomRight)
      }
    },
    origin:
      'Rectangles des cases (cellMm) en millimètres depuis le centre de la marque en haut à gauche, x vers la droite, y vers le bas.',
    pages: layout.pages.map((page) => ({
      number: page.number,
      shots: page.cells.map((cell) => ({
        shotId: cell.shotId,
        sceneId: cell.sceneId,
        label: cell.label,
        cellMm: {
          x: toMm(cell.rect.x - topLeft.x),
          y: toMm(cell.rect.y - topLeft.y),
          width: toMm(cell.rect.width),
          height: toMm(cell.rect.height)
        }
      }))
    }))
  }
}
