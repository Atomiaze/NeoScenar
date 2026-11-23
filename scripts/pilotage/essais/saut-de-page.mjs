// Bouton « Saut de page » de la barre des éléments : sur une ligne vide (après Entrée), « === » est
// écrit à chaque fois, même après plusieurs sauts de page. Sur une ligne écrite, il est ajouté dessous.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

const SCRIPT = 'INT. A - JOUR #10#\n\nDébut.\n'

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const fountainFile = join(dirname(projectFile), 'neoscenar', 'scenario.fountain')
  writeFileSync(fountainFile, SCRIPT)
  await app.openProject(projectFile)
  await app.module('Scénario')
  await sleep(1500)

  const enter = async () => {
    const params = { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }
    await app.page.send('Input.dispatchKeyEvent', { type: 'keyDown', ...params, text: '\r' })
    await app.page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...params })
    await sleep(150)
  }
  await app.mouseClick('.cm-line', 'Début.')
  await app.page.send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown',
    key: 'End',
    code: 'End',
    windowsVirtualKeyCode: 35
  })
  await sleep(150)
  for (let i = 1; i <= 4; i++) {
    await enter()
    await app.page.send('Input.insertText', { text: `Action ${i}.` })
    await sleep(150)
    await enter()
    await app.click('.element-bar-button[aria-label^="Saut de page"]')
    await sleep(200)
  }
  await enter()
  await app.page.send('Input.insertText', { text: 'Fin.' })
  await sleep(1800)
  const file = readFileSync(fountainFile, 'utf8')
  log('fichier :', JSON.stringify(file))
  const breaks = (file.match(/^===$/gm) ?? []).length
  check(breaks === 4, `quatre sauts de page écrits (${breaks})`)
  check(file.includes('Action 4.\n\n===\n\nFin.'), 'le dernier saut de page est suivi du texte')
  // Sur une ligne écrite : le texte est gardé, le saut de page est ajouté en dessous.
  await app.mouseClick('.cm-line', 'Action 2.')
  await sleep(150)
  await app.click('.element-bar-button[aria-label^="Saut de page"]')
  await sleep(1800)
  const after = readFileSync(fountainFile, 'utf8')
  log('ligne écrite :', JSON.stringify(after))
  check(
    after.includes('Action 2.\n\n===\n\n===\n\nAction 3.'),
    'ligne écrite : texte gardé, saut de page ajouté dessous'
  )
  await app.screenshot('saut-de-page.png')
}
