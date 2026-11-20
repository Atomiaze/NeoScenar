// Étape 13C : versions sur « Le Dernier Bus ». Enregistrer → modifier → restaurer → Annuler (retour
// exact au texte et aux cartes) ; modification après restauration (Annuler retiré) ; suppression ;
// duplicata en nouveau projet (ouvert, nouvel identifiant, original intact).

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

const ROOT = join(import.meta.dirname, '..', '..', '..')

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const root = dirname(projectFile)
  const data = join(root, 'neoscenar')
  copyFileSync(
    join(ROOT, 'packages', 'fountain', 'tests', 'exemples', 'le-dernier-bus.fountain'),
    join(data, 'scenario.fountain')
  )
  const read = (dir, file) => readFileSync(join(dir, 'neoscenar', file), 'utf8')
  const snapshot = (dir = root) => ({
    scenario: read(dir, 'scenario.fountain'),
    decoupage: read(dir, 'decoupage.json')
  })
  const versionFolders = () =>
    existsSync(join(data, 'versions'))
      ? readdirSync(join(data, 'versions')).filter((name) => !name.startsWith('.'))
      : []
  const rows = () =>
    app.evaluate(
      `[...document.querySelectorAll('.versions-table tbody tr')].map((tr) => tr.textContent)`
    )
  const selectRow = (text) =>
    app.evaluate(`(() => {
      const row = [...document.querySelectorAll('.versions-table tbody tr')]
        .find((tr) => tr.textContent.includes(${JSON.stringify(text)}))
      if (!row) return 'introuvable'
      row.click()
      return 'ok'
    })()`)
  const banner = () =>
    app.evaluate(`(() => {
      const banner = [...document.querySelectorAll('.link-banner')]
        .find((b) => /restaur/i.test(b.textContent))
      if (!banner) return null
      return { text: banner.querySelector('li').textContent,
        buttons: [...banner.querySelectorAll('button')].map((b) => b.textContent) }
    })()`)
  const bannerButton = (label) =>
    app.evaluate(`(() => {
      const button = [...document.querySelectorAll('.link-banner button')]
        .find((b) => b.textContent === ${JSON.stringify(label)})
      if (!button) return 'introuvable'
      button.click()
      return 'ok'
    })()`)
  const setField = (selector, value, prototype) =>
    app.evaluate(`(() => {
      const field = document.querySelector(${JSON.stringify(selector)})
      Object.getOwnPropertyDescriptor(${prototype}.prototype, 'value').set.call(field, ${JSON.stringify(value)})
      field.dispatchEvent(new Event('input', { bubbles: true }))
    })()`)
  const typeAtEnd = async (text) => {
    await app.module('Scénario')
    await sleep(1000)
    await app.evaluate(`document.querySelector('.cm-scroller').scrollTop = 1e9`)
    await sleep(500)
    await app.mouseClick('.cm-line:last-child')
    for (const type of ['keyDown', 'keyUp'])
      await app.page.send('Input.dispatchKeyEvent', {
        type,
        key: 'End',
        code: 'End',
        windowsVirtualKeyCode: 35
      })
    await sleep(200)
    await app.page.send('Input.insertText', { text })
    await sleep(3000)
  }

  await app.openProject(projectFile)
  await sleep(1500)
  // Le premier rapprochement (numéros écrits) est fait : c'est l'état « A ».
  if ((await app.dialog())?.buttons.includes('Continuer')) await app.dialogButton('Continuer')
  await sleep(1500)

  // 1. Enregistrer une version (menu Fichier).
  check((await app.menu('Fichier', 'Versions…')) === 'ok', 'menu Fichier > Versions…')
  await sleep(800)
  check((await app.dialog())?.title === 'Versions', 'fenêtre Versions ouverte')
  check((await rows()).length === 0, 'aucune version au départ')
  await app.dialogButton('Enregistrer une version…')
  await sleep(300)
  const proposed = await app.evaluate(`document.querySelector('.dialog input').value`)
  check(proposed === 'Version 1', `nom proposé : ${proposed}`)
  await setField('.dialog textarea', 'Avant la lecture d’été', 'HTMLTextAreaElement')
  await app.dialogButton('Enregistrer')
  await sleep(1500)
  const firstRows = await rows()
  log(`    ${firstRows.join(' | ')}`)
  check(firstRows.length === 1 && firstRows[0].includes('Version 1'), 'version listée')
  check(firstRows[0].includes('p.') && firstRows[0].includes('Avant la lecture'), 'pages et note')
  check(
    versionFolders().some((name) => /^\d{8}-\d{6}_Version_1$/.test(name)),
    'dossier daté'
  )
  await app.screenshot('versions-liste.png')
  await app.dialogButton('Fermer')
  const stateA = snapshot()

  // 2. Modifier : une nouvelle scène (nouvelle carte) et du texte.
  await typeAtEnd('\n\nINT. NOUVEAU LIEU - JOUR\n\nUne scène ajoutée après la version.')
  await sleep(1500)
  const stateB = snapshot()
  check(stateB.scenario.includes('NOUVEAU LIEU'), 'scénario modifié sur le disque')
  check(stateB.decoupage !== stateA.decoupage, 'cartes modifiées (nouvelle scène)')

  // 3. Restaurer la version 1.
  await app.menu('Fichier', 'Versions…')
  await sleep(800)
  check((await selectRow('Version 1')) === 'ok', 'version choisie')
  await app.dialogButton('Restaurer…')
  await sleep(300)
  check((await app.dialog())?.title === 'Restaurer une version', 'confirmation demandée')
  await app.dialogButton('Restaurer')
  await sleep(4000)
  const restored = snapshot()
  check(restored.scenario === stateA.scenario, 'restauration : texte identique à la version')
  check(restored.decoupage === stateA.decoupage, 'restauration : cartes identiques à la version')
  const shown = await banner()
  log(`    bandeau : ${JSON.stringify(shown)}`)
  check(shown?.text === 'Version « Version 1 » restaurée.', 'bandeau « Version 1 restaurée »')
  check(shown?.buttons.includes('Annuler'), 'bouton Annuler')
  check(
    versionFolders().some((name) => name.includes('Avant_restauration')),
    'version « Avant restauration » enregistrée'
  )
  check(!(await app.sceneCards()).join(' ').includes('NOUVEAU'), 'cartes affichées relues')
  await app.screenshot('versions-restauree.png')

  // 4. Annuler : retour exact à l'état B.
  check((await bannerButton('Annuler')) === 'ok', 'clic sur Annuler')
  await sleep(4000)
  const undone = snapshot()
  check(undone.scenario === stateB.scenario, 'annulation : texte d’avant la restauration')
  check(undone.decoupage === stateB.decoupage, 'annulation : cartes d’avant la restauration')
  check((await banner())?.text.startsWith('Restauration annulée'), 'bandeau « annulée »')
  await app.module('Scénario')
  await sleep(1000)
  // La frappe de l'étape 2 est tombée en haut du scénario : c'est là qu'on la cherche.
  await app.evaluate(`document.querySelector('.cm-scroller').scrollTop = 0`)
  await sleep(500)
  const lines = await app.scriptLines()
  await app.screenshot('versions-annulee-editeur.png')
  check(lines.join('\n').includes('NOUVEAU LIEU'), 'l’éditeur montre l’état B')

  // 5. Restaurer puis modifier : Annuler n'est plus proposé.
  await app.menu('Fichier', 'Versions…')
  await sleep(800)
  await selectRow('Version 1')
  await app.dialogButton('Restaurer…')
  await app.dialogButton('Restaurer')
  await sleep(4000)
  await typeAtEnd(' Frappe.')
  const after = await banner()
  log(`    bandeau après frappe : ${JSON.stringify(after)}`)
  check(after && !after.buttons.includes('Annuler'), 'Annuler retiré après une modification')

  // 6. Vignette de la version retirée depuis (comme à la fermeture du projet), puis restauration :
  // elle revient dans storyboard/vignettes/.
  const thumb = join(data, 'storyboard', 'vignettes', 'S20-P10.png')
  const retiredDir = join(data, 'sauvegardes', 'vignettes_retirees', 'vignettes')
  const retired = join(retiredDir, 'S20-P10.png')
  const retire = () => {
    mkdirSync(retiredDir, { recursive: true })
    renameSync(thumb, retired)
  }
  check(
    stateA.decoupage.includes('storyboard/vignettes/S20-P10.png'),
    'la version utilise la vignette'
  )
  retire()
  await app.menu('Fichier', 'Versions…')
  await sleep(800)
  await selectRow('Version 1')
  await app.dialogButton('Restaurer…')
  await app.dialogButton('Restaurer')
  await sleep(4000)
  check(
    existsSync(thumb) && !existsSync(retired),
    'restauration : vignette remise en place (déplacée)'
  )

  // 7. Supprimer une version : déplacée dans sauvegardes/versions_supprimees/.
  await app.menu('Fichier', 'Versions…')
  await sleep(800)
  const before = versionFolders().length
  await selectRow('Avant restauration')
  await app.dialogButton('Supprimer…')
  await app.dialogButton('Supprimer')
  await sleep(1000)
  check(versionFolders().length === before - 1, 'version retirée de la liste')
  check(
    readdirSync(join(data, 'sauvegardes', 'versions_supprimees')).length === 1,
    'version déplacée dans sauvegardes/versions_supprimees/'
  )

  // 8. Dupliquer en nouveau projet (le choix du dossier est simulé), vignette de nouveau retirée :
  // elle est copiée depuis les sauvegardes de l'original.
  retire()
  const target = join(dirname(root), `${basename(root)}_Version_1`)
  await app.main.evaluate(`(() => {
    const { dialog } = process.mainModule.require('electron')
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: ${JSON.stringify(target)} })
  })()`)
  const originalBefore = snapshot()
  const originalId = JSON.parse(read(root, 'projet.json')).id
  await selectRow('Version 1')
  await app.dialogButton('Dupliquer en nouveau projet…')
  await sleep(4000)
  check(existsSync(join(target, basename(projectFile))), 'dossier du duplicata créé')
  check(!existsSync(join(target, 'neoscenar', 'sauvegardes')), 'sauvegardes/ non copié')
  check(snapshot(target).scenario === stateA.scenario, 'duplicata : texte de la version')
  const copyId = JSON.parse(read(target, 'projet.json')).id
  check(copyId !== originalId, 'duplicata : nouvel identifiant')
  const title = await app.main.evaluate(
    `process.mainModule.require('electron').BrowserWindow.getAllWindows()[0].getTitle()`
  )
  check(title === `${basename(target)} — NeoScenar`, `duplicata ouvert : ${title}`)
  const originalAfter = snapshot()
  check(
    originalAfter.scenario === originalBefore.scenario &&
      originalAfter.decoupage === originalBefore.decoupage &&
      JSON.parse(read(root, 'projet.json')).id === originalId,
    'original intact'
  )
  check(
    existsSync(join(target, 'neoscenar', 'storyboard', 'vignettes', 'S20-P10.png')),
    'duplicata : vignette retirée copiée dans le nouveau projet'
  )
  check(existsSync(retired), 'original : la vignette reste dans ses sauvegardes')
  await app.screenshot('versions-duplicata.png')
}
