// Sous-étape 18C-12 : déplacer une scène dans le navigateur par glisser-déposer (repère
// d'insertion), y compris d'un acte à l'autre. Ordre identique dans l'éditeur, le navigateur et les Cartes ; numéros
// comme depuis les Cartes ; pas d'orpheline ; synopsis et marques suivent ; Cmd + Z en une étape.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

const SCRIPT = [
  '# ACTE 1',
  '',
  'INT. A - JOUR #10#',
  '',
  '= Résumé A.',
  '',
  'Action A.',
  '',
  'INT. GRENIER - NUIT #20#',
  '',
  'Il [[R:rose|Revoir]]pleut[[/R]] fort.',
  '',
  '# ACTE 2',
  '',
  'INT. C - JOUR #30#',
  '',
  'Action C.',
  '',
  'INT. D - NUIT #40#',
  '',
  'Action D.',
  ''
].join('\n')

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const fountainFile = join(dirname(projectFile), 'neoscenar', 'scenario.fountain')
  writeFileSync(fountainFile, SCRIPT)
  await app.openProject(projectFile)
  await app.module('Scénario')
  await sleep(1500)

  const rows = () =>
    app.evaluate(`[...document.querySelectorAll('.navigator-row')].map((row) =>
      row.classList.contains('section')
        ? row.querySelector('.navigator-title').textContent
        : row.querySelector('.navigator-number').textContent + ' ' +
          row.querySelector('.navigator-heading').textContent)`)
  const rowBox = (text) =>
    app.evaluate(`(() => {
      const row = [...document.querySelectorAll('.navigator-row')]
        .find((r) => r.textContent.includes(${JSON.stringify(text)}))
      const b = row.getBoundingClientRect()
      return { x: b.left + 60, y: b.top + b.height / 2, top: b.top, bottom: b.bottom }
    })()`)
  const saved = async () => {
    await sleep(1800)
    return readFileSync(fountainFile, 'utf8')
  }
  const numbers = (text) => [...text.matchAll(/#(\d+[A-Z]?)#/g)].map((m) => m[1])
  const editorHeadings = () =>
    app.evaluate(`[...document.querySelectorAll('.cm-line.fl-scene_heading, .cm-line.fl-section')]
      .map((l) => l.textContent.replace(/^S_\\d{4}/, '').trim())`)

  /** Glisse la scène `text` jusqu'au haut de la ligne `target` (ou sous la dernière ligne). */
  const drag = async (text, target, below = false) => {
    const from = await rowBox(text)
    const box = await rowBox(target)
    await app.mouseDrag(from, { x: from.x, y: below ? box.bottom - 2 : box.top + 3 }, 10)
    await sleep(700)
  }

  log('départ :', await rows())

  // 1. Glisser « INT. D » entre A et GRENIER : repère visible, puis dépôt.
  const from = await rowBox('INT. D')
  const target = await rowBox('INT. GRENIER')
  const send = (type, point, buttons) =>
    app.page.send('Input.dispatchMouseEvent', {
      type,
      x: point.x,
      y: point.y,
      button: type === 'mouseMoved' ? 'none' : 'left',
      buttons,
      clickCount: type === 'mouseMoved' ? 0 : 1
    })
  await send('mouseMoved', from, 0)
  await send('mousePressed', from, 1)
  const to = { x: from.x, y: target.top + 3 }
  for (let i = 1; i <= 10; i++) {
    await send('mouseMoved', { x: from.x, y: from.y + ((to.y - from.y) * i) / 10 }, 1)
    await sleep(30)
  }
  await sleep(200)
  const marker = await app.evaluate(`(() => {
    const m = document.querySelector('.navigator-drop-marker')
    return m ? m.getBoundingClientRect().top : null
  })()`)
  check(
    marker !== null && Math.abs(marker - target.top) < 4,
    `repère d'insertion au-dessus de GRENIER (${marker} / ${target.top})`
  )
  await app.screenshot('navigateur-glisser.png')
  await send('mouseReleased', to, 0)
  await sleep(600)

  const afterDrag = await rows()
  log('après le dépôt :', afterDrag)
  check(
    JSON.stringify(afterDrag) ===
      JSON.stringify([
        'ACTE 1',
        'S_0010 INT. A - JOUR',
        'S_0015 INT. D - NUIT',
        'S_0020 INT. GRENIER - NUIT',
        'ACTE 2',
        'S_0030 INT. C - JOUR'
      ]),
    'navigateur : D entre A et GRENIER, numéro 15 (comme depuis les Cartes)'
  )
  check(
    JSON.stringify(await editorHeadings()) ===
      JSON.stringify([
        'ACTE 1',
        'INT. A - JOUR',
        'INT. D - NUIT',
        'INT. GRENIER - NUIT',
        'ACTE 2',
        'INT. C - JOUR'
      ]),
    `éditeur : même ordre (${JSON.stringify(await editorHeadings())})`
  )
  let file = await saved()
  check(
    numbers(file).join(',') === '10,15,20,30',
    `fichier : numéros 10,15,20,30 (${numbers(file)})`
  )
  check(
    file.includes('INT. D - NUIT #15#\n\nAction D.\n\nINT. GRENIER'),
    'bloc de D entier à sa place'
  )
  check(
    await app.evaluate(`document.activeElement?.closest('.cm-editor') !== null`),
    'après un dépôt, le focus est dans l’éditeur'
  )
  check(
    (await app.navigatorCurrent())?.includes('INT. D') === true,
    'le curseur est sur la scène déplacée'
  )

  // 2. Cmd + Z (menu Édition > Annuler) : tout revient en une étape.
  await app.menu('Édition', 'Annuler')
  await sleep(500)
  file = await saved()
  log('après Annuler :', JSON.stringify(file), await rows())
  check(file === SCRIPT, 'Annuler : fichier identique au départ')
  check(
    (await rows()).join('|').includes('S_0030 INT. C - JOUR|S_0040 INT. D - NUIT'),
    'Annuler : navigateur revenu'
  )

  // 3. GRENIER glissé juste sous « ACTE 2 » : en tête de l'acte 2, numéro gardé, marque suivie.
  await drag('INT. GRENIER', 'INT. C')
  let now = await rows()
  log('sous ACTE 2 :', now)
  check(
    now.join('|') ===
      'ACTE 1|S_0010 INT. A - JOUR|ACTE 2|S_0020 INT. GRENIER - NUIT|S_0030 INT. C - JOUR|S_0040 INT. D - NUIT',
    'GRENIER change d’acte et garde S_0020'
  )
  file = await saved()
  check(
    file.indexOf('# ACTE 2') < file.indexOf('[[R:rose|Revoir]]pleut'),
    'la marque de révision a suivi la scène'
  )

  // D glissé juste au-dessus de « ACTE 2 » : fin de l'acte 1, entre 10 et 20.
  await drag('INT. D', 'ACTE 2')
  now = await rows()
  log('au-dessus de ACTE 2 :', now)
  check(
    now.join('|') ===
      'ACTE 1|S_0010 INT. A - JOUR|S_0015 INT. D - NUIT|ACTE 2|S_0020 INT. GRENIER - NUIT|S_0030 INT. C - JOUR',
    'D va à la fin de l’acte 1, numéro 15'
  )

  // A glissé tout en bas : dernière scène, numéro après 30.
  await drag('INT. A', 'INT. C', true)
  now = await rows()
  log('tout en bas :', now)
  check(
    /^ACTE 1\|S_0015 INT\. D - NUIT\|ACTE 2\|S_0020 INT\. GRENIER - NUIT\|S_0030 INT\. C - JOUR\|S_00[3-9]\d INT\. A - JOUR$/.test(
      now.join('|')
    ),
    'A va à la fin, avec un numéro après 30'
  )
  const navNumbers = now.filter((row) => row.startsWith('S_')).map((row) => row.slice(0, 6))
  await app.screenshot('navigateur-actes.png')

  // 4. Cartes : même ordre, aucune orpheline ; synopsis de A gardé.
  await sleep(1500)
  await app.module('Cartes')
  await sleep(800)
  const cards = await app.sceneCards()
  log('cartes :', cards)
  check(
    cards.map((c) => c.replace(' [sélectionnée]', '')).join(',') === navNumbers.join(','),
    'Cartes : même ordre que le navigateur'
  )
  check(
    (await app.evaluate(`document.querySelectorAll('.orphan-label').length`)) === 0,
    'aucune carte orpheline'
  )
  file = readFileSync(fountainFile, 'utf8')
  check(
    /INT\. A - JOUR #\d+#\n\n= Résumé A\.\n\nAction A\.\n?$/.test(file),
    'A à la fin, avec son synopsis'
  )

  await locked({ app, check, newProject })
}

// Numéros verrouillés : refus, même message que dans les Cartes.
async function locked({ app, check, newProject }) {
  const projectFile = newProject({ locked: true })
  const fountainFile = join(dirname(projectFile), 'neoscenar', 'scenario.fountain')
  writeFileSync(fountainFile, SCRIPT)
  await app.openProject(projectFile)
  await app.module('Scénario')
  await sleep(1500)
  const from = await app.evaluate(`(() => {
    const b = [...document.querySelectorAll('.navigator-row')].find((r) => r.textContent.includes('INT. D')).getBoundingClientRect()
    return { x: b.left + 60, y: b.top + b.height / 2 }
  })()`)
  const to = await app.evaluate(`(() => {
    const b = [...document.querySelectorAll('.navigator-row')].find((r) => r.textContent.includes('INT. GRENIER')).getBoundingClientRect()
    return { x: b.left + 60, y: b.top + 3 }
  })()`)
  await app.mouseDrag(from, to, 10)
  await sleep(700)
  const dialog = await app.dialog()
  check(
    dialog !== null && /verrouill/i.test(JSON.stringify(dialog)),
    `numéros verrouillés : message (${JSON.stringify(dialog)})`
  )
  check(readFileSync(fountainFile, 'utf8') === SCRIPT, 'numéros verrouillés : rien n’a bougé')
}
