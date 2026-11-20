import { describe, expect, it } from 'vitest'
import { aspectRatio } from '../imageFormat'
import type { CropFrame } from '../projectTypes'
import {
  applyMatrix,
  imagePlacement,
  initialFrame,
  moveFrame,
  resizeFrame,
  rotate,
  rotatedSize,
  rotationMatrix,
  type Corner
} from './geometry'

const HD = { width: 1920, height: 1080 }

function pixels(frame: CropFrame, image: { width: number; height: number }) {
  return {
    x: frame.x * image.width,
    y: frame.y * image.height,
    width: frame.width * image.width,
    height: frame.height * image.height
  }
}

function expectInside(frame: CropFrame): void {
  expect(frame.x).toBeGreaterThanOrEqual(-1e-9)
  expect(frame.y).toBeGreaterThanOrEqual(-1e-9)
  expect(frame.x + frame.width).toBeLessThanOrEqual(1 + 1e-9)
  expect(frame.y + frame.height).toBeLessThanOrEqual(1 + 1e-9)
}

describe('cadre de départ', () => {
  it('image plus haute que le format : toute la largeur, centré en hauteur', () => {
    const photo = { width: 3000, height: 4000 }
    const frame = pixels(initialFrame(photo, HD), photo)
    expect(frame.width).toBeCloseTo(3000)
    expect(frame.height).toBeCloseTo(1687.5)
    expect(frame.x).toBeCloseTo(0)
    expect(frame.y).toBeCloseTo((4000 - 1687.5) / 2)
  })

  it('image plus large que le format : toute la hauteur, centré en largeur', () => {
    const panorama = { width: 4000, height: 1000 }
    const frame = pixels(initialFrame(panorama, HD), panorama)
    expect(frame.height).toBeCloseTo(1000)
    expect(frame.width).toBeCloseTo(1777.78, 1)
    expect(frame.x).toBeCloseTo((4000 - 1777.78) / 2, 1)
    expect(frame.y).toBeCloseTo(0)
  })

  it('image aux bonnes proportions : le cadre couvre toute l’image', () => {
    const frame = initialFrame({ width: 3840, height: 2160 }, HD)
    expect(frame.x).toBeCloseTo(0)
    expect(frame.width).toBeCloseTo(1)
    expect(frame.height).toBeCloseTo(1)
  })
})

describe('contraintes du cadre', () => {
  const photo = { width: 3000, height: 4000 }
  const start = initialFrame(photo, HD)

  it('le déplacement s’arrête au bord de l’image', () => {
    const far = moveFrame(start, photo, 10000, -10000)
    expectInside(far)
    expect(far.y).toBeCloseTo(0)
    const down = moveFrame(start, photo, 0, 100000)
    expect(down.y + down.height).toBeCloseTo(1)
  })

  it('le redimensionnement garde les proportions et reste dans l’image', () => {
    const corners: Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
    for (const corner of corners) {
      for (const pointer of [
        { x: -500, y: -500 },
        { x: 1500, y: 2000 },
        { x: 9000, y: 9000 },
        { x: 1490, y: 1990 }
      ]) {
        const frame = resizeFrame(start, photo, HD, corner, pointer)
        expectInside(frame)
        const rect = pixels(frame, photo)
        expect(rect.width / rect.height).toBeCloseTo(aspectRatio(HD), 6)
        expect(rect.width).toBeGreaterThanOrEqual(16)
      }
    }
  })

  it('le coin opposé reste fixe', () => {
    const before = pixels(start, photo)
    const smaller = pixels(
      resizeFrame(start, photo, HD, 'bottom-right', { x: 1000, y: before.y + 100 }),
      photo
    )
    expect(smaller.x).toBeCloseTo(before.x)
    expect(smaller.y).toBeCloseTo(before.y)
    expect(smaller.width).toBeCloseTo(1000)
  })
})

describe('rotation', () => {
  it('dimensions après 90°, 180°, 270°', () => {
    const photo = { width: 4000, height: 3000 }
    expect(rotatedSize(photo, 90)).toEqual({ width: 3000, height: 4000 })
    expect(rotatedSize(photo, 180)).toEqual(photo)
    expect(rotatedSize(photo, 270)).toEqual({ width: 3000, height: 4000 })
  })

  it('pivoter à gauche et à droite fait le tour', () => {
    expect(rotate(0, 'right')).toBe(90)
    expect(rotate(270, 'right')).toBe(0)
    expect(rotate(0, 'left')).toBe(270)
    expect(rotate(90, 'left')).toBe(0)
  })

  it('les coins de l’image arrivent aux bons endroits', () => {
    const size = { width: 400, height: 300 }
    const corner = (rotation: 0 | 90 | 180 | 270, x: number, y: number) =>
      applyMatrix(rotationMatrix(rotation, size), { x, y })
    // Le coin haut-gauche de l'image part en haut à droite après 90° (sens des aiguilles).
    expect(corner(90, 0, 0)).toEqual({ x: 300, y: 0 })
    expect(corner(90, 400, 300)).toEqual({ x: 0, y: 400 })
    expect(corner(180, 0, 0)).toEqual({ x: 400, y: 300 })
    expect(corner(270, 0, 0)).toEqual({ x: 0, y: 400 })
    expect(corner(270, 400, 300)).toEqual({ x: 300, y: 0 })
  })

  it('cadre recalculé après rotation : une photo portrait pivotée remplit un cadre 16:9', () => {
    const portrait = { width: 3000, height: 4000 }
    const turned = rotatedSize(portrait, 90)
    const frame = pixels(initialFrame(turned, HD), turned)
    expect(frame.width).toBeCloseTo(4000)
    expect(frame.height).toBeCloseTo(2250)
  })
})

describe('placement de l’image dans la vignette', () => {
  it('mode « ajuster » : image entière centrée, bandes sur les côtés', () => {
    const portrait = { width: 3000, height: 4000 }
    const place = imagePlacement(portrait, { mode: 'fit', frame: initialFrame(portrait, HD) }, HD)
    expect(place.height).toBeCloseTo(1080)
    expect(place.width).toBeCloseTo(810)
    expect(place.x).toBeCloseTo((1920 - 810) / 2) // bandes de 555 pixels à gauche et à droite
    expect(place.y).toBeCloseTo(0)
  })

  it('mode « ajuster » : bandes en haut et en bas pour une image très large', () => {
    const place = imagePlacement(
      { width: 4000, height: 1000 },
      { mode: 'fit', frame: initialFrame({ width: 4000, height: 1000 }, HD) },
      HD
    )
    expect(place.width).toBeCloseTo(1920)
    expect(place.height).toBeCloseTo(480)
    expect(place.y).toBeCloseTo(300)
  })

  it('mode « recadrer » : le cadre remplit exactement la vignette', () => {
    const photo = { width: 3000, height: 4000 }
    const frame = initialFrame(photo, HD)
    const place = imagePlacement(photo, { mode: 'crop', frame }, HD)
    const rect = pixels(frame, photo)
    const scale = place.width / photo.width
    expect(place.x + rect.x * scale).toBeCloseTo(0)
    expect(place.y + rect.y * scale).toBeCloseTo(0)
    expect(rect.width * scale).toBeCloseTo(1920)
    expect(rect.height * scale).toBeCloseTo(1080)
  })
})
