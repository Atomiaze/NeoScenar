// Projet copié (dossier dupliqué dans le Finder) : la copie reçoit un nouvel identifiant à
// l'ouverture, sans message ; chaque projet écrit dans son propre dossier (générique, scénario) ; la
// barre de titre montre le nom du dossier ; rouvrir l'un ou l'autre ne change plus rien.

import { cpSync, readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

export default async function ({ app, check, log, newProject }) {
  const fileA = newProject()
  const rootA = dirname(fileA)
  const rootB = join(dirname(rootA), `${basename(rootA)}_copie`)
  cpSync(rootA, rootB, { recursive: true })
  const fileB = join(rootB, basename(fileA))

  const projectJson = (root) =>
    JSON.parse(readFileSync(join(root, 'neoscenar', 'projet.json'), 'utf8'))
  const credits = (root) => {
    try {
      return readFileSync(join(root, 'neoscenar', 'generique.json'), 'utf8')
    } catch {
      return ''
    }
  }
  const scenario = (root) => readFileSync(join(root, 'neoscenar', 'scenario.fountain'), 'utf8')
  const windowTitle = () =>
    app.main.evaluate(
      `process.mainModule.require('electron').BrowserWindow.getAllWindows()[0].getTitle()`
    )
  const idA = projectJson(rootA).id
  check(projectJson(rootB).id === idA, 'la copie a d’abord le même identifiant')

  // Saisie dans un champ contrôlé par React.
  const typeIntoRubric = (original, value) =>
    app.evaluate(`(() => {
      const rubric = [...document.querySelectorAll('.credits-rubric')]
        .find((r) => r.querySelector('input')?.placeholder === ${JSON.stringify(original)})
      const area = rubric?.querySelector('textarea')
      if (!area) return 'introuvable'
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(area, ${JSON.stringify(value)})
      area.dispatchEvent(new Event('input', { bubbles: true }))
      return 'ok'
    })()`)
  const openCredits = async () => {
    await app.module('Données du projet')
    await sleep(500)
    await app.evaluate(
      `[...document.querySelectorAll('.research-branch-title')].find((b) => b.textContent.trim() === 'Générique')?.click()`
    )
    await sleep(800)
  }
  // Frappe dans l'éditeur, sur la dernière ligne.
  const typeAtEnd = async (text) => {
    await app.module('Scénario')
    await sleep(800)
    const box = await app.evaluate(`(() => {
      const last = [...document.querySelectorAll('.cm-line')].at(-1)
      last.scrollIntoView({ block: 'center' })
      const r = last.getBoundingClientRect()
      return { x: r.left + 5, y: r.top + r.height / 2 }
    })()`)
    for (const type of ['mousePressed', 'mouseReleased'])
      await app.page.send('Input.dispatchMouseEvent', {
        type,
        ...box,
        button: 'left',
        clickCount: 1
      })
    await sleep(200)
    await app.page.send('Input.insertText', { text })
    await sleep(2500)
  }

  // Original A : ouvert et modifié.
  await app.openProject(fileA)
  check(
    (await windowTitle()) === `${basename(rootA)} — NeoScenar`,
    `titre : ${await windowTitle()}`
  )
  await openCredits()
  check((await typeIntoRubric('Réalisation', 'Réalisatrice A')) === 'ok', 'saisie dans A')
  await sleep(1500)
  await typeAtEnd('Action tapée dans A.')

  // Copie B : ouverte juste après (depuis le module Scénario), nouvel identifiant, modifiée autrement.
  // L'éditeur ne doit pas garder le texte de A.
  await app.openProject(fileB)
  const title = await windowTitle()
  check(title === `${basename(rootB)} — NeoScenar`, `titre de la copie : ${title}`)
  const idB = projectJson(rootB).id
  log(`    identifiants : A ${idA}, B ${idB}`)
  check(idB !== idA, 'la copie a reçu un nouvel identifiant')
  check(projectJson(rootA).id === idA, 'l’original garde son identifiant')
  check((await app.dialog()) === null, 'détection silencieuse (aucune fenêtre)')
  await openCredits()
  const shownInB = await app.evaluate(
    `[...document.querySelectorAll('.credits-rubric')].find((r) => r.querySelector('input')?.placeholder === 'Réalisation')?.querySelector('textarea')?.value`
  )
  check(shownInB === '', `la copie montre son propre générique (vide : « ${shownInB} »)`)
  await app.module('Scénario')
  await sleep(1000)
  check(
    !(await app.scriptLines()).join('\n').includes('Action tapée dans A.'),
    'l’éditeur de la copie ne garde pas le texte de A'
  )
  await openCredits()
  check(
    (await typeIntoRubric('Directeur de la photographie', 'Cheffe op B')) === 'ok',
    'saisie dans B'
  )
  await sleep(1500)
  await typeAtEnd('Action tapée dans B.')

  // Chaque projet a écrit dans son propre dossier.
  check(
    credits(rootA).includes('Réalisatrice A') && !credits(rootA).includes('Cheffe op B'),
    'générique de A : seulement la saisie de A'
  )
  check(
    credits(rootB).includes('Cheffe op B') && !credits(rootB).includes('Réalisatrice A'),
    'générique de B : seulement la saisie de B'
  )
  check(
    scenario(rootA).includes('Action tapée dans A.') && !scenario(rootA).includes('dans B'),
    'scénario de A : seulement la frappe de A'
  )
  check(
    scenario(rootB).includes('Action tapée dans B.') && !scenario(rootB).includes('dans A'),
    'scénario de B : seulement la frappe de B'
  )

  // Rouvrir A puis B : plus aucun conflit, les identifiants ne bougent plus.
  await app.openProject(fileA)
  check((await windowTitle()) === `${basename(rootA)} — NeoScenar`, 'titre de A à la réouverture')
  await openCredits()
  const shownInA = await app.evaluate(
    `[...document.querySelectorAll('.credits-rubric')].find((r) => r.querySelector('input')?.placeholder === 'Réalisation')?.querySelector('textarea')?.value`
  )
  check(shownInA === 'Réalisatrice A', 'A rouvert montre son propre générique')
  await app.openProject(fileB)
  check(
    projectJson(rootA).id === idA && projectJson(rootB).id === idB,
    'réouvertures : identifiants inchangés'
  )
  await app.screenshot('projet-copie.png')
}
