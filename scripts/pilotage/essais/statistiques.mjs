// Étape 13B : module Statistiques sur « Le Dernier Bus » : totaux identiques au navigateur, clics.

import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

const ROOT = join(import.meta.dirname, '..', '..', '..')

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  copyFileSync(
    join(ROOT, 'packages', 'fountain', 'tests', 'exemples', 'le-dernier-bus.fountain'),
    join(dirname(projectFile), 'neoscenar', 'scenario.fountain')
  )

  // Découpage d'essai : S_0010 (carte du projet d'essai, absente de « Le Dernier Bus » donc orpheline)
  // porte 100 s qui ne doivent PAS compter ; les deux premières scènes réelles ont 4 + 6 s et 5 s.
  const data = join(dirname(projectFile), 'neoscenar')
  const decoupageFile = join(data, 'decoupage.json')
  const decoupage = JSON.parse(readFileSync(decoupageFile, 'utf8'))
  const numbers = [
    ...readFileSync(join(data, 'scenario.fountain'), 'utf8').matchAll(/#(\d+)#\s*$/gm)
  ].map((match) => Number(match[1]))
  const withShots = (number, durations) => ({
    id: `E${number}`,
    number,
    letter: '',
    name: '',
    heading: '',
    color: null,
    shots: durations.map((duration, rank) => ({
      ...decoupage.scenes[0].shots[0],
      id: `E${number}-P${rank}`,
      number: (rank + 1) * 10,
      duration
    }))
  })
  decoupage.scenes[0].shots[0].duration = 100
  decoupage.scenes.unshift(withShots(numbers[0], [4, 6]), withShots(numbers[1], [5, null]))
  writeFileSync(decoupageFile, JSON.stringify(decoupage, null, 2))
  await app.openProject(projectFile)

  // Valeurs du navigateur (Scénario) : « Scènes : N · m:ss » et « Page x / y · m:ss ».
  await app.module('Scénario')
  await sleep(1500)
  const navigator = await app.evaluate(`document.querySelector('.navigator-summary')?.textContent`)
  const indicator = await app.evaluate(`document.querySelector('.page-indicator')?.textContent`)
  log(`    navigateur : ${navigator} | ${indicator}`)
  const navScenes = /Scènes : (\d+) · (\S+)/.exec(navigator ?? '')
  const navPages = /\/\s*(\d+)/.exec(indicator ?? '')
  check(navScenes !== null && navPages !== null, 'valeurs du navigateur relevées')

  await app.module('Statistiques')
  await sleep(800)
  const tile = (id) =>
    app.evaluate(`document.querySelector('[data-tile="${id}"] dd')?.textContent ?? null`)
  const pages = await tile('pages')
  const duration = await tile('duration')
  const scenes = await tile('scenes')
  log(
    `    statistiques : ${pages} pages, ${duration}, ${scenes} scènes, ${await tile('characters')} personnages, ${await tile('places')} lieux`
  )
  check(pages === navPages[1], `pages : ${pages} = navigateur ${navPages[1]}`)
  check(scenes === navScenes[1], `scènes : ${scenes} = navigateur ${navScenes[1]}`)
  check(duration === navScenes[2], `durée : ${duration} = navigateur ${navScenes[2]}`)
  await app.screenshot('stats-haut.png')

  // Durée du découpage : 4 + 6 + 5 = 15 s ; la carte orpheline (100 s) ne compte pas.
  await sleep(1000)
  const saved = JSON.parse(readFileSync(decoupageFile, 'utf8'))
  check(
    saved.scenes.find((scene) => scene.id === 'S10')?.orphan === true,
    'la carte S_0010 (100 s) est bien orpheline dans le découpage'
  )
  log(`    durée du découpage affichée : ${await tile('shots-duration')}`)
  check(
    (await tile('shots-duration')) === '0:15',
    'tuile « Durée du découpage » : 0:15 (orpheline exclue)'
  )

  const counts = await app.evaluate(`({
    speech: document.querySelectorAll('.stats-speech li').length,
    grid: document.querySelectorAll('.stats-grid tbody tr').length,
    columns: document.querySelectorAll('.stats-grid thead th').length - 1,
    bars: document.querySelectorAll('.stats-scene').length,
    full: document.querySelectorAll('.stats-cell.speaks').length
  })`)
  log(`    ${JSON.stringify(counts)}`)
  check(counts.speech > 0 && counts.grid > 0, 'temps de parole et grille remplis')
  check(
    counts.columns === Number(scenes) && counts.bars === Number(scenes),
    'une colonne et une barre par scène'
  )
  check(counts.full > 0, 'des cases pleines dans la grille')
  await app.evaluate(`document.querySelector('.stats-module').scrollTo(0, 700)`)
  await sleep(200)
  await app.screenshot('stats-milieu.png')
  await app.evaluate(`document.querySelector('.stats-module').scrollTo(0, 99999)`)
  await sleep(200)
  await app.screenshot('stats-bas.png')

  // Clic sur une barre : le Scénario s'ouvre à cette scène.
  const target = await app.evaluate(`(() => {
    const bar = document.querySelectorAll('.stats-scene')[4]
    const label = bar.dataset.scene
    bar.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    return label
  })()`)
  await sleep(1200)
  const current = await app.navigatorCurrent()
  log(`    clic sur ${target} → navigateur : ${current}`)
  check(current !== null && current.includes(target), 'le clic ouvre la scène dans le Scénario')
  await app.screenshot('stats-vers-scenario.png')

  // Clic sur un personnage : sa fiche s'ouvre dans Recherches.
  await app.module('Statistiques')
  await sleep(500)
  const name = await app.evaluate(`(() => {
    const link = document.querySelector('.stats-speech .stats-link')
    const name = link.textContent
    link.click()
    return name
  })()`)
  await sleep(1200)
  const heading = await app.evaluate(
    `document.querySelector('.module-bar .active')?.getAttribute('aria-label')`
  )
  const sheetText = await app.evaluate(`document.body.innerText`)
  check(heading === 'Données du projet', 'le clic sur un personnage ouvre Données du projet')
  check(sheetText.toUpperCase().includes(name.toUpperCase()), `la fiche de ${name} est affichée`)
  await app.screenshot('stats-vers-fiche.png')

  const problems = app.problems()
  check(problems.length === 0, `aucune erreur de console ${problems.join(' | ')}`)
}
