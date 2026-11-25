// Sous-étape 18C-14 : couleur d'une section. Clic droit > Couleur dans le navigateur, note
// [[COULEUR #hex]] juste sous la ligne #, masquée dans l'éditeur, Cmd + Z en une étape, couleur
// identique (bandeau de l'éditeur, navigateur, Statistiques), gardée à la réouverture, rotation des
// autres sections inchangée.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

const SCRIPT = [
  '# ACTE 1',
  '',
  'INT. A - JOUR #10#',
  '',
  'Action A.',
  '',
  '# ACTE 2',
  '= Le milieu.',
  '',
  'INT. B - JOUR #20#',
  '',
  'Action B.',
  '',
  '# ACTE 3',
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
  const state = () =>
    app.evaluate(`({
      navigator: [...document.querySelectorAll('.navigator-row.section .navigator-band')].map((b) => ({
        title: b.textContent.trim(), bg: getComputedStyle(b).backgroundColor, fg: getComputedStyle(b).color })),
      editor: [...document.querySelectorAll('.cm-line')].map((l) => l.textContent).join('|'),
      bands: [...document.querySelectorAll('.cm-line.fl-section')].map((l) =>
        l.style.getPropertyValue('--section-color'))
    })`)
  const rgb = (hex) => {
    const n = parseInt(hex.slice(1), 16)
    return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`
  }
  const point = (selector, text) =>
    app.evaluate(`(() => {
      const e = [...document.querySelectorAll(${JSON.stringify(selector)})]
        .find((x) => x.textContent.includes(${JSON.stringify(text)}) || x.getAttribute('aria-label') === ${JSON.stringify(text)})
      const b = e.getBoundingClientRect()
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 }
    })()`)
  const mouse = async (type, p, button = 'left') =>
    app.page.send('Input.dispatchMouseEvent', {
      type,
      ...p,
      button,
      buttons: type === 'mousePressed' ? (button === 'right' ? 2 : 1) : 0,
      clickCount: 1
    })
  const chooseColor = async (section, colorLabel) => {
    const row = await point('.navigator-row.section', section)
    await mouse('mousePressed', { x: row.x + 30, y: row.y }, 'right')
    await mouse('mouseReleased', { x: row.x + 30, y: row.y }, 'right')
    await sleep(300)
    const entry = await point('.context-menu [role="menuitem"]', 'Couleur')
    await mouse('mouseMoved', entry)
    await sleep(300)
    const swatch = await point('.context-menu .color-choices [role="menuitem"]', colorLabel)
    await mouse('mouseMoved', swatch)
    await mouse('mousePressed', swatch)
    await mouse('mouseReleased', swatch)
    await sleep(300)
  }

  // 1. Départ : trois couleurs automatiques, différentes, identiques dans l'éditeur et le navigateur.
  const start = await state()
  log('départ :', JSON.stringify(start.navigator.map((n) => n.bg)))
  check(start.navigator.length === 3, 'trois sections dans le navigateur')
  check(new Set(start.navigator.map((n) => n.bg)).size === 3, 'trois couleurs automatiques')
  await app.screenshot('section-couleur-1-depart.png')

  // 2. Acte 2 en bleu vif : note sous la ligne #, avant le synopsis ; les autres actes inchangés.
  const blue = '#2463EB'
  await chooseColor('ACTE 2', 'Bleu vif')
  let file = await saved()
  check(
    file.includes('# ACTE 2\n[[COULEUR #2463EB]]\n= Le milieu.'),
    'note écrite juste sous « # ACTE 2 », hex en majuscules'
  )
  let now = await state()
  check(now.navigator[1].bg === rgb(blue), `navigateur : acte 2 en bleu (${now.navigator[1].bg})`)
  check(
    now.bands.includes(blue) || now.bands.map((b) => b.trim()).includes(blue),
    'bandeau de l’éditeur : bleu'
  )
  check(
    now.navigator[0].bg === start.navigator[0].bg && now.navigator[2].bg === start.navigator[2].bg,
    'actes 1 et 3 : couleurs automatiques inchangées'
  )
  check(!now.editor.includes('COULEUR'), 'note masquée dans l’éditeur')
  check(
    now.editor.includes('ACTE 2') && now.editor.includes('INT. B'),
    'le reste du texte est affiché'
  )
  await app.screenshot('section-couleur-2-bleu.png')

  // 3. Statistiques : même couleur.
  await app.module('Statistiques')
  await sleep(1000)
  const stats = await app.evaluate(
    `[...document.querySelectorAll('.stats-legend .stats-swatch')].map((e) => getComputedStyle(e).backgroundColor)`
  )
  log('statistiques :', stats)
  check(stats.includes(rgb(blue)), 'Statistiques : acte 2 en bleu')
  await app.module('Scénario')
  await sleep(800)

  // 4. Changer : une seule note ; Cmd + Z revient à la couleur précédente, puis au texte d'origine.
  await chooseColor('ACTE 2', 'Rouge vif')
  file = await saved()
  check(
    file.match(/COULEUR/g)?.length === 1 && file.includes('[[COULEUR #FF4D4D]]'),
    'une seule note, rouge'
  )
  await app.menu('Édition', 'Annuler')
  file = await saved()
  check(
    file.includes('[[COULEUR #2463EB]]') && file.match(/COULEUR/g).length === 1,
    'Annuler : retour au bleu'
  )
  await app.menu('Édition', 'Annuler')
  file = await saved()
  check(file === SCRIPT, 'Annuler encore : texte d’origine')
  await app.menu('Édition', 'Rétablir')
  await saved()

  // 5. Réouverture : la couleur est gardée.
  await app.openProject(projectFile)
  await app.module('Scénario')
  await sleep(1500)
  now = await state()
  check(now.navigator[1].bg === rgb(blue), 'après réouverture : acte 2 toujours bleu')

  // 6. Automatique : la note disparaît, texte d'origine.
  await chooseColor('ACTE 2', 'Automatique')
  file = await saved()
  now = await state()
  check(file === SCRIPT, 'Automatique : texte d’origine')
  check(now.navigator[1].bg === start.navigator[1].bg, 'acte 2 retrouve sa couleur automatique')

  // 7. Une note [[COULEUR]] ailleurs que sous une section s'affiche comme une note normale.
  await app.mouseClick('.cm-line', 'Action A.')
  await sleep(200)
  await app.page.send('Input.insertText', { text: ' [[COULEUR #FF0000]]' })
  await sleep(500)
  now = await state()
  check(now.editor.includes('COULEUR #FF0000'), 'note hors section : affichée comme une note')
  check(
    JSON.stringify(now.navigator.map((n) => n.bg)) ===
      JSON.stringify(start.navigator.map((n) => n.bg)),
    'et sans effet sur les couleurs'
  )
}
