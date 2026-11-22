// Étape 18C-1 : ordre des 10 rubriques de Données du projet sur les 7 thèmes, page de titre
// éditée dans le module (aller-retour avec le fichier et la fenêtre du Scénario), vues « À venir »,
// et aucun fichier modifié à l'ouverture d'un projet.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

const ORDER = [
  'Page de titre',
  'Log line',
  'Synopsis',
  'Personnages',
  'Lieux',
  'Documents',
  'Générique',
  'Pitch',
  'Tag line',
  'Note d’intention'
]

function snapshot(dir) {
  const out = {}
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name)
      if (statSync(p).isDirectory()) walk(p)
      else if (!p.includes('sauvegardes')) out[p] = statSync(p).mtimeMs
    }
  }
  walk(dir)
  return out
}

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const root = dirname(projectFile)
  const before = snapshot(root)
  await app.openProject(projectFile)
  await app.module('Données du projet')
  await sleep(800)

  const titles = () =>
    app.evaluate(
      `[...document.querySelectorAll('.research-tree .research-branch-title')].map((b) => b.textContent.replace(/\\d+$/, '').trim())`
    )
  const order = await titles()
  log('ordre :', JSON.stringify(order))
  check(JSON.stringify(order) === JSON.stringify(ORDER), 'les 10 rubriques dans le bon ordre')

  const clickEntry = (label) =>
    app.evaluate(
      `[...document.querySelectorAll('.research-tree .research-branch-title')].find((b) => b.textContent.replace(/\\d+$/, '').trim() === ${JSON.stringify(label)})?.click()`
    )

  // Vues provisoires.
  // Synopsis, Pitch et Note d'intention sont réalisés en 18C-2 (essai documents-markdown.mjs).
  for (const label of ['Log line', 'Tag line']) {
    await clickEntry(label)
    await sleep(300)
    const view = await app.evaluate(
      `({ h: document.querySelector('.research-sheet h2')?.textContent, text: document.querySelector('.research-sheet .panel-empty')?.textContent, active: document.querySelector('.research-branch-title.active')?.textContent.trim() })`
    )
    check(view.h === label && view.text === 'À venir', `${label} : vue « À venir »`)
    check(view.active === label, `${label} : rubrique active`)
  }

  // Page de titre dans le module.
  await clickEntry('Page de titre')
  await sleep(600)
  // Ouverture et simple visite de toutes les rubriques, sans saisie : aucun fichier ne change.
  const visited = snapshot(root)
  // Les fiches Personnages/Lieux créées d'après le scénario (étape 10C) existent déjà sans ce lot.
  const touched = Object.keys(visited).filter(
    (p) => before[p] !== visited[p] && !/[/\\](lieux|personnages)[/\\]/.test(p)
  )
  log('modifiés avant toute saisie :', JSON.stringify(touched.map((p) => p.replace(root, ''))))
  check(
    touched.length === 0,
    'ouverture + visite des rubriques : ni scenario.fountain ni projet.json ni aucun autre fichier du projet modifié'
  )
  const fields = await app.evaluate(
    `document.querySelectorAll('.research-sheet .title-page-field').length`
  )
  check(fields === 7, `page de titre : ${fields} champs`)
  const setField = (index, value) =>
    app.evaluate(`(() => {
      const el = document.querySelectorAll('.research-sheet .title-page-field')[${index}].querySelector('input, textarea')
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)})
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })()`)
  await setField(0, 'Le Grand Essai')
  await setField(2, 'Jeanne Martin')
  await app.evaluate(
    `[...document.querySelectorAll('.research-sheet button')].find((b) => b.textContent.trim() === 'Enregistrer')?.click()`
  )
  await sleep(1200)
  const fountain = readFileSync(join(root, 'neoscenar', 'scenario.fountain'), 'utf8')
  log(fountain.split('\n').slice(0, 6).join(' | '))
  check(/Title:\s*Le Grand Essai/.test(fountain), 'Fountain : titre écrit')
  check(/Jeanne Martin/.test(fountain), 'Fountain : auteur écrit')
  const msg = await app.evaluate(
    `document.querySelector('.title-page-actions .muted')?.textContent`
  )
  check(msg === 'Page de titre enregistrée.', 'message « enregistrée » affiché')
  await app.screenshot('page-de-titre-module.png')

  // Retour : la fenêtre du Scénario montre les mêmes valeurs.
  await app.module('Scénario')
  await sleep(600)
  await app.menu('Scénario', 'Page de titre…').catch(() => app.click('.tool-button'))
  await sleep(600)
  const dialog = await app.evaluate(
    `({ open: !!document.querySelector('.title-page-dialog'), title: document.querySelector('.title-page-dialog input')?.value })`
  )
  if (!dialog.open) {
    await app.evaluate(
      `[...document.querySelectorAll('.tool-button')].find((b) => b.textContent.includes('Page de titre'))?.click()`
    )
    await sleep(600)
  }
  const d2 = await app.evaluate(`document.querySelector('.title-page-dialog input')?.value ?? null`)
  check(d2 === 'Le Grand Essai', `fenêtre du Scénario : titre « ${d2} »`)
  await app.evaluate(
    `[...document.querySelectorAll('.title-page-dialog button')].find((b) => b.textContent.trim() === 'Annuler')?.click()`
  )
  await sleep(300)

  // Thèmes : rubriques lisibles et active soulignée.
  await app.module('Données du projet')
  for (const theme of ['defaut', 'cobalt', 'or', 'matrix', 'pinklady', 'forest', 'aqua']) {
    await app.evaluate(`window.neoscenar.setTheme(${JSON.stringify(theme)})`)
    await sleep(350)
    await clickEntry('Pitch')
    await sleep(200)
    const r = await app.evaluate(
      `({ n: document.querySelectorAll('.research-tree .research-branch-title').length, deco: getComputedStyle(document.querySelector('.research-branch-title.active')).textDecorationLine })`
    )
    check(r.n === 10 && r.deco === 'underline', `${theme} : 10 rubriques, active soulignée`)
  }
  await app.screenshot('donnees-10-rubriques.png')

  // Un projet existant ne change pas à l'ouverture (hors le scénario écrit plus haut).
  const after = snapshot(root)
  const changed = Object.keys(after).filter(
    (p) => before[p] !== undefined && before[p] !== after[p]
  )
  log('fichiers modifiés :', JSON.stringify(changed.map((p) => p.replace(root, ''))))
  check(
    changed.every((p) => p.endsWith('scenario.fountain') || p.endsWith('projet.json')),
    'seuls scenario.fountain et projet.json (titre) ont changé'
  )
  const created = Object.keys(after).filter((p) => before[p] === undefined)
  check(
    !created.some((p) => /synopsis|pitch|log-line|tag-line|note-intention/.test(p)),
    'aucun nouveau fichier de document'
  )
}
