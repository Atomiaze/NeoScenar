import { describe, expect, it } from 'vitest'
import {
  creditsOpenKey,
  MAX_CREDITS_OPEN_PROJECTS,
  openBlocksOf,
  parseCreditsOpen,
  toggleBlock,
  withProjectOpen
} from './openState'

describe("état d'ouverture du générique", () => {
  it('replie tout par défaut', () => {
    expect(openBlocksOf({}, 'p1')).toEqual([])
  })

  it("utilise l'identifiant, sinon le chemin", () => {
    expect(creditsOpenKey('abc', '/x/a.neoscenar')).toBe('abc')
    expect(creditsOpenKey(undefined, '/x/a.neoscenar')).toBe('/x/a.neoscenar')
    expect(creditsOpenKey('', '/x/a.neoscenar')).toBe('/x/a.neoscenar')
  })

  it('ouvre et ferme un bloc sans doublon', () => {
    const open = toggleBlock(toggleBlock([], 'a', true), 'a', true)
    expect(open).toEqual(['a'])
    expect(toggleBlock(open, 'a', false)).toEqual([])
  })

  it('garde les 50 projets les plus récents', () => {
    let state = {}
    for (let i = 0; i < MAX_CREDITS_OPEN_PROJECTS + 5; i++)
      state = withProjectOpen(state, `p${i}`, ['a'])
    state = withProjectOpen(state, 'p10', ['b'])
    const keys = Object.keys(state)
    expect(keys).toHaveLength(MAX_CREDITS_OPEN_PROJECTS)
    expect(keys.at(-1)).toBe('p10')
    expect(keys).not.toContain('p0')
  })

  it('ignore les données abîmées', () => {
    expect(parseCreditsOpen('x')).toEqual({})
    expect(parseCreditsOpen([1])).toEqual({})
    expect(parseCreditsOpen({ a: ['x'], b: 3, c: [1] })).toEqual({ a: ['x'] })
  })
})
