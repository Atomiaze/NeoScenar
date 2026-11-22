// Étape 18C-8 : panneau des révisions à droite du scénario. Liste dans l'ordre du texte, titre avec
// le nombre, clic = sélection + focus dans l'éditeur, mise à jour en direct (frappe, « Effacer toutes
// les marques »), état gardé par projet, page A4 sans débordement dans une fenêtre étroite.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const electron = `process.mainModule.require('electron')`

const LONG_COMMENT =
  'Ce commentaire est volontairement très long pour vérifier qu’il est coupé sur deux lignes dans le panneau des révisions'

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const scenarioFile = join(dirname(projectFile), 'neoscenar', 'scenario.fountain')
  const source = readFileSync(
    join(ROOT, 'packages', 'fountain', 'tests', 'exemples', 'le-dernier-bus.fountain'),
    'utf8'
  )
  // Trois marques posées dans le fichier, dans le désordre des couleurs.
  const marked = source
    .replace("encore l'horloge", "[[R:jaune|Revoir]]encore l'horloge[[/R]]")
    .replace('Non, non, non...', `[[R:rose|${LONG_COMMENT}]]Non, non, non...[[/R]]`)
    .replace('Onze heures vingt.', '[[R:bleu]]Onze heures vingt.[[/R]]')
  writeFileSync(scenarioFile, marked)

  await app.openProject(projectFile)
  await app.module('Scénario')
  await sleep(2000)

  const panel = () =>
    app.evaluate(`(() => {
      const aside = document.querySelector('.revision-side-panel')
      if (!aside) return null
      return {
        title: aside.querySelector('.revision-side-title')?.textContent ?? '',
        empty: aside.querySelector('.revision-side-empty')?.textContent ?? null,
        rows: [...aside.querySelectorAll('.revision-side-row')].map((row) => ({
          color: [...row.classList].find((c) => c.startsWith('rev-')),
          scene: row.querySelector('.revision-side-scene')?.textContent,
          excerpt: row.querySelector('.revision-side-excerpt')?.textContent,
          comment: row.querySelector('.revision-side-comment')?.textContent ?? ''
        }))
      }
    })()`)
  const panelButton = () =>
    app.evaluate(
      `[...document.querySelectorAll('.revision-palette .tool-button')].find((b) => b.textContent.includes('le panneau'))?.textContent ?? null`
    )
  const clickPanelButton = () =>
    app.evaluate(
      `[...document.querySelectorAll('.revision-palette .tool-button')].find((b) => b.textContent.includes('le panneau')).click()`
    )

  // 1. Hors du mode révision : pas de panneau.
  check((await panel()) === null, 'pas de panneau hors du mode révision')

  // 2. Bouton Révision : palette et panneau (affiché par défaut).
  await app.click('.toolbar .tool-button[aria-pressed]:not(.icon-only)')
  await sleep(400)
  let state = await panel()
  check(state !== null, 'panneau affiché à l’ouverture du mode révision')
  check(state?.title === 'Révisions (3)', `titre : ${state?.title}`)
  log(`    lignes : ${JSON.stringify(state?.rows.map((r) => [r.color, r.scene, r.excerpt]))}`)
  check(state?.rows.map((r) => r.color).join() === 'rev-jaune,rev-rose,rev-bleu', 'ordre du texte')
  check(
    state?.rows.every((r) => /^S_\d{4}$/.test(r.scene)),
    `numéros de scène : ${state?.rows.map((r) => r.scene)}`
  )
  check(state?.rows[0].excerpt === "encore l'horloge", 'début du texte surligné')
  check(state?.rows[0].comment === 'Revoir', 'commentaire affiché')
  check((await panelButton()) === 'Masquer le panneau', 'bouton Masquer dans la palette')
  const clamp = await app.evaluate(`(() => {
    const c = document.querySelectorAll('.revision-side-comment')[1]
    const lineHeight = parseFloat(getComputedStyle(c).lineHeight) || 16
    return { height: c.getBoundingClientRect().height, lineHeight }
  })()`)
  check(
    clamp.height <= clamp.lineHeight * 2.2,
    `commentaire long sur deux lignes (${clamp.height}px)`
  )
  await app.screenshot('revision-panneau.png')

  // 3. Clic sur la 3e ligne : sélection du texte surligné, focus dans l'éditeur.
  await app.evaluate(`document.querySelectorAll('.revision-side-row')[2].click()`)
  await sleep(400)
  const after = await app.evaluate(`({
    selected: document.getSelection().toString(),
    focused: !!document.activeElement?.closest('.cm-content')
  })`)
  check(after.selected === 'Onze heures vingt.', `sélection : « ${after.selected} »`)
  check(after.focused, 'focus dans l’éditeur après le clic')

  // 4. On tape tout de suite : la sélection est remplacée, le panneau suit (après ~200 ms).
  await app.page.send('Input.insertText', { text: 'Minuit passé.' })
  await sleep(500)
  state = await panel()
  check(
    state?.rows[2]?.excerpt === 'Minuit passé.',
    `mise à jour en direct : ${state?.rows[2]?.excerpt}`
  )
  check(state?.title === 'Révisions (3)', 'toujours 3 marques')

  // 5. Effacer toutes les marques : « Aucune révision ».
  await app.evaluate(
    `[...document.querySelectorAll('.revision-palette .tool-button')].find((b) => b.textContent === 'Effacer toutes les marques').click()`
  )
  await sleep(300)
  await app.dialogButton('Tout effacer')
  await sleep(500)
  state = await panel()
  check(state?.title === 'Révisions (0)', `titre après effacement : ${state?.title}`)
  check(state?.empty === 'Aucune révision', `panneau vide : ${state?.empty}`)
  await app.menu('Édition', 'Annuler')
  await sleep(500)
  check((await panel())?.title === 'Révisions (3)', 'Cmd + Z : les lignes reviennent')

  // 6. Fenêtre de 1280 px (portable courant) : la page ne tient pas à côté des deux panneaux, le
  //    navigateur se masque tout seul ; la préférence reste intacte.
  const REVISION = '.toolbar .tool-button[aria-pressed]:not(.icon-only)'
  const NAVIGATOR = '.toolbar .tool-button.icon-only[aria-pressed]'
  const resize = async (w, h) => {
    await app.main.evaluate(`${electron}.BrowserWindow.getAllWindows()[0].setSize(${w}, ${h})`)
    await sleep(800)
  }
  const layout = () =>
    app.evaluate(`(() => {
      const scroller = document.querySelector('.cm-scroller')
      const aside = document.querySelector('.revision-side-panel')
      return {
        overflow: scroller.scrollWidth - scroller.clientWidth,
        panel: aside ? Math.round(aside.getBoundingClientRect().width) : 0,
        navigator: !!document.querySelector('.scene-navigator'),
        pressed: document.querySelector('${NAVIGATOR}').getAttribute('aria-pressed')
      }
    })()`)
  await resize(1280, 800)
  let fit = await layout()
  log(`    fenêtre 1280 px : ${JSON.stringify(fit)}`)
  check(fit.panel >= 270 && fit.panel <= 290, `largeur du panneau : ${fit.panel}`)
  check(!fit.navigator && fit.pressed === 'false', 'navigateur masqué tout seul')
  check(fit.overflow <= 0, `page A4 sans débordement (${fit.overflow} px de trop)`)
  await app.screenshot('revision-panneau-1280.png')

  // Rouvert à la main : on le laisse, même si la page déborde.
  await app.click(NAVIGATOR)
  await sleep(600)
  fit = await layout()
  check(fit.navigator && fit.pressed === 'true', 'navigateur rouvert à la main')
  await resize(1300, 800)
  check((await layout()).navigator, 'il reste ouvert malgré le débordement')

  // Fin du mode révision : panneau fermé, navigateur affiché (préférence intacte).
  await app.click(REVISION)
  await sleep(500)
  fit = await layout()
  check(fit.panel === 0 && fit.navigator, 'mode révision fermé : navigateur affiché')

  // Nouveau mode révision : masquage automatique de nouveau, puis retour quand la place revient.
  await app.click(REVISION)
  await sleep(600)
  check(!(await layout()).navigator, 'mode révision rouvert : de nouveau masqué')
  await resize(1700, 900)
  fit = await layout()
  check(
    fit.navigator && fit.overflow <= 0,
    `fenêtre agrandie : navigateur revenu (${JSON.stringify(fit)})`
  )
  await resize(1280, 800)
  check(!(await layout()).navigator, 'fenêtre réduite : masqué de nouveau')

  // 7. Masquer : gardé pour ce projet (préférences de l'application), même après réouverture.
  await clickPanelButton()
  await sleep(300)
  check((await panel()) === null, 'panneau masqué')
  check((await panelButton()) === 'Afficher le panneau', 'bouton Afficher')
  await sleep(300)
  await app.openProject(projectFile)
  await app.module('Scénario')
  await sleep(1500)
  if (!(await app.evaluate(`!!document.querySelector('.revision-palette')`))) {
    await app.click('.toolbar .tool-button[aria-pressed]:not(.icon-only)')
    await sleep(400)
  }
  check((await panel()) === null, 'toujours masqué après réouverture du projet')
  await clickPanelButton()
  await sleep(400)
  check((await panel())?.title === 'Révisions (3)', 'de nouveau affiché')

  // 8. Le survol des commentaires n'a pas changé (CodeMirror ne dessine que la partie visible).
  await app.evaluate(`document.querySelector('.cm-scroller').scrollTop = 0`)
  await sleep(300)
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
  check(tooltip === 'Revoir', `bulle au survol : ${tooltip}`)
}
