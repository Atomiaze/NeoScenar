import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { paginate, parse } from '@neoscenar/fountain'
import { timeLimit } from '../../../shared/timeLimit'
import { scriptLayout } from '../layoutProfile'
import { buildNavigator } from './buildNavigator'

// Test indicatif : le navigateur est recalculé au plus toutes les 250 ms pendant la frappe.
// Sur les serveurs d'intégration continue (CI), le seuil est triplé (voir timeLimit).
describe('performance du navigateur', () => {
  it('reconstruit l’arbre d’un scénario de 120 pages (environ 150 scènes) en moins de 60 ms', () => {
    const file = join(
      import.meta.dirname,
      '../../../../packages/fountain/tests/exemples/exemple-complet.fountain'
    )
    const body = readFileSync(file, 'utf8').split('\n\n').slice(1).join('\n\n')
    let text = ''
    while (text.split('\n').length < 120 * 55) text += `${body}\n\n`
    const doc = parse(text, { titlePage: false })
    const build = () => buildNavigator(doc, paginate(doc, scriptLayout))
    build()
    let best = Infinity
    for (let run = 0; run < 5; run++) {
      const started = performance.now()
      build()
      best = Math.min(best, performance.now() - started)
    }
    const tree = build()
    console.log(`${tree.sceneCount} scènes : arbre en ${best.toFixed(1)} ms`)
    expect(tree.sceneCount).toBeGreaterThan(150)
    expect(best).toBeLessThan(timeLimit(60))
  })
})
