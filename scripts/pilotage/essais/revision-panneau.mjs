// Étape 18C-8 : panneau des révisions à droite du scénario. Liste dans l'ordre du texte, titre avec
// le nombre, clic = sélection + focus dans l'éditeur, mise à jour en direct (frappe, « Effacer toutes
// les marques »), état gardé par projet, page A4 sans débordement dans une fenêtre étroite.
// Étape 18C-9 (partie 9) : filtre par couleur, crayon, pastille (couleur), poubelle, commentaire sur
// plusieurs lignes (« ¶ » dans le fichier, éditeur identique), contraste des pastilles sur 7 thèmes.

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
        rows: [...aside.querySelectorAll('.revision-side-item')].map((row) => ({
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

  // 9. Étape 18C-9.
  await resize(1700, 900)
  const fileText = () => readFileSync(scenarioFile, 'utf8')
  const saved = async () => {
    await sleep(2500)
    return fileText()
  }
  const filters = () =>
    app.evaluate(`[...document.querySelectorAll('.revision-filter')].map((b) => ({
      color: b.dataset.color,
      on: b.getAttribute('aria-pressed') === 'true',
      disabled: b.disabled,
      count: b.querySelector('.revision-filter-count').textContent,
      filled: getComputedStyle(b.querySelector('.revision-filter-dot')).backgroundImage === 'none'
    }))`)
  const clickFilter = (color, altKey = false) =>
    app.evaluate(
      `document.querySelector('.revision-filter[data-color="${color}"]').dispatchEvent(new MouseEvent('click', { bubbles: true, altKey: ${altKey} }))`
    )
  const rowButton = (index, part) =>
    `document.querySelectorAll('.revision-side-item')[${index}].querySelector('[data-part="${part}"]')`
  const clickRow = async (index, part) => {
    await app.evaluate(`${rowButton(index, part)}.click()`)
    await sleep(400)
  }
  const focused = (index, part) =>
    app.evaluate(`document.activeElement === ${rowButton(index, part)}`)
  const colors = async () => (await panel()).rows.map((r) => r.color.slice(4)).join()
  const key = async (key, code, vk, modifiers = 0, text) => {
    const params = { key, code, windowsVirtualKeyCode: vk, modifiers }
    await app.page.send('Input.dispatchKeyEvent', {
      type: text ? 'keyDown' : 'rawKeyDown',
      ...params,
      ...(text ? { text } : {})
    })
    await app.page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...params })
    await sleep(120)
  }
  const type = async (text) => {
    await app.page.send('Input.insertText', { text })
    await sleep(120)
  }
  const undo = async () => {
    await app.menu('Édition', 'Annuler')
    await sleep(500)
  }

  // 9a. Filtre : nombres, interrupteurs, Alt + clic, liste vide à cause du filtre.
  let f = await filters()
  log(`    pastilles : ${JSON.stringify(f.map((p) => [p.color, p.count, p.on, p.disabled]))}`)
  check(f.map((p) => p.count).join() === '1,0,1,1', 'nombre de marques par couleur')
  check(f[1].disabled && !f[0].disabled, 'couleur sans marque : grisée, non cliquable')
  check(
    f.every((p) => p.on),
    'toutes allumées par défaut'
  )
  check(
    f.filter((p) => !p.disabled).every((p) => p.filled),
    'pastilles allumées pleines'
  )
  await clickFilter('rose')
  await sleep(200)
  state = await panel()
  f = await filters()
  check(state.title === 'Révisions (2 / 3)', `rose éteint : titre ${state.title}`)
  check((await colors()) === 'jaune,bleu', 'rose éteint : ses lignes sont cachées')
  check(!f[2].on && !f[2].filled, 'pastille éteinte : contour seul (barrée)')
  check(
    (await app.evaluate(`document.querySelectorAll('.cm-content .fl-rev-rose').length`)) > 0,
    'les surlignages de l’éditeur restent visibles'
  )
  const filterBox = await app.evaluate(`(() => {
    const r = document.querySelector('.revision-side-panel').getBoundingClientRect()
    return { x: r.left, y: r.top, width: r.width, height: 140 }
  })()`)
  await app.screenshot('revision-filtre.png', filterBox)
  await clickFilter('jaune', true)
  await sleep(200)
  check((await panel()).title === 'Révisions (1 / 3)', 'Alt + clic : seulement le jaune')
  check((await colors()) === 'jaune', 'Alt + clic : une seule ligne')
  await clickFilter('jaune', true)
  await sleep(200)
  check((await panel()).title === 'Révisions (3)', 'Alt + clic sur la seule allumée : tout revient')
  for (const color of ['jaune', 'rose', 'bleu']) await clickFilter(color)
  await sleep(200)
  state = await panel()
  check(
    state.empty === 'Aucune révision pour ces couleurs' && state.title === 'Révisions (0 / 3)',
    `tout éteint : ${state.title} / ${state.empty}`
  )
  for (const color of ['jaune', 'rose']) await clickFilter(color)
  await sleep(200)

  // 9b. Le filtre résiste à la frappe et à « Effacer toutes les marques » ; quitter le mode le remet.
  check((await panel()).title === 'Révisions (2 / 3)', 'bleu seul éteint')
  await clickRow(0, 'row')
  await key('ArrowRight', 'ArrowRight', 39)
  await type('z')
  await key('Backspace', 'Backspace', 8)
  await sleep(500)
  check((await panel()).title === 'Révisions (2 / 3)', 'frappe : filtre gardé')
  await app.evaluate(
    `[...document.querySelectorAll('.revision-palette .tool-button')].find((b) => b.textContent === 'Effacer toutes les marques').click()`
  )
  await sleep(300)
  await app.dialogButton('Tout effacer')
  await sleep(500)
  check((await panel()).empty === 'Aucune révision', 'tout effacé : « Aucune révision »')
  await undo()
  check((await panel()).title === 'Révisions (2 / 3)', 'Cmd + Z : filtre toujours là')
  await app.click(REVISION)
  await sleep(400)
  await app.click(REVISION)
  await sleep(600)
  check(
    (await panel()).title === 'Révisions (3)',
    'mode révision quitté puis rouvert : filtre remis'
  )
  check(
    (await filters()).every((p) => p.on),
    'toutes les pastilles rallumées'
  )

  // Forme de l'éditeur (hauteur, traits de page) : curseur au début, marqueurs cachés.
  const editorShape = async () => {
    await app.evaluate(`document.querySelector('.cm-content').focus()`)
    await key('Home', 'Home', 36, 4)
    await sleep(300)
    const shape = { height: 0, breaks: {} }
    for (let y = 0; ; y += 500) {
      const step = await app.evaluate(`(() => {
        const scroller = document.querySelector('.cm-scroller')
        scroller.scrollTop = ${y}
        return { height: scroller.scrollHeight, end: scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1 }
      })()`)
      await sleep(300)
      const breaks = await app.evaluate(`(() => {
        const top = document.querySelector('.cm-content').getBoundingClientRect().top
        return [...document.querySelectorAll('.fl-page-break')].map((b) => [
          b.querySelector('.fl-page-number')?.textContent ?? b.parentElement.querySelector('.fl-page-number')?.textContent ?? '',
          Math.round(b.getBoundingClientRect().top - top)
        ])
      })()`)
      // Dernière mesure de chaque trait (CodeMirror estime d'abord la hauteur des lignes non dessinées).
      const seen = {}
      for (const [label, top] of breaks) (seen[label] ??= []).push(top)
      Object.assign(shape.breaks, seen)
      shape.height = step.height
      if (step.end || y > 40000) break
    }
    // Second passage : chaque trait amené au milieu de l'écran, mesuré une fois l'affichage stable.
    for (const [label, tops] of Object.entries(shape.breaks)) {
      const settled = []
      for (const top of tops) {
        await app.evaluate(`document.querySelector('.cm-scroller').scrollTop = ${top - 300}`)
        await sleep(600)
        const near = await app.evaluate(`(() => {
          const top = document.querySelector('.cm-content').getBoundingClientRect().top
          return [...document.querySelectorAll('.fl-page-break')]
            .filter((b) => (b.querySelector('.fl-page-number')?.textContent ?? '') === ${JSON.stringify(label)})
            .map((b) => Math.round(b.getBoundingClientRect().top - top))
        })()`)
        settled.push(...near)
      }
      shape.breaks[label] = [...new Set(settled)]
    }
    shape.breaks = Object.entries(shape.breaks)
      .map(([label, tops]) => `${label}@${tops.join('+')}`)
      .sort()
      .join(' ')
    return shape
  }
  const shapeBefore = await editorShape()
  log(
    `    éditeur avant : hauteur ${shapeBefore.height}, traits ${shapeBefore.breaks.split(' ').length}`
  )

  // 9c. Crayon : la même fenêtre, Maj + Entrée = retour à la ligne, Entrée = valider.
  check(
    (await app.evaluate(`${rowButton(0, 'edit')}.getAttribute('aria-label')`)) ===
      'Modifier le commentaire' &&
      (await app.evaluate(`${rowButton(2, 'edit')}.getAttribute('aria-label')`)) ===
        'Ajouter un commentaire',
    'crayon : « Modifier » ou « Ajouter » selon le commentaire'
  )
  check(
    (await app.evaluate(`getComputedStyle(${rowButton(0, 'edit')}.parentElement).opacity`)) === '0',
    'crayon et poubelle cachés hors survol et hors focus'
  )
  await app.evaluate(`${rowButton(0, 'edit')}.focus()`)
  check(
    (await app.evaluate(`getComputedStyle(${rowButton(0, 'edit')}.parentElement).opacity`)) === '1',
    'crayon visible au focus clavier'
  )
  await clickRow(0, 'edit')
  const bubble = () =>
    app.evaluate(`(() => {
      const area = document.querySelector('.revision-bubble textarea')
      return area ? { value: area.value, focused: document.activeElement === area, hint: document.querySelector('.revision-bubble p').textContent } : null
    })()`)
  let b = await bubble()
  check(b?.value === 'Revoir' && b.focused, `fenêtre préremplie : ${JSON.stringify(b)}`)
  check(
    b?.hint === 'Maj + Entrée pour aller à la ligne. Laissez vide pour retirer le commentaire.',
    'indication sous le champ'
  )
  await type('Ligne un')
  await key('Enter', 'Enter', 13, 8, '\r')
  await type('Ligne deux')
  await key('Enter', 'Enter', 13, 8, '\r')
  await key('Enter', 'Enter', 13, 8, '\r')
  await type('  [trois]  ')
  b = await bubble()
  check(
    b?.value === 'Ligne un\nLigne deux\n\n  [trois]  ',
    `Maj + Entrée : ${JSON.stringify(b?.value)}`
  )
  await app.screenshot('revision-commentaire-lignes.png')
  await key('Enter', 'Enter', 13)
  await sleep(400)
  check((await bubble()) === null, 'Entrée valide et ferme la fenêtre')
  state = await panel()
  check(
    state.rows[0].comment === 'Ligne un\nLigne deux\n(trois)',
    `ligne mise à jour : ${JSON.stringify(state.rows[0].comment)}`
  )
  check(await focused(0, 'edit'), 'le focus revient au crayon')
  // La sélection de l'éditeur (non affichée tant qu'il n'a pas le focus) : on le lui rend pour la lire.
  await app.evaluate(`document.querySelector('.cm-content').focus()`)
  await sleep(200)
  const selected = await app.evaluate(`document.getSelection().toString()`)
  check(selected === "encore l'horloge", `texte surligné sélectionné : « ${selected} »`)
  let text = await saved()
  check(
    text.includes("[[R:jaune|Ligne un ¶ Ligne deux ¶ (trois)]]encore l'horloge[[/R]]"),
    'fichier : « ¶ » sur une seule ligne, sans ligne vide, crochets remplacés'
  )
  await app.screenshot('revision-panneau-lignes.png')
  const shapeAfter = await editorShape()
  check(shapeAfter.height === shapeBefore.height, `éditeur : même hauteur (${shapeAfter.height})`)
  check(
    shapeAfter.breaks === shapeBefore.breaks,
    `éditeur : traits de page aux mêmes places (${shapeAfter.breaks} / ${shapeBefore.breaks})`
  )

  // Bulle du survol : retours à la ligne respectés.
  const hover = async (selector) => {
    await app.evaluate(`document.querySelector('.cm-scroller').scrollTop = 0`)
    await sleep(300)
    const box = await app.evaluate(`(() => {
      const mark = document.querySelector('${selector}')
      mark.scrollIntoView({ block: 'center' })
      const r = mark.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    })()`)
    await sleep(300)
    await app.page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x - 4, y: box.y })
    await app.page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...box })
    await sleep(900)
    return app.evaluate(`(() => {
      const t = document.querySelector('.rev-tooltip')
      return t ? { text: t.textContent, lines: t.innerText.split('\\n').length } : null
    })()`)
  }
  const tip = await hover('.fl-rev-jaune')
  check(
    tip?.text === 'Ligne un\nLigne deux\n(trois)' && tip.lines === 3,
    `bulle du survol sur trois lignes : ${JSON.stringify(tip)}`
  )
  await app.screenshot('revision-bulle-lignes.png')
  await app.page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 })
  await undo()
  check((await panel()).rows[0].comment === 'Revoir', 'Cmd + Z : ancien commentaire')

  // Ajouter puis retirer un commentaire ; Échap annule.
  await clickRow(2, 'edit')
  check((await bubble())?.value === '', 'fenêtre vide pour « Ajouter »')
  await type('Nouveau')
  await key('Enter', 'Enter', 13)
  check((await saved()).includes('[[R:bleu|Nouveau]]'), 'commentaire ajouté dans le fichier')
  await clickRow(2, 'edit')
  await app.evaluate(`document.querySelector('.revision-bubble textarea').select()`)
  await key('Backspace', 'Backspace', 8)
  await key('Enter', 'Enter', 13)
  text = await saved()
  check(text.includes('[[R:bleu]]') && !text.includes('Nouveau'), 'vide = commentaire retiré')
  await clickRow(0, 'edit')
  await type('xx')
  await key('Escape', 'Escape', 27)
  await sleep(300)
  check((await bubble()) === null && (await focused(0, 'edit')), 'Échap : annulé, focus au crayon')
  check((await panel()).rows[0].comment === 'Revoir', 'Échap : rien d’écrit')

  // 9d. Pastille d'une ligne : menu des 4 couleurs, commentaire gardé, Cmd + Z.
  await clickRow(0, 'color')
  const menu = await app.evaluate(
    `[...document.querySelectorAll('.revision-color-menu [role="menuitemradio"]')].map((m) => [m.textContent, m.getAttribute('aria-checked')])`
  )
  check(
    menu.length === 4 && menu[0][1] === 'true' && menu.slice(1).every((m) => m[1] === 'false'),
    `menu des couleurs : ${JSON.stringify(menu)}`
  )
  await app.screenshot('revision-menu-couleurs.png')
  await app.evaluate(`document.querySelector('.revision-color-choice[data-color="vert"]').click()`)
  await sleep(400)
  text = await saved()
  check(
    text.includes("[[R:vert|Revoir]]encore l'horloge[[/R]]"),
    'couleur changée, commentaire gardé'
  )
  f = await filters()
  check(f[0].count === '0' && f[1].count === '1', 'nombres des pastilles mis à jour')
  check(await focused(0, 'color'), 'focus sur la pastille de la ligne')
  await undo()
  check((await colors()) === 'jaune,rose,bleu', 'Cmd + Z : couleur d’origine')
  // Le filtre cache la nouvelle couleur : la ligne disparaît, le focus passe à la suivante.
  await clickFilter('bleu')
  await sleep(200)
  await clickRow(0, 'color')
  await app.evaluate(`document.querySelector('.revision-color-choice[data-color="bleu"]').click()`)
  await sleep(400)
  state = await panel()
  check(
    state.title === 'Révisions (1 / 3)' && (await colors()) === 'rose',
    `ligne cachée : ${state.title}`
  )
  check(await focused(0, 'row'), 'focus sur la ligne suivante')
  await undo()
  await clickFilter('bleu')
  await sleep(200)
  check((await colors()) === 'jaune,rose,bleu', 'Cmd + Z puis filtre rallumé')

  // 9e. Poubelle : seules les notes partent, sans confirmation ; focus suivant puis précédent.
  const beforeTrash = await saved()
  await clickRow(1, 'trash')
  check(
    (await app.evaluate(`!!document.querySelector('.dialog')`)) === false,
    'pas de confirmation'
  )
  check((await colors()) === 'jaune,bleu', 'ligne rose effacée')
  check(await focused(1, 'row'), 'focus sur la ligne suivante')
  text = await saved()
  check(
    !text.includes('[[R:rose') &&
      text ===
        beforeTrash
          .replace(`[[R:rose|${LONG_COMMENT}]]`, '')
          .replace('Non, non, non...[[/R]]', 'Non, non, non...'),
    'effacer retire seulement les notes'
  )
  await clickRow(1, 'trash')
  check(
    (await colors()) === 'jaune' && (await focused(0, 'row')),
    'dernière ligne : focus sur la précédente'
  )
  check(
    (await app.evaluate(`${rowButton(0, 'trash')}.title`)) === 'Effacer la marque (Cmd + Z annule)',
    'info-bulle de la poubelle'
  )
  await undo()
  await undo()
  check((await saved()) === beforeTrash, 'Cmd + Z deux fois : fichier identique')

  // 9f. Contraste des pastilles (allumée / éteinte) sur les 7 thèmes.
  await clickFilter('rose')
  await sleep(200)
  for (const theme of ['defaut', 'cobalt', 'or', 'matrix', 'pinklady', 'forest', 'aqua']) {
    await app.evaluate(`window.neoscenar.setTheme(${JSON.stringify(theme)})`)
    await sleep(500)
    const ratios = await app.evaluate(`(() => {
      const parse = (c) => c.match(/[\\d.]+/g).slice(0, 3).map(Number)
      const lum = ([r, g, b]) => {
        const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
      }
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }
      const panel = parse(getComputedStyle(document.querySelector('.revision-side-panel')).backgroundColor)
      const offDot = getComputedStyle(document.querySelector('.revision-filter[data-color="rose"] .revision-filter-dot'))
      const onDot = getComputedStyle(document.querySelector('.revision-filter[data-color="jaune"] .revision-filter-dot'))
      return {
        slash: ratio(parse(getComputedStyle(document.body).color), panel),
        ring: ratio(parse(offDot.boxShadow), panel),
        onBorder: ratio(parse(onDot.borderTopColor), panel),
        offFilled: offDot.backgroundImage !== 'none'
      }
    })()`)
    check(
      ratios.slash >= 3 && ratios.ring >= 3 && ratios.onBorder >= 3 && ratios.offFilled,
      `${theme} : pastilles lisibles (${JSON.stringify(Object.fromEntries(Object.entries(ratios).map(([k, v]) => [k, typeof v === 'number' ? v.toFixed(1) : v])))})`
    )
    await app.screenshot(`revision-filtre-${theme}.png`, filterBox)
  }
  await app.evaluate(`window.neoscenar.setTheme('defaut')`)
  await sleep(300)
}
