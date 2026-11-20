import { describe, expect, it } from 'vitest'
import { SHIPPED_FORMATS as catalog } from './formatsFixture'
import {
  checkDimension,
  defaultSettings,
  findPreset,
  formatAspect,
  isValidSettings,
  sameAspect,
  workingSize
} from './imageFormat'

describe('préréglages', () => {
  it('retrouve le préréglage à partir de la définition', () => {
    expect(findPreset(catalog.presets, { width: 1080, height: 1920 })?.name).toBe(
      'Vertical Full HD'
    )
    expect(findPreset(catalog.presets, { width: 1920, height: 804 })?.name).toBe('Cinémascope')
  })

  it('aucun préréglage pour une définition personnalisée', () => {
    expect(findPreset(catalog.presets, { width: 2048, height: 858 })).toBeNull()
  })

  it('le fichier livré est cohérent et le défaut est Paysage Full HD à 25 i/s', () => {
    expect(defaultSettings(catalog)).toEqual({ fps: 25, resolution: { width: 1920, height: 1080 } })
    for (const preset of catalog.presets) {
      expect(isValidSettings(catalog, { fps: 25, resolution: preset })).toBe(true)
    }
    expect(catalog.frameRates).toEqual([24, 25, 30, 50, 60])
  })

  it('refuse une cadence qui n’est pas proposée', () => {
    expect(isValidSettings(catalog, { fps: 23, resolution: { width: 1920, height: 1080 } })).toBe(
      false
    )
  })
})

describe('dimensions personnalisées', () => {
  it('accepte les nombres pairs de 16 à 8192', () => {
    for (const value of [16, 858, 2048, 8192]) expect(checkDimension(value)).toBeNull()
  })

  it('refuse les nombres impairs, trop petits, trop grands ou non entiers', () => {
    expect(checkDimension(859)).toBe('odd')
    expect(checkDimension(14)).toBe('too-small')
    expect(checkDimension(8194)).toBe('too-large')
    expect(checkDimension(100.5)).toBe('not-integer')
    expect(checkDimension(NaN)).toBe('not-integer')
  })
})

describe('proportions', () => {
  it('écrit les proportions simples en fraction', () => {
    expect(formatAspect({ width: 1920, height: 1080 })).toBe('16:9')
    expect(formatAspect({ width: 1080, height: 1920 })).toBe('9:16')
    expect(formatAspect({ width: 1080, height: 1080 })).toBe('1:1')
    expect(formatAspect({ width: 3840, height: 2160 })).toBe('16:9')
    expect(formatAspect({ width: 1440, height: 1080 })).toBe('4:3')
  })

  it('écrit les autres en « x,xx:1 »', () => {
    expect(formatAspect({ width: 1920, height: 804 })).toBe('2,39:1')
    expect(formatAspect({ width: 2048, height: 858 })).toBe('2,39:1')
    expect(formatAspect({ width: 1998, height: 1080 })).toBe('1,85:1')
  })

  it('compare avec une tolérance de 1 %', () => {
    const hd = { width: 1920, height: 1080 }
    expect(sameAspect(hd, { width: 3840, height: 2160 })).toBe(true)
    expect(sameAspect(hd, { width: 1920, height: 1090 })).toBe(true) // 0,9 %
    expect(sameAspect(hd, { width: 1920, height: 1100 })).toBe(false) // 1,8 %
    expect(sameAspect(hd, { width: 1080, height: 1920 })).toBe(false)
  })
})

describe('définition de travail des vignettes', () => {
  it('1920 sur le côté le plus long pour chaque préréglage', () => {
    const sizes = catalog.presets.map((preset) => workingSize(preset))
    expect(sizes).toEqual([
      { width: 1920, height: 1080 },
      { width: 1080, height: 1920 },
      { width: 1920, height: 1920 },
      { width: 1920, height: 1080 },
      { width: 1920, height: 804 }
    ])
  })

  it('formats personnalisés extrêmes', () => {
    expect(workingSize({ width: 8192, height: 16 })).toEqual({ width: 1920, height: 4 })
    expect(workingSize({ width: 16, height: 8192 })).toEqual({ width: 4, height: 1920 })
    expect(workingSize({ width: 16, height: 16 })).toEqual({ width: 1920, height: 1920 })
    expect(workingSize({ width: 2048, height: 858 })).toEqual({ width: 1920, height: 804 })
  })
})
