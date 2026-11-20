import { describe, expect, it } from 'vitest'
import {
  SCRIPT_CSS_VARIABLES,
  SCRIPT_ELEMENTS,
  defaultScriptColors,
  hasScriptColors,
  lowContrast,
  parseScriptColors,
  resolveScriptColors,
  scriptContrast,
  scriptCssVariables,
  withScriptColor,
  withoutScriptColors
} from './scriptColors'
import { PALETTE_IDS, PALETTES } from './themes'

describe('couleurs du scénario : valeurs d’origine', () => {
  it.each(PALETTE_IDS)('%s : toutes les couleurs sont des « #rrggbb » (sauf les actes)', (id) => {
    const defaults = defaultScriptColors(PALETTES[id].colors)
    for (const element of SCRIPT_ELEMENTS) {
      const value = defaults[element]
      if (element === 'actBackground' || element === 'actText') expect(value).toBeNull()
      else expect(value, element).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it.each(PALETTE_IDS)('%s : aucun avertissement de contraste sur les valeurs d’origine', (id) => {
    const palette = PALETTES[id]
    const resolved = resolveScriptColors(id, {})
    for (const element of SCRIPT_ELEMENTS) {
      expect(lowContrast(element, resolved, palette.colors), element).toBe(false)
    }
  })

  it('chaque élément a sa variable CSS, toutes différentes', () => {
    const names = SCRIPT_ELEMENTS.map((element) => SCRIPT_CSS_VARIABLES[element])
    expect(new Set(names).size).toBe(SCRIPT_ELEMENTS.length)
  })
})

describe('couleurs du scénario : réglages par thème', () => {
  it('changer une couleur dans Matrix ne change rien dans Cobalt', () => {
    const all = withScriptColor({}, 'matrix', 'note', '#ff00ff')
    expect(resolveScriptColors('matrix', all).note).toBe('#ff00ff')
    expect(resolveScriptColors('cobalt', all)).toEqual(resolveScriptColors('cobalt', {}))
  })

  it('« Par défaut » clair et sombre sont séparés', () => {
    const all = withScriptColor({}, 'defaut-sombre', 'character', '#abcdef')
    expect(resolveScriptColors('defaut-clair', all).character).toBe(
      defaultScriptColors(PALETTES['defaut-clair'].colors).character
    )
  })

  it('seules les différences sont gardées', () => {
    const original = defaultScriptColors(PALETTES.matrix.colors).note as string
    expect(withScriptColor({}, 'matrix', 'note', original.toUpperCase())).toEqual({})
    const changed = withScriptColor({}, 'matrix', 'note', '#ff00ff')
    expect(changed).toEqual({ matrix: { note: '#ff00ff' } })
    // Revenir à la valeur d'origine efface le réglage, et le jeu vide disparaît.
    expect(withScriptColor(changed, 'matrix', 'note', original)).toEqual({})
    expect(withScriptColor(changed, 'matrix', 'note', null)).toEqual({})
  })

  it('« Couleurs d’origine du thème » n’efface que ce thème', () => {
    let all = withScriptColor({}, 'matrix', 'note', '#ff00ff')
    all = withScriptColor(all, 'cobalt', 'note', '#00ffff')
    const reset = withoutScriptColors(all, 'matrix')
    expect(hasScriptColors(reset, 'matrix')).toBe(false)
    expect(reset.cobalt).toEqual({ note: '#00ffff' })
    expect(resolveScriptColors('matrix', reset)).toEqual(resolveScriptColors('matrix', {}))
  })

  it('une couleur mal écrite n’est pas enregistrée', () => {
    expect(withScriptColor({}, 'matrix', 'note', 'rouge')).toEqual({})
  })
})

describe('couleurs du scénario : lecture des préférences', () => {
  it('ignore les thèmes, éléments et couleurs inconnus', () => {
    expect(
      parseScriptColors({
        matrix: { note: '#FF00FF', inconnu: '#000000', dialogue: 'rouge', character: 12 },
        pirate: { note: '#000000' },
        cobalt: 'oups'
      })
    ).toEqual({ matrix: { note: '#ff00ff' } })
    expect(parseScriptColors(null)).toEqual({})
    expect(parseScriptColors('x')).toEqual({})
  })
})

describe('couleurs du scénario : bandeaux d’actes et variables CSS', () => {
  it('sans réglage, aucune variable d’acte : la palette des cartes reste en place', () => {
    const variables = scriptCssVariables(resolveScriptColors('matrix', {}))
    expect(variables[SCRIPT_CSS_VARIABLES.actBackground]).toBeUndefined()
    expect(variables[SCRIPT_CSS_VARIABLES.actText]).toBeUndefined()
    expect(variables[SCRIPT_CSS_VARIABLES.note]).toBeDefined()
  })

  it('un fond choisi sans texte reçoit le texte le plus lisible', () => {
    const resolved = resolveScriptColors('matrix', { matrix: { actBackground: '#101010' } })
    expect(scriptCssVariables(resolved)[SCRIPT_CSS_VARIABLES.actText]).toBe('#ffffff')
    expect(lowContrast('actBackground', resolved, PALETTES.matrix.colors)).toBe(false)
  })

  it('un texte d’acte trop proche du fond est signalé', () => {
    const resolved = resolveScriptColors('matrix', {
      matrix: { actBackground: '#202020', actText: '#252525' }
    })
    expect(lowContrast('actText', resolved, PALETTES.matrix.colors)).toBe(true)
  })
})

describe('couleurs du scénario : contraste', () => {
  const colors = PALETTES['defaut-clair'].colors

  it('une couleur claire sur la page blanche est signalée', () => {
    const resolved = resolveScriptColors('defaut-clair', {
      'defaut-clair': { dialogue: '#dddddd' }
    })
    expect(lowContrast('dialogue', resolved, colors)).toBe(true)
  })

  it('la sélection et la ligne du curseur se mesurent avec le texte de la page', () => {
    const resolved = resolveScriptColors('defaut-clair', {
      'defaut-clair': { selection: '#222222', activeLine: '#fafafa' }
    })
    expect(scriptContrast('selection', resolved, colors)).toBeLessThan(4.5)
    expect(lowContrast('selection', resolved, colors)).toBe(true)
    expect(lowContrast('activeLine', resolved, colors)).toBe(false)
  })
})
