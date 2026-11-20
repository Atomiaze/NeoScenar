import { describe, expect, it } from 'vitest'
import { blend, contrastOf, contrastRatio, parseColor } from './contrast'
import {
  CSS_VARIABLES,
  PALETTE_IDS,
  PALETTES,
  THEMES,
  cssVariables,
  paletteId,
  parseTheme,
  themeSource,
  type ThemeColors
} from './themes'

describe('préférence de thème', () => {
  it('« Par défaut » si la valeur est absente ou abîmée', () => {
    expect(parseTheme(undefined)).toBe('defaut')
    expect(parseTheme('violet')).toBe('defaut')
    expect(parseTheme(3)).toBe('defaut')
  })

  it('migre les anciens réglages Automatique, Clair et Sombre vers « Par défaut »', () => {
    expect(parseTheme('system')).toBe('defaut')
    expect(parseTheme('light')).toBe('defaut')
    expect(parseTheme('dark')).toBe('defaut')
  })

  it('garde les sept thèmes', () => {
    for (const theme of THEMES) expect(parseTheme(theme)).toBe(theme)
    expect(THEMES).toHaveLength(7)
  })

  it('« Par défaut » suit le Mac, les autres imposent leur ton', () => {
    expect(themeSource('defaut')).toBe('system')
    expect(paletteId('defaut', true)).toBe('defaut-sombre')
    expect(paletteId('defaut', false)).toBe('defaut-clair')
    expect(themeSource('matrix')).toBe('dark')
    expect(themeSource('pinklady')).toBe('light')
    expect(themeSource('aqua')).toBe('light')
    expect(themeSource('cobalt')).toBe('dark')
  })
})

describe('structure des thèmes', () => {
  it('tous les jeux de couleurs ont les mêmes clés, des couleurs lisibles', () => {
    const keys = Object.keys(CSS_VARIABLES).sort()
    for (const id of PALETTE_IDS) {
      expect(Object.keys(PALETTES[id].colors).sort(), id).toEqual(keys)
      for (const value of Object.values(PALETTES[id].colors)) {
        expect(parseColor(value), `${id} : ${value}`).not.toBeNull()
      }
    }
  })

  it('chaque couleur devient une variable CSS', () => {
    const variables = cssVariables(PALETTES.matrix)
    expect(variables['--background']).toBe('#000000')
    expect(Object.keys(variables)).toHaveLength(Object.keys(CSS_VARIABLES).length)
  })
})

describe('contraste (formule WCAG)', () => {
  it('noir sur blanc = 21, deux couleurs égales = 1', () => {
    expect(contrastOf('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastOf('#777777', '#777777')).toBeCloseTo(1, 5)
  })

  it('pose une couleur translucide sur son fond', () => {
    const fill = blend(parseColor('rgba(255, 0, 0, 0.5)')!, parseColor('#ffffff')!)
    expect(fill).toEqual({ r: 255, g: 128, b: 128, a: 1 })
    expect(contrastRatio(fill, parseColor('#ffffff')!)).toBeGreaterThan(1)
  })
})

describe('lisibilité de chaque jeu de couleurs', () => {
  type Pair = [foreground: keyof ThemeColors, background: keyof ThemeColors, minimum: number]
  // Texte principal ≥ 7:1 ; texte secondaire, accent et couleurs de signalisation ≥ 4,5:1.
  const pairs: Pair[] = [
    ['text', 'background', 7],
    ['text', 'surface', 7],
    ['text', 'hover', 7],
    ['pageText', 'page', 7],
    ['muted', 'background', 4.5],
    ['muted', 'surface', 4.5],
    ['muted', 'hover', 4.5],
    ['pageMuted', 'page', 4.5],
    ['accent', 'background', 4.5],
    ['accent', 'surface', 4.5],
    ['accentText', 'accent', 4.5],
    ['danger', 'background', 4.5],
    ['danger', 'surface', 4.5],
    ['note', 'page', 4.5],
    ['noteMark', 'page', 3],
    ['diffAdded', 'surface', 4.5],
    ['diffRemoved', 'surface', 4.5],
    ['revBadgeText', 'revSolidJaune', 4.5],
    // Liseret et coche d'une tâche validée : élément graphique, 3:1 sur le fond de la ligne du temps.
    ['validee', 'background', 3]
  ]

  for (const id of PALETTE_IDS) {
    for (const [foreground, background, minimum] of pairs) {
      it(`${id} : ${foreground} sur ${background} ≥ ${minimum}:1`, () => {
        const { colors } = PALETTES[id]
        expect(contrastOf(colors[foreground], colors[background])).toBeGreaterThanOrEqual(minimum)
      })
    }

    it(`${id} : le texte de la page reste lisible sous chaque marque de révision`, () => {
      const { colors } = PALETTES[id]
      const page = parseColor(colors.page)!
      const text = parseColor(colors.pageText)!
      for (const key of ['revJaune', 'revVert', 'revRose', 'revBleu'] as const) {
        const fill = blend(parseColor(colors[key])!, page)
        expect(contrastRatio(text, fill), key).toBeGreaterThanOrEqual(4.5)
      }
    })

    it(`${id} : « validée » est cyan vif en thème sombre, turquoise foncé en thème clair`, () => {
      const { colors, tone } = PALETTES[id]
      if (tone === 'sombre') expect(colors.validee).toBe('#00ffff')
      else {
        const [red, green, blue] = [1, 3, 5].map((i) =>
          parseInt(colors.validee.slice(i, i + 2), 16)
        )
        expect(red).toBeLessThan(40)
        expect(green).toBeGreaterThan(red)
        expect(Math.abs(green - blue)).toBeLessThan(25)
        expect(colors.validee).not.toBe('#00ffff')
      }
    })

    it(`${id} : les statistiques jour/nuit se distinguent du fond`, () => {
      const { colors } = PALETTES[id]
      for (const key of ['statDay', 'statNight', 'statOther'] as const) {
        expect(contrastOf(colors[key], colors.surface), key).toBeGreaterThanOrEqual(2)
      }
    })
  }
})
