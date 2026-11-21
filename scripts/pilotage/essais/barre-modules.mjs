// Étape 17A : barre de modules. Ordre, libellés (plus de « Recherches »), icône dossier
// (captures sur un thème clair et un sombre), projet existant inchangé.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

// Les modules créent eux-mêmes des fichiers au premier passage (fiches de lieux, planning) : on
// compare seulement les trois fichiers du projet existant.
const MAIN_FILES = ['scenario.fountain', 'decoupage.json', 'projet.json']
const hashFolder = (dir) =>
  MAIN_FILES.map((f) =>
    createHash('sha1')
      .update(readFileSync(join(dir, f)))
      .digest('hex')
  ).join()

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const dataDir = join(dirname(projectFile), 'neoscenar')
  const before = hashFolder(dataDir)
  await app.openProject(projectFile)
  await sleep(800)

  const labels = await app.evaluate(
    `[...document.querySelectorAll('.module-bar button[aria-label]')].map((b) => b.getAttribute('aria-label'))`
  )
  log(`barre : ${JSON.stringify(labels)}`)
  check(
    JSON.stringify(labels) ===
      JSON.stringify([
        'Projet',
        'Données du projet',
        'Planification',
        'Cartes',
        'Scénario',
        'Statistiques'
      ]),
    'ordre de la barre'
  )
  const active = await app.evaluate(
    `document.querySelector('.module-bar .active')?.getAttribute('aria-label')`
  )
  check(active === 'Cartes', `module ouvert par défaut : ${active}`)

  const tip = await app.evaluate(
    `document.querySelector('.module-bar [aria-label="Données du projet"]').title`
  )
  check(tip === 'Données du projet', 'infobulle')

  const hasOld = async () =>
    (
      await app.evaluate(
        `document.body.innerText + [...document.querySelectorAll('[title],[aria-label]')].map((e) => (e.title||'') + (e.getAttribute('aria-label')||'')).join(' ')`
      )
    ).includes('Recherches')
  for (const module of [
    'Données du projet',
    'Planification',
    'Cartes',
    'Scénario',
    'Statistiques'
  ]) {
    await app.module(module)
    await sleep(500)
    check(!(await hasOld()), `aucun « Recherches » à l’écran (${module})`)
  }

  // Icône : un clair (Aqua) et un sombre (Cobalt), active puis inactive.
  for (const theme of ['aqua', 'cobalt']) {
    await app.evaluate(`window.neoscenar.setTheme('${theme}')`)
    await sleep(500)
    await app.module('Données du projet')
    await sleep(500)
    await app.screenshot(`barre-modules-${theme}-active.png`)
    await app.module('Cartes')
    await sleep(500)
    await app.screenshot(`barre-modules-${theme}-inactive.png`)
  }
  await app.evaluate(`window.neoscenar.setTheme('defaut')`)

  check(hashFolder(dataDir) === before, 'les fichiers du projet n’ont pas changé')
}
