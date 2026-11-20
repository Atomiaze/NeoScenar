import { describe, expect, it } from 'vitest'
import { parse, serialize } from '../src/index.ts'
import { readExample, timeLimit } from './helpers.ts'

// Test indicatif : un scénario de 120 pages (environ 55 lignes par page) en moins de 50 ms.
describe('performance', () => {
  it('analyse un scénario de 120 pages en moins de 50 ms', () => {
    const body = readExample('exemple-complet.fountain').split('\n\n').slice(1).join('\n\n')
    let text = ''
    while (text.split('\n').length < 120 * 55) text += `${body}\n\n`

    parse(text) // échauffement du moteur JavaScript
    let best = Infinity
    for (let run = 0; run < 5; run++) {
      const started = performance.now()
      parse(text)
      best = Math.min(best, performance.now() - started)
    }
    console.log(`120 pages (${text.length} caractères) analysées en ${best.toFixed(1)} ms`)
    expect(best).toBeLessThan(timeLimit(50))
    expect(serialize(parse(text))).toBe(text)
  })
})
