import { parse } from '@neoscenar/fountain'
import { describe, expect, it } from 'vitest'
import { counterIds } from '../decoupage/testFixtures'
import { reconcile } from './reconcile'
import { cards, script } from './testHelpers'

// Test indicatif : le rapprochement est refait à chaque frappe dans l'éditeur, qui fournit l'analyse
// du texte déjà faite. Il doit rester bien en dessous de la durée d'une frappe.
describe('performance du rapprochement', () => {
  it('scénario de 120 pages (150 scènes, quelques-unes déplacées) : moins de 15 ms par frappe', () => {
    const numbers = Array.from({ length: 150 }, (_, i) => (i + 1) * 10)
    // Quelques scènes déplacées dans le texte, pour exercer le choix des scènes à renuméroter.
    const order = [...numbers]
    for (const [from, to] of [
      [3, 120],
      [50, 10],
      [90, 140]
    ])
      order.splice(to, 0, ...order.splice(from, 1))
    const action = 'Une longue ligne d’action qui occupe plusieurs lignes à l’écran. '.repeat(12)
    const text = script(...order.map((n) => `INT. LIEU ${n} - JOUR #${n}#`)).replaceAll(
      /Action \d+\./g,
      action
    )
    const decoupage = cards(numbers.map(String))
    const parsed = parse(text, { titlePage: false })
    const ids = counterIds()
    const run = () => reconcile(text, decoupage, { parsed }, ids)
    run()
    let best = Infinity
    for (let i = 0; i < 5; i++) {
      const started = performance.now()
      run()
      best = Math.min(best, performance.now() - started)
    }
    console.log(`150 scènes : rapprochement en ${best.toFixed(1)} ms`)
    expect(run().decoupage.scenes).toHaveLength(150)
    expect(best).toBeLessThan(15)
  })
})
