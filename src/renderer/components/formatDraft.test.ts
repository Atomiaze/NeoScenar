import { describe, expect, it } from 'vitest'
import { SHIPPED_FORMATS as catalog } from '../../shared/formatsFixture'
import {
  checkDraft,
  chooseFormat,
  CUSTOM_FORMAT,
  draftFromSettings,
  frameRateChoices
} from './formatDraft'

describe('réglages de format en cours de saisie', () => {
  it('reconnaît le préréglage, sinon « Personnalisé »', () => {
    const vertical = { fps: 25, resolution: { width: 1080, height: 1920 } }
    expect(draftFromSettings(catalog, vertical).choice).toBe('vertical-full-hd')
    const custom = { fps: 24, resolution: { width: 2048, height: 858 } }
    expect(draftFromSettings(catalog, custom)).toEqual({
      choice: CUSTOM_FORMAT,
      width: '2048',
      height: '858',
      fps: 24
    })
  })

  it('un préréglage remplit les champs, « Personnalisé » les garde', () => {
    const start = draftFromSettings(catalog, { fps: 25, resolution: { width: 1920, height: 1080 } })
    const square = chooseFormat(catalog, start, 'carre')
    expect([square.width, square.height]).toEqual(['1080', '1080'])
    const custom = chooseFormat(catalog, square, CUSTOM_FORMAT)
    expect(custom).toEqual({ ...square, choice: CUSTOM_FORMAT })
  })

  it('donne les réglages quand tout est valide, sinon le problème de chaque champ', () => {
    const draft = { choice: CUSTOM_FORMAT, width: '2048', height: '858', fps: 25 }
    expect(checkDraft(draft).settings).toEqual({
      fps: 25,
      resolution: { width: 2048, height: 858 }
    })
    const odd = checkDraft({ ...draft, height: '859' })
    expect(odd).toMatchObject({ widthProblem: null, heightProblem: 'odd', settings: null })
    expect(checkDraft({ ...draft, width: '' }).widthProblem).toBe('not-integer')
    expect(checkDraft({ ...draft, width: '12a' }).widthProblem).toBe('not-integer')
  })

  it('garde dans la liste une cadence du projet qui n’y figure pas', () => {
    expect(frameRateChoices(catalog, 25)).toEqual([24, 25, 30, 50, 60])
    expect(frameRateChoices(catalog, 48)).toEqual([24, 25, 30, 48, 50, 60])
  })
})
