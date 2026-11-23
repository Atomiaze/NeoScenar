// Sous-étape 18C-13 (2e partie) : fenêtre d'édition d'une scène brouillon (double-clic, Valider en une
// étape d'annulation, en-tête obligatoire), recherche qui signale un résultat dans un brouillon, case
// « Brouillon » des Cartes (annulable dans les Cartes), étiquette du plan de tournage.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { closeLinkBanner, sleep } from '../application.mjs'

const SCRIPT = [
  'INT. A - JOUR #10#',
  '',
  'Action A.',
  '',
  'INT. B - JOUR #20#',
  '[[BROUILLON]]',
  '',
  'Action B secrète.',
  '',
  'INT. C - JOUR #30#',
  '',
  'Action C.',
  ''
].join('\n')

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const fountainFile = join(dirname(projectFile), 'neoscenar', 'scenario.fountain')
  writeFileSync(fountainFile, SCRIPT)
  await app.openProject(projectFile)
  await app.module('Scénario')
  await sleep(1500)

  const saved = async () => {
    await sleep(1800)
    return readFileSync(fountainFile, 'utf8')
  }
  const key = async (key, code, vk, modifiers = 0, text) => {
    const params = { key, code, windowsVirtualKeyCode: vk, modifiers }
    await app.page.send('Input.dispatchKeyEvent', {
      type: text ? 'keyDown' : 'rawKeyDown',
      ...params,
      ...(text ? { text } : {})
    })
    await app.page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...params })
    await sleep(150)
  }
  const dialogLines = () =>
    app.evaluate(
      `[...document.querySelectorAll('.draft-dialog .cm-line')].map((l) => l.textContent)`
    )
  const dialogButton = (label) =>
    app.evaluate(`[...document.querySelectorAll('.draft-dialog button')]
      .find((b) => b.textContent.trim() === ${JSON.stringify(label)})?.click()`)
  const doubleClickRow = async (text) => {
    const box = await app.evaluate(`(() => {
      const row = [...document.querySelectorAll('.navigator-row')]
        .find((r) => r.textContent.includes(${JSON.stringify(text)}))
      const b = row.getBoundingClientRect()
      return { x: b.left + 60, y: b.top + b.height / 2 }
    })()`)
    for (const clickCount of [1, 2]) {
      for (const type of ['mousePressed', 'mouseReleased']) {
        await app.page.send('Input.dispatchMouseEvent', {
          type,
          ...box,
          button: 'left',
          buttons: type === 'mousePressed' ? 1 : 0,
          clickCount
        })
      }
    }
    await sleep(500)
  }

  // 1. Double-clic sur B : la fenêtre montre la scène sans la note.
  await doubleClickRow('INT. B')
  let lines = await dialogLines()
  log('fenêtre :', lines)
  check(lines.join('|').includes('INT. B - JOUR'), 'fenêtre ouverte sur la scène B')
  check(!lines.join('|').includes('BROUILLON'), 'la note [[BROUILLON]] n’est pas montrée')
  await app.screenshot('brouillon-3-fenetre.png')

  // Écrire une ligne à la fin, puis Valider.
  await key('Enter', 'Enter', 13, 0, '\r')
  await app.page.send('Input.insertText', { text: 'Ajout dans le brouillon.' })
  await sleep(300)
  await dialogButton('Valider')
  let file = await saved()
  log('après Valider :', JSON.stringify(file))
  check(
    file.includes('Action B secrète.\n\nAjout dans le brouillon.\n\nINT. C'),
    'texte ajouté dans le bloc de B'
  )
  check(file.includes('INT. B - JOUR #20#\n[[BROUILLON]]\n'), 'B reste un brouillon')
  check(
    !(await app.scriptLines()).join('|').includes('Ajout dans le brouillon'),
    'le texte ajouté reste absent de la page'
  )
  await app.menu('Édition', 'Annuler')
  file = await saved()
  check(file === SCRIPT, 'Annuler : une seule étape')

  // 2. En-tête effacé : refus, la fenêtre reste ouverte.
  await doubleClickRow('INT. B')
  await key('a', 'KeyA', 65, 4)
  await app.page.send('Input.insertText', { text: 'Juste du texte' })
  await sleep(300)
  await dialogButton('Valider')
  await sleep(300)
  const error = await app.evaluate(
    `document.querySelector('.draft-dialog .field-error')?.textContent ?? null`
  )
  log('refus :', error)
  check(error?.includes('en-tête'), 'refus sans en-tête, message affiché')
  await dialogButton('Annuler')
  await sleep(300)
  check(
    (await app.evaluate(`document.querySelector('.draft-dialog') === null`)) === true,
    'Annuler ferme la fenêtre'
  )
  check((await saved()) === SCRIPT, 'rien n’est écrit après Annuler')

  // 3. Recherche : un résultat dans B est signalé, la fenêtre est proposée.
  await app.mouseClick('.cm-line', 'Action A.')
  await app.menu('Édition', 'Rechercher…')
  await sleep(300)
  await app.page.send('Input.insertText', { text: 'secrète' })
  // Le panneau ne lit le champ qu'au relâchement d'une touche : la première Entrée l'enregistre.
  await key('Enter', 'Enter', 13, 0, '\r')
  await key('Enter', 'Enter', 13, 0, '\r')
  await sleep(400)
  const hit = await app.evaluate(
    `document.querySelector('.draft-search-hit .draft-search-text')?.textContent ?? null`
  )
  log('recherche :', hit)
  check(hit?.includes('S_0020'), 'résultat dans le brouillon S_0020 signalé')
  await app.screenshot('brouillon-4-recherche.png')
  await app.evaluate(`document.querySelector('.draft-search-hit button.primary').click()`)
  await sleep(400)
  check(
    (await dialogLines()).join('|').includes('secrète'),
    'la fenêtre s’ouvre depuis la recherche'
  )
  const marked = await app.evaluate(
    `[...document.querySelectorAll('.draft-dialog .cm-searchMatch')].map((m) => m.textContent)`
  )
  const selected = await app.evaluate(`getSelection().toString()`)
  log('surligné :', marked, 'sélection :', JSON.stringify(selected))
  check(
    marked.length === 1 && marked[0] === 'secrète',
    'le mot cherché est surligné dans la fenêtre'
  )
  check(selected === 'secrète', 'la première occurrence est sélectionnée')
  await app.screenshot('brouillon-4b-fenetre-recherche.png')
  await dialogButton('Annuler')
  await sleep(300)

  // 4. Cartes : étiquette, case décochée puis Cmd + Z dans les Cartes.
  await app.module('Cartes')
  await sleep(800)
  const tags = await app.evaluate(`[...document.querySelectorAll('[data-card-kind="scene"]')]
    .filter((c) => c.querySelector('.draft-tag')).map((c) => c.querySelector('.card-number').textContent)`)
  log('cartes brouillon :', tags)
  check(tags.length === 1 && tags[0] === 'S_0020', 'carte S_0020 avec l’étiquette « Brouillon »')
  await app.mouseClick('[data-card-kind="scene"]', 'S_0020')
  await sleep(400)
  await app.screenshot('brouillon-5-carte.png')
  const box = await app.evaluate(`(() => {
    const input = [...document.querySelectorAll('.sheet label')].find((l) => l.textContent.trim() === 'Brouillon')?.querySelector('input')
    return input ? input.checked : null
  })()`)
  check(box === true, 'case « Brouillon » cochée dans la fiche')
  // Vrai clic de souris : la case garde le focus, et Cmd + Z doit quand même annuler dans les Cartes.
  await app.mouseClick('.sheet input[type="checkbox"]')
  file = await saved()
  log('focus :', await app.evaluate('document.activeElement?.type ?? null'))
  check(file === SCRIPT.replace('[[BROUILLON]]\n', ''), 'case décochée : note retirée')
  // Dans les Cartes, l'entrée du menu dit ce qu'elle annule (« Annuler la modification »).
  const undoLabel = (await app.menuLabels('Édition')).find((label) => label.startsWith('Annuler'))
  log('menu :', undoLabel)
  await app.menu('Édition', undoLabel)
  file = await saved()
  check(file === SCRIPT, 'Annuler dans les Cartes : note revenue')

  // 5. Plan de tournage : la scène reste, avec son étiquette.
  await app.module('Planification')
  await sleep(800)
  await closeLinkBanner(app)
  await app.click('[data-view="shooting"]')
  await sleep(800)
  const shooting =
    await app.evaluate(`[...document.querySelectorAll('[data-shooting="unplanned"] [data-scene]')]
    .map((s) => s.dataset.scene + (s.querySelector('.draft-tag') ? ' brouillon' : ''))`)
  log('tournage :', shooting)
  check(shooting.includes('S_0020 brouillon'), 'plan de tournage : S_0020 avec l’étiquette')
  check(shooting.length === 3, 'les trois scènes au plan de tournage')
  await app.screenshot('brouillon-6-tournage.png')
}
