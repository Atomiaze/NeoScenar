import { describe, expect, it } from 'vitest'
import { CARD_PALETTE } from '../palette'
import { DEFAULT_DRAWING_COLOR, DRAWING_SWATCHES } from './swatches'

describe('nuancier de l’éditeur', () => {
  it('38 couleurs : la palette des cartes dans le même ordre, puis noir et blanc', () => {
    expect(DRAWING_SWATCHES).toHaveLength(38)
    expect(DRAWING_SWATCHES.slice(0, 36)).toEqual(CARD_PALETTE.map((color) => color.hex))
    expect(DRAWING_SWATCHES.slice(36)).toEqual(['#000000', '#ffffff'])
  })

  it('noir par défaut', () => {
    expect(DEFAULT_DRAWING_COLOR).toBe('#000000')
  })
})
