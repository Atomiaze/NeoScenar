import { describe, expect, it } from 'vitest'
import { clampScriptZoom, nextScriptZoom, SCRIPT_ZOOM_STEPS } from './scriptZoom'

describe('zoom de l’éditeur de scénario', () => {
  it('passe au palier suivant ou précédent', () => {
    expect(nextScriptZoom(1, 'in')).toBe(1.1)
    expect(nextScriptZoom(1.1, 'in')).toBe(1.25)
    expect(nextScriptZoom(1, 'out')).toBe(0.9)
    expect(nextScriptZoom(1.25, 'out')).toBe(1.1)
  })

  it('ne dépasse pas les limites (70 % et 200 %)', () => {
    expect(nextScriptZoom(0.7, 'out')).toBe(0.7)
    expect(nextScriptZoom(2, 'in')).toBe(2)
  })

  it('Cmd + 0 remet à 100 %', () => {
    expect(nextScriptZoom(1.75, 'reset')).toBe(1)
  })

  it('les paliers sont 70, 80, 90, 100, 110, 125, 150, 175 et 200 %', () => {
    expect(SCRIPT_ZOOM_STEPS.map((step) => Math.round(step * 100))).toEqual([
      70, 80, 90, 100, 110, 125, 150, 175, 200
    ])
  })

  it('préférence absente ou abîmée : 100 % ; valeur entre deux paliers : le plus proche', () => {
    expect(clampScriptZoom(undefined)).toBe(1)
    expect(clampScriptZoom('grand')).toBe(1)
    expect(clampScriptZoom(Number.NaN)).toBe(1)
    expect(clampScriptZoom(1.3)).toBe(1.25)
    expect(clampScriptZoom(9)).toBe(2)
    expect(clampScriptZoom(0.1)).toBe(0.7)
    expect(nextScriptZoom(1.3, 'in')).toBe(1.5)
  })
})
