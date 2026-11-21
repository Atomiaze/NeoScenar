// Étape 17E : entrées personnelles des menus de plan (Réglages > Vocabulaire des plans).
// Ajout, infobulle, suppression (la carte garde la valeur), doublon refusé, entrées du cours figées,
// persistance dans les préférences de l'application.

import { sleep } from '../application.mjs'

export default async function ({ app, check, newProject }) {
  await app.openProject(newProject())
  await app.click('[data-card-id="S20-P10"]')
  await sleep(500)

  const settings = async (open) => {
    if (open) {
      await app.menu('NeoScenar', 'Réglages…')
      await sleep(500)
    } else {
      await app.click('.dialog button.primary')
      await sleep(300)
    }
  }
  const block = (i) => `document.querySelectorAll('.vocab-list')[${i}]`
  const type = async (selector, text) => {
    await app.evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`)
    await app.page.send('Input.insertText', { text })
    await sleep(200)
  }
  const movementField = `[...document.querySelectorAll('.field')].find((f) => f.querySelector('.field-label')?.textContent === 'Mouvement de caméra')`
  const menuOptions = async () => {
    await app.evaluate(`${movementField}.querySelector('.combobox-toggle').click()`)
    await sleep(300)
    const list = await app.evaluate(
      `[...${movementField}.querySelectorAll('.combobox-list li')].map((li) => [li.textContent, li.title])`
    )
    await app.evaluate(`${movementField}.querySelector('.combobox-toggle').click()`)
    return list
  }

  // 1. Ajout de « Plan drone » dans Mouvement de caméra.
  await settings(true)
  await app.evaluate(`${block(1)}.open = true`)
  await sleep(200)
  const courseCount = await app.evaluate(`${block(1)}.querySelectorAll('.vocab-course').length`)
  check(courseCount > 0, `entrées du cours listées (${courseCount})`)
  check(
    (await app.evaluate(`${block(1)}.querySelector('.vocab-course button') === null`)) === true,
    'entrées du cours : ni Renommer ni Supprimer'
  )
  await type('.vocab-list[open] .vocab-form input[placeholder="Libellé"]', 'Plan drone')
  await type('.vocab-list[open] .vocab-form input[placeholder^="Définition"]', 'Vue du ciel')
  await app.evaluate(`${block(1)}.querySelector('.vocab-form button').click()`)
  await sleep(300)
  await app.screenshot('vocabulaire-reglages.png')

  // 2. Doublon refusé (casse et accents ignorés), y compris avec une entrée du cours.
  await type('.vocab-list[open] .vocab-form input[placeholder="Libellé"]', 'PLAN DRONE')
  await app.evaluate(`${block(1)}.querySelector('.vocab-form button').click()`)
  await sleep(300)
  const alert = await app.evaluate(`${block(1)}.querySelector('[role="alert"]')?.textContent ?? ''`)
  check(/existe déjà/.test(alert), `doublon refusé avec un message (« ${alert} »)`)
  await settings(false)

  // 3. Le menu des plans propose le terme avec sa définition ; on le choisit.
  const options = await menuOptions()
  const drone = options.find(([label]) => label === 'Plan drone')
  check(
    !!drone && drone[1] === 'Vue du ciel',
    'menu : « Plan drone » avec sa définition en infobulle'
  )
  check(options[0][0] !== 'Plan drone', 'menu : les entrées du cours viennent d’abord')
  await app.evaluate(`${movementField}.querySelector('.combobox-toggle').click()`)
  await sleep(200)
  await app.evaluate(
    `[...${movementField}.querySelectorAll('.combobox-list li')].find((li) => li.textContent === 'Plan drone').click()`
  )
  await sleep(500)

  // 4. Suppression : la carte garde la valeur, affichée telle quelle.
  await settings(true)
  await app.evaluate(`${block(1)}.open = true`)
  await sleep(200)
  await app.evaluate(
    `[...${block(1)}.querySelectorAll('.vocab-terms li:not(.vocab-course) button')].find((b) => b.textContent === 'Supprimer').click()`
  )
  await sleep(300)
  await settings(false)
  const shown = await app.evaluate(`${movementField}.querySelector('input').value`)
  check(shown === 'Plan drone', 'entrée supprimée : la carte affiche toujours « Plan drone »')
  const after = await menuOptions()
  check(!after.some(([label]) => label === 'Plan drone'), 'entrée supprimée : plus dans le menu')
  check(
    (await app.evaluate(`${movementField}.querySelector('input').value`)) === 'Plan drone',
    'la valeur n’a pas été effacée par l’ouverture du menu'
  )

  // 5. Persistance : ajout, puis lecture du fichier de préférences.
  await settings(true)
  await app.evaluate(`${block(2)}.open = true`)
  await type('.vocab-list[open] .vocab-form input[placeholder="Libellé"]', 'Angle penché')
  await app.evaluate(`${block(2)}.querySelector('.vocab-form button').click()`)
  await sleep(600)
  await settings(false)
  const saved = await app.evaluate(`window.neoscenar.getCustomVocabulary()`)
  check(
    saved.cameraAngles.some((t) => t.label === 'Angle penché'),
    'l’entrée est gardée côté application (préférences)'
  )
}
