import { describe, expect, it } from 'vitest'
import {
  CARD_PALETTE,
  CARD_TEXT_COLOR,
  COLOR_SHADES,
  cardMutedTextColor,
  cardTextColor,
  contrastRatio
} from './palette'

describe('palette des cartes', () => {
  it('12 teintes, chacune en pastel, vive et foncée : 36 couleurs distinctes', () => {
    expect(CARD_PALETTE).toHaveLength(36)
    expect(new Set(CARD_PALETTE.map((color) => color.hex)).size).toBe(36)
    const hues = new Set(CARD_PALETTE.map((color) => color.hue))
    expect(hues.size).toBe(12)
    for (const hue of hues) {
      const shades = CARD_PALETTE.filter((color) => color.hue === hue).map((color) => color.shade)
      expect(shades, hue).toEqual([...COLOR_SHADES])
    }
    expect(CARD_PALETTE.every((color) => /^#[0-9a-f]{6}$/.test(color.hex))).toBe(true)
  })

  it('pour chaque teinte : pastel plus clair que vive, vive plus claire que foncée', () => {
    const lightness = (hex: string): number => contrastRatio(hex, '#000000')
    for (const hue of new Set(CARD_PALETTE.map((color) => color.hue))) {
      const [pastel, vivid, dark] = CARD_PALETTE.filter((color) => color.hue === hue)
      expect(lightness(pastel.hex), hue).toBeGreaterThan(lightness(vivid.hex))
      expect(lightness(vivid.hex), hue).toBeGreaterThan(lightness(dark.hex))
    }
  })

  it('pastels : texte foncé très lisible (contraste AAA, au moins 7:1)', () => {
    for (const color of CARD_PALETTE.filter((item) => item.shade === 'pastel')) {
      expect(cardTextColor(color.hex), color.hue).toBe(CARD_TEXT_COLOR)
      expect(contrastRatio(color.hex, CARD_TEXT_COLOR), color.hue).toBeGreaterThanOrEqual(7)
    }
  })

  it('toutes les couleurs : texte principal et secondaire lisibles (au moins 4,5:1)', () => {
    for (const color of CARD_PALETTE) {
      const label = `${color.hue} ${color.shade}`
      expect(contrastRatio(color.hex, cardTextColor(color.hex)), label).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(color.hex, cardMutedTextColor(color.hex)), label).toBeGreaterThanOrEqual(
        4.5
      )
    }
  })

  it('texte blanc sur les couleurs foncées', () => {
    expect(cardTextColor('#1a3fa8')).toBe('#ffffff')
    expect(cardTextColor('#ffe100')).toBe(CARD_TEXT_COLOR)
  })

  it('calcule le contraste noir sur blanc : 21', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21)
  })
})
