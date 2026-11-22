// Étape 18C-6 : « Présents en plus » d'un jour du plan de tournage (ajout, modification,
// suppression, annulation, enregistrement dans planning.json).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { closeLinkBanner, sleep } from '../application.mjs'

const SCRIPT = `Title: Film essai

INT. CUISINE - JOUR #10#

Marie entre.
`

export default async function ({ app, check, newProject }) {
  const projectFile = newProject()
  const data = join(dirname(projectFile), 'neoscenar')
  writeFileSync(join(data, 'scenario.fountain'), SCRIPT)
  mkdirSync(join(data, 'personnages'), { recursive: true })
  const planningFile = join(data, 'planning.json')

  const presentsSaved = () => {
    try {
      return JSON.parse(readFileSync(planningFile, 'utf8')).tournage.jours[0].presents ?? []
    } catch {
      return null
    }
  }
  const settled = async (condition) => {
    for (let i = 0; i < 25; i++) {
      if (condition()) return true
      await sleep(150)
    }
    return false
  }
  const setValue = (selector, value) =>
    app.evaluate(`(() => {
      const input = document.querySelector(${JSON.stringify(selector)})
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)})
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })()`)
  const rows = () =>
    app.evaluate(
      `[...document.querySelectorAll('[data-present]')].map((li) => [...li.querySelectorAll('input')].map((i) => i.value).join('|'))`
    )
  const undo = async () => {
    await app.evaluate(`document.activeElement?.blur?.()`)
    const labels = await app.menuLabels('Édition')
    const entry = labels.find((label) => label.startsWith('Annuler'))
    return app.menu('Édition', entry.replace(' (désactivé)', ''))
  }

  await app.openProject(projectFile)
  await sleep(600)
  await app.module('Planification')
  await sleep(800)
  await closeLinkBanner(app)
  await app.click('[data-view="shooting"]')
  await sleep(800)
  await app.click('[data-new-day]')
  await sleep(600)

  check(JSON.stringify(await rows()) === '[]', 'aucun présent au départ')
  check(
    (await app.evaluate(`document.querySelector('[data-present-add]').disabled`)) === true,
    '+ grisé sans nom'
  )

  // Ajout avec un rôle, puis un second sans rôle (Entrée).
  await setValue('[data-present-new="nom"]', 'Marc')
  await setValue('[data-present-new="role"]', 'figurant')
  await app.click('[data-present-add]')
  await sleep(400)
  check(JSON.stringify(await rows()) === '["Marc|figurant"]', `Marc ajouté (${await rows()})`)
  check(
    (await app.evaluate(`document.querySelector('[data-present-new="nom"]').value`)) === '',
    'champ de saisie vidé'
  )
  await app.screenshot('tournage-presents-ajout.png')
  check(
    await settled(
      () => presentsSaved()?.[0]?.nom === 'Marc' && presentsSaved()[0].role === 'figurant'
    ),
    'enregistré dans planning.json'
  )

  // Modification du rôle : validée en quittant le champ.
  await app.evaluate(
    `document.querySelectorAll('[data-present] input')[1].setAttribute('data-role', '')`
  )
  await app.evaluate(`document.querySelector('[data-present] [data-role]').focus()`)
  await setValue('[data-present] [data-role]', 'doublure')
  await app.evaluate(
    `document.querySelector('[data-present] [data-role]').dispatchEvent(new FocusEvent('focusout', { bubbles: true }))`
  )
  await sleep(300)
  check(await settled(() => presentsSaved()?.[0]?.role === 'doublure'), 'rôle modifié enregistré')

  // Annuler (Cmd + Z) ramène « figurant », puis suppression.
  await undo()
  await sleep(400)
  check(
    JSON.stringify(await rows()) === '["Marc|figurant"]',
    `annulation de la modification (${await rows()})`
  )
  await app.click('[data-present] button')
  await sleep(400)
  check(JSON.stringify(await rows()) === '[]', 'présent supprimé')
  check(await settled(() => presentsSaved()?.length === 0), 'suppression enregistrée')
  await undo()
  await sleep(400)
  check(JSON.stringify(await rows()) === '["Marc|figurant"]', 'suppression annulée')
}
