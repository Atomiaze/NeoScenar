// Étape 17C : blocs du générique repliés par défaut, état gardé (changement de module, fichier de
// préférences, réouverture du projet), boutons « Tout réduire » et « Tout déployer ».

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { sleep } from '../application.mjs'

export default async function ({ app, check, newProject }) {
  const projectFile = newProject()
  const electron = `process.mainModule.require('electron')`
  const userData = await app.main.evaluate(`${electron}.app.getPath('userData')`)
  const openIds = () => {
    const prefs = JSON.parse(readFileSync(join(userData, 'preferences.json'), 'utf8'))
    return Object.values(prefs.creditsOpen ?? {})[0] ?? []
  }
  const counts = () =>
    app.evaluate(`({
      total: document.querySelectorAll('.credits-block').length,
      open: [...document.querySelectorAll('.credits-block')].filter((b) => b.open).length
    })`)
  const clickButton = (label) =>
    app.evaluate(
      `[...document.querySelectorAll('.research-sheet-header button')].find((b) => b.textContent.trim() === ${JSON.stringify(label)})?.click()`
    )
  const openCredits = async () => {
    await app.module('Données du projet')
    await sleep(500)
    await app.evaluate(
      `[...document.querySelectorAll('.research-branch-title')].find((b) => b.textContent.trim() === 'Générique')?.click()`
    )
    await sleep(800)
  }
  const toggleBlock = (index) =>
    app.evaluate(`document.querySelectorAll('.credits-block > summary')[${index}]?.click()`)

  await app.openProject(projectFile)
  await openCredits()
  let state = await counts()
  check(
    state.total > 0 && state.open === 0,
    `projet neuf : tout replié (${state.open}/${state.total})`
  )

  await toggleBlock(0)
  await toggleBlock(2)
  await sleep(400)
  state = await counts()
  check(state.open === 2, `deux blocs ouverts (${state.open})`)

  await app.module('Cartes')
  await sleep(500)
  await openCredits()
  state = await counts()
  check(state.open === 2, `après Cartes, toujours deux ouverts (${state.open})`)
  check(openIds().length === 2, 'état écrit dans les préférences de l’application')

  // Réouverture du projet : l'état est relu depuis le fichier de préférences.
  await app.openProject(projectFile)
  await openCredits()
  state = await counts()
  check(state.open === 2, `après réouverture du projet, deux ouverts (${state.open})`)

  await clickButton('Tout déployer')
  await sleep(400)
  state = await counts()
  check(state.open === state.total, `Tout déployer (${state.open}/${state.total})`)
  check(openIds().length === state.total, 'Tout déployer enregistré')
  await clickButton('Tout réduire')
  await sleep(400)
  state = await counts()
  check(state.open === 0, `Tout réduire (${state.open})`)
  check(openIds().length === 0, 'Tout réduire enregistré')

  // Un champ rempli dans un bloc replié n'est pas perdu.
  await toggleBlock(0)
  await sleep(300)
  await app.evaluate(`(() => {
    const input = document.querySelector('.credits-block[open] .credits-rubric input')
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Titre essai')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })()`)
  await sleep(300)
  await toggleBlock(0)
  await sleep(300)
  await toggleBlock(0)
  await sleep(300)
  const kept = await app.evaluate(
    `document.querySelector('.credits-block[open] .credits-rubric input')?.value`
  )
  check(kept === 'Titre essai', `champ gardé après repli et déploiement (${kept})`)
  await app.screenshot('generique-replie')
}
