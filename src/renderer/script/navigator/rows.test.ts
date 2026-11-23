import { describe, expect, it } from 'vitest'
import { paginate, parse } from '@neoscenar/fountain'
import { scriptLayout } from '../layoutProfile'
import { buildNavigator, currentItem, flattenNavigator } from './buildNavigator'
import { dropTarget, highlightedPosition, visibleRows } from './rows'

const text = [
  '# ACTE 1', // ligne 1, rang 0
  '## Séquence', // ligne 3, rang 1
  'INT. A - JOUR', // ligne 5, rang 2
  '# ACTE 2', // ligne 7, rang 3
  'INT. B - JOUR', // ligne 9, rang 4
  '# ACTE 2', // ligne 11, rang 5 (même titre)
  'INT. C - JOUR' // ligne 13, rang 6
].join('\n\n')
const doc = parse(text, { titlePage: false })
const items = buildNavigator(doc, paginate(doc, scriptLayout)).items

describe('lignes du navigateur', () => {
  it('toutes visibles sans acte replié, avec leur profondeur', () => {
    expect(visibleRows(items, new Set()).map((row) => [row.position, row.depth])).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 0],
      [4, 1],
      [5, 0],
      [6, 1]
    ])
  })

  it('distingue deux actes de même titre', () => {
    const keys = visibleRows(items, new Set())
      .filter((row) => row.key !== '')
      .map((row) => row.key)
    expect(keys).toEqual(['1|ACTE 1|0', '2|Séquence|0', '1|ACTE 2|0', '1|ACTE 2|1'])
  })

  it('un acte replié cache ses sous-sections et ses scènes', () => {
    const rows = visibleRows(items, new Set(['1|ACTE 1|0']))
    expect(rows.map((row) => row.position)).toEqual([0, 3, 4, 5, 6])
    expect(rows[0].collapsed).toBe(true)
  })

  it('la scène courante dans un acte replié : l’acte est mis en évidence', () => {
    const current = flattenNavigator(items).indexOf(currentItem(items, 5)!)
    expect(current).toBe(2)
    expect(highlightedPosition(items, new Set(), current)).toBe(2)
    expect(highlightedPosition(items, new Set(['2|Séquence|0']), current)).toBe(1)
    // Le plus haut des actes repliés qui la cachent.
    expect(highlightedPosition(items, new Set(['1|ACTE 1|0', '2|Séquence|0']), current)).toBe(0)
    expect(highlightedPosition(items, new Set(), null)).toBeNull()
  })
})

describe('déplacer une scène dans le navigateur (18C-12)', () => {
  const rows = visibleRows(items, new Set())
  const from = (line: string): number => text.indexOf(line)

  it('dépôt : début de la ligne du dessous, fin du texte, ou rien si la scène ne bouge pas', () => {
    // INT. B est la ligne 4.
    expect(dropTarget(rows, 4, 4)).toBeUndefined()
    expect(dropTarget(rows, 4, 5)).toBeUndefined()
    expect(dropTarget(rows, 4, 3)).toBe(from('# ACTE 2'))
    expect(dropTarget(rows, 4, 2)).toBe(from('INT. A'))
    expect(dropTarget(rows, 4, 7)).toBeNull()
    expect(dropTarget(rows, 4, 8)).toBeUndefined()
  })

  it('sous un acte replié : avant la ligne qui le suit (fin de cet acte)', () => {
    const folded = visibleRows(items, new Set(['1|ACTE 2|0']))
    // Lignes : ACTE 1, Séquence, A, ACTE 2 (replié), ACTE 2, C.
    expect(folded.map((row) => row.position)).toEqual([0, 1, 2, 3, 5, 6])
    expect(dropTarget(folded, 2, 4)).toBe(text.lastIndexOf('# ACTE 2'))
  })
})
