import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SHIPPED_FORMATS } from '../shared/formatsFixture'
import { loadFormatCatalog, parseFormatCatalog } from './formats'

const SHIPPED = join(__dirname, '..', '..', 'resources', 'formats', 'formats.json')

describe('formats d’image livrés', () => {
  it('le fichier livré est valide', async () => {
    const catalog = await loadFormatCatalog(SHIPPED)
    expect(catalog).toEqual(SHIPPED_FORMATS)
    expect(catalog.presets.map((preset) => preset.name)).toEqual([
      'Paysage Full HD',
      'Vertical Full HD',
      'Carré',
      'Paysage 4K UHD',
      'Cinémascope'
    ])
    expect(catalog.defaultFrameRate).toBe(25)
  })

  it('refuse une dimension impaire ou un défaut absent de la liste', () => {
    const base = {
      formatVersion: 1,
      presets: [{ id: 'a', name: 'A', width: 1920, height: 1080 }],
      defaultPresetId: 'a',
      frameRates: [25],
      defaultFrameRate: 25
    }
    expect(() => parseFormatCatalog(base, 'formats.json')).not.toThrow()
    const odd = { ...base, presets: [{ id: 'a', name: 'A', width: 1921, height: 1080 }] }
    expect(() => parseFormatCatalog(odd, 'formats.json')).toThrow(/presets\[0\]/)
    expect(() => parseFormatCatalog({ ...base, defaultFrameRate: 30 }, 'formats.json')).toThrow(
      /defaultFrameRate/
    )
  })

  it('fichier introuvable : message pour l’enseignant', async () => {
    await expect(loadFormatCatalog(join(__dirname, 'absent.json'))).rejects.toThrow(
      /formats d’image/
    )
  })
})
