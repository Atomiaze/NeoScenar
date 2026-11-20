import type { NavigatorItem } from './buildNavigator'

export interface NavigatorRow {
  item: NavigatorItem
  /** Profondeur d'imbrication (0 : premier niveau). */
  depth: number
  /** Rang de l'élément dans l'ordre du texte (voir flattenNavigator). */
  position: number
  /** Clé d'un acte qui survit aux modifications du texte : niveau, titre et rang parmi les homonymes. */
  key: string
  collapsed: boolean
}

interface Walk {
  rows: NavigatorRow[]
  /** Toutes les lignes, y compris celles des actes repliés, avec l'acte replié le plus haut qui les cache. */
  hiddenBy: Map<number, number>
}

function walk(items: readonly NavigatorItem[], collapsed: ReadonlySet<string>): Walk {
  const rows: NavigatorRow[] = []
  const hiddenBy = new Map<number, number>()
  const ranks = new Map<string, number>()
  let position = 0
  const visit = (list: readonly NavigatorItem[], depth: number, hider: number | null): void => {
    for (const item of list) {
      const here = position++
      let key = ''
      if (item.kind === 'section') {
        const base = `${item.level}|${item.title}`
        const rank = ranks.get(base) ?? 0
        ranks.set(base, rank + 1)
        key = `${base}|${rank}`
      }
      const isCollapsed = key !== '' && collapsed.has(key)
      if (hider === null) rows.push({ item, depth, position: here, key, collapsed: isCollapsed })
      else hiddenBy.set(here, hider)
      if (item.kind === 'section') {
        visit(item.children, depth + 1, hider ?? (isCollapsed ? here : null))
      }
    }
  }
  visit(items, 0, null)
  return { rows, hiddenBy }
}

/** Lignes affichées : les scènes et sous-sections d'un acte replié sont cachées. */
export function visibleRows(
  items: readonly NavigatorItem[],
  collapsed: ReadonlySet<string>
): NavigatorRow[] {
  return walk(items, collapsed).rows
}

/**
 * Ligne mise en évidence : celle de l'élément courant, ou l'acte replié le plus haut qui le cache.
 * `current` est le rang de l'élément courant (ou null).
 */
export function highlightedPosition(
  items: readonly NavigatorItem[],
  collapsed: ReadonlySet<string>,
  current: number | null
): number | null {
  if (current === null) return null
  return walk(items, collapsed).hiddenBy.get(current) ?? current
}
