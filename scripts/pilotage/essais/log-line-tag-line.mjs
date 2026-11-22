// Étape 18C-3 : log line et tag line (versions, case « retenue », suppression confirmée,
// fichier au format prévu, relecture d'un fichier écrit à la main).

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const data = join(dirname(projectFile), 'neoscenar')
  const read = (name) => readFileSync(join(data, name), 'utf8')

  await app.openProject(projectFile)
  await app.module('Données du projet')
  await sleep(800)

  const clickEntry = (label) =>
    app.evaluate(
      `[...document.querySelectorAll('.research-tree .research-branch-title')].find((b) => b.textContent.replace(/\\d+$/, '').trim() === ${JSON.stringify(label)})?.click()`
    )
  const view = () =>
    app.evaluate(`({
      title: document.querySelector('.research-sheet h2')?.textContent,
      active: document.querySelector('.research-branch-title.active')?.textContent.trim(),
      texts: [...document.querySelectorAll('.version-block textarea')].map((t) => t.value),
      heads: [...document.querySelectorAll('.version-block h3')].map((h) => h.textContent),
      retained: [...document.querySelectorAll('.version-block input[type=checkbox]')].map((c) => c.checked),
      spell: document.querySelector('.version-block textarea')?.spellcheck
    })`)
  const add = () =>
    app.evaluate(`document.querySelector('[aria-label="Ajouter une version"]')?.click()`)
  const typeIn = async (index, text) => {
    await app.evaluate(`document.querySelectorAll('.version-block textarea')[${index}].focus()`)
    await app.page.send('Input.insertText', { text })
    await sleep(150)
  }
  const retain = (index) =>
    app.evaluate(
      `document.querySelectorAll('.version-block input[type=checkbox]')[${index}].click()`
    )
  const trash = (index) =>
    app.evaluate(
      `document.querySelectorAll('.version-block [aria-label="Supprimer cette version"]')[${index}].click()`
    )

  // 1. Visite : rien n'est écrit.
  await clickEntry('Log line')
  await sleep(500)
  let v = await view()
  check(v.title === 'Log line' && v.active === 'Log line', 'vue Log line et rubrique active')
  await sleep(1200)
  check(!existsSync(join(data, 'log-line.md')), 'aucun fichier créé sans saisie')

  // 2. Trois versions, la 2e retenue.
  for (let i = 0; i < 3; i++) await add()
  await sleep(200)
  await typeIn(0, 'Un père cherche.')
  await typeIn(1, 'Un homme seul.')
  await typeIn(2, 'Une fille part.')
  await retain(1)
  await sleep(1500)
  v = await view()
  check(v.texts.length === 3 && v.spell === true, 'trois versions, correcteur actif')
  check(
    read('log-line.md') ===
      '## Version 1\n\nUn père cherche.\n\n## Version 2 (retenue)\n\nUn homme seul.\n\n## Version 3\n\nUne fille part.\n',
    'fichier au format prévu'
  )

  // 3. Retenir la 3e décoche la 2e.
  await retain(2)
  await sleep(1500)
  v = await view()
  check(JSON.stringify(v.retained) === '[false,false,true]', 'une seule version retenue')

  // 4. Suppression de la 1re : confirmation, renumérotation, la retenue reste la bonne.
  await trash(0)
  await sleep(300)
  const dialog = await app.dialog()
  check(dialog !== null, 'confirmation demandée pour une version non vide')
  await app.dialogButton('Supprimer')
  await sleep(1500)
  v = await view()
  check(
    JSON.stringify(v.texts) === '["Un homme seul.","Une fille part."]' &&
      JSON.stringify(v.retained) === '[false,true]' &&
      v.heads[1] === 'Version 2',
    'version supprimée, renumérotée, retenue conservée'
  )
  check(
    read('log-line.md').includes('## Version 2 (retenue)\n\nUne fille part.'),
    'fichier mis à jour'
  )

  // 5. Version vide : supprimée sans confirmation.
  await add()
  await sleep(200)
  await trash(2)
  await sleep(300)
  check(
    (await app.dialog()) === null && (await view()).texts.length === 2,
    'version vide supprimée sans question'
  )

  // 6. Tag line indépendante, puis fichier écrit à la main relu.
  await clickEntry('Tag line')
  await sleep(500)
  v = await view()
  check(v.title === 'Tag line' && v.texts.length === 0, 'tag line vide et indépendante')
  writeFileSync(
    join(data, 'tag-line.md'),
    '## Version 4\n\nPartir pour revenir.\n\n## version 9 (Retenue)\n\nRevenir pour partir.\n',
    'utf8'
  )
  await clickEntry('Log line')
  await sleep(300)
  await clickEntry('Tag line')
  await sleep(600)
  v = await view()
  check(
    JSON.stringify(v.texts) === '["Partir pour revenir.","Revenir pour partir."]' &&
      JSON.stringify(v.retained) === '[false,true]',
    'fichier écrit à la main relu sans perte'
  )
  await app.screenshot('log-line-tag-line')
  log('ok')
}
