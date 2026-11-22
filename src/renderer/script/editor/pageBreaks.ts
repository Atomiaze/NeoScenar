// Limites de pages dans l'éditeur : un trait pointillé à la ligne d'affichage où commence chaque page
// (à partir de la page 2), et le numéro de page dans la marge droite. Dessinés dans un calque, comme la
// sélection : ils n'ajoutent aucune ligne et ne décalent jamais le texte.

import { EditorSelection } from '@codemirror/state'
import { layer, type EditorView, type LayerMarker } from '@codemirror/view'
import { pageLayoutField } from './pageLayout'

class PageBreakMarker implements LayerMarker {
  constructor(
    private readonly left: number,
    private readonly top: number,
    private readonly width: number,
    private readonly page: number,
    /** « darken » ou « lighten » quand le trait doit passer derrière les lettres ; sinon vide. */
    private readonly blend: string
  ) {}

  eq(other: PageBreakMarker): boolean {
    return (
      other.left === this.left &&
      other.top === this.top &&
      other.width === this.width &&
      other.page === this.page &&
      other.blend === this.blend
    )
  }

  draw(): HTMLElement {
    const element = document.createElement('div')
    element.className = 'fl-page-break'
    const number = document.createElement('span')
    number.className = 'fl-page-number'
    element.append(number)
    this.update(element)
    return element
  }

  update(element: HTMLElement): boolean {
    element.style.left = `${this.left}px`
    element.style.top = `${this.top}px`
    element.style.width = `${this.width}px`
    // Fusion avec le texte : le trait ne se voit que sur le fond de la page, jamais sur une lettre.
    element.style.mixBlendMode = this.blend
    const number = element.firstElementChild as HTMLElement
    number.textContent = `${this.page}.`
    return true
  }
}

let measureContext: CanvasRenderingContext2D | null = null

/** Encre réelle d'un texte (haut et bas des glyphes accents compris), mesurée sur la police affichée. */
function measureInk(font: string, text: string) {
  measureContext ??= document.createElement('canvas').getContext('2d')
  if (!measureContext) return null
  measureContext.font = font
  const m = measureContext.measureText(text)
  return {
    ascent: text === '' ? 0 : m.actualBoundingBoxAscent,
    descent: text === '' ? 0 : m.actualBoundingBoxDescent,
    fontAscent: m.fontBoundingBoxAscent,
    fontDescent: m.fontBoundingBoxDescent
  }
}

interface BreakPosition {
  top: number
  /** Pas la place de passer entre les lettres : le trait doit passer derrière elles. */
  behind: boolean
}

/**
 * Ordonnée écran du trait de la page qui commence à `pos`. Point de départ : la limite haute de la
 * ligne d'affichage, calculée depuis la boîte de la ligne (hauteur fixe, interligne 1), pas depuis le
 * rectangle du texte, qui grandit avec les glyphes. Si un accent (É, À) dépasse de cette boîte, le
 * trait se place au milieu de l'espace libre entre le bas des lettres de la ligne précédente
 * (descentes comprises) et le haut de l'accent ; sans espace libre, il passe derrière le texte.
 */
function breakPosition(view: EditorView, pos: number): BreakPosition | null {
  const block = view.lineBlockAt(pos)
  const node = view.domAtPos(block.from).node
  const element = node instanceof Element ? node : node.parentElement
  const lineDom = element?.closest('.cm-line')
  const here = view.coordsAtPos(pos, 1)
  if (!lineDom || !here) return here ? { top: here.top, behind: false } : null
  const style = getComputedStyle(lineDom)
  const rowHeight = parseFloat(style.lineHeight) || view.defaultLineHeight
  // Rang de la ligne d'affichage dans la ligne du texte (0 si la ligne n'est pas coupée avant).
  const first = view.coordsAtPos(block.from, 1)
  const rank = first ? Math.max(0, Math.round((here.top - first.top) / rowHeight)) : 0
  const rowTop =
    lineDom.getBoundingClientRect().top + (parseFloat(style.paddingTop) || 0) + rank * rowHeight
  const boxTop = { top: rowTop, behind: false }

  const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  const doc = view.state.doc
  const rowEnd = view.moveToLineBoundary(EditorSelection.cursor(pos, 1), true).head
  const current = measureInk(font, doc.sliceString(pos, rowEnd))
  if (!current || pos === 0) return boxTop
  // Ligne de base : le contenu de la police est centré dans la boîte de la ligne.
  const baseline =
    rowTop + (rowHeight - current.fontAscent - current.fontDescent) / 2 + current.fontAscent
  const inkTop = baseline - current.ascent
  if (inkTop >= rowTop) return boxTop // Rien ne dépasse : le trait reste entre les deux boîtes.

  const previousStart = view.moveToLineBoundary(EditorSelection.cursor(pos - 1, -1), false).head
  const previous = measureInk(font, doc.sliceString(previousStart, pos).replace(/\n$/, ''))
  const previousBottom = baseline - rowHeight + (previous?.descent ?? 0)
  const free = inkTop - previousBottom
  return { top: (inkTop + previousBottom) / 2, behind: free < 1 }
}

/** « darken » si le texte est plus sombre que la page, « lighten » sinon. */
function blendFor(view: EditorView): string {
  const style = getComputedStyle(view.contentDOM)
  const luminance = (color: string): number => {
    const [r = 0, g = 0, b = 0] = (color.match(/[\d.]+/g) ?? []).map(Number)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  return luminance(style.color) < luminance(style.backgroundColor) ? 'darken' : 'lighten'
}

function markers(view: EditorView): PageBreakMarker[] {
  const layout = view.state.field(pageLayoutField)
  if (!layout || layout.starts.length === 0) return []
  // Repère du calque : le coin du défilement, comme pour la sélection.
  const scroller = view.scrollDOM.getBoundingClientRect()
  const baseLeft = scroller.left - view.scrollDOM.scrollLeft
  const baseTop = scroller.top - view.scrollDOM.scrollTop
  // Le trait couvre toute la largeur de la page (marges comprises).
  const page = view.contentDOM.getBoundingClientRect()
  const { from, to } = view.viewport
  const result: PageBreakMarker[] = []
  layout.starts.forEach((pos, index) => {
    if (pos < from || pos > to || pos > view.state.doc.length) return
    const position = breakPosition(view, pos)
    if (position === null) return
    const blend = position.behind ? blendFor(view) : ''
    result.push(
      new PageBreakMarker(
        page.left - baseLeft,
        position.top - baseTop,
        page.width,
        index + 2,
        blend
      )
    )
  })
  return result
}

export const pageBreakLayer = layer({
  // Au-dessus du texte : la page a un fond opaque. Le trait passe à la limite haute de la ligne.
  above: true,
  class: 'fl-page-breaks',
  markers,
  update: (update) =>
    update.docChanged ||
    update.viewportChanged ||
    update.geometryChanged ||
    update.startState.field(pageLayoutField) !== update.state.field(pageLayoutField)
})
