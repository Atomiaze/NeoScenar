import { describe, expect, it } from 'vitest'
import { makeDecoupage } from '../decoupage/testFixtures'
import type { Decoupage, ThumbnailCrop } from '../projectTypes'
import { countMismatchedThumbnails, thumbnailBadge, thumbnailPaths } from './status'

const HD = { width: 1920, height: 1080 }
const SQUARE = { width: 1080, height: 1080 }
const sizes = { 'v/hd.png': HD, 'v/carre.png': { width: 1920, height: 1920 } }
const crop = (auto: boolean): ThumbnailCrop => ({
  rotation: 0,
  mode: 'crop',
  frame: { x: 0, y: 0, width: 1, height: 1 },
  bands: 'white',
  auto
})

describe('badges des vignettes', () => {
  it('aucun badge pour une vignette aux bonnes proportions, ou sans vignette', () => {
    expect(
      thumbnailBadge({ thumbnail: 'v/hd.png', thumbnailCrop: crop(false) }, sizes, HD)
    ).toBeNull()
    expect(thumbnailBadge({ thumbnail: null, thumbnailCrop: null }, sizes, HD)).toBeNull()
  })

  it('« À recadrer » après un changement de format', () => {
    expect(thumbnailBadge({ thumbnail: 'v/hd.png', thumbnailCrop: null }, sizes, SQUARE)).toBe(
      'recrop'
    )
  })

  it('« À vérifier » après un recadrage automatique', () => {
    expect(thumbnailBadge({ thumbnail: 'v/hd.png', thumbnailCrop: crop(true) }, sizes, HD)).toBe(
      'check'
    )
  })

  it('taille encore inconnue : pas de badge « À recadrer » (en attendant)', () => {
    expect(
      thumbnailBadge({ thumbnail: 'v/autre.png', thumbnailCrop: null }, sizes, SQUARE)
    ).toBeNull()
  })
})

describe('changement de format', () => {
  const decoupage: Decoupage = makeDecoupage({ '10': ['10', '20', '30'] })
  const shots = decoupage.scenes[0].shots
  shots[0].thumbnail = 'v/hd.png'
  shots[1].thumbnail = 'v/carre.png'
  shots[2].thumbnail = 'v/hd.png'

  it('compte les vignettes qui n’auront plus les bonnes proportions', () => {
    expect(countMismatchedThumbnails(decoupage, sizes, SQUARE)).toBe(2)
    expect(countMismatchedThumbnails(decoupage, sizes, { width: 3840, height: 2160 })).toBe(1)
  })

  it('liste les vignettes sans doublon', () => {
    expect(thumbnailPaths(decoupage)).toEqual(['v/hd.png', 'v/carre.png'])
  })
})
