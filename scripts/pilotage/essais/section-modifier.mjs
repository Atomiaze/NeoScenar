// Sous-étape 18C-15 : ajouter, renommer, supprimer, imbriquer une section depuis le navigateur.
// Chaque action = une étape d'annulation ; arbre du navigateur, bandeaux « FIN DE … » et Statistiques
// justes ; un « ## » sans « # » au-dessus s'affiche sans problème ; aucun numéro ni carte touchés.

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
  '## Séquence 1',
  '',
  'INT. B - JOUR #20#',
  '',
  'Action B.',
  '',
  '# ACTE 2',
  '= Le milieu.',
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
  const sections = (text) =>
    text
      .split('\n')
      .filter((line) => line.startsWith('#'))
      .join(' | ')
  const state = () =>
    app.evaluate(`({
      tree: [...document.querySelectorAll('.navigator-row[data-position]')].map((r) =>
        r.style.getPropertyValue('--depth') + ':' +
        (r.classList.contains('section') ? r.querySelector('.navigator-title').textContent
          : r.querySelector('.navigator-number').textContent)).join(' '),
      ends: [...document.querySelectorAll('.fl-section-end')].map((e) => e.textContent.trim()),
      bands: [...document.querySelectorAll('.cm-line.fl-section')].map((l) => l.textContent.trim()),
      durations: [...document.querySelectorAll('.navigator-row.section')].map((r) =>
        r.querySelector('.navigator-title').textContent + ' ' + r.querySelector('.navigator-duration').textContent),
      summary: document.querySelector('.navigator-summary').textContent
    })`)
  const point = (selector, text) =>
    app.evaluate(`(() => {
      const e = [...document.querySelectorAll(${JSON.stringify(selector)})]
        .find((x) => x.textContent.includes(${JSON.stringify(text)}))
      if (!e) return null
      const b = e.getBoundingClientRect()
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 }
    })()`)
  const mouse = (type, p, button = 'left', clickCount = 1) =>
    app.page.send('Input.dispatchMouseEvent', {
      type,
      ...p,
      button,
      buttons: type === 'mousePressed' ? (button === 'right' ? 2 : 1) : 0,
      clickCount
    })
  const click = async (p, button = 'left') => {
    await mouse('mouseMoved', p)
    await mouse('mousePressed', p, button)
    await mouse('mouseReleased', p, button)
    await sleep(300)
  }
  const rowPoint = async (text) => {
    const p = await point('.navigator-row[data-position]', text)
    return { x: p.x - 40, y: p.y }
  }
  const menuItem = (label) =>
    app.evaluate(`(() => {
      const b = [...document.querySelectorAll('.context-menu [role="menuitem"]')]
        .find((x) => x.textContent.trim() === ${JSON.stringify(label)})
      return b ? { disabled: b.getAttribute('aria-disabled') === 'true', title: b.title } : null
    })()`)
  const openMenu = async (row) => click(await rowPoint(row), 'right')
  const chooseMenu = async (label) => {
    const p = await point('.context-menu [role="menuitem"]', label)
    await click(p)
  }
  const typeTitle = async (title, enter) => {
    await app.evaluate(`document.querySelector('.dialog input').select()`)
    await app.page.send('Input.insertText', { text: title })
    await sleep(200)
    if (enter) {
      for (const type of ['keyDown', 'keyUp']) {
        await app.page.send('Input.dispatchKeyEvent', {
          type,
          key: 'Enter',
          code: 'Enter',
          windowsVirtualKeyCode: 13
        })
      }
    } else await app.dialogButton('Valider')
    await sleep(300)
  }
  let steps = 0

  // 1. Départ.
  let now = await state()
  log('départ :', now.tree, '|', now.ends.join(', '))
  check(now.tree === '0:ACTE 1 1:S_0010 1:Séquence 1 2:S_0020 0:ACTE 2 1:S_0030', 'arbre de départ')

  // 2. Insérer une section au-dessus de la scène 20 : niveau de « Séquence 1 » ; Valider grisé si vide.
  await openMenu('S_0020')
  await chooseMenu('Insérer une section au-dessus…')
  let dialog = await app.dialog()
  check(dialog?.title === 'Insérer une section', 'fenêtre « Insérer une section »')
  check(
    await app.evaluate(
      `[...document.querySelectorAll('.dialog-actions button')].find((b) => b.textContent === 'Valider').disabled`
    ),
    'Valider grisé tant que le titre est vide'
  )
  await typeTitle('Le pont', true)
  let file = await saved()
  steps++
  check(
    file.includes('Action A.\n\n## Séquence 1\n\n## Le pont\n\nINT. B - JOUR #20#'),
    '« ## Le pont » écrit au-dessus de la scène, lignes vides autour'
  )
  now = await state()
  check(
    now.tree === '0:ACTE 1 1:S_0010 1:Séquence 1 1:Le pont 2:S_0020 0:ACTE 2 1:S_0030',
    `arbre : ${now.tree}`
  )
  await app.menu('Édition', 'Annuler')
  check((await saved()) === SCRIPT, 'Annuler : une seule étape, texte d’origine')
  await app.menu('Édition', 'Rétablir')
  await saved()

  // 3. Renommer par double-clic.
  const pont = await rowPoint('Le pont')
  await mouse('mousePressed', pont, 'left', 1)
  await mouse('mouseReleased', pont, 'left', 1)
  await mouse('mousePressed', pont, 'left', 2)
  await mouse('mouseReleased', pont, 'left', 2)
  await sleep(400)
  dialog = await app.dialog()
  check(dialog?.title === 'Renommer la section', 'double-clic : fenêtre « Renommer la section »')
  check(
    (await app.evaluate(`document.querySelector('.dialog input').value`)) === 'Le pont',
    'titre actuel proposé'
  )
  await typeTitle('La traversée', false)
  file = await saved()
  steps++
  check(file.includes('## La traversée\n') && !file.includes('Le pont'), 'section renommée')

  // 4. Imbriquer « La traversée » par la flèche → au survol : « ### », bandeaux justes.
  const row = await rowPoint('La traversée')
  await mouse('mouseMoved', row)
  await sleep(300)
  check(
    await app.evaluate(`[...document.querySelectorAll('.navigator-row.section')].find((r) =>
      r.textContent.includes('La traversée')).querySelector('.navigator-shift').offsetParent !== null`),
    'flèches visibles au survol'
  )
  await app.screenshot('section-modifier-1-survol.png')
  const nest = await app.evaluate(`(() => {
    const b = [...document.querySelectorAll('.navigator-row.section')].find((r) =>
      r.textContent.includes('La traversée')).querySelector('[aria-label="Imbriquer"]').getBoundingClientRect()
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 }
  })()`)
  await click(nest)
  file = await saved()
  steps++
  check(file.includes('### La traversée'), 'imbriquée : « ### La traversée »')
  now = await state()
  log('après imbrication :', now.tree, '|', now.ends.join(', '))
  check(
    now.tree === '0:ACTE 1 1:S_0010 1:Séquence 1 2:La traversée 3:S_0020 0:ACTE 2 1:S_0030',
    `arbre : ${now.tree}`
  )
  check(
    now.ends.includes('FIN DE La traversée') ||
      now.ends.some((e) => e.includes('LA TRAVERSÉE') || e.includes('La traversée')),
    `bandeau « FIN DE La traversée » (${now.ends.join(', ')})`
  )

  // 5. Refus : « ACTE 1 » ne s'imbrique pas (pas de sœur au-dessus), ne se désimbrique pas.
  await openMenu('ACTE 1')
  const refused = await menuItem('Imbriquer')
  const refusedUp = await menuItem('Désimbriquer')
  check(
    refused?.disabled && refused.title.includes('même niveau'),
    `Imbriquer grisé : « ${refused?.title} »`
  )
  check(refusedUp?.disabled, 'Désimbriquer grisé au premier niveau')
  await app.screenshot('section-modifier-2-menu.png')
  await chooseMenu('Imbriquer')
  check((await saved()) === file, 'clic sur une entrée grisée : rien ne change')
  await app.page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' })
  await sleep(200)

  // 6. Supprimer « ACTE 1 » (sans description : pas de question) : « ## » sans « # » au-dessus.
  await openMenu('ACTE 1')
  await chooseMenu('Supprimer la section')
  check((await app.dialog()) === null, 'pas de confirmation sans description')
  file = await saved()
  steps++
  check(
    file.startsWith('INT. A - JOUR #10#\n'),
    'ligne « # ACTE 1 » retirée, sans ligne vide en tête'
  )
  check(
    sections(file) === '## Séquence 1 | ### La traversée | # ACTE 2',
    `sous-sections au même niveau (${sections(file)})`
  )
  now = await state()
  log('« ## » sans « # » :', now.tree, '|', now.ends.join(', '), '|', now.durations.join(', '))
  check(
    now.tree === '0:S_0010 0:Séquence 1 1:La traversée 2:S_0020 0:ACTE 2 1:S_0030',
    `navigateur : ${now.tree}`
  )
  check(
    now.bands.length === 3,
    `trois bandeaux de section dans l’éditeur (${now.bands.join(', ')})`
  )
  check(now.ends.length === 3, `trois bandeaux « FIN DE … » (${now.ends.join(', ')})`)
  await app.screenshot('section-modifier-3-sans-acte.png')
  await app.module('Statistiques')
  await sleep(1000)
  const legend = await app.evaluate(
    `[...document.querySelectorAll('.stats-legend p:first-child .stats-legend-item')].map((e) => e.textContent.trim())`
  )
  log('Statistiques :', legend)
  // Les Statistiques ne comptent que les actes (« # ») : sans « # » au-dessus, « Hors acte ».
  check(
    legend.join(',') === 'Hors acte,ACTE 2',
    'Statistiques : scènes 10 et 20 hors acte, scène 30 dans l’ACTE 2'
  )
  await app.screenshot('section-modifier-4-statistiques.png')
  await app.module('Scénario')
  await sleep(800)

  // 7. Désimbriquer « Séquence 1 » : sa sous-section suit.
  await openMenu('Séquence 1')
  await chooseMenu('Désimbriquer')
  file = await saved()
  steps++
  check(
    sections(file) === '# Séquence 1 | ## La traversée | # ACTE 2',
    `désimbriquée, la sous-section suit (${sections(file)})`
  )

  // 8. Supprimer « ACTE 2 » (avec description) : question ; Annuler puis Supprimer.
  await openMenu('ACTE 2')
  await chooseMenu('Supprimer la section')
  dialog = await app.dialog()
  check(
    dialog?.title === 'Supprimer la section' && dialog.text.includes('description'),
    'confirmation demandée'
  )
  await app.dialogButton('Annuler')
  check((await saved()) === file, 'Annuler : rien ne change')
  await openMenu('ACTE 2')
  await chooseMenu('Supprimer la section')
  await app.dialogButton('Supprimer')
  file = await saved()
  steps++
  check(!file.includes('ACTE 2') && !file.includes('Le milieu'), 'section et description retirées')
  check(file.includes('Action B.\n\nINT. C - JOUR #30#'), 'scène 30 gardée, une ligne vide')

  // 9. « + Section » : niveau 1 à la fin.
  await app.click('.navigator-add-section')
  await sleep(300)
  check((await app.dialog())?.title === 'Ajouter une section', 'fenêtre « Ajouter une section »')
  await typeTitle('Épilogue', true)
  file = await saved()
  steps++
  check(file.endsWith('Action C.\n\n# Épilogue\n'), '« # Épilogue » ajouté à la fin')
  now = await state()
  log('fin :', now.tree, '|', now.ends.join(', '))
  check(
    now.tree === '0:S_0010 0:Séquence 1 1:La traversée 2:S_0020 2:S_0030 0:Épilogue',
    `arbre : ${now.tree}`
  )
  check(now.summary.startsWith('Scènes : 3'), 'trois scènes comptées')
  await app.screenshot('section-modifier-5-fin.png')

  // 10. Numéros et cartes inchangés.
  check(
    (file.match(/#\d+#/g) ?? []).join(',') === '#10#,#20#,#30#',
    'numéros de scène inchangés dans le fichier'
  )
  await app.module('Cartes')
  await sleep(1000)
  const cards = await app.sceneCards()
  log('cartes :', cards)
  check(cards.join(',') === 'S_0010,S_0020,S_0030', 'cartes inchangées')
  check(
    (await app.evaluate(`document.querySelectorAll('.orphan, [data-orphan="true"]').length`)) === 0,
    'aucune carte orpheline'
  )
  await app.module('Scénario')
  await sleep(800)

  // 11. Une étape d'annulation par action : retour au texte d'origine.
  for (let i = 0; i < steps; i++) await app.menu('Édition', 'Annuler')
  check((await saved()) === SCRIPT, `${steps} × Annuler : texte d’origine`)
}
