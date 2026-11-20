// Bloc d'un plan, à hauteur variable : en-tête de scène éventuel, ligne Scène / Plan / Verso avec la
// case dessin, colonne des champs à droite, description en dessous. Le bloc est fait de groupes
// insécables (une ligne, ou la case avec sa ligne du haut) : seul un bloc plus haut qu'une page est
// réparti entre plusieurs pages, entre deux groupes.

import {
  CONTENT,
  CONTENT_WIDTH,
  CONTINUATION,
  DESCRIPTION,
  FIELDS,
  FIELDS_X,
  LABEL_GAP,
  SCENE_HEADING,
  TOP_ROW,
  ZONE,
  zoneHeight
} from './geometry.ts'
import { formatDuration, LABELS, shotLabel } from './labels.ts'
import type { CellPlacement, InkColor, Measure, PageItem, Rect, StoryboardShot } from './types.ts'
import { wrapText } from './wrap.ts'

/** Groupe insécable ; positions relatives au haut du bloc. */
export interface Group {
  top: number
  bottom: number
  items: PageItem[]
  cell?: CellPlacement
}

export interface Block {
  shot: StoryboardShot
  groups: Group[]
  height: number
}

/** Part de la hauteur d'une ligne laissée sous la ligne de base (jambages de g, p…). */
const BASELINE_FROM_BOTTOM = 4.5
const RULE_FROM_BOTTOM = 2

function text(
  value: string,
  x: number,
  baseline: number,
  size: number,
  face: 'regular' | 'bold',
  color: InkColor
): PageItem {
  return { type: 'text', text: value, x, baseline, size, face, color }
}

/** Plus grande case aux proportions du film, centrée dans la zone dessin. */
export function cellInZone(zone: Rect, format: { width: number; height: number }): Rect {
  const aspect = format.width / format.height
  const width = Math.min(zone.width, zone.height * aspect)
  const height = width / aspect
  return {
    x: zone.x + (zone.width - width) / 2,
    y: zone.y + (zone.height - height) / 2,
    width,
    height
  }
}

interface RuledField {
  label: string
  value: string
  minLines: number
  x: number
  right: number
  lineHeight: number
  size: number
  /** La ligne à écrire passe aussi sous le libellé (Description, comme sur la planche papier). */
  ruleUnderLabel: boolean
}

/** Lignes d'un champ : libellé puis valeur sur la première ligne, valeur seule ensuite. */
function ruledFieldGroups(field: RuledField, top: number, measure: Measure): Group[] {
  const labelWidth = measure(field.label, 'regular', field.size)
  const valueX = field.x + labelWidth + LABEL_GAP
  const width = (line: number): number =>
    line === 0 ? field.right - valueX - 1 : field.right - field.x - 1
  const lines = wrapText(field.value, width, (part) => measure(part, 'regular', field.size))
  const count = Math.max(field.minLines, lines.length)
  const groups: Group[] = []
  for (let line = 0; line < count; line++) {
    const lineTop = top + line * field.lineHeight
    const bottom = lineTop + field.lineHeight
    const baseline = bottom - BASELINE_FROM_BOTTOM
    const items: PageItem[] = []
    const startX = line === 0 ? valueX : field.x
    if (line === 0) items.push(text(field.label, field.x, baseline, field.size, 'regular', 'label'))
    const ruleX = line === 0 && !field.ruleUnderLabel ? valueX : field.x
    items.push({ type: 'rule', x1: ruleX, x2: field.right, y: bottom - RULE_FROM_BOTTOM })
    const value = lines[line] ?? ''
    if (value !== '') items.push(text(value, startX + 1, baseline, field.size, 'regular', 'ink'))
    groups.push({ top: lineTop, bottom, items })
  }
  return groups
}

/** En-tête de scène en petit gris (premier plan de chaque scène seulement). */
function headingGroup(heading: string, measure: Measure): Group | null {
  if (heading.trim() === '') return null
  const lines = wrapText(
    heading,
    () => CONTENT_WIDTH,
    (part) => measure(part, 'regular', SCENE_HEADING.size)
  )
  const items = lines.map((line, index) =>
    text(
      line,
      CONTENT.left,
      (index + 1) * SCENE_HEADING.lineHeight - 2.5,
      SCENE_HEADING.size,
      'regular',
      'muted'
    )
  )
  return { top: 0, bottom: lines.length * SCENE_HEADING.lineHeight, items }
}

/**
 * Ligne « Scène : S_0030   Plan : P_0010   Verso : ☐ » au-dessus de la case, nom du plan à sa
 * droite (au-dessus des champs, il y a la place), puis la case dessin ; à partir de `top`.
 */
function cellGroup(
  shot: StoryboardShot,
  top: number,
  format: { width: number; height: number },
  measure: Measure
): Group {
  const { size, lineHeight } = TOP_ROW
  const items: PageItem[] = []
  const left = CONTENT.left
  const zoneRight = left + ZONE.width
  const baselineOf = (line: number): number => top + (line + 1) * lineHeight - 3.5
  const labelled = (label: string, value: string, x: number): void => {
    items.push(text(label, x, baselineOf(0), size, 'regular', 'label'))
    const valueX = x + measure(label, 'regular', size) + 4
    items.push(text(value, valueX, baselineOf(0), size, 'bold', 'ink'))
  }

  labelled(LABELS.scene, shot.sceneLabel, left)
  labelled(LABELS.shot, shot.shotLabel, left + TOP_ROW.planX)

  // « Verso : ☐ », aligné sur le bord droit de la case.
  const boxX = zoneRight - TOP_ROW.versoBox
  const versoX = boxX - 3 - measure(LABELS.verso, 'regular', size)
  items.push(text(LABELS.verso, versoX, baselineOf(0), size, 'regular', 'label'))
  items.push({
    type: 'frame',
    x: boxX,
    y: baselineOf(0) - TOP_ROW.versoBox + 1,
    width: TOP_ROW.versoBox,
    height: TOP_ROW.versoBox,
    thickness: 0.8
  })

  // Nom du plan, qui passe à la ligne s'il est long.
  const nameLines = wrapText(
    shot.name,
    () => CONTENT.right - FIELDS_X,
    (part) => measure(part, 'regular', size)
  )
  nameLines.forEach((line, index) => {
    if (line !== '') items.push(text(line, FIELDS_X, baselineOf(index), size, 'regular', 'ink'))
  })

  const zoneTop = top + Math.max(1, nameLines.length) * lineHeight + TOP_ROW.gapBelow
  const zone = { x: left, y: zoneTop, width: ZONE.width, height: zoneHeight(format) }
  const rect = cellInZone(zone, format)
  items.push({ type: 'cell', shotId: shot.shotId, ...rect })
  return {
    top,
    bottom: zoneTop + zone.height,
    items,
    cell: {
      shotId: shot.shotId,
      sceneId: shot.sceneId,
      label: shotLabel(shot.sceneLabel, shot.shotLabel),
      rect
    }
  }
}

/** Champs de la colonne de droite, dans l'ordre de la planche. */
function fieldList(shot: StoryboardShot): { label: string; value: string; minLines: number }[] {
  return [
    { label: LABELS.duration, value: formatDuration(shot.duration), minLines: 1 },
    { label: LABELS.cameraMovement, value: shot.cameraMovement, minLines: 1 },
    { label: LABELS.music, value: shot.music, minLines: 1 },
    { label: LABELS.shotSize, value: shot.shotSize, minLines: 1 },
    { label: LABELS.sound, value: shot.sound, minLines: 3 },
    { label: LABELS.cameraAngle, value: shot.cameraAngle, minLines: 2 }
  ]
}

export function buildBlock(
  shot: StoryboardShot,
  withHeading: boolean,
  format: { width: number; height: number },
  measure: Measure
): Block {
  const groups: Group[] = []
  const heading = withHeading ? headingGroup(shot.sceneHeading, measure) : null
  if (heading) groups.push(heading)

  const cell = cellGroup(shot, heading?.bottom ?? 0, format, measure)
  groups.push(cell)
  const zoneTop = cell.bottom - zoneHeight(format)

  let fieldsBottom = zoneTop
  for (const field of fieldList(shot)) {
    const lines = ruledFieldGroups(
      {
        ...field,
        x: FIELDS_X,
        right: CONTENT.right,
        lineHeight: FIELDS.lineHeight,
        size: FIELDS.size,
        ruleUnderLabel: false
      },
      fieldsBottom,
      measure
    )
    groups.push(...lines)
    fieldsBottom = lines[lines.length - 1].bottom
  }

  const descriptionTop = Math.max(cell.bottom, fieldsBottom) + DESCRIPTION.gapAbove
  const description = ruledFieldGroups(
    {
      label: LABELS.description,
      value: shot.description,
      minLines: 4,
      x: CONTENT.left,
      right: CONTENT.right,
      lineHeight: DESCRIPTION.lineHeight,
      size: DESCRIPTION.size,
      ruleUnderLabel: true
    },
    descriptionTop,
    measure
  )
  groups.push(...description)
  groups.sort((a, b) => a.top - b.top)
  return { shot, groups, height: description[description.length - 1].bottom }
}

/** Ligne « S_0030 · P_0010 (suite) » en haut d'une page de suite ; positions relatives à `top`. */
export function continuationGroup(shot: StoryboardShot, top: number): Group {
  const label = `${shotLabel(shot.sceneLabel, shot.shotLabel)} ${LABELS.continued}`
  return {
    top,
    bottom: top + CONTINUATION.lineHeight,
    items: [
      text(
        label,
        CONTENT.left,
        top + CONTINUATION.lineHeight - 4.5,
        CONTINUATION.size,
        'bold',
        'muted'
      )
    ]
  }
}
