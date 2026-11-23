// Sous-étape 18C-10 : bouton « Aide » du module Scénario, fenêtre à huit onglets, Échap la ferme,
// lisible dans les sept thèmes. Au passage : compteur de page en haut, « # » donne un bandeau d'acte.

import { sleep } from '../application.mjs'

const KEYS = { End: 35, Enter: 13, Escape: 27, ArrowRight: 39, ArrowLeft: 37 }
const TABS = [
  'Éléments',
  'Clavier',
  'Rédiger',
  'Autres éléments',
  'Mise en forme',
  'Simultanés',
  'Numéros',
  'Révision'
]
const THEMES = ['defaut', 'cobalt', 'or', 'matrix', 'pinklady', 'forest', 'aqua']

export default async function ({ app, check, log, newProject }) {
  await app.openProject(newProject())
  await app.module('Scénario')
  await sleep(800)

  const press = async (key) => {
    const params = { key, code: key, windowsVirtualKeyCode: KEYS[key] }
    await app.page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...params })
    await app.page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...params })
    await sleep(200)
  }

  // 1. Le bouton « Aide » suit le bouton « Révision ».
  const buttons = await app.evaluate(
    `[...document.querySelectorAll('.script-module .toolbar .tool-button')].map((b) => b.textContent.trim())`
  )
  log(`barre : ${JSON.stringify(buttons)}`)
  check(buttons.indexOf('Aide') === buttons.indexOf('Révision') + 1, 'Aide à côté de Révision')

  // 2. Compteur de page dans la barre du haut.
  const counter = await app.evaluate(`(() => {
    const c = document.querySelector('.page-indicator')
    const editor = document.querySelector('.script-editor-host')
    return c && { text: c.textContent, inToolbar: !!c.closest('.toolbar'),
      above: c.getBoundingClientRect().bottom <= editor.getBoundingClientRect().top + 1 }
  })()`)
  log(`compteur : ${JSON.stringify(counter)}`)
  check(
    counter && counter.inToolbar && counter.above && /Page \d+ \/ \d+/.test(counter.text),
    'compteur de page en haut, au-dessus de la page'
  )

  // 3. Ouverture de la fenêtre.
  await app.click('.script-module .toolbar .tool-button[title^="Aide"]')
  await sleep(400)
  const dialog = () =>
    app.evaluate(`(() => {
      const d = document.querySelector('.help-dialog')
      return d && {
        title: d.querySelector('h2').textContent,
        tabs: [...d.querySelectorAll('[role="tab"]')].map((t) => t.textContent),
        selected: d.querySelector('[role="tab"][aria-selected="true"]')?.textContent,
        heading: d.querySelector('.help-panel h3')?.textContent,
        text: d.querySelector('.help-panel').innerText,
        tables: d.querySelectorAll('.help-panel table').length,
        focus: document.activeElement?.textContent
      }
    })()`)
  let state = await dialog()
  check(state !== null, 'le bouton ouvre la fenêtre d’aide')
  check(state.title === 'Aide — Module Scénario', 'titre de la fenêtre')
  check(JSON.stringify(state.tabs) === JSON.stringify(TABS), 'huit onglets dans l’ordre')
  check(state.selected === 'Éléments' && state.focus === 'Éléments', 'premier onglet ouvert')
  check(!/Brouillon/.test(state.text), 'pas de ligne « Brouillon »')
  check(/⌘ \+ Entrée/.test(state.text) && /⌘ \+ J/.test(state.text), 'raccourcis ⌘ sur Mac')

  // 4. Chaque onglet : rubrique attendue, capture.
  const expected = [
    ['Les six éléments principaux', /Transition\s+⌘ \+ G/],
    ['Écrire au clavier', /Maj \+ Entrée : va à la ligne/],
    ['Bien rédiger', /\(SOUS-TITRE\)/],
    ['Les autres éléments', /\[\[ texte \]\]/],
    ['Mise en forme', /F5 \(Échap pour sortir\)/],
    ['Dialogues simultanés', /MARC \^/],
    ['Numéros de scène', /Ne le modifiez pas à la main/],
    ['Le mode Révision', /Alt \+ clic \(Option sur Mac\)/]
  ]
  for (const [index, name] of TABS.entries()) {
    await app.click(`.help-dialog [role="tab"]:nth-child(${index + 1})`)
    await sleep(200)
    state = await dialog()
    const [heading, pattern] = expected[index]
    check(
      state.selected === name && state.heading === heading && pattern.test(state.text),
      `onglet « ${name} »`
    )
    await app.screenshot(`aide-${index + 1}.png`)
  }

  // 5. Flèches entre les onglets (focus sur l'onglet « Révision »).
  await app.evaluate(
    `document.querySelector('.help-dialog [role="tab"][aria-selected="true"]').focus()`
  )
  await press('ArrowRight')
  state = await dialog()
  check(state.selected === 'Éléments', 'flèche droite après le dernier : premier onglet')
  await press('ArrowLeft')
  state = await dialog()
  check(state.selected === 'Révision', 'flèche gauche : onglet précédent')

  // 6. Lisible dans les sept thèmes (onglet actif, texte, en-têtes de tableau, code).
  await app.click('.help-dialog [role="tab"]:nth-child(4)')
  await sleep(200)
  for (const theme of THEMES) {
    await app.evaluate(`window.neoscenar.setTheme(${JSON.stringify(theme)})`)
    await sleep(400)
    const ratios = await app.evaluate(`(() => {
      const parse = (c) => c.match(/[\\d.]+/g).slice(0, 3).map(Number)
      const lum = ([r, g, b]) => {
        const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
      }
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }
      const style = (s) => getComputedStyle(document.querySelector(s))
      const surface = parse(style('.help-dialog').backgroundColor)
      const tab = style('.help-tab.active')
      const th = style('.help-table th')
      const inactive = style('.help-tab:not(.active)')
      return {
        text: ratio(parse(style('.help-panel td').color), surface),
        code: ratio(parse(style('.help-panel code').color), surface),
        header: ratio(parse(th.color), parse(th.backgroundColor)),
        tab: ratio(parse(tab.color), parse(tab.backgroundColor)),
        otherTab: ratio(parse(inactive.color), surface)
      }
    })()`)
    const shown = Object.fromEntries(Object.entries(ratios).map(([k, v]) => [k, v.toFixed(1)]))
    check(
      Object.values(ratios).every((v) => v >= 4.5),
      `${theme} : lisible (${JSON.stringify(shown)})`
    )
    await app.screenshot(`aide-theme-${theme}.png`)
  }
  await app.evaluate(`window.neoscenar.setTheme('defaut')`)
  await sleep(300)

  // 7. Échap ferme la fenêtre, puis Fermer.
  await press('Escape')
  await sleep(200)
  check((await dialog()) === null, 'Échap ferme la fenêtre')
  await app.click('.script-module .toolbar .tool-button[title^="Aide"]')
  await sleep(300)
  state = await dialog()
  check(state !== null && state.selected === 'Éléments', 'rouverte sur le premier onglet')
  await app.dialogButton('Fermer')
  await sleep(300)
  check((await dialog()) === null, 'Fermer ferme la fenêtre')

  // 8. Sections : « # » tapé au début d'une ligne créée par Entrée, puis bouton « Section ».
  const actLine = (name) =>
    app.evaluate(`(() => {
      const line = [...document.querySelectorAll('.cm-line')].find((l) => l.textContent.includes(${JSON.stringify(name)}))
      return line && { cls: line.className, text: line.textContent,
        navigator: [...document.querySelectorAll('.navigator-row')].some((r) => r.textContent.includes(${JSON.stringify(name)})),
        end: [...document.querySelectorAll('.fl-section-end')].some((e) => e.textContent.includes(${JSON.stringify(name)})) }
    })()`)

  // 8a. Tapé au clavier (constat, sans vérification : voir le rapport).
  await app.mouseClick('.cm-line', 'Texte avant la première scène.')
  await press('End')
  await press('Enter')
  await app.page.send('Input.insertText', { text: '# ACTE 1' })
  await sleep(300)
  await app.mouseClick('.cm-line', 'Un.')
  await sleep(800)
  log(`« # ACTE 1 » tapé après Entrée, ligne quittée : ${JSON.stringify(await actLine('ACTE 1'))}`)

  // 8b. Bouton « Section » de la barre des éléments.
  await app.mouseClick('.cm-line', 'Deux.')
  await press('End')
  await press('Enter')
  await app.page.send('Input.insertText', { text: 'ACTE 2' })
  await sleep(300)
  await app.click('.element-bar-button[title^="Section"]')
  await sleep(300)
  await app.mouseClick('.cm-line', 'Trois.')
  await sleep(800)
  const act = await actLine('ACTE 2')
  log(`bouton Section : ${JSON.stringify(act)}`)
  check(act && /fl-section/.test(act.cls), 'bouton « Section » : bandeau d’acte')
  check(act && act.navigator, 'ACTE 2 dans le navigateur de scènes')
  check(act && act.end, 'bandeau « FIN DE ACTE 2 »')
  await app.screenshot('aide-acte.png')
}
