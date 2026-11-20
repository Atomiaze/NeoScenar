// Découpage en pages d'un scénario mis en lignes, partagé par l'éditeur et l'export PDF.
// Règles (version simple) :
// - les lignes vides qui tomberaient en haut d'une page sont supprimées ;
// - un en-tête de scène n'est jamais seul en bas de page : il passe à la page suivante
//   s'il ne tient pas avec ses lignes vides et la première ligne qui le suit ;
// - un bloc de dialogue (personnage, didascalies, répliques) n'est pas coupé : il passe entier
//   à la page suivante, sauf s'il est plus long qu'une page entière ;
// - les autres éléments (action…) peuvent être coupés entre deux lignes, mais jamais en laissant
//   une ligne isolée : au moins 2 lignes en bas de page et 2 en haut de la suivante ;
// - deux dialogues simultanés forment un seul groupe insécable, haut comme la plus longue colonne ;
// - avec l'option, chaque acte commence une nouvelle page (comme un saut ===).

import { layoutElements, type ElementLayout, type PaginationOptions } from './layout.ts'
import type { ResolvedLayout } from './profile.ts'
import type { FountainDocument } from './types.ts'

/** Morceau d'un élément posé sur une page. */
export interface PageFragment {
  elementIndex: number
  /** Index, dans layout.lines, de la première ligne posée sur cette page. */
  firstLine: number
  lineCount: number
  /** Lignes vides réellement placées avant ce morceau (0 en haut de page). */
  spaceBefore: number
  /** Rang, sur la page (à partir de 0), de la première ligne du morceau. */
  row: number
}

export interface Page {
  /** Numéro de page (1 pour la première page du scénario, page de titre non comptée). */
  number: number
  fragments: PageFragment[]
  /** Lignes occupées, lignes vides comprises. */
  usedLines: number
  /** Page ouverte par un acte (option) : position de l'acte dans le texte source. */
  breakOffset?: number
}

export interface Pagination {
  linesPerPage: number
  layouts: ElementLayout[]
  pages: Page[]
  /** Pour chaque élément : numéro de la page où il commence (un élément non imprimé prend celle du suivant). */
  elementPages: number[]
}

/** Début d'une page à partir de la deuxième : là où l'éditeur dessine la limite de page. */
export interface PageStart {
  pageNumber: number
  elementIndex: number
  /** Index de la ligne dans layout.lines. */
  line: number
  /** Ligne du texte source et rang dans sa coupure (voir LaidOutLine). */
  sourceLine?: number
  wrapIndex: number
  /** Position dans le texte source du premier caractère de la page (voir LaidOutLine). */
  sourceOffset?: number
}

interface Unit {
  /** Index dans layouts des éléments imprimés du groupe. */
  members: number[]
  height: number
  splittable: boolean
  keepWithNext: boolean
  pageBreak: boolean
  /** Dialogue simultané : rang dans `members` du premier élément de la colonne de droite. */
  rightFrom?: number
  /** Hauteur de chaque colonne d'un dialogue simultané. */
  columnHeights?: { left: number; right: number }
  /** Position de l'acte qui ouvre une page (option). */
  breakOffset?: number
}

export function paginate(
  doc: FountainDocument,
  layout: ResolvedLayout,
  options: PaginationOptions = {}
): Pagination {
  const layouts = layoutElements(doc, layout, options)
  return paginateLayouts(layouts, layout.linesPerPage)
}

export function paginateLayouts(layouts: ElementLayout[], linesPerPage: number): Pagination {
  const units = buildUnits(layouts)
  const pages: Page[] = [{ number: 1, fragments: [], usedLines: 0 }]
  let page = pages[0]
  const newPage = (): void => {
    page = { number: pages.length + 1, fragments: [], usedLines: 0 }
    pages.push(page)
  }

  units.forEach((unit, unitIndex) => {
    if (unit.pageBreak) {
      if (page.usedLines > 0) newPage()
      if (unit.breakOffset !== undefined) page.breakOffset = unit.breakOffset
      return
    }
    const space = page.usedLines === 0 ? 0 : layouts[unit.members[0]].spaceBefore
    const needed = space + minimumHeight(units, unitIndex, layouts)
    if (page.usedLines > 0 && needed > linesPerPage - page.usedLines) newPage()

    // Dialogue simultané (tient toujours sur la page) : la colonne de droite repart du haut du groupe.
    let groupTop = 0
    let leftBottom = 0
    unit.members.forEach((member, rank) => {
      if (rank === 0 && unit.rightFrom !== undefined)
        groupTop = page.usedLines + (page.usedLines === 0 ? 0 : layouts[member].spaceBefore)
      if (rank === unit.rightFrom) {
        leftBottom = page.usedLines
        page.usedLines = groupTop
      }
      const element = layouts[member]
      let spaceBefore = element.spaceBefore
      let line = 0
      while (line < element.lines.length) {
        if (page.usedLines === 0) spaceBefore = 0
        if (spaceBefore + 1 > linesPerPage - page.usedLines) {
          newPage()
          spaceBefore = 0
        }
        const count = linesToPlace(
          element.lines.length - line,
          linesPerPage - page.usedLines - spaceBefore,
          page.usedLines === 0
        )
        if (count === 0) {
          newPage()
          continue
        }
        page.fragments.push({
          elementIndex: element.elementIndex,
          firstLine: line,
          lineCount: count,
          spaceBefore,
          row: page.usedLines + spaceBefore
        })
        page.usedLines += spaceBefore + count
        line += count
        spaceBefore = 0
      }
    })
    if (unit.rightFrom !== undefined) page.usedLines = Math.max(page.usedLines, leftBottom)
  })

  if (pages.length > 1 && pages[pages.length - 1].fragments.length === 0) pages.pop()
  return { linesPerPage, layouts, pages, elementPages: elementPages(layouts, pages) }
}

/**
 * Débuts des pages 2, 3… (la première page n'a ni trait ni numéro). Une page ouverte par un acte
 * (option) commence à la ligne de l'acte, pour que le trait passe au-dessus de son bandeau.
 */
export function pageStarts(pagination: Pagination): PageStart[] {
  return pagination.pages.slice(1).flatMap((page) => {
    const first = page.fragments[0]
    if (!first) return []
    const line = pagination.layouts[first.elementIndex].lines[first.firstLine]
    return [
      {
        pageNumber: page.number,
        elementIndex: first.elementIndex,
        line: first.firstLine,
        sourceLine: line.sourceLine,
        wrapIndex: line.wrapIndex,
        sourceOffset: page.breakOffset ?? line.sourceOffset
      }
    ]
  })
}

/** Lignes minimales de chaque côté d'une coupure de page à l'intérieur d'un élément. */
const MIN_LINES_AT_BREAK = 2

/**
 * Nombre de lignes d'un élément à poser sur la page (0 : tout passer à la page suivante).
 * Une coupure laisse au moins 2 lignes de chaque côté ; seul un élément plus long qu'une page vide
 * est coupé quoi qu'il arrive.
 */
function linesToPlace(remaining: number, available: number, pageEmpty: boolean): number {
  if (remaining <= available) return remaining
  const count = Math.min(available, remaining - MIN_LINES_AT_BREAK)
  if (count >= MIN_LINES_AT_BREAK) return count
  return pageEmpty ? available : 0
}

/** Regroupe les éléments imprimés : un bloc de dialogue forme un seul groupe, insécable. */
function buildUnits(layouts: ElementLayout[]): Unit[] {
  const units: Unit[] = []
  layouts.forEach((element, index) => {
    if (element.type === 'page_break' || element.newPage) {
      units.push({
        members: [],
        height: 0,
        splittable: false,
        keepWithNext: false,
        pageBreak: true,
        ...(element.newPage ? { breakOffset: element.sourceOffset } : {})
      })
      return
    }
    if (element.lines.length === 0) return
    const previous = units[units.length - 1]
    const last = previous?.members[previous.members.length - 1]
    const joinsBlock =
      element.dialogueBlock !== null &&
      element.type !== 'character' &&
      previous !== undefined &&
      !previous.pageBreak &&
      layouts[last].dialogueBlock === element.dialogueBlock
    const opensRight =
      element.dual === 'right' &&
      element.type === 'character' &&
      previous !== undefined &&
      !previous.pageBreak &&
      previous.rightFrom === undefined &&
      layouts[previous.members[0]].dual === 'left'
    if (opensRight) {
      previous.rightFrom = previous.members.length
      previous.columnHeights = { left: previous.height, right: 0 }
    }
    if (joinsBlock || opensRight) {
      previous.members.push(index)
      if (previous.columnHeights) {
        if (previous.rightFrom === undefined) previous.columnHeights.left += element.lines.length
        else previous.columnHeights.right += element.spaceBefore + element.lines.length
        previous.height = Math.max(previous.columnHeights.left, previous.columnHeights.right)
      } else previous.height += element.spaceBefore + element.lines.length
      return
    }
    units.push({
      members: [index],
      height: element.lines.length,
      splittable: element.type !== 'character',
      keepWithNext: element.type === 'scene_heading',
      pageBreak: false
    })
  })
  return units
}

/**
 * Hauteur minimale à trouver en bas de page pour commencer ce groupe : tout le bloc s'il est insécable
 * ou trop court pour être coupé, sinon ses 2 premières lignes ; un en-tête y ajoute ce dont a besoin l'élément qui le suit.
 */
function minimumHeight(units: Unit[], index: number, layouts: ElementLayout[]): number {
  const unit = units[index]
  const own =
    unit.splittable && unit.height >= 2 * MIN_LINES_AT_BREAK ? MIN_LINES_AT_BREAK : unit.height
  const next = units[index + 1]
  if (!unit.keepWithNext || next === undefined || next.pageBreak) return own
  return (
    unit.height + layouts[next.members[0]].spaceBefore + minimumHeight(units, index + 1, layouts)
  )
}

function elementPages(layouts: ElementLayout[], pages: Page[]): number[] {
  const result: number[] = new Array<number>(layouts.length).fill(0)
  for (const page of pages)
    for (const fragment of page.fragments)
      if (result[fragment.elementIndex] === 0) result[fragment.elementIndex] = page.number
  let following = pages[pages.length - 1].number
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i] === 0) result[i] = following
    else following = result[i]
  }
  return result
}
