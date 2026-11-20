// Étape 14B : couleurs des éléments du scénario. Réglages par thème (Matrix ≠ Cobalt), aperçu à
// l'événement input, « Couleurs d'origine du thème », bandeaux d'actes, avertissement de contraste,
// Par défaut clair / sombre, mémorisation dans les préférences.

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

const TEXT = `Title: Essai

# ACTE 1

INT. CUISINE - JOUR

Marie entre. [[à vérifier]]

MARIE
(bas)
Tu as vu l'heure ?

CUT TO:

EXT. RUE - NUIT

Il pleut.
`

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  writeFileSync(join(dirname(projectFile), 'neoscenar', 'scenario.fountain'), TEXT)
  await app.openProject(projectFile)
  await app.module('Scénario')
  await sleep(1500)

  const css = (selector, property = 'color') =>
    app.evaluate(
      `(() => { const e = document.querySelector(${JSON.stringify(selector)}); return e ? getComputedStyle(e).${property} : null })()`
    )
  const rgb = (hex) => {
    const n = parseInt(hex.slice(1), 16)
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
  }
  const setTheme = async (id) => {
    await app.evaluate(`window.neoscenar.setTheme(${JSON.stringify(id)})`)
    await sleep(500)
  }
  // Vrai événement « input » d'un sélecteur de couleur (comme un déplacement dans le sélecteur).
  const pick = async (element, hex) => {
    await app.evaluate(`(() => {
      const input = document.querySelector('input[data-element="${element}"]')
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      set.call(input, ${JSON.stringify(hex)})
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })()`)
    await sleep(60)
  }
  const saved = () => app.evaluate(`window.neoscenar.getScriptColors()`)

  // 1. Matrix : couleurs d'origine.
  await setTheme('matrix')
  const matrixNote = await css('.fl-note')
  const matrixDialogue = await css('.cm-line.fl-dialogue')
  const matrixDefaultNote = await css('.fl-note')
  check(matrixNote !== null, 'une note [[ ]] est visible dans le scénario')
  check(matrixDialogue === rgb('#4dff7a'), `Matrix : dialogue vert d'origine (${matrixDialogue})`)

  // 2. Réglages : section, thème affiché, aperçu en direct.
  await app.menu('NeoScenar', 'Réglages…')
  await sleep(500)
  const palette = () =>
    app.evaluate(`document.querySelector('[data-testid="script-colors-palette"]').textContent`)
  check(
    (await palette()).includes('Matrix'),
    `section réglée sur le thème affiché (${await palette()})`
  )
  const previewNote = () => css('[data-testid="script-colors-preview"] .pv-note')
  const rows = await app.evaluate(
    `document.querySelectorAll('input[type=color][data-element]').length`
  )
  check(rows === 13, `13 sélecteurs de couleur (${rows})`)

  await pick('note', '#ff00ff')
  check((await previewNote()) === rgb('#ff00ff'), "aperçu : la note change dès l'événement input")
  check((await css('.fl-note')) === rgb('#ff00ff'), 'scénario : la note change aussitôt')
  await pick('dialogue', '#ffcc00')
  await pick('character', '#00ffff')
  await pick('selection', '#336699')
  // L'aperçu reste visible quand on fait défiler la fenêtre jusqu'en bas.
  await app.evaluate(`document.querySelector('.dialog-body').scrollTop = 100000`)
  await sleep(200)
  const box = await app.evaluate(`(() => {
    const p = document.querySelector('[data-testid="script-colors-preview"]').getBoundingClientRect()
    const b = document.querySelector('.dialog-body').getBoundingClientRect()
    return { top: p.top, bottom: p.bottom, bodyTop: b.top, bodyBottom: b.bottom }
  })()`)
  check(
    box.top >= box.bodyTop - 1 && box.bottom <= box.bodyBottom + 1,
    'aperçu collant : visible après défilement en bas'
  )
  await app.screenshot('couleurs-matrix-reglages.png')
  await app.evaluate(`document.querySelector('.dialog-body').scrollTop = 0`)
  await sleep(600)
  let prefs = await saved()
  check(
    prefs.matrix?.note === '#ff00ff' && prefs.matrix?.dialogue === '#ffcc00',
    'préférences : seulement les différences, rangées sous « matrix »'
  )
  check(Object.keys(prefs).join() === 'matrix', 'aucun autre thème touché')

  // 3. Cobalt ne change pas.
  await app.evaluate(`document.querySelector('input[name="theme"][value="cobalt"]').click()`)
  await sleep(600)
  check((await palette()).includes('Cobalt'), 'la section suit le thème choisi (Cobalt)')
  const cobaltNote = await css('.fl-note')
  check(cobaltNote !== rgb('#ff00ff'), `Cobalt : la note garde ses couleurs (${cobaltNote})`)
  check(
    (await css('.cm-line.fl-dialogue')) === rgb('#eef3ff'),
    'Cobalt : dialogue = texte du thème'
  )
  await app.screenshot('couleurs-cobalt-reglages.png')
  await app.evaluate(`document.querySelector('input[name="theme"][value="matrix"]').click()`)
  await sleep(600)
  check((await css('.fl-note')) === rgb('#ff00ff'), 'retour à Matrix : le réglage est resté')

  // 4. Bandeau d'acte : automatique d'abord, puis réglé (texte lisible choisi seul).
  const autoBand = await css('.cm-line.fl-section', 'backgroundColor')
  check(
    autoBand !== null && autoBand !== 'rgba(0, 0, 0, 0)',
    `acte : palette automatique (${autoBand})`
  )
  await pick('actBackground', '#202020')
  check(
    (await css('.cm-line.fl-section', 'backgroundColor')) === rgb('#202020'),
    'acte : fond réglé'
  )
  check(
    (await css('.cm-line.fl-section')) === 'rgb(255, 255, 255)',
    'acte : texte blanc choisi seul'
  )
  await pick('actText', '#252525')
  const warnAct = await app.evaluate(`!!document.querySelector('[data-warning="actText"]')`)
  check(warnAct, 'acte : avertissement quand le texte est trop proche du fond')
  await app.screenshot('couleurs-avertissement.png')

  // 5. Avertissement de contraste sur la page, sans blocage.
  await pick('pageNumber', '#010101')
  check(
    await app.evaluate(`!!document.querySelector('[data-warning="pageNumber"]')`),
    'numéro de page presque noir sur fond noir : avertissement'
  )
  check(
    (await css('[data-testid="script-colors-preview"] .pv-page-number')) === rgb('#010101'),
    'le choix reste permis'
  )

  // 6. Une couleur remise à celle d'origine n'est plus écrite.
  await pick('pageNumber', '#4dff7a')
  await sleep(600)
  prefs = await saved()
  check(
    prefs.matrix?.pageNumber === '#4dff7a' || prefs.matrix?.pageNumber === undefined,
    'pageNumber enregistré ou absent'
  )

  // 7. Couleurs d'origine du thème.
  await app.click('[data-testid="script-colors-reset-all"]')
  await sleep(700)
  check(
    (await css('.fl-note')) === matrixDefaultNote,
    "« Couleurs d'origine » : la note reprend le vert du thème"
  )
  check((await css('.cm-line.fl-dialogue')) === matrixDialogue, 'dialogue : retour au thème')
  check(
    (await css('.cm-line.fl-section', 'backgroundColor')) === autoBand,
    'acte : retour à la palette automatique'
  )
  prefs = await saved()
  check(Object.keys(prefs).length === 0, 'préférences : plus aucun réglage')

  // 8. Par défaut : clair et sombre séparés, le jeu affiché est annoncé.
  await app.evaluate(`document.querySelector('input[name="theme"][value="defaut"]').click()`)
  await sleep(600)
  const label = await palette()
  check(/Par défaut \((clair|sombre)\)/.test(label), `Par défaut : jeu annoncé (${label})`)
  await app.click('.dialog button.primary')
  await sleep(300)

  // 9. Le PDF n'est pas concerné (test unitaire exportsIgnoreTheme) : on le dit dans la section.
  await app.menu('NeoScenar', 'Réglages…')
  await sleep(400)
  const note = await app.evaluate(
    `document.querySelector('[data-testid="script-colors"]').textContent`
  )
  check(
    note.includes('PDF reste en noir sur blanc'),
    'la section rappelle que le PDF ne change pas'
  )
  await app.click('.dialog button.primary')
  await setTheme('defaut')
  log('captures : couleurs-*.png')
}
