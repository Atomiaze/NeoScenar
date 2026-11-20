// Pagination du scénario dans l'éditeur : calculée une seule fois, de façon regroupée pendant la frappe,
// et partagée par les traits de page, l'indicateur « Page x / y » et le navigateur de scènes.

import { StateEffect, StateField, type EditorState } from '@codemirror/state'
import { ViewPlugin, type EditorView, type ViewUpdate } from '@codemirror/view'
import { pageStarts, paginate, type FountainDocument, type Pagination } from '@neoscenar/fountain'
import { scriptLayout } from '../layoutProfile'
import { analysisField } from './analysis'
import { paginationSettings } from './paginationSettings'

export interface PageLayout {
  /** Texte analysé et pagination au moment du calcul. */
  doc: FountainDocument
  pagination: Pagination
  /**
   * Début des pages 2, 3… : position dans le texte actuel du premier caractère de la page. Entre deux
   * calculs, ces positions suivent les modifications du texte (les traits ne sautent pas).
   */
  starts: number[]
}

export const setPageLayout = StateEffect.define<PageLayout>()

/** Les règles de pagination ont changé (Réglages, fenêtre PDF) : l'habillage est refait. */
export const paginationSettingsChanged = StateEffect.define<null>()

export const pageLayoutField = StateField.define<PageLayout | null>({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) if (effect.is(setPageLayout)) return effect.value
    if (value && tr.docChanged) {
      return { ...value, starts: value.starts.map((pos) => tr.changes.mapPos(pos, 1)) }
    }
    return value
  }
})

export function computePageLayout(state: EditorState): PageLayout {
  const doc = state.field(analysisField).doc
  const pagination = paginate(doc, scriptLayout, paginationSettings.get())
  const starts = pageStarts(pagination).flatMap((start) =>
    start.sourceOffset === undefined ? [] : [start.sourceOffset]
  )
  return { doc, pagination, starts }
}

/** Page (à partir de 1) qui contient la position : une page commence à son premier caractère. */
export function pageAt(starts: readonly number[], pos: number): number {
  let page = 1
  for (const start of starts) {
    if (start > pos) break
    page++
  }
  return page
}

/** Délai de regroupement : la pagination suit la frappe sans la ralentir. */
const DELAY_MS = 250

class PageLayoutUpdater {
  private timer: ReturnType<typeof setTimeout> | null = null
  private readonly unsubscribe: () => void

  constructor(private readonly view: EditorView) {
    this.schedule(0)
    this.unsubscribe = paginationSettings.subscribe(() => {
      this.view.dispatch({ effects: paginationSettingsChanged.of(null) })
      this.schedule(0)
    })
  }

  update(update: ViewUpdate): void {
    if (update.docChanged) this.schedule(DELAY_MS)
  }

  /** Calcule tout de suite ce qui est en attente (avant d'aller à une scène, par exemple). */
  flush(): void {
    if (this.timer === null) return
    this.run()
  }

  destroy(): void {
    this.unsubscribe()
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  private schedule(delay: number): void {
    this.timer ??= setTimeout(() => this.run(), delay)
  }

  private run(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this.view.dispatch({ effects: setPageLayout.of(computePageLayout(this.view.state)) })
  }
}

export const pageLayoutUpdater = ViewPlugin.fromClass(PageLayoutUpdater)

/** Termine le calcul en attente, pour lire une pagination à jour. */
export function flushPageLayout(view: EditorView): void {
  view.plugin(pageLayoutUpdater)?.flush()
}
