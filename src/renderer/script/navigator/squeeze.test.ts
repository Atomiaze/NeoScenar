import { describe, expect, it } from 'vitest'
import { NAVIGATOR_WIDTH, nextAutoHidden } from './squeeze'

describe('nextAutoHidden', () => {
  it('masque le navigateur quand la page déborde', () => {
    expect(nextAutoHidden(false, { clientWidth: 629, pageWidth: 796 })).toBe(true)
    expect(nextAutoHidden(false, { clientWidth: 909, pageWidth: 796 })).toBe(false)
  })

  it('le rend seulement si la page tient encore avec lui', () => {
    const tight = 796 + NAVIGATOR_WIDTH - 1
    expect(nextAutoHidden(true, { clientWidth: tight, pageWidth: 796 })).toBe(true)
    expect(nextAutoHidden(true, { clientWidth: tight + 1, pageWidth: 796 })).toBe(false)
  })
})
