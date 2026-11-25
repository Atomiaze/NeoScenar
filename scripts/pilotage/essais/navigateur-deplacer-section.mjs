// Sous-étape 18C-16 : déplacer une section avec ses scènes dans le navigateur par glisser-déposer.
// Places permises (au-dessus d'une section, tout en bas), repère rouge ailleurs ; niveau adapté ;
// ordre identique dans l'éditeur, le navigateur et les Cartes ; numéros comme depuis les Cartes ;
// note de couleur, synopsis, brouillon et marques suivent ; Cmd + Z en une étape ; dépôt à sa propre
// place sans étape ; numéros verrouillés refusés ; « Renuméroter ? » accepté.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

const SCRIPT = [
  '# ACTE 1',
  '[[COULEUR #2463EB]]',
  '',
  '= Le début.',
  '',
  'INT. A - JOUR #10#',
  '',
  'Action A.',
  '',
  '## Matin',
  '',
  'INT. B - JOUR #20#',
  '',
  'Il [[R:rose|Revoir]]pleut[[/R]] fort.',
  '',
  '## Soir',
  '',
  'INT. C - NUIT #30#',
  '[[BROUILLON]]',
  '',
  'Action C.',
  '',
  '# ACTE 2',
  '',
  'INT. D - JOUR #40#',
  '',
  'Action D.',
  '',
  'INT. E - JOUR #50#',
  '',
  'Action E.',
  '',
  '# ACTE 3',
  '',
  'INT. F - JOUR #60#',
  '',
  'Action F.',
  ''
].join('\n')

const THEMES = ['defaut', 'cobalt', 'or', 'matrix', 'pinklady', 'forest', 'aqua']

function tools(app, fountainFile) {
  const rows = () =>
    app.evaluate(`[...document.querySelectorAll('.navigator-row')].map((row) =>
      row.classList.contains('section')
        ? '§' + row.querySelector('.navigator-title').textContent
        : row.querySelector('.navigator-number').textContent + ' ' +
          row.querySelector('.navigator-heading').textContent)`)
  const rowBox = (text) =>
    app.evaluate(`(() => {
      const row = [...document.querySelectorAll('.navigator-row')]
        .find((r) => r.textContent.includes(${JSON.stringify(text)}))
      const b = row.getBoundingClientRect()
      return { x: b.left + 90, y: b.top + b.height / 2, top: b.top, bottom: b.bottom }
    })()`)
  const saved = async () => {
    await sleep(1800)
    return readFileSync(fountainFile, 'utf8')
  }
  const send = (type, point, buttons) =>
    app.page.send('Input.dispatchMouseEvent', {
      type,
      x: point.x,
      y: point.y,
      button: type === 'mouseMoved' ? 'none' : 'left',
      buttons,
      clickCount: type === 'mouseMoved' ? 0 : 1
    })
  /**
   * Glisse la ligne `text` jusqu'au haut de la ligne `target` (ou sous la dernière ligne), en lisant
   * le repère juste avant de relâcher : null (aucun), 'accent' ou 'refusé'.
   */
  const drag = async (text, target, below = false, screenshot = null, whileHeld = null) => {
    const from = await rowBox(text)
    const box = await rowBox(target)
    const to = { x: from.x, y: below ? box.bottom - 2 : box.top + 3 }
    await send('mouseMoved', from, 0)
    await send('mousePressed', from, 1)
    for (let i = 1; i <= 10; i++) {
      await send('mouseMoved', { x: from.x, y: from.y + ((to.y - from.y) * i) / 10 }, 1)
      await sleep(30)
    }
    await sleep(200)
    const marker = await app.evaluate(`(() => {
      const m = document.querySelector('.navigator-drop-marker')
      return m ? (m.classList.contains('refused') ? 'refusé' : 'accent') : null
    })()`)
    if (screenshot) await app.screenshot(screenshot)
    if (whileHeld) await whileHeld()
    await send('mouseReleased', to, 0)
    await sleep(700)
    return marker
  }
  const numbers = (text) => [...text.matchAll(/#(\d+[A-Z]?)#/g)].map((m) => m[1])
  const sections = (text) => text.split('\n').filter((line) => /^#+ /.test(line))
  return { rows, saved, drag, numbers, sections }
}

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const fountainFile = join(dirname(projectFile), 'neoscenar', 'scenario.fountain')
  writeFileSync(fountainFile, SCRIPT)
  await app.openProject(projectFile)
  await app.module('Scénario')
  await sleep(1500)
  const { rows, saved, drag, numbers, sections } = tools(app, fountainFile)
  log('départ :', await rows())

  // 1. ACTE 3 au-dessus d'ACTE 1 : repère en couleur d'accent, tout le bloc bouge.
  let marker = await drag('ACTE 3', 'ACTE 1', false, 'section-glisser.png')
  check(marker === 'accent', `repère en couleur d'accent au-dessus d'ACTE 1 (${marker})`)
  let now = await rows()
  log('ACTE 3 en tête :', now)
  check(
    now.join('|') ===
      '§ACTE 3|S_0005 INT. F - JOUR|§ACTE 1|S_0010 INT. A - JOUR|§Matin|S_0020 INT. B - JOUR|§Soir|S_0030 INT. C - NUIT|§ACTE 2|S_0040 INT. D - JOUR|S_0050 INT. E - JOUR',
    'navigateur : ACTE 3 et F en tête, F prend 5 (comme depuis les Cartes)'
  )
  let file = await saved()
  check(numbers(file).join(',') === '5,10,20,30,40,50', `fichier : numéros (${numbers(file)})`)
  check(
    file.startsWith('# ACTE 3\n\nINT. F - JOUR #5#\n\nAction F.\n\n# ACTE 1\n'),
    'bloc entier en tête'
  )
  check(
    (await app.navigatorCurrent())?.includes('ACTE 3') === true,
    'le curseur est sur la section déplacée'
  )

  // 2. Dépôt à sa propre place : rien, aucune étape d'annulation (un seul Annuler défait l'étape 1).
  marker = await drag('ACTE 2', 'ACTE 2')
  check(marker === null, `à sa propre place : pas de repère (${marker})`)
  check((await saved()) === file, 'à sa propre place : texte inchangé')
  await app.menu('Édition', 'Annuler')
  await sleep(500)
  file = await saved()
  check(file === SCRIPT, 'un seul Annuler : fichier identique au départ')

  // 3. Places refusées : repère rouge, rien ne bouge.
  marker = await drag('ACTE 1', 'INT. E')
  check(marker === 'refusé', `entre deux scènes : repère rouge (${marker})`)
  marker = await drag('ACTE 1', 'Soir', false, 'section-refus.png')
  check(marker === 'refusé', `dans elle-même : repère rouge (${marker})`)
  check((await saved()) === SCRIPT, 'refus : texte inchangé')

  // 3 bis. Repère rouge bien visible dans les sept thèmes : contraste ≥ 3 avec le fond du navigateur.
  for (const theme of THEMES) {
    await app.evaluate(`window.neoscenar.setTheme(${JSON.stringify(theme)})`)
    await sleep(350)
    await drag('ACTE 1', 'INT. E', false, null, async () => {
      const measure = await app.evaluate(`(() => {
        const rgb = (value) => value.match(/[\\d.]+/g).slice(0, 3).map(Number)
        const lum = ([r, g, b]) => {
          const f = (c) => (c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
        }
        const marker = document.querySelector('.navigator-drop-marker.refused')
        if (!marker) return null
        const box = marker.getBoundingClientRect()
        const a = lum(rgb(getComputedStyle(marker).backgroundColor))
        const b = lum(rgb(getComputedStyle(document.querySelector('.scene-navigator')).backgroundColor))
        return { ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), height: box.height, left: box.left, top: box.top, width: box.width }
      })()`)
      check(
        measure !== null && measure.ratio >= 3 && measure.height >= 5,
        `${theme} : repère rouge visible (contraste ${measure?.ratio.toFixed(2)}, ${measure?.height} px)`
      )
      if (measure) {
        await app.screenshot(`refus-${theme}.png`, {
          x: measure.left - 20,
          y: measure.top - 60,
          width: measure.width + 40,
          height: 120,
          scale: 2
        })
      }
    })
  }
  await app.evaluate(`window.neoscenar.setTheme('defaut')`)
  await sleep(350)
  check((await saved()) === SCRIPT, 'thèmes : texte inchangé')

  // 4. ACTE 1 tout en bas : sous-sections, note de couleur, synopsis, brouillon et marque suivent.
  marker = await drag('ACTE 1', 'INT. F', true)
  check(marker === 'accent', `tout en bas : repère d'accent (${marker})`)
  file = await saved()
  log('ACTE 1 en bas :', await rows())
  check(
    sections(file).join('|') === '# ACTE 2|# ACTE 3|# ACTE 1|## Matin|## Soir',
    `sections : ${sections(file).join('|')}`
  )
  check(numbers(file).join(',') === '40,50,60,70,80,90', `numéros (${numbers(file)})`)
  check(
    file.includes('# ACTE 1\n[[COULEUR #2463EB]]\n\n= Le début.') &&
      file.includes('[[R:rose|Revoir]]pleut[[/R]]') &&
      file.includes('INT. C - NUIT #90#\n[[BROUILLON]]'),
    'note de couleur, synopsis, marque et brouillon ont suivi'
  )
  const band = await app.evaluate(`(() => {
    const row = [...document.querySelectorAll('.navigator-row.section')].find((r) => r.textContent.includes('ACTE 1'))
    return row.querySelector('.navigator-band').style.background
  })()`)
  check(band === 'rgb(36, 99, 235)', `couleur de l'acte gardée (${band})`)

  // 5. Soir au-dessus d'ACTE 3 : devient un acte (niveau de sa voisine).
  await drag('Soir', 'ACTE 3')
  file = await saved()
  check(
    sections(file).join('|') === '# ACTE 2|# Soir|# ACTE 3|# ACTE 1|## Matin',
    `Soir devient un acte : ${sections(file).join('|')}`
  )
  const navNumbers = (await rows())
    .filter((row) => row.startsWith('S_'))
    .map((row) => row.slice(0, 6))
  await app.screenshot('section-deplacee.png')

  // 6. Cartes : même ordre, aucune orpheline.
  await sleep(1500)
  await app.module('Cartes')
  await sleep(800)
  const cards = (await app.sceneCards()).map((c) => c.replace(' [sélectionnée]', ''))
  log('cartes :', cards)
  check(cards.join(',') === navNumbers.join(','), `Cartes : même ordre (${navNumbers})`)
  check(
    (await app.evaluate(`document.querySelectorAll('.orphan-label').length`)) === 0,
    'aucune carte orpheline'
  )

  // Ordre d'origine (verrouillé d'abord) : le projet suivant est ouvert depuis le Scénario affiché.
  await locked({ app, check, newProject })
  await renumber({ app, check, log, newProject })
}

// Numéros verrouillés : refus, même message que dans les Cartes.
async function locked({ app, check, newProject }) {
  const projectFile = newProject({ locked: true })
  const fountainFile = join(dirname(projectFile), 'neoscenar', 'scenario.fountain')
  writeFileSync(fountainFile, SCRIPT)
  await app.openProject(projectFile)
  await app.module('Scénario')
  await sleep(1500)
  const { drag } = tools(app, fountainFile)
  await drag('ACTE 3', 'ACTE 1')
  const dialog = await app.dialog()
  check(
    dialog !== null && /verrouill/i.test(JSON.stringify(dialog)),
    `numéros verrouillés : message (${JSON.stringify(dialog)})`
  )
  await app.dialogButton('Fermer')
  await sleep(300)
  check(readFileSync(fountainFile, 'utf8') === SCRIPT, 'numéros verrouillés : rien n’a bougé')
}

// Pas de numéro libre : « Renuméroter ? » ; accepté, tout passe par les Cartes, en une étape.
async function renumber({ app, check, log, newProject }) {
  const text = SCRIPT.replace('#40#', '#30A#').replace('#50#', '#30B#').replace('#60#', '#40#')
  const projectFile = newProject()
  const fountainFile = join(dirname(projectFile), 'neoscenar', 'scenario.fountain')
  writeFileSync(fountainFile, text)
  await app.openProject(projectFile)
  await app.module('Scénario')
  await sleep(1500)
  const { rows, saved, drag, numbers, sections } = tools(app, fountainFile)
  await drag('ACTE 3', 'ACTE 2')
  const dialog = await app.dialog()
  log('fenêtre :', JSON.stringify(dialog))
  check(
    dialog !== null && /renuméroter/i.test(JSON.stringify(dialog)),
    'question « Renuméroter ? »'
  )
  await app.dialogButton('Oui, renuméroter')
  await sleep(700)
  const file = await saved()
  log('renuméroté :', await rows())
  check(
    sections(file).join('|') === '# ACTE 1|## Matin|## Soir|# ACTE 3|# ACTE 2',
    `ACTE 3 avant ACTE 2 : ${sections(file).join('|')}`
  )
  check(numbers(file).join(',') === '10,20,30,40,50,60', `tout renuméroté (${numbers(file)})`)
  check(file.includes('# ACTE 3\n\nINT. F - JOUR #40#'), 'F suit sa section')
  await app.module('Cartes')
  await sleep(800)
  const cards = (await app.sceneCards()).map((c) => c.replace(' [sélectionnée]', ''))
  check(cards.join(',') === 'S_0010,S_0020,S_0030,S_0040,S_0050,S_0060', `Cartes (${cards})`)
  check(
    (await app.evaluate(`document.querySelectorAll('.orphan-label').length`)) === 0,
    'renumérotation : aucune carte orpheline'
  )
  // Annuler dans les Cartes : texte et cartes reviennent en une étape.
  const undoLabel = (await app.menuLabels('Édition')).find((label) => label.startsWith('Annuler'))
  log('menu :', undoLabel)
  await app.menu('Édition', undoLabel)
  await sleep(600)
  const undone = await saved()
  if (undone !== text) log('après Annuler :', JSON.stringify(undone), await app.sceneCards())
  check(undone === text, 'Annuler (Cartes) : fichier identique au départ')
}
