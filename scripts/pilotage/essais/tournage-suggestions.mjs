// Étape 18C-5 : suggestions de personnages muets dans le panneau d'une scène du plan de tournage.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { closeLinkBanner, sleep } from '../application.mjs'

const SCRIPT = `Title: Film essai

INT. CUISINE - JOUR #10#

Marie entre.

MARIE
Bonjour Paul.

EXT. JARDIN - JOUR #20#

Paul entre, suivi de Paulette.

INT. SALON - NUIT #30#

Marie dort.

PAUL
Zzz.
`

export default async function ({ app, check, newProject }) {
  const projectFile = newProject()
  const data = join(dirname(projectFile), 'neoscenar')
  writeFileSync(join(data, 'scenario.fountain'), SCRIPT)
  mkdirSync(join(data, 'personnages'), { recursive: true })
  const planningFile = join(data, 'planning.json')
  const suggestions = () =>
    app.evaluate(
      `[...document.querySelectorAll('[data-suggestion]')].map((e) => e.dataset.suggestion)`
    )
  const characters = () =>
    app.evaluate(
      `[...document.querySelectorAll('.shooting-panel-characters [data-character]')].map((e) => e.dataset.character)`
    )

  await app.openProject(projectFile)
  await sleep(600)
  await app.module('Planification')
  await sleep(800)
  await closeLinkBanner(app)
  await app.click('[data-view="shooting"]')
  await sleep(800)

  // Scène 20 : Paul cité (il parle ailleurs), Paulette n'est pas Paul et n'a ni fiche ni réplique.
  await app.click('[data-shooting="unplanned"] [data-scene="S_0020"]')
  await sleep(300)
  check(
    JSON.stringify(await suggestions()) === '["PAUL"]',
    `S_0020 propose PAUL seul (${await suggestions()})`
  )
  await app.screenshot('tournage-suggestions-avant.png')

  // Scène 30 : PAUL parle, donc jamais proposé ; Marie est citée.
  await app.click('[data-shooting="unplanned"] [data-scene="S_0030"]')
  await sleep(300)
  check(
    JSON.stringify(await suggestions()) === '["MARIE"]',
    `S_0030 propose MARIE seule (${await suggestions()})`
  )

  // Un clic sur + ajoute aux muets et retire la suggestion.
  await app.click('[data-suggestion="MARIE"] button')
  await sleep(400)
  check((await suggestions()).length === 0, 'la suggestion disparaît après le +')
  check(
    JSON.stringify(await characters()) === '["PAUL","MARIE"]',
    `MARIE ajoutée aux muets (${await characters()})`
  )
  let saved = false
  for (let i = 0; i < 20 && !saved; i++) {
    try {
      saved =
        JSON.stringify(
          Object.values(JSON.parse(readFileSync(planningFile, 'utf8')).tournage.muets)
        ) === '[["MARIE"]]'
    } catch {
      // en cours d'écriture
    }
    await sleep(150)
  }
  check(saved, 'muet enregistré dans planning.json')
  await app.screenshot('tournage-suggestions-apres.png')
}
