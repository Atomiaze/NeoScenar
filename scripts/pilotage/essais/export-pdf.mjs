// Étape 9B : fenêtre « Exporter le scénario en PDF » (menu, aperçu, options, enregistrement).

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const exportsDir = join(dirname(projectFile), 'neoscenar', 'exports')
  await app.openProject(projectFile)
  await app.module('Scénario')
  await sleep(800)

  const state = () =>
    app.evaluate(`(() => ({
      open: !!document.querySelector('.pdf-dialog'),
      frame: document.querySelector('.pdf-preview iframe')?.src ?? null,
      count: document.querySelector('.pdf-page-count')?.textContent ?? null,
      boxes: [...document.querySelectorAll('.pdf-options input')].map((i) => i.checked)
    }))()`)
  const waitPreview = async () => {
    for (let i = 0; i < 40; i++) {
      const s = await state()
      if (s.frame && s.count) return s
      await sleep(250)
    }
    return state()
  }

  const labels = await app.menuLabels('Fichier')
  check(
    labels.includes('Exporter le scénario en PDF…'),
    'menu Fichier : « Exporter le scénario en PDF… »'
  )

  await app.menu('Fichier', 'Exporter le scénario en PDF…')
  const first = await waitPreview()
  log('    état :', JSON.stringify(first))
  check(first.open, 'la fenêtre s’ouvre')
  check(first.frame?.startsWith('blob:'), 'l’aperçu est un fichier PDF généré (blob)')
  check(/^\d+ pages?$/.test(first.count ?? ''), `nombre de pages affiché : ${first.count}`)
  check(first.boxes[0] === true && first.boxes[1] === false, 'cases : titre cochée, 1-2-3 décochée')
  await sleep(1500)
  await app.screenshot('export-pdf-apercu.png')

  // Option « page de titre » décochée : une page de moins (si le scénario a une page de titre).
  await app.click('.pdf-options label:nth-of-type(1) input')
  await sleep(1500)
  const second = await waitPreview()
  log('    sans page de titre :', second.count)
  check(second.count !== first.count, 'décocher la page de titre change le nombre de pages')
  await app.click('.pdf-options label:nth-of-type(1) input')
  await app.click('.pdf-options label:nth-of-type(2) input')
  await sleep(1500)

  await app.dialogButton('Enregistrer')
  await sleep(1500)
  const files = existsSync(exportsDir) ? readdirSync(exportsDir) : []
  log('    exports/ :', files.join(', '))
  check(
    files.length === 1 && /^Film_essai_scenario_\d{4}-\d{2}-\d{2}\.pdf$/.test(files[0]),
    'PDF dans exports/'
  )
  check(
    files.length === 1 &&
      readFileSync(join(exportsDir, files[0])).subarray(0, 5).toString() === '%PDF-',
    'le fichier est un PDF'
  )
  const done = await app.evaluate(`document.querySelector('.dialog')?.getAttribute('aria-label')`)
  check(done === 'PDF enregistré', 'message « PDF enregistré »')
  await app.screenshot('export-pdf-enregistre.png')
  await app.dialogButton('Fermer')

  const saved = JSON.parse(
    readFileSync(join(dirname(projectFile), 'neoscenar', 'projet.json'), 'utf8')
  )
  check(saved.exportPdf?.numerotation === 'continue', 'options mémorisées dans projet.json')

  // Bouton de la barre d'outils.
  await app.click('.toolbar .tool-button[title="Exporter le scénario en PDF…"]')
  const reopened = await waitPreview()
  check(
    reopened.open && reopened.boxes[1] === true,
    'bouton de la barre d’outils : options retrouvées'
  )
  await app.dialogButton('Annuler')
}
