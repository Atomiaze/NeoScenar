import { describe, expect, it } from 'vitest'
import { counterIds } from '../decoupage/testFixtures'
import { firstLinkLines, summaryLines } from './summary'
import { cards, run, script } from './testHelpers'

describe('résumé en français', () => {
  it('« 2 scènes numérotées, 1 carte orpheline : S_0040 »', () => {
    const text = script('INT. A #10#', 'INT. B', 'INT. C #20#', 'INT. D')
    const { result } = run(text, cards(['10', '20', '40*']), counterIds())
    expect(summaryLines(result.summary)).toEqual([
      '2 scènes numérotées : S_0015, S_0030',
      '1 carte devenue orpheline (absente du scénario) : S_0040'
    ])
  })

  it('numéros invalides, doublons, déplacements, cartes vides supprimées', () => {
    const text = script('INT. A #10#', 'INT. C #30#', 'INT. B #20#', 'INT. X #3.1#', 'INT. C2 #30#')
    const { result } = run(text, cards(['10', '20', '30', '50']), counterIds())
    expect(summaryLines(result.summary)).toEqual([
      '1 numéro invalide remplacé : #3.1# → S_0040',
      '1 numéro en double remplacé : #30# → S_0050',
      // 10, 30, 20 : ambigu ; à égalité, on garde les plus petits numéros (10, 20).
      '1 scène déplacée a changé de numéro : S_0030 → S_0015',
      '1 carte vide supprimée : S_0050'
    ])
  })

  it('rien à signaler : liste vide', () => {
    const { result } = run(script('INT. A #10#'), cards(['10']), counterIds())
    expect(summaryLines(result.summary)).toEqual([])
  })

  it('fenêtre de première liaison', () => {
    const decoupage = cards(['10', '20'], { linked: false })
    decoupage.scenes[0].heading = 'INT. SALON - JOUR'
    const { result } = run(script('INT. CUISINE - JOUR'), decoupage, counterIds())
    expect(firstLinkLines(result.summary)).toEqual({
      pairs: ['S_0010 ↔ INT. CUISINE - JOUR'],
      differences: [
        'S_0010 : l’en-tête de la carte (« INT. SALON - JOUR ») a été remplacé par celui du scénario (« INT. CUISINE - JOUR »)'
      ]
    })
    expect(summaryLines(result.summary)).toEqual(['1 en-tête ajouté à la fin du scénario : S_0020'])
  })
})
