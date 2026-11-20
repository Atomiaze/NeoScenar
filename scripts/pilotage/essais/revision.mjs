// Étape 13E : mode révision. Surligner, commenter, effacer une marque, tout effacer (fichier identique
// à l'octet près), Cmd + Z, navigateur, clic droit (question du processus principal).

import { copyFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const electron = `process.mainModule.require('electron')`

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const scenarioFile = join(dirname(projectFile), 'neoscenar', 'scenario.fountain')
  copyFileSync(
    join(ROOT, 'packages', 'fountain', 'tests', 'exemples', 'le-dernier-bus.fountain'),
    scenarioFile
  )
  await app.openProject(projectFile)
  await app.module('Scénario')
  await sleep(2500)
  // Référence : le fichier tel que NeoScenar l'a laissé après l'ouverture (rapprochement compris).
  const original = readFileSync(scenarioFile)
  const fileText = () => readFileSync(scenarioFile, 'utf8')
  const saved = async () => {
    await sleep(2500)
    return fileText()
  }

  /**
   * Sélectionne `text` (dans une seule ligne, sans mise en forme) ; `to` : jusqu'à la fin d'un autre
   * texte. Vraie sélection à la souris : on glisse du début à la fin.
   */
  const select = async (text, to = null) => {
    // CodeMirror ne dessine que la partie visible : on descend jusqu'à voir les deux textes.
    let points = null
    for (let y = 0; y < 20000 && !points; y += 300) {
      points = await locate(text, to)
      if (!points) {
        await app.evaluate(`document.querySelector('.cm-scroller').scrollTop = ${y}`)
        await sleep(120)
      }
    }
    if (!points) return 'introuvable'
    const mouse = (type, point) =>
      app.page.send('Input.dispatchMouseEvent', { type, ...point, button: 'left', clickCount: 1 })
    await mouse('mousePressed', points.from)
    await mouse('mouseMoved', points.to)
    await mouse('mouseReleased', points.to)
    await sleep(200)
    return 'ok'
  }

  const locate = async (text, to) => {
    const points = await app.evaluate(`(() => {
      const find = (needle) => {
        for (const line of document.querySelectorAll('.cm-line')) {
          const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT)
          let node
          while ((node = walker.nextNode())) {
            const index = node.data.indexOf(needle)
            if (index >= 0) return { node, index }
          }
        }
        return null
      }
      const start = find(${JSON.stringify(text)})
      const end = ${to ? `find(${JSON.stringify(to)})` : 'start'}
      if (!start || !end) return null
      start.node.parentElement.scrollIntoView({ block: 'center' })
      const endOffset = end.index + ${JSON.stringify(to ?? text)}.length
      const caret = (node, offset, side) => {
        const range = document.createRange()
        range.setStart(node, offset)
        range.setEnd(node, offset)
        const rects = range.getClientRects()
        const r = rects[side === 'start' ? 0 : rects.length - 1] ?? range.getBoundingClientRect()
        return { x: r.left + (side === 'start' ? 1 : -1), y: r.top + r.height / 2 }
      }
      return { from: caret(start.node, start.index, 'start'), to: caret(end.node, endOffset, 'end') }
    })()`)
    if (points) await sleep(250)
    return points
  }
  const notice = () => app.evaluate(`document.querySelector('.script-notice')?.textContent ?? ''`)
  const marked = (color) =>
    app.evaluate(
      `[...document.querySelectorAll('.fl-rev${color ? `-${color}` : ''}')].map((e) => e.textContent)`
    )

  // 1. Le bouton « Révision » affiche la palette.
  check(
    (await app.click('.toolbar .tool-button[aria-pressed]:not(.icon-only)')) === 'ok',
    'bouton Révision'
  )
  await sleep(300)
  const swatches = await app.evaluate(
    `[...document.querySelectorAll('.revision-swatch')].map((b) => b.dataset.color)`
  )
  check(swatches.join(',') === 'jaune,vert,rose,bleu', `palette : ${swatches}`)

  // 2. Sélection dans une action + Jaune : texte surligné, marqueurs masqués hors de la ligne.
  check((await select("encore l'horloge")) === 'ok', 'sélection dans une action')
  await sleep(200)
  await app.click('.revision-swatch[data-color="jaune"]')
  await sleep(400)
  check((await marked('jaune')).join() === "encore l'horloge", 'texte surligné en jaune')
  let text = await saved()
  check(
    text.includes('21 h 52.') && text.includes("[[R:jaune]]encore l'horloge[[/R]]"),
    'marque écrite dans le Fountain'
  )
  await app.mouseClick('.cm-line', 'Madame, mon bus est à dix heures.')
  await sleep(300)
  const actionLine = await app.evaluate(
    `[...document.querySelectorAll('.cm-line')].find((l) => l.textContent.includes("encore l'horloge")).textContent`
  )
  check(
    actionLine === "Inès regarde encore l'horloge. 21 h 52.",
    `marqueurs masqués : « ${actionLine} »`
  )

  // 3. Sélection d'un dialogue jusqu'à un autre + Rose : une marque par paragraphe autorisé (dialogue,
  //    action, didascalie), personnages sautés.
  check(
    (await select('Non, non, non', 'Dernier départ')) === 'ok',
    'sélection sur plusieurs paragraphes'
  )
  await app.click('.revision-swatch[data-color="rose"]')
  await sleep(400)
  const pinks = await marked('rose')
  log(`    rose : ${JSON.stringify(pinks)}`)
  check(
    pinks.length === 4 && pinks[2] === '(lisant)',
    'une marque par paragraphe (dialogue, didascalie…), personnages sautés'
  )
  text = await saved()
  check(!/\[\[R:[^\]]*\]\](INÈS|ÉLIOTT)/.test(text), 'aucune marque sur un nom de personnage')

  // 4. Un en-tête seul : refusé, message court.
  await select('EXT. ARRÊT DE BUS - SOIR')
  await app.click('.revision-swatch[data-color="vert"]')
  await sleep(300)
  const refused = await notice()
  check(refused.includes('seulement sur l’action'), `message : « ${refused} »`)

  // 5. Commentaire : curseur dans la marque jaune, « Commentaire… », bulle, Enregistrer.
  await app.mouseClick('.fl-rev-jaune')
  await sleep(200)
  await app.evaluate(
    `[...document.querySelectorAll('.revision-palette .tool-button')].find((b) => b.textContent === 'Commentaire…').click()`
  )
  await sleep(300)
  check(
    (await app.evaluate(`!!document.querySelector('.revision-bubble input')`)) === true,
    'bulle du commentaire ouverte'
  )
  await app.evaluate(`(() => {
    const input = document.querySelector('.revision-bubble input')
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(input, 'Revoir [ce] passage')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })()`)
  await app.screenshot('revision-bulle.png')
  await app.evaluate(`document.querySelector('.revision-bubble button[type=submit]').click()`)
  text = await saved()
  check(
    text.includes("[[R:jaune|Revoir (ce) passage]]encore l'horloge"),
    'commentaire écrit (crochets remplacés)'
  )

  // Survol : la bulle montre le commentaire.
  await app.mouseClick('.cm-line', 'Madame, mon bus est à dix heures.')
  await sleep(200)
  const box = await app.evaluate(`(() => {
    const mark = document.querySelector('.fl-rev-jaune')
    mark.scrollIntoView({ block: 'center' })
    const r = mark.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  })()`)
  await sleep(300)
  await app.page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x - 4, y: box.y })
  await app.page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...box })
  await sleep(900)
  const tooltip = await app.evaluate(`document.querySelector('.rev-tooltip')?.textContent ?? null`)
  check(tooltip === 'Revoir (ce) passage', `bulle au survol : ${tooltip}`)
  await app.screenshot('revision-survol.png')

  // 6. Navigateur : pastille du nombre de marques, total = nombre de marques.
  const counts = await app.evaluate(
    `[...document.querySelectorAll('.navigator-row.scene .navigator-revision-count')].map((e) => Number(e.textContent))`
  )
  const total = counts.reduce((a, b) => a + b, 0)
  check(total === 5, `pastilles du navigateur : ${counts} (total ${total})`)

  // 7. Clic droit sur la marque jaune : le processus principal apprend qu'elle a un commentaire, puis
  //    « Effacer cette marque » la retire (le menu natif lui-même n'est pas ouvert pendant l'essai).
  await app.evaluate(`(() => {
    const target = document.querySelector('.fl-rev-jaune')
    const r = target.getBoundingClientRect()
    target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true,
      clientX: r.left + 3, clientY: r.top + r.height / 2 }))
  })()`)
  const info = await app.main.evaluate(`new Promise((resolve) => {
    const { ipcMain, BrowserWindow } = ${electron}
    ipcMain.once('revision:context-reply', (_e, _id, value) => resolve(value))
    BrowserWindow.getAllWindows()[0].webContents.send('event:revision-context-query', 4242)
  })`)
  check(info?.hasComment === true, `réponse au clic droit : ${JSON.stringify(info)}`)
  await app.main.evaluate(
    `${electron}.BrowserWindow.getAllWindows()[0].webContents.send('event:menu-command', 'revision-remove-mark')`
  )
  await sleep(400)
  check((await marked('jaune')).length === 0, '« Effacer cette marque » : surlignage retiré')
  text = await saved()
  check(text.includes("Inès regarde encore l'horloge. 21 h 52."), 'texte de la ligne intact')

  // 8. Effacer toutes les marques : confirmation, puis fichier identique à l'octet près ; Cmd + Z.
  await app.evaluate(
    `[...document.querySelectorAll('.revision-palette .tool-button')].find((b) => b.textContent === 'Effacer toutes les marques').click()`
  )
  await sleep(300)
  const dialog = await app.dialog()
  check(dialog?.title === 'Effacer toutes les marques', `confirmation : ${dialog?.text}`)
  await app.screenshot('revision-confirmation.png')
  await app.dialogButton('Tout effacer')
  await saved()
  check(
    readFileSync(scenarioFile).equals(original),
    'fichier identique à l’original, octet par octet'
  )
  check((await marked()).length === 0, 'plus aucun surlignage')
  log(`    ${await notice()}`)

  await app.menu('Édition', 'Annuler')
  await sleep(400)
  check((await marked('rose')).length === 4, 'Cmd + Z : les marques reviennent')
  await app.screenshot('revision-marques.png')
  await app.menu('Édition', 'Rétablir')
  await saved()
  check(readFileSync(scenarioFile).equals(original), 'rétabli : de nouveau identique')
}
