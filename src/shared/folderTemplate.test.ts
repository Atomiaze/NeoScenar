import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { defaultFoldersFor, type FolderTemplate } from './folderTemplate'

const template = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'resources', 'modeles', 'saint-luc.json'), 'utf8')
) as FolderTemplate

describe('dossiers cochés par défaut', () => {
  it('Film', () => {
    expect(defaultFoldersFor(template, 'film')).toEqual([
      '01_Production',
      '02_References',
      '03_Rushes',
      '04_Son',
      '05_Images',
      '08_Graphisme',
      '10_Montage',
      '11_Exports'
    ])
  })

  it('Animation Blender', () => {
    expect(defaultFoldersFor(template, 'animation')).toEqual([
      '01_Production',
      '02_References',
      '04_Son',
      '05_Images',
      '06_Blender',
      '07_Rendus',
      '08_Graphisme',
      '10_Montage',
      '11_Exports'
    ])
  })

  it('Mixte coche l’union de Film et Animation', () => {
    const mixed = defaultFoldersFor(template, 'mixte')
    expect(mixed).toContain('03_Rushes')
    expect(mixed).toContain('06_Blender')
    expect(mixed).not.toContain('09_VFX')
    expect(mixed).toHaveLength(10)
  })

  it('Personnalisé ne coche rien', () => {
    expect(defaultFoldersFor(template, 'personnalise')).toEqual([])
  })
})
