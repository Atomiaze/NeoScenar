// Habillage du texte Fountain : chaque ligne reçoit la classe de son élément (retrait, largeur,
// style), les marqueurs de forçage sont masqués hors de la ligne du curseur, la mise en forme
// (gras, italique, souligné), les notes et le texte mis de côté sont rendus comme tels.
// Rien de tout cela ne modifie le texte.

import { StateField, type EditorState, type Range } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate
} from '@codemirror/view'
import {
  CONTINUED_MARK,
  inlineLayout,
  type ElementType,
  type FountainElement
} from '@neoscenar/fountain'
import { pendingTypes } from '../editing/pendingTypes'
import { cardTextColor } from '../../../shared/palette'
import { fr } from '../../i18n/fr'
import { analysisField, type ScriptAnalysis } from './analysis'
import { syntaxMarkers } from './syntaxMarkers'
import type { RevisionMark } from '../../../shared/revision/revisionMarks'
import { paginationSettingsChanged } from './pageLayout'
import { paginationSettings } from './paginationSettings'

const HIDDEN = Decoration.replace({})
const MARKER = Decoration.mark({ class: 'fl-marker' })
const NOTE = Decoration.mark({ class: 'fl-note' })
const BONEYARD = Decoration.mark({ class: 'fl-boneyard' })

/** Éléments dont le texte peut contenir du gras, de l'italique ou du souligné. */
const FORMATTED: ReadonlySet<string> = new Set([
  'action',
  'character',
  'parenthetical',
  'dialogue',
  'lyrics',
  'transition',
  'centered',
  'scene_heading'
])

class SceneNumberWidget extends WidgetType {
  constructor(private readonly label: string) {
    super()
  }
  eq(other: SceneNumberWidget): boolean {
    return other.label === this.label
  }
  toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'fl-scene-number'
    span.textContent = this.label
    span.setAttribute('aria-hidden', 'true')
    return span
  }
}

/** Mention ajoutée à l'affichage seulement : jamais dans le fichier (étape 13D). */
class ContinuedWidget extends WidgetType {
  eq(): boolean {
    return true
  }
  toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'fl-continued'
    span.textContent = ` ${CONTINUED_MARK}`
    return span
  }
  ignoreEvent(): boolean {
    return false
  }
}

const CONTINUED = Decoration.widget({ widget: new ContinuedWidget(), side: 1 })

/** « simultané » dans la marge, devant le premier des deux dialogues simultanés. */
class DualLabelWidget extends WidgetType {
  eq(): boolean {
    return true
  }
  toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'fl-dual-label'
    span.textContent = fr.script.dualDialogue
    span.setAttribute('aria-hidden', 'true')
    return span
  }
}

const DUAL_LABEL = Decoration.widget({ widget: new DualLabelWidget(), side: -1 })
const DUAL_LINE = Decoration.line({ class: 'fl-dual' })

class SectionEndWidget extends WidgetType {
  constructor(
    private readonly title: string,
    private readonly color: string
  ) {
    super()
  }
  eq(other: SectionEndWidget): boolean {
    return other.title === this.title && other.color === this.color
  }
  toDOM(): HTMLElement {
    const div = document.createElement('div')
    div.className = 'fl-section-end'
    div.style.setProperty('--section-color', this.color)
    div.style.setProperty('--section-text', cardTextColor(this.color))
    div.textContent = fr.script.endOfSection(this.title)
    return div
  }
}

/** Pas de correcteur sur les en-têtes et les personnages : lieux, noms propres, INT., EXT. */
const NO_SPELLCHECK: ReadonlySet<ElementType> = new Set(['scene_heading', 'character'])

/** Attributs d'une ligne selon son type (le correcteur orthographique s'y désactive ligne par ligne). */
export function lineAttributes(type: ElementType): Record<string, string> {
  return NO_SPELLCHECK.has(type) ? { spellcheck: 'false' } : {}
}

const LINE_CLASSES = new Map<ElementType, Decoration>()

/** Habillage d'une ligne d'après un type seul (ligne dont le type est retenu par l'éditeur). */
function lineClass(type: ElementType): Decoration {
  let decoration = LINE_CLASSES.get(type)
  if (!decoration) {
    decoration = Decoration.line({
      class: `fl-line fl-${type} fl-pending`,
      attributes: lineAttributes(type)
    })
    LINE_CLASSES.set(type, decoration)
  }
  return decoration
}

function markClass(bold: boolean, italic: boolean, underline: boolean): Decoration {
  const classes = [bold && 'fl-bold', italic && 'fl-italic', underline && 'fl-underline']
  return Decoration.mark({ class: classes.filter(Boolean).join(' ') })
}

/** Lignes (numéros à partir de 1) où se trouve le curseur ou la sélection. */
function cursorLines(state: EditorState): Set<number> {
  const lines = new Set<number>()
  for (const range of state.selection.ranges) {
    const first = state.doc.lineAt(range.from).number
    const last = state.doc.lineAt(range.to).number
    for (let n = first; n <= last; n++) lines.add(n)
  }
  return lines
}

/** Premier élément susceptible de toucher la position (les éléments sont rangés dans l'ordre du texte). */
function firstElementFrom(elements: FountainElement[], position: number): number {
  let low = 0
  let high = elements.length
  while (low < high) {
    const middle = (low + high) >> 1
    if ((elements[middle].position?.endOffset ?? 0) <= position) low = middle + 1
    else high = middle
  }
  return low
}

function decorateElement(
  state: EditorState,
  analysis: ScriptAnalysis,
  index: number,
  visible: { from: number; to: number },
  cursor: Set<number>,
  pending: Map<number, ElementType>,
  showContinued: boolean,
  out: Range<Decoration>[]
): void {
  const element = analysis.doc.elements[index]
  const position = element.position
  if (!position) return
  const sectionColor = analysis.sectionColors.get(index)
  const lineDecoration = Decoration.line({
    class: `fl-line fl-${element.type}${index === 0 ? ' fl-first' : ''}`,
    attributes: {
      ...lineAttributes(element.type),
      ...(sectionColor
        ? {
            style: `--section-color: ${sectionColor}; --section-text: ${cardTextColor(sectionColor)}`
          }
        : {})
    }
  })

  const dual = analysis.dualElements.get(index)
  const continued = showContinued && analysis.continued.has(index)
  for (let n = position.startLine; n <= position.endLine; n++) {
    const line = state.doc.line(n)
    if (line.to < visible.from || line.from > visible.to) continue
    const firstLine = n === position.startLine
    // Le type retenu par l'éditeur (ligne en cours d'écriture) l'emporte sur celui que lit Fountain.
    const wanted = pending.get(line.from)
    out.push((wanted ? lineClass(wanted) : lineDecoration).range(line.from))
    if (dual) out.push(DUAL_LINE.range(line.from))
    if (dual === 'first' && firstLine) out.push(DUAL_LABEL.range(line.from))
    if (continued && n === position.endLine) out.push(CONTINUED.range(line.to))
    if (firstLine && element.type === 'scene_heading') {
      const label = analysis.sceneNumbers.get(index)
      if (label)
        out.push(
          Decoration.widget({ widget: new SceneNumberWidget(label), side: -1 }).range(line.from)
        )
    }
    const onCursor = cursor.has(n)
    for (const marker of syntaxMarkers(element.type, element.forced, line.text, firstLine)) {
      if (marker.to > marker.from) {
        out.push((onCursor ? MARKER : HIDDEN).range(line.from + marker.from, line.from + marker.to))
      }
    }
    if (FORMATTED.has(element.type)) {
      const { styled, markers } = inlineLayout(line.text)
      for (const range of styled) {
        out.push(
          markClass(range.bold, range.italic, range.underline).range(
            line.from + range.from,
            line.from + range.to
          )
        )
      }
      // Comme les marqueurs de forçage : visibles (discrets) seulement sur la ligne du curseur, pour que
      // les lignes se coupent à l'écran comme à l'impression.
      for (const marker of markers) {
        out.push((onCursor ? MARKER : HIDDEN).range(line.from + marker.from, line.from + marker.to))
      }
    }
  }
  for (const note of element.notes) {
    if (!analysis.revisionMarkers.has(note.start)) out.push(NOTE.range(note.start, note.end))
  }
  decorateRevisionMarks(state, analysis, index, cursor, out)
  for (const boneyard of element.boneyards) out.push(BONEYARD.range(boneyard.start, boneyard.end))
}

const REVISION_MARKS = new Map<string, Decoration>()

/** Texte surligné d'une marque de révision (étape 13E). */
function revisionClass(mark: RevisionMark): Decoration {
  const key = `${mark.color}${mark.comment ? '+' : ''}`
  let decoration = REVISION_MARKS.get(key)
  if (!decoration) {
    decoration = Decoration.mark({
      class: `fl-rev fl-rev-${mark.color}${mark.comment ? ' fl-rev-commented' : ''}`
    })
    REVISION_MARKS.set(key, decoration)
  }
  return decoration
}

/**
 * Marques de révision : texte surligné ; les notes [[R:…]] et [[/R]] masquées comme les « ** »,
 * visibles (discrètes) seulement sur la ligne du curseur.
 */
function decorateRevisionMarks(
  state: EditorState,
  analysis: ScriptAnalysis,
  index: number,
  cursor: Set<number>,
  out: Range<Decoration>[]
): void {
  for (const mark of analysis.revisionMarks) {
    if (mark.element !== index) continue
    for (const marker of [mark.open, mark.close]) {
      const onCursor = cursor.has(state.doc.lineAt(marker.from).number)
      out.push((onCursor ? MARKER : HIDDEN).range(marker.from, marker.to))
    }
    if (mark.close.from > mark.open.to) {
      out.push(revisionClass(mark).range(mark.open.to, mark.close.from))
    }
  }
}

function buildViewportDecorations(view: EditorView): DecorationSet {
  const { state } = view
  const analysis = state.field(analysisField)
  const elements = analysis.doc.elements
  const cursor = cursorLines(state)
  const pending = new Map(state.field(pendingTypes).map((entry) => [entry.pos, entry.type]))
  const out: Range<Decoration>[] = []
  const showContinued = paginationSettings.get().continued
  for (const visible of view.visibleRanges) {
    for (let i = firstElementFrom(elements, visible.from); i < elements.length; i++) {
      const start = elements[i].position?.startOffset ?? 0
      if (start > visible.to) break
      decorateElement(state, analysis, i, visible, cursor, pending, showContinued, out)
    }
  }
  // Lignes encore vides dont le type est retenu : le curseur s'y place au bon retrait.
  for (const [pos, type] of pending) {
    const line = state.doc.lineAt(pos)
    if (analysis.lineTypes[line.number] === null) out.push(lineClass(type).range(line.from))
  }
  return Decoration.set(out, true)
}

/** Habillage des lignes visibles, refait à chaque frappe, défilement ou déplacement du curseur. */
export const elementDecorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = buildViewportDecorations(view)
    }
    update(update: ViewUpdate): void {
      const pendingChanged =
        update.startState.field(pendingTypes) !== update.state.field(pendingTypes)
      const settingsChanged = update.transactions.some((transaction) =>
        transaction.effects.some((effect) => effect.is(paginationSettingsChanged))
      )
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.selectionSet ||
        pendingChanged ||
        settingsChanged
      ) {
        this.decorations = buildViewportDecorations(update.view)
      }
    }
  },
  { decorations: (plugin) => plugin.decorations }
)

function buildSectionEnds(state: EditorState): DecorationSet {
  const analysis = state.field(analysisField)
  const elements = analysis.doc.elements
  const widgets = analysis.sectionEnds.map((end, order) => {
    const color = analysis.sectionColors.get(end.sectionIndex) ?? '#dcdcdc'
    const widget = new SectionEndWidget(end.title, color)
    const before = end.beforeElement === null ? undefined : elements[end.beforeElement].position
    // Avant la ligne de l'élément qui suit, ou tout à la fin du texte.
    return before
      ? Decoration.widget({ widget, block: true, side: -1000 + order }).range(
          state.doc.line(before.startLine).from
        )
      : Decoration.widget({ widget, block: true, side: 1 + order }).range(state.doc.length)
  })
  return Decoration.set(widgets, true)
}

/** Bandeaux « FIN DE … » : ajoutés à l'affichage seulement, jamais au fichier. */
export const sectionEndBanners = StateField.define<DecorationSet>({
  create: buildSectionEnds,
  update: (value, transaction) =>
    transaction.docChanged ? buildSectionEnds(transaction.state) : value,
  provide: (field) => EditorView.decorations.from(field)
})
