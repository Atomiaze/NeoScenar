import { describe, expect, it } from 'vitest'
import { fileSafeId, imageFileName, isStoryboardImagePath } from './files'

const DATE = new Date(Date.UTC(2026, 10, 17, 14, 30, 12, 42))

describe('noms des fichiers de vignettes', () => {
  it('préfixés par l’identifiant du plan, avec un horodatage', () => {
    expect(imageFileName('7f3c2a10-1b2c-4d5e-8f90-123456789abc', DATE, 'png')).toBe(
      '7f3c2a10-1b2c-4d5e-8f90-123456789abc_20261117-143012-042.png'
    )
    expect(imageFileName('a', DATE, 'jpg', 2)).toBe('a_20261117-143012-042-2.jpg')
  })

  it('sans accent ni espace, même avec un identifiant modifié à la main', () => {
    const name = imageFileName('Plan d’été/1', DATE, 'png')
    expect(name).toMatch(/^[A-Za-z0-9_-]+\.png$/)
    expect(fileSafeId('')).toBe('plan')
  })

  it('uniques d’une milliseconde à l’autre et d’une tentative à l’autre', () => {
    const later = new Date(DATE.getTime() + 1)
    const names = new Set([
      imageFileName('a', DATE, 'png'),
      imageFileName('a', DATE, 'png', 2),
      imageFileName('a', later, 'png'),
      imageFileName('b', DATE, 'png')
    ])
    expect(names.size).toBe(4)
  })

  it('reconnaît uniquement les chemins créés par NeoScenar', () => {
    expect(isStoryboardImagePath('storyboard/vignettes/a_20261117-143012-042.png')).toBe(true)
    expect(isStoryboardImagePath('storyboard/originaux/a_20261117-143012-042.jpg')).toBe(true)
    expect(isStoryboardImagePath('../secret.png')).toBe(false)
    expect(isStoryboardImagePath('storyboard/vignettes/../../projet.json')).toBe(false)
    expect(isStoryboardImagePath('/Users/x/image.png')).toBe(false)
  })
})
