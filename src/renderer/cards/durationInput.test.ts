import { describe, expect, it } from 'vitest'
import { formatDurationInput, parseDurationInput } from './durationInput'

describe('saisie de la durée', () => {
  it('accepte les entiers et les décimales avec virgule ou point', () => {
    expect(parseDurationInput('4')).toEqual({ ok: true, value: 4 })
    expect(parseDurationInput('3,5')).toEqual({ ok: true, value: 3.5 })
    expect(parseDurationInput('3.5')).toEqual({ ok: true, value: 3.5 })
    expect(parseDurationInput(' 12,25 ')).toEqual({ ok: true, value: 12.25 })
    expect(parseDurationInput(',5')).toEqual({ ok: true, value: 0.5 })
    expect(parseDurationInput('0')).toEqual({ ok: true, value: 0 })
  })

  it('vide : pas de durée', () => {
    expect(parseDurationInput('')).toEqual({ ok: true, value: null })
    expect(parseDurationInput('   ')).toEqual({ ok: true, value: null })
  })

  it('refuse le texte, les nombres négatifs et les écritures douteuses', () => {
    for (const text of ['abc', '-2', '3,5,1', '1e3', '3 s', ',']) {
      expect(parseDurationInput(text), text).toEqual({ ok: false })
    }
  })

  it('affiche avec une virgule', () => {
    expect(formatDurationInput(3.5)).toBe('3,5')
    expect(formatDurationInput(4)).toBe('4')
    expect(formatDurationInput(null)).toBe('')
  })
})
