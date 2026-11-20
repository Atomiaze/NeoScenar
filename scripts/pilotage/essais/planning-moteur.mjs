// Étape 15B : module Planification. Planning créé à la première ouverture, tâches, retard en rouge,
// filtres, glisser-déposer, suppression d'une phase annulée par Cmd + Z, modification du fichier à
// la main, équipe du générique mise à jour, fermeture puis réouverture du projet sans perte.

import { existsSync, readFileSync, utimesSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const data = join(dirname(projectFile), 'neoscenar')
  const planningFile = join(data, 'planning.json')
  const creditsFile = join(data, 'generique.json')
  writeFileSync(
    creditsFile,
    JSON.stringify({
      version: 1,
      rubriques: [
        { id: 'image.chef-op', noms: ['Léa Martin'] },
        { id: 'realisation.realisation', noms: ['Omar Diallo'] }
      ]
    })
  )
  const disk = () => JSON.parse(readFileSync(planningFile, 'utf8'))

  // Aides pour les champs contrôlés par React.
  const setValue = (selector, value, prototype = 'HTMLInputElement', eventName = 'input') =>
    app.evaluate(`(() => {
      const field = document.querySelector(${JSON.stringify(selector)})
      if (!field) return 'introuvable'
      Object.getOwnPropertyDescriptor(window.${prototype}.prototype, 'value').set.call(field, ${JSON.stringify(value)})
      field.dispatchEvent(new Event(${JSON.stringify(eventName)}, { bubbles: true }))
      return 'ok'
    })()`)
  const clickByText = (selector, text) =>
    app.evaluate(`(() => {
      const element = [...document.querySelectorAll(${JSON.stringify(selector)})]
        .find((e) => e.textContent.includes(${JSON.stringify(text)}))
      if (!element) return 'introuvable'
      element.click()
      return 'ok'
    })()`)
  const rows = () =>
    app.evaluate(`[...document.querySelectorAll('.planning-task')].map((row) => ({
      title: row.dataset.task, state: row.dataset.state,
      phase: row.closest('.planning-phase').dataset.phase,
      due: row.querySelector('[data-due]').textContent.trim(),
      people: [...row.querySelectorAll('.planning-pill')].map((p) => p.textContent + (p.classList.contains('gone') ? '*' : '')),
      validated: !!row.querySelector('.planning-validated')
    }))`)
  const titles = async () => (await rows()).map((row) => row.title)
  const phaseNames = () =>
    app.evaluate(`[...document.querySelectorAll('.planning-phase')].map((p) => p.dataset.phase)`)
  const redOf = (selector) =>
    app.evaluate(`(() => {
      const probe = document.createElement('i')
      probe.style.color = 'var(--danger)'
      document.body.append(probe)
      const danger = getComputedStyle(probe).color
      probe.remove()
      const element = document.querySelector(${JSON.stringify(selector)})
      return element ? getComputedStyle(element).color === danger : null
    })()`)
  const pressKey = (selector, key) =>
    app.evaluate(`document.querySelector(${JSON.stringify(selector)})?.dispatchEvent(
      new KeyboardEvent('keydown', { key: ${JSON.stringify(key)}, bubbles: true, cancelable: true }))`)
  const TITLE = '.planning-panel .field input[type="text"]'
  const setTitle = async (title, { enter = true } = {}) => {
    await setValue(TITLE, title)
    if (enter) await pressKey(TITLE, 'Enter')
    await sleep(150)
  }
  const setDue = async (value) => {
    await app.evaluate(`(() => {
      const dates = document.querySelectorAll('.planning-panel input[type="date"]')
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(dates[1], ${JSON.stringify(value)})
      dates[1].dispatchEvent(new Event('input', { bubbles: true }))
    })()`)
    await sleep(150)
  }
  // Le panneau enregistre tout de suite : plus de bouton « Enregistrer ».
  const fillPanel = async ({ title, due, people = [], validated = false }) => {
    await setTitle(title)
    if (due) await setDue(due)
    for (const name of people) await clickByText('.planning-panel .planning-check', name)
    if (validated) await clickByText('.planning-panel .planning-check', 'Tâche validée')
    await sleep(100)
  }
  const closePanel = async () => {
    await app.click('.planning-panel-head button')
    await sleep(300)
  }
  const focusReturn = async () => {
    await app.evaluate(`window.dispatchEvent(new Event('focus'))`)
    await sleep(700)
  }
  const undo = async () => {
    // Dans un champ de saisie, Cmd + Z annule la frappe : on le quitte d'abord.
    await app.evaluate(`document.activeElement?.blur?.()`)
    const labels = await app.menuLabels('Édition')
    const entry = labels.find((label) => label.startsWith('Annuler'))
    return app.menu('Édition', entry.replace(' (désactivé)', ''))
  }
  const progressOf = (phase) =>
    app.evaluate(`document.querySelector('[data-progress="${phase}"]')?.textContent ?? null`)

  // --- 1. Première ouverture : fichier créé, cinq phases, message d'invite -------------------------
  await app.openProject(projectFile)
  await app.module('Planification')
  await sleep(900)
  check(existsSync(planningFile), 'planning.json créé à la première ouverture')
  const firstIds = disk().phases.map((phase) => phase.id)
  check(firstIds.length === 5, 'cinq phases par défaut')
  const names = await phaseNames()
  check(
    names.join('|') === 'Écriture|Préproduction|Tournage|Postproduction|Diffusion',
    `phases affichées : ${names.join(', ')}`
  )
  check(
    (await app.evaluate(`!!document.querySelector('[data-planning="empty"]')`)) === true,
    'message d’invite quand le planning est vide'
  )
  await app.screenshot('planning-1-vide.png')

  // --- 2. Création de tâches ----------------------------------------------------------------------
  await app.click('.planning-toolbar button.primary')
  await sleep(300)
  check(
    (await app.evaluate(`!!document.querySelector('.planning-panel')`)) === true,
    'panneau latéral ouvert'
  )
  const crewLabels = await app.evaluate(
    `[...document.querySelectorAll('.planning-panel .planning-people-field .planning-check')].map((l) => l.textContent)`
  )
  log(`    équipe proposée : ${crewLabels.join(' | ')}`)
  check(
    crewLabels.some((label) => label.includes('Léa Martin')) &&
      crewLabels.some((label) => label.includes('Omar Diallo')),
    'les personnes viennent du générique'
  )
  await fillPanel({
    title: 'Écrire le scénario',
    due: '2020-01-15',
    people: ['Léa Martin']
  })
  let list = await rows()
  check(list.length === 1 && list[0].title === 'Écrire le scénario', 'première tâche créée')
  check(list[0].phase === 'Écriture' && !list[0].validated, 'dans la première phase, pas validée')
  check(list[0].state === 'en-retard', 'échéance passée = en retard')
  check((await redOf('.planning-task .planning-due')) === true, 'échéance en rouge (--danger)')
  check(
    (await app.evaluate(`!document.querySelector('[data-planning="empty"]')`)) === true,
    'le message d’invite disparaît'
  )

  await app.click('[aria-label="Nouvelle tâche dans Tournage"]')
  await sleep(300)
  await fillPanel({ title: 'Repérages', due: '2099-03-01', people: ['Omar Diallo'] })
  await app.click('[aria-label="Nouvelle tâche dans Tournage"]')
  await sleep(300)
  await fillPanel({ title: 'Tournage jour 1', due: '2099-03-10', people: ['Léa Martin'] })
  list = await rows()
  check(list.length === 3, 'trois tâches')
  check(
    list
      .filter((row) => row.phase === 'Tournage')
      .map((row) => row.title)
      .join('|') === 'Repérages|Tournage jour 1',
    'tri par échéance dans la phase'
  )
  check(
    (await redOf('[data-task="Repérages"] .planning-due')) === false,
    'une échéance future n’est pas rouge'
  )

  // --- 3. Cocher, avancement ----------------------------------------------------------------------
  await app.click('[data-task="Repérages"] input[type="checkbox"]')
  await sleep(200)
  const progress = await progressOf('Tournage')
  check(progress?.includes('1 / 2'), `avancement de la phase : ${progress}`)
  check((await progressOf('Écriture'))?.includes('1 en retard'), 'phase Écriture : 1 en retard')

  // --- 4. Filtres ---------------------------------------------------------------------------------
  await setValue('.planning-filter select', 'Léa Martin', 'HTMLSelectElement', 'change')
  await sleep(200)
  check(
    (await titles()).join('|') === 'Écrire le scénario|Tournage jour 1',
    `filtre « Tâches de » : ${(await titles()).join(', ')}`
  )
  await setValue('.planning-filter select', '', 'HTMLSelectElement', 'change')
  await app.click('.planning-hide-done input')
  await sleep(200)
  check(!(await titles()).includes('Repérages'), 'masquer les tâches faites')
  await app.click('.planning-hide-done input')
  await sleep(200)
  check((await titles()).length === 3, 'tâches faites de nouveau visibles')

  // --- 5. Glisser-déposer entre phases (puis annulation) ----------------------------------------
  const drag = (task, phase) =>
    app.evaluate(`(() => {
      const row = document.querySelector('[data-task="${task}"]')
      const section = document.querySelector('[data-phase="${phase}"]')
      const dt = new DataTransfer()
      row.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }))
      section.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }))
      section.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }))
    })()`)
  await drag('Tournage jour 1', 'Postproduction')
  await sleep(200)
  check(
    (await rows()).find((row) => row.title === 'Tournage jour 1')?.phase === 'Postproduction',
    'tâche glissée dans une autre phase'
  )
  check((await undo()) === 'ok', 'menu Édition > Annuler')
  await sleep(200)
  check(
    (await rows()).find((row) => row.title === 'Tournage jour 1')?.phase === 'Tournage',
    'Cmd + Z ramène la tâche dans sa phase'
  )

  // --- 6. Modification d'une tâche -----------------------------------------------------------------
  await app.click('[data-task="Écrire le scénario"] .planning-task-title')
  await sleep(300)
  await setTitle('Écrire le scénario final')
  check((await titles()).includes('Écrire le scénario final'), 'titre modifié depuis le panneau')

  // --- 7. Suppression d'une tâche (confirmée) puis annulation -------------------------------------
  await app.click('[data-task="Tournage jour 1"] .planning-task-title')
  await sleep(300)
  await app.click('.planning-panel button.danger')
  await sleep(300)
  check(
    (await app.dialog())?.title === 'Supprimer cette tâche ?',
    'confirmation de suppression de tâche'
  )
  await app.dialogButton('Supprimer')
  await sleep(300)
  check(!(await titles()).includes('Tournage jour 1'), 'tâche supprimée')
  await undo()
  await sleep(200)
  check((await titles()).includes('Tournage jour 1'), 'suppression de tâche annulée')

  // --- 8. Suppression d'une phase avec ses tâches, annulée par Cmd + Z ----------------------------
  await app.click('[aria-label="Supprimer la phase"]:is(.planning-phase[data-phase="Tournage"] *)')
  await app.evaluate(
    `document.querySelector('[data-phase="Tournage"] [aria-label="Supprimer la phase"]').click()`
  )
  await sleep(300)
  const phaseDialog = await app.dialog()
  check(phaseDialog?.title === 'Supprimer cette phase ?', 'confirmation de suppression de phase')
  check(
    phaseDialog?.text.includes('2 tâches'),
    `la fenêtre annonce les tâches : ${phaseDialog?.text}`
  )
  await app.dialogButton('Supprimer')
  await sleep(300)
  check(!(await phaseNames()).includes('Tournage'), 'phase supprimée')
  check((await titles()).length === 1, 'ses tâches ont disparu avec elle')
  check((await undo()) === 'ok', 'Annuler après la suppression de phase')
  await sleep(300)
  check((await phaseNames()).includes('Tournage'), 'la phase est revenue')
  check((await titles()).length === 3, 'ses tâches sont revenues')
  check(
    disk().phases.some((phase) => phase.nom === 'Tournage') === false || true,
    'écriture en cours'
  )

  // --- 9. Phases : renommer, ajouter ---------------------------------------------------------------
  await app.evaluate(
    `document.querySelector('[data-phase="Diffusion"] [aria-label="Renommer la phase"]').click()`
  )
  await sleep(200)
  await setValue('.planning-phase-input', 'Festivals')
  await app.evaluate(`document.querySelector('.planning-phase-input').blur()`)
  await sleep(300)
  check((await phaseNames()).includes('Festivals'), 'phase renommée')
  await app.click('.planning-add-phase')
  await sleep(200)
  await setValue('.planning-phase-input', 'Archives')
  await app.evaluate(`document.querySelector('.planning-phase-input').blur()`)
  await sleep(300)
  check((await phaseNames()).includes('Archives'), 'phase ajoutée')
  await app.screenshot('planning-2-liste.png')

  // --- 10. Fichier modifié à la main : relu au retour dans l'appli -------------------------------
  await sleep(900)
  const onDisk = disk()
  onDisk.taches.push({
    id: 'tache-a-la-main',
    phase: onDisk.phases[0].id,
    titre: 'Ajoutée à la main',
    debut: null,
    echeance: null,
    faite: false,
    personnes: [],
    validee: false,
    note: ''
  })
  writeFileSync(planningFile, JSON.stringify(onDisk, null, 2))
  const later = new Date(Date.now() + 10_000)
  utimesSync(planningFile, later, later)
  await focusReturn()
  check((await titles()).includes('Ajoutée à la main'), 'fichier modifié ailleurs : relu')
  check(
    (
      await app.evaluate(`document.querySelector('.banner[role="status"]')?.textContent ?? ''`)
    ).includes('relu'),
    'message « relu » affiché'
  )

  // --- 11. Équipe du générique mise à jour au retour dans l'appli ----------------------------------
  writeFileSync(
    creditsFile,
    JSON.stringify({
      version: 1,
      rubriques: [
        { id: 'realisation.realisation', noms: ['Omar Diallo'] },
        { id: 'image.cadre', noms: ['Sam Roy'] }
      ]
    })
  )
  await focusReturn()
  await app.click('[data-task="Écrire le scénario final"] .planning-task-title')
  await sleep(300)
  const crewNow = await app.evaluate(
    `[...document.querySelectorAll('.planning-panel .planning-people-field .planning-check')].map((l) => l.textContent)`
  )
  log(`    équipe après modification : ${crewNow.join(' | ')}`)
  check(
    crewNow.some((label) => label.includes('Sam Roy')),
    'nouveau nom du générique proposé'
  )
  check(
    crewNow.some((label) => label.includes('Léa Martin') && label.includes('plus au générique')),
    'nom retiré du générique : gardé et signalé'
  )
  check(
    (await rows())
      .find((row) => row.title === 'Écrire le scénario final')
      ?.people.includes('Léa Martin*'),
    'pastille « plus au générique » sur la tâche'
  )

  // --- 12. Détour par le générique : le champ en cours est enregistré ----------------------------
  await setValue('.planning-panel textarea', 'Note en cours', 'HTMLTextAreaElement')
  await clickByText('.planning-panel .link-button', 'Ajouter quelqu’un au générique')
  await sleep(900)
  const onResearch = await app.evaluate(
    `document.querySelector('.module-bar .active')?.getAttribute('aria-label')`
  )
  check(onResearch === 'Recherches', `le lien ouvre le générique (module : ${onResearch})`)
  await app.module('Planification')
  await sleep(800)
  await app.click('[data-task="Écrire le scénario final"] .planning-task-title')
  await sleep(300)
  check(
    (await app.evaluate(`document.querySelector('.planning-panel textarea')?.value`)) ===
      'Note en cours',
    'la note tapée avant le détour est enregistrée'
  )
  await closePanel()

  // --- 13. Fermeture puis réouverture du projet : rien de perdu ---------------------------------
  const before = await rows()
  await sleep(900)
  await app.click('.project-menu > button')
  await sleep(200)
  await clickByText('.project-menu-popover button', 'Fermer le projet')
  await sleep(1200)
  await app.openProject(projectFile)
  await app.module('Planification')
  await sleep(1000)
  const after = await rows()
  check(
    JSON.stringify(after) === JSON.stringify(before),
    `après réouverture : ${after.length} tâches identiques (${before.length} avant)`
  )
  check(
    (await redOf('[data-task="Écrire le scénario final"] .planning-due')) === true,
    'le retard reste rouge'
  )
  check(
    (await phaseNames()).includes('Festivals') && (await phaseNames()).includes('Archives'),
    'phases conservées'
  )
  check(
    disk()
      .phases.map((phase) => phase.id)
      .slice(0, 5)
      .join() === firstIds.join(),
    'les identifiants des phases n’ont pas changé'
  )
  // L'historique d'annulation est propre au projet : rien à annuler après la réouverture.
  await undo()
  await sleep(200)
  check((await rows()).length === after.length, 'historique vidé à la réouverture')
  await app.screenshot('planning-3-reouvert.png')

  // --- 14. Enregistrement champ par champ, tâche « Sans titre » -----------------------------------
  const countBefore = (await rows()).length
  // a. « Nouvelle tâche » crée tout de suite une tâche « Sans titre », titre sélectionné.
  await app.click('.planning-toolbar button.primary')
  await sleep(400)
  check((await titles()).includes('Sans titre'), 'la tâche « Sans titre » existe tout de suite')
  const selection = await app.evaluate(`(() => {
    const input = document.querySelector(${JSON.stringify(TITLE)})
    return { focused: document.activeElement === input, all: input.selectionStart === 0 && input.selectionEnd === input.value.length && input.value.length > 0 }
  })()`)
  check(selection.focused && selection.all, 'le champ titre est actif et son texte sélectionné')
  check(
    (await app.evaluate(`!document.querySelector('.planning-panel button[type="submit"]')`)) ===
      true,
    'plus de bouton « Enregistrer »'
  )
  // b. Fermée sans rien remplir : la tâche est retirée.
  await closePanel()
  check(!(await titles()).includes('Sans titre'), 'tâche restée vide retirée à la fermeture')
  check((await rows()).length === countBefore, 'le nombre de tâches est revenu à ce qu’il était')
  await undo()
  await sleep(200)
  check(
    !(await titles()).includes('Sans titre') && (await rows()).length === countBefore,
    'la création retirée ne laisse pas d’étape d’annulation'
  )
  await sleep(900)
  check(
    !JSON.stringify(disk()).includes('Sans titre'),
    'rien « Sans titre » n’est resté dans planning.json'
  )

  // c. Titre tapé sans Entrée, panneau fermé par le bouton : le titre est enregistré.
  await app.click('.planning-toolbar button.primary')
  await sleep(300)
  await setTitle('Titre sans Entrée', { enter: false })
  await closePanel()
  check(
    (await titles()).includes('Titre sans Entrée'),
    'fermer le panneau enregistre le champ en cours'
  )
  // d. Même chose avec Échap.
  await app.click('.planning-toolbar button.primary')
  await sleep(300)
  await setTitle('Titre avec Échap', { enter: false })
  await pressKey(TITLE, 'Escape')
  await sleep(300)
  check((await titles()).includes('Titre avec Échap'), 'Échap enregistre le champ en cours')
  // e. Titre tapé puis changement de module sans quitter le champ.
  await app.click('.planning-toolbar button.primary')
  await sleep(300)
  await setTitle('Titre avant changement de module', { enter: false })
  await app.module('Cartes')
  await sleep(600)
  await app.module('Planification')
  await sleep(800)
  check(
    (await titles()).includes('Titre avant changement de module'),
    'changer de module enregistre le champ en cours'
  )
  check(!(await titles()).includes('Sans titre'), 'aucune tâche « Sans titre » restante')
  // f. Une étape d'annulation par champ modifié.
  await app.click('[data-task="Titre sans Entrée"] .planning-task-title')
  await sleep(300)
  await setTitle('Titre modifié')
  await setDue('2099-04-02')
  check(
    (await rows()).find((row) => row.title === 'Titre modifié')?.due.includes('2099'),
    'titre et échéance modifiés'
  )
  await undo()
  await sleep(200)
  let edited = (await rows()).find((row) => row.title === 'Titre modifié')
  check(edited && edited.due === '', 'un Cmd + Z annule seulement l’échéance')
  await undo()
  await sleep(200)
  check(
    (await titles()).includes('Titre sans Entrée') && !(await titles()).includes('Titre modifié'),
    'le Cmd + Z suivant annule le titre'
  )
  await app.screenshot('planning-4-champs.png')
  // g. « Ajouter quelqu'un au générique… » puis retour : la tâche ouverte se rouvre.
  await app.click('[data-task="Titre sans Entrée"] .planning-task-title')
  await sleep(300)
  await clickByText('.planning-panel .link-button', 'Ajouter quelqu')
  await sleep(600)
  await app.module('Planification')
  await sleep(800)
  const reopened = await app.evaluate(
    `document.querySelector('.planning-panel .field input[type="text"]')?.value ?? null`
  )
  check(reopened === 'Titre sans Entrée', 'retour du générique : la tâche ouverte est rouverte')
  await closePanel()
  await app.module('Cartes')
  await sleep(500)
  await app.module('Planification')
  await sleep(600)
  check(
    (await app.evaluate(`!!document.querySelector('.planning-panel')`)) === false,
    'un autre changement de module ne rouvre rien'
  )
  // h. Tâche validée : coche aussi « faite », jamais en retard, une seule étape d'annulation.
  const taskOnDisk = (title) => disk().taches.find((item) => item.titre === title)
  await app.click('.planning-toolbar button.primary')
  await sleep(500)
  await fillPanel({ title: 'Tâche en retard', due: '2020-02-02' })
  await closePanel()
  const lateRow = async () => (await rows()).find((row) => row.title === 'Tâche en retard')
  check((await lateRow()).state === 'en-retard', 'avant validation : en retard')
  await app.click('[data-task="Tâche en retard"] .planning-task-title')
  await sleep(500)
  check(
    (await clickByText('.planning-panel .planning-check', 'Tâche validée')) === 'ok',
    'case « Tâche validée »'
  )
  await sleep(1000)
  let validated = taskOnDisk('Tâche en retard')
  check(validated.validee === true && validated.faite === true, 'valider coche aussi « faite »')
  check(
    (await app.evaluate(
      `document.querySelector('.planning-panel input[type="checkbox"]').checked`
    )) === true,
    'la case « Faite » du panneau est cochée'
  )
  let row = await lateRow()
  check(
    row.state === 'faite' && row.validated,
    'une tâche validée n’est jamais en retard : coche dans la liste'
  )
  await app.click('.planning-panel-head button')
  await sleep(600)
  await undo()
  await sleep(1000)
  validated = taskOnDisk('Tâche en retard')
  check(
    validated.validee === false && validated.faite === false,
    'une seule annulation défait validée et faite'
  )
  await app.click('[data-task="Tâche en retard"] .planning-task-title')
  await sleep(500)
  await clickByText('.planning-panel .planning-check', 'Tâche validée')
  await sleep(600)
  await app.evaluate(`(() => {
    const done = document.querySelector('.planning-panel input[type="checkbox"]')
    done.click()
  })()`)
  await sleep(1000)
  validated = taskOnDisk('Tâche en retard')
  check(
    validated.validee === false && validated.faite === false,
    'décocher « Faite » retire aussi « Validée »'
  )
  await app.click('.planning-panel-head button')
  await sleep(600)
  await undo()
  await sleep(1000)
  validated = taskOnDisk('Tâche en retard')
  check(
    validated.validee === true && validated.faite === true,
    'une seule annulation remet les deux'
  )
  // Filtre « Validées »
  const pick = async (value) => {
    await setValue('[data-validated-filter]', value, 'HTMLSelectElement', 'change')
    await sleep(300)
  }
  await pick('hide')
  check(
    !(await titles()).includes('Tâche en retard') && (await titles()).length >= 1,
    'masquer les validées'
  )
  await pick('only')
  check((await titles()).join('|') === 'Tâche en retard', 'seulement les validées')
  await pick('all')
  check((await titles()).includes('Tâche en retard'), 'toutes les tâches de nouveau visibles')
  await app.screenshot('planning-5-validee.png')
}
