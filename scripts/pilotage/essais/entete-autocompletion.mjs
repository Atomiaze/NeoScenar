// Étape 17D : autocomplétion du champ « En-tête » du panneau de détail d'une carte scène
// (préfixes, lieux des autres cartes, moments), liste au clavier (↑ ↓ Entrée Échap).

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

const KEYS = {
  ArrowDown: 40,
  ArrowUp: 38,
  Enter: 13,
  Escape: 27,
  Tab: 9
}

export default async function ({ app, check, newProject }) {
  const projectFile = newProject()
  await app.openProject(projectFile)
  await app.click('[data-card-id="S10"]')
  await sleep(500)

  const press = async (key) => {
    const params = { key, code: key, windowsVirtualKeyCode: KEYS[key] }
    await app.page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...params })
    await app.page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...params })
    await sleep(250)
  }
  const type = async (text) => {
    await app.page.send('Input.insertText', { text })
    await sleep(300)
  }
  const field = `document.querySelector('input[role="combobox"][placeholder="INT. CUISINE - JOUR"]')`
  const options = () =>
    app.evaluate(`[...document.querySelectorAll('.combobox-list li')].map((li) => li.textContent)`)
  const value = () => app.evaluate(`${field}.value`)
  const clear = async () => {
    await app.evaluate(`(() => { const f = ${field}; f.focus(); f.select() })()`)
    await app.page.send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      key: 'Backspace',
      code: 'Backspace',
      windowsVirtualKeyCode: 8
    })
    await app.page.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Backspace',
      code: 'Backspace'
    })
    await sleep(300)
  }

  const projectDir = dirname(projectFile)
  const fountain = () => readFileSync(join(projectDir, 'neoscenar', 'scenario.fountain'), 'utf8')
  const places = () =>
    readdirSync(join(projectDir, 'neoscenar', 'lieux')).filter((f) => f.endsWith('.md'))
  const original = fountain()

  check((await app.evaluate(`!!${field}`)) === true, 'champ « En-tête » présent')
  await clear()
  await type('in')
  let shown = await options()
  check(shown.includes('INT.') && shown.includes('INT./EXT.'), `« in » propose INT. (${shown})`)
  await app.screenshot('entete-prefixe.png')
  await sleep(1500)
  check(fountain() === original, 'frappe en cours : le Fountain n’est pas modifié')
  check(!places().some((f) => /^IN?\.md$/.test(f)), `aucune fiche « I » ni « IN » (${places()})`)

  await press('Enter')
  check((await value()) === 'INT. ', `Entrée accepte le préfixe (« ${await value()} »)`)
  shown = await options()
  check(shown.length > 0, `après « INT. », la liste des lieux s'ouvre (${shown})`)
  await app.screenshot('entete-lieux.png')

  await press('Escape')
  check((await options()).length === 0, 'Échap ferme la liste')
  check((await value()) === 'INT. ', 'Échap n’efface pas la saisie')
  await type('X')
  check((await value()) === 'INT. X', 'saisie libre possible')

  await clear()
  await type('INT. GRENIER - ')
  shown = await options()
  check(shown.includes('JOUR') && shown.includes('NUIT'), `après « - », les moments (${shown})`)
  check(
    shown.length > 0 && shown.every((label) => !/[-–—]\s*$/.test(label)),
    'après « - », jamais un lieu terminé par un tiret'
  )
  await press('Escape')
  await sleep(1500)
  check(fountain() === original, 'Échap : le Fountain n’est toujours pas modifié')
  // Liste fermée : Entrée valide l'en-tête.
  await press('Enter')
  await sleep(1500)
  check(
    /^INT\. GRENIER -\s*#10#$/m.test(fountain()),
    'Entrée (liste fermée) : l’en-tête est écrit dans le Fountain'
  )
  check(!places().some((f) => /-\.md$/.test(f)), `aucune fiche terminée par un tiret (${places()})`)

  await clear()
  await type('INT. GRENIER - ')
  await press('ArrowDown')
  await press('Enter')
  check(/^INT\. GRENIER - \S+/.test(await value()), `moment accepté (« ${await value()} »)`)
  await app.screenshot('entete-moments.png')
  // Perte du focus : validation.
  await app.click('[data-card-id="S30"]')
  await sleep(1500)
  check(/^INT\. GRENIER - NUIT #10#$/m.test(fountain()), 'perte du focus : l’en-tête est écrit')
}
