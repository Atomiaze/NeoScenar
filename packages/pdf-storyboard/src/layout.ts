// Mise en page complète : en-tête de chaque page, puis les blocs placés à la suite. Une page reçoit
// autant de blocs entiers qu'elle peut (3, 2 ou 1 ; 2 au plus pour un format vertical) ; un bloc plus haut qu'une page continue sur la
// page suivante, sous « S_0030 · P_0010 (suite) ».

import { buildBlock, continuationGroup, type Block, type Group } from './block.ts'
import { BLOCKS, CONTENT, CONTENT_WIDTH, HEADER, maxShotsPerPage } from './geometry.ts'
import { LABELS } from './labels.ts'
import type { LayoutInput, Measure, PageItem, PageLayout, StoryboardLayout } from './types.ts'
import { wrapText } from './wrap.ts'

/** Largeur réservée au numéro de page, calculée sur le plus long possible. */
const PAGE_NUMBER_SAMPLE = `${LABELS.pageNumber} 888 / 888`

export interface HeaderLayout {
  height: number
  frameWidth: number
  titleLines: string[]
}

export function headerLayout(title: string, measure: Measure): HeaderLayout {
  const frameWidth = CONTENT_WIDTH - HEADER.qrSize - HEADER.qrGap
  const reserved = measure(PAGE_NUMBER_SAMPLE, 'regular', HEADER.size) + 16
  const labelWidth = measure(LABELS.title, 'regular', HEADER.size) + 6
  const available = frameWidth - 2 * HEADER.paddingX - reserved - labelWidth
  const titleLines = wrapText(
    title,
    () => available,
    (part) => measure(part, 'bold', HEADER.size)
  )
  const lines = Math.max(1, titleLines.length)
  const height = Math.max(HEADER.minHeight, lines * HEADER.lineHeight + 20)
  return { height, frameWidth, titleLines }
}

/** Haut de la zone des blocs, sous l'en-tête. */
export function blocksTop(header: HeaderLayout): number {
  return HEADER.top + header.height + BLOCKS.gapAfterHeader
}

function headerItems(
  header: HeaderLayout,
  page: number,
  total: number,
  measure: Measure
): PageItem[] {
  const { size, lineHeight, paddingX } = HEADER
  const lines = Math.max(1, header.titleLines.length)
  const firstBaseline = HEADER.top + (header.height - lines * lineHeight) / 2 + lineHeight - 4
  const left = CONTENT.left + paddingX
  const titleX = left + measure(LABELS.title, 'regular', size) + 6
  const items: PageItem[] = [
    {
      type: 'frame',
      x: CONTENT.left,
      y: HEADER.top,
      width: header.frameWidth,
      height: header.height,
      thickness: HEADER.frameThickness
    },
    {
      type: 'text',
      text: LABELS.title,
      x: left,
      baseline: firstBaseline,
      size,
      face: 'regular',
      color: 'label'
    }
  ]
  header.titleLines.forEach((line, index) => {
    items.push({
      type: 'text',
      text: line,
      x: titleX,
      baseline: firstBaseline + index * lineHeight,
      size,
      face: 'bold',
      color: 'ink'
    })
  })
  const number = `${LABELS.pageNumber} ${page} / ${total}`
  items.push({
    type: 'text',
    text: number,
    x: CONTENT.left + header.frameWidth - paddingX - measure(number, 'regular', size),
    baseline: firstBaseline,
    size,
    face: 'regular',
    color: 'label'
  })
  return items
}

function shiftGroup(group: Group, dy: number): PageItem[] {
  return group.items.map((item) => {
    if (item.type === 'text') return { ...item, baseline: item.baseline + dy }
    if (item.type === 'rule') return { ...item, y: item.y + dy }
    return { ...item, y: item.y + dy }
  })
}

interface DraftPage {
  items: PageItem[]
  cells: PageLayout['cells']
  /** Bas du dernier bloc posé, ou null si la page est vide. */
  cursor: number | null
}

export function layoutStoryboard(input: LayoutInput, measure: Measure): StoryboardLayout {
  const header = headerLayout(input.title, measure)
  const top = blocksTop(header)
  const pageRoom = BLOCKS.bottom - top
  const pages: DraftPage[] = []
  const newPage = (): DraftPage => {
    const page: DraftPage = { items: [], cells: [], cursor: null }
    pages.push(page)
    return page
  }
  let page = newPage()

  const put = (group: Group, dy: number): void => {
    page.items.push(...shiftGroup(group, dy))
    if (group.cell) {
      const { rect } = group.cell
      page.cells.push({ ...group.cell, rect: { ...rect, y: rect.y + dy } })
    }
    page.cursor = group.bottom + dy
  }

  let previousScene: string | null = null
  for (const shot of input.shots) {
    const firstOfScene = shot.sceneId !== previousScene
    previousScene = shot.sceneId
    const block: Block = buildBlock(shot, firstOfScene, input.format, measure)

    if (firstOfScene && input.options.newPagePerScene && page.cursor !== null) page = newPage()
    if (page.cells.length >= maxShotsPerPage(input.format)) page = newPage()
    const start = page.cursor === null ? top : page.cursor + BLOCKS.gap
    if (start + block.height > BLOCKS.bottom && page.cursor !== null) page = newPage()
    let dy = page.cursor === null ? top : page.cursor + BLOCKS.gap

    // Un bloc plus haut qu'une page : ses lignes passent sur les pages suivantes, groupe par groupe.
    const oversized = block.height > pageRoom
    for (const group of block.groups) {
      if (oversized && group.bottom + dy > BLOCKS.bottom) {
        page = newPage()
        const continuation = continuationGroup(shot, top)
        put(continuation, 0)
        dy = continuation.bottom - group.top
      }
      put(group, dy)
    }
    page.cursor = block.height + dy
  }

  const total = pages.length
  return {
    pages: pages.map((draft, index) => ({
      number: index + 1,
      items: [...headerItems(header, index + 1, total, measure), ...draft.items],
      cells: draft.cells
    }))
  }
}
