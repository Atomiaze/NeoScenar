// Lot 5 : la durée totale du film (barre des Cartes) ne compte pas les scènes brouillon, et suit
// la case « Brouillon » de la fiche (cochée, décochée, annulée).

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

const SCRIPT = [
  'INT. A - JOUR #10#',
  '',
  'Action A.',
  '',
  'INT. B - JOUR #20#',
  '[[BROUILLON]]',
  '',
  'Action B.',
  '',
  'INT. C - JOUR #30#',
  '',
  'Action C.',
  ''
].join('\n')

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  writeFileSync(join(dirname(projectFile), 'neoscenar', 'scenario.fountain'), SCRIPT)
  await app.openProject(projectFile)
  await app.module('Cartes')
  await sleep(1200)

  const total = () => app.evaluate(`document.querySelector('.total-duration').textContent.trim()`)
  const shotIds = await app.evaluate(
    `[...document.querySelectorAll('[data-card-kind="shot"]')].map((c) => c.querySelector('.card-number').textContent)`
  )
  log('plans :', shotIds)
  check(shotIds.length === 3, 'un plan par scène')

  // Durées : 10 s (A), 20 s (B, brouillon), 30 s (C).
  for (const [place, seconds] of [
    ['INT. A - JOUR', 10],
    ['INT. B - JOUR', 20],
    ['INT. C - JOUR', 30]
  ]) {
    await app.mouseClick('[data-card-kind="shot"]', place)
    await sleep(300)
    await app.evaluate(`(() => {
      const label = [...document.querySelectorAll('.sheet label')].find((l) => l.textContent.startsWith('Durée'))
      const input = document.getElementById(label.htmlFor) ?? label.querySelector('input')
      input.focus(); input.select()
    })()`)
    await app.page.send('Input.insertText', { text: String(seconds) })
    await sleep(200)
    await app.evaluate(`document.activeElement.blur()`)
    await sleep(300)
  }
  let shown = await total()
  log('durée totale avec B brouillon :', shown)
  check(shown === '0:40', 'brouillon exclu : 10 + 30 = 0:40')
  await app.screenshot('duree-brouillon-1.png')

  // Case « Brouillon » décochée : B compte de nouveau.
  await app.mouseClick('[data-card-kind="scene"]', 'S_0020')
  await sleep(400)
  await app.mouseClick('.sheet input[type="checkbox"]')
  await sleep(800)
  shown = await total()
  check(shown === '1:00', 'brouillon retiré : 10 + 20 + 30 = 1:00')

  // Annuler dans les Cartes : B redevient brouillon, la durée suit.
  const undoLabel = (await app.menuLabels('Édition')).find((label) => label.startsWith('Annuler'))
  await app.menu('Édition', undoLabel)
  await sleep(800)
  shown = await total()
  check(shown === '0:40', 'Annuler : de nouveau 0:40')
  await app.screenshot('duree-brouillon-2.png')
}
