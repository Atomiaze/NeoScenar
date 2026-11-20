// Mise en lignes de chaque élément selon le profil : texte visible, coupure des mots, retraits, espacements.

import type { PrintedElementType, ResolvedLayout, ResolvedStyle } from './profile.ts'
import type { InlineRange } from './inline.ts'
import {
  CONTINUED_MARK,
  continuedCharacters,
  dualDialogues,
  followedByBlankLine
} from './dialogueRules.ts'
import { STYLE_BOLD, STYLE_ITALIC, STYLE_UNDERLINE, visibleLines } from './visibleLine.ts'
import { wrapLine } from './wrap.ts'
import type { ElementType, FountainDocument, FountainElement } from './types.ts'

export interface LaidOutLine {
  /** Texte imprimé : sans marqueurs de mise en forme, notes ni texte mis de côté. */
  text: string
  /** Début de la ligne, en caractères depuis la marge gauche du texte (peut être fractionnaire). */
  column: number
  /** Ligne du texte source (à partir de 1) d'où vient cette ligne ; absente pour un élément créé par programme. */
  sourceLine?: number
  /** Rang de cette ligne parmi celles obtenues en coupant sa ligne source (0 = la première). */
  wrapIndex: number
  /**
   * Position, dans le texte source, du caractère qui commence cette ligne (même au milieu d'un
   * paragraphe coupé) : c'est là que l'éditeur dessine une limite de page. Absente sans texte source.
   */
  sourceOffset?: number
  /**
   * Passages en gras, italique ou souligné (positions dans `text`) ; absent si la ligne n'en a pas.
   * L'italique propre à l'élément (paroles) n'y figure pas : il vient du style.
   */
  marks?: InlineRange[]
}

export interface ElementLayout {
  elementIndex: number
  type: ElementType
  /** Lignes vides avant l'élément (avant leur suppression éventuelle en haut de page). */
  spaceBefore: number
  /** Index du personnage qui ouvre le bloc de dialogue auquel appartient l'élément, sinon null. */
  dialogueBlock: number | null
  /** Lignes imprimées ; aucune pour un élément non imprimé (note, section, synopsis, saut de page…). */
  lines: LaidOutLine[]
  /** Colonne d'un dialogue simultané : gauche (premier bloc) ou droite (bloc marqué « ^ »). */
  dual?: 'left' | 'right'
  /** Acte qui commence une nouvelle page (option « nouvelle page à chaque acte »). */
  newPage?: boolean
  /** Position, dans le texte source, du début d'un acte qui commence une page (trait de l'éditeur). */
  sourceOffset?: number
}

/** Règles facultatives de mise en page, identiques à l'écran et dans le PDF. */
export interface PaginationOptions {
  /** Ajouter (SUITE) quand un personnage reprend la parole après une action. */
  continued?: boolean
  /** Chaque acte (section de niveau 1) commence une nouvelle page. */
  newPageForActs?: boolean
}

/** Largeur d'une colonne de dialogue simultané, en caractères (nom centré au-dessus). */
export const DUAL_COLUMN_WIDTH = 28
/** Retrait des didascalies dans leur colonne, et leur largeur. */
const DUAL_PARENTHETICAL_INDENT = 3
const DUAL_PARENTHETICAL_WIDTH = 22

const PRINTED: ReadonlySet<ElementType> = new Set<ElementType>([
  'scene_heading',
  'action',
  'character',
  'parenthetical',
  'dialogue',
  'lyrics',
  'transition',
  'centered'
])
const DIALOGUE_GROUP: ReadonlySet<ElementType> = new Set<ElementType>([
  'character',
  'parenthetical',
  'dialogue',
  'lyrics'
])

export function layoutElements(
  doc: FountainDocument,
  layout: ResolvedLayout,
  options: PaginationOptions = {}
): ElementLayout[] {
  const result: ElementLayout[] = []
  let block: number | null = null
  let printedBefore = false
  const continued = options.continued ? continuedCharacters(doc) : new Set<number>()
  const columns = dualColumns(doc, layout, continued)

  doc.elements.forEach((element, index) => {
    const column = columns.get(index)
    let lines = column?.lines ?? []
    if (!column && PRINTED.has(element.type)) {
      const style = layout.styles[element.type as PrintedElementType]
      lines = layoutLines(element, style)
      if (continued.has(index)) lines = withContinuedMark(lines, style)
    }
    if (element.type === 'page_break') block = null
    if (lines.length === 0) {
      const act =
        options.newPageForActs === true &&
        element.type === 'section' &&
        (element.section?.level ?? 1) === 1
      result.push({
        elementIndex: index,
        type: element.type,
        spaceBefore: 0,
        dialogueBlock: null,
        lines,
        ...(act ? { newPage: true, sourceOffset: element.position?.startOffset } : {})
      })
      if (act) block = null
      return
    }

    let inBlock = false
    if (element.type === 'character') block = index
    else if (element.type === 'parenthetical' || element.type === 'dialogue')
      inBlock = block !== null
    else if (element.type === 'lyrics') {
      // Des paroles collées à une réplique ou à d'autres paroles forment un seul bloc ;
      // après une ligne vide, elles en ouvrent un nouveau.
      inBlock = block !== null && !followedByBlankLine(doc.elements[index - 1])
      if (!inBlock) block = index
    } else block = null

    const style = layout.styles[element.type as PrintedElementType]
    result.push({
      elementIndex: index,
      type: element.type,
      // Le bloc de droite d'un dialogue simultané commence sur la même ligne que celui de gauche.
      spaceBefore: !printedBefore || inBlock || column?.side === 'right' ? 0 : style.spaceBefore,
      dialogueBlock: DIALOGUE_GROUP.has(element.type) ? block : null,
      lines,
      ...(column ? { dual: column.side } : {})
    })
    printedBefore = true
  })
  return result
}

/** Ajoute (SUITE) à la dernière ligne du nom, ou sur une ligne à part si elle ne tient pas. */
function withContinuedMark(lines: LaidOutLine[], style: ResolvedStyle): LaidOutLine[] {
  if (lines.length === 0) return lines
  const last = lines[lines.length - 1]
  const joined = `${last.text} ${CONTINUED_MARK}`
  if (joined.length <= style.wrapWidth) {
    return [...lines.slice(0, -1), { ...last, text: joined, column: columnOf(joined, style) }]
  }
  const extra: LaidOutLine = {
    text: CONTINUED_MARK,
    column: columnOf(CONTINUED_MARK, style),
    sourceLine: last.sourceLine,
    wrapIndex: last.wrapIndex + 1,
    sourceOffset: last.sourceOffset
  }
  return [...lines, extra]
}

/** Styles d'une colonne de dialogue simultané qui commence à `origin` caractères de la marge. */
function columnStyle(base: ResolvedStyle, type: PrintedElementType, origin: number): ResolvedStyle {
  if (type === 'character')
    return { ...base, indentCh: origin, wrapWidth: DUAL_COLUMN_WIDTH, align: 'center' }
  if (type === 'parenthetical')
    return {
      ...base,
      indentCh: origin + DUAL_PARENTHETICAL_INDENT,
      wrapWidth: DUAL_PARENTHETICAL_WIDTH,
      align: 'left'
    }
  return { ...base, indentCh: origin, wrapWidth: DUAL_COLUMN_WIDTH, align: 'left' }
}

/**
 * Lignes des éléments placés en colonnes (dialogues simultanés). Une paire dont une colonne serait
 * plus haute qu'une page reste imprimée l'un sous l'autre : une paire n'est jamais coupée.
 */
function dualColumns(
  doc: FountainDocument,
  layout: ResolvedLayout,
  continued: ReadonlySet<number>
): Map<number, { side: 'left' | 'right'; lines: LaidOutLine[] }> {
  const result = new Map<number, { side: 'left' | 'right'; lines: LaidOutLine[] }>()
  const origins = { left: 0, right: layout.textWidthCh - DUAL_COLUMN_WIDTH }
  for (const pair of dualDialogues(doc)) {
    const placed = new Map<number, { side: 'left' | 'right'; lines: LaidOutLine[] }>()
    const heights = { left: 0, right: 0 }
    for (const side of ['left', 'right'] as const) {
      for (const index of pair[side]) {
        const element = doc.elements[index]
        const type = element.type as PrintedElementType
        const style = columnStyle(layout.styles[type], type, origins[side])
        let lines = layoutLines(element, style)
        if (continued.has(index)) lines = withContinuedMark(lines, style)
        heights[side] += lines.length
        placed.set(index, { side, lines })
      }
    }
    if (Math.max(heights.left, heights.right) > layout.linesPerPage) continue
    for (const [index, value] of placed) result.set(index, value)
  }
  return result
}

/** Lignes imprimées d'un élément ; les lignes faites uniquement de notes disparaissent. */
export function layoutLines(element: FountainElement, style: ResolvedStyle): LaidOutLine[] {
  const position = element.position
  const visible = visibleLines(element)
  const lines: LaidOutLine[] = []
  visible.forEach((line, i) => {
    if (line.text.trim() === '' && line.written.trim() !== '') return
    // Majuscules caractère par caractère : la longueur ne change pas (positions source).
    let text = style.uppercase
      ? Array.from(line.text, (char) =>
          char.toUpperCase().length === 1 ? char.toUpperCase() : char
        ).join('')
      : line.text
    let lead = 0
    if (style.align !== 'left') {
      lead = text.length - text.trimStart().length
      text = text.trim()
    }
    const sourceLine = position
      ? position.startLine + (visible.length === position.endLine - position.startLine + 1 ? i : 0)
      : undefined
    let from = 0
    wrapLine(text, style.wrapWidth).forEach((segment, wrapIndex) => {
      const at = segment === '' ? from : text.indexOf(segment, from)
      from = at + segment.length
      const sourceOffset = line.offsets?.[lead + at] ?? line.lineStart
      const laidOut: LaidOutLine = {
        text: segment,
        column: columnOf(segment, style),
        sourceLine,
        wrapIndex,
        sourceOffset
      }
      const marks = marksOf(line.styles.slice(lead + at, lead + at + segment.length))
      if (marks.length > 0) laidOut.marks = marks
      lines.push(laidOut)
    })
  })
  return lines
}

/** Regroupe les caractères de même mise en forme en passages. */
function marksOf(styles: number[]): InlineRange[] {
  const marks: InlineRange[] = []
  styles.forEach((style, i) => {
    if (style === 0) return
    const last = marks[marks.length - 1]
    if (last?.to === i && styleCode(last) === style) last.to = i + 1
    else
      marks.push({
        from: i,
        to: i + 1,
        bold: (style & STYLE_BOLD) !== 0,
        italic: (style & STYLE_ITALIC) !== 0,
        underline: (style & STYLE_UNDERLINE) !== 0
      })
  })
  return marks
}

function styleCode(range: InlineRange): number {
  return (
    (range.bold ? STYLE_BOLD : 0) |
    (range.italic ? STYLE_ITALIC : 0) |
    (range.underline ? STYLE_UNDERLINE : 0)
  )
}

function columnOf(text: string, style: ResolvedStyle): number {
  if (style.align === 'right') return style.indentCh + style.wrapWidth - text.length
  if (style.align === 'center') return style.indentCh + (style.wrapWidth - text.length) / 2
  return style.indentCh
}
