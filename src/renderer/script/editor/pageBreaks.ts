// Limites de pages dans l'éditeur : un trait pointillé à la ligne d'affichage où commence chaque page
// (à partir de la page 2), et le numéro de page dans la marge droite. Dessinés dans un calque, comme la
// sélection : ils n'ajoutent aucune ligne et ne décalent jamais le texte.

import { layer, type EditorView, type LayerMarker } from '@codemirror/view'
import { pageLayoutField } from './pageLayout'

class PageBreakMarker implements LayerMarker {
  constructor(
    private readonly left: number,
    private readonly top: number,
    private readonly width: number,
    private readonly page: number
  ) {}

  eq(other: PageBreakMarker): boolean {
    return (
      other.left === this.left &&
      other.top === this.top &&
      other.width === this.width &&
      other.page === this.page
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
    const number = element.firstElementChild as HTMLElement
    number.textContent = `${this.page}.`
    return true
  }
}

/**
 * Ordonnée écran de la limite haute de la ligne d'affichage qui commence à `pos`. Calculée depuis la
 * boîte de la ligne (hauteur fixe, interligne 1), pas depuis le rectangle du texte : celui-ci grandit
 * avec les glyphes (majuscules accentuées…) et ferait monter le trait.
 */
function rowTop(view: EditorView, pos: number): number | null {
  const block = view.lineBlockAt(pos)
  const node = view.domAtPos(block.from).node
  const element = node instanceof Element ? node : node.parentElement
  const lineDom = element?.closest('.cm-line')
  const here = view.coordsAtPos(pos, 1)
  if (!lineDom || !here) return here?.top ?? null
  const style = getComputedStyle(lineDom)
  const rowHeight = parseFloat(style.lineHeight) || view.defaultLineHeight
  // Rang de la ligne d'affichage dans la ligne du texte (0 si la ligne n'est pas coupée avant).
  const first = view.coordsAtPos(block.from, 1)
  const rank = first ? Math.max(0, Math.round((here.top - first.top) / rowHeight)) : 0
  return (
    lineDom.getBoundingClientRect().top + (parseFloat(style.paddingTop) || 0) + rank * rowHeight
  )
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
    const top = rowTop(view, pos)
    if (top === null) return
    result.push(new PageBreakMarker(page.left - baseLeft, top - baseTop, page.width, index + 2))
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
