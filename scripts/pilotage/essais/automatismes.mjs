// Étape 13D : (SUITE) à l'affichage, dialogues simultanés, nouvelle page à chaque acte (écran et PDF).

import { copyFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

const ROOT = join(import.meta.dirname, '..', '..', '..')

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const dataDir = join(dirname(projectFile), 'neoscenar')
  copyFileSync(
    join(ROOT, 'packages', 'fountain', 'tests', 'exemples', 'automatismes.fountain'),
    join(dataDir, 'scenario.fountain')
  )
  await app.openProject(projectFile)
  await app.module('Scénario')
  await sleep(1500)

  // CodeMirror ne dessine que la partie visible : on fait défiler la page et on réunit les relevés.
  const snapshot = () =>
    app.evaluate(`(() => ({
      continued: [...document.querySelectorAll('.fl-continued')].map((w) => w.closest('.cm-line').textContent),
      dualLines: [...document.querySelectorAll('.cm-line.fl-dual')].map((l) => l.textContent.slice(0, 20)),
      dualLabel: document.querySelector('.fl-dual-label')?.textContent ?? null,
      breaks: [...document.querySelectorAll('.fl-page-break')].map((b) => {
        const top = b.getBoundingClientRect().top
        const below = [...document.querySelectorAll('.cm-line')]
          .map((l) => ({ top: l.getBoundingClientRect().top, bottom: l.getBoundingClientRect().bottom, text: l.textContent }))
          .filter((l) => l.bottom > top + 1)
          .sort((a, c) => a.top - c.top)[0]
        return { page: b.textContent, below: (below?.text ?? '').slice(0, 30) }
      })
    }))()`)
  const screen = async () => {
    const all = { continued: new Set(), dualLines: new Set(), dualLabel: null, breaks: new Map() }
    const height = await app.evaluate(`document.querySelector('.cm-scroller').scrollHeight`)
    for (let y = 0; y <= height; y += 300) {
      await app.evaluate(`document.querySelector('.cm-scroller').scrollTop = ${y}`)
      await sleep(150)
      const part = await snapshot()
      part.continued.forEach((text) => all.continued.add(text))
      part.dualLines.forEach((text) => all.dualLines.add(text))
      all.dualLabel ??= part.dualLabel
      for (const b of part.breaks) all.breaks.set(b.page, b)
    }
    return {
      continued: [...all.continued],
      dualLines: [...all.dualLines],
      dualLabel: all.dualLabel,
      breaks: [...all.breaks.values()]
    }
  }
  const showDual = async () => {
    await app.evaluate(`document.querySelector('.fl-dual')?.scrollIntoView({ block: 'center' })`)
    await sleep(300)
  }

  // 1. Par défaut : pas de (SUITE), dialogues simultanés l'un sous l'autre avec une barre.
  const first = await screen()
  log('    écran :', JSON.stringify(first))
  check(first.continued.length === 0, '(SUITE) absent par défaut')
  check(first.dualLabel === 'simultané', 'mention « simultané » dans la marge')
  check(first.dualLines.length === 4, `4 lignes barrées (PAUL, réplique, MARIE ^, réplique)`)
  check(first.breaks.length === 1, 'un seul trait de page (le saut ===)')
  await app.dialogButton('Fermer').catch(() => undefined)
  await showDual()
  await app.screenshot('automatismes-defaut.png')

  // 2. Réglages : (SUITE) coché → affiché tout de suite, jamais écrit dans le fichier.
  await app.menu('NeoScenar', 'Réglages…')
  await sleep(500)
  const box = `document.querySelectorAll('.dialog input[type=checkbox]')[1]`
  check((await app.evaluate(`${box}.checked`)) === false, 'Réglages : case (SUITE) décochée')
  await app.evaluate(`${box}.click()`)
  await sleep(300)
  await app.screenshot('automatismes-reglages.png')
  await app.dialogButton('Fermer')
  await sleep(500)
  check(
    (await app.evaluate(`window.neoscenar.getContinuedMarks()`)) === true,
    'préférence mémorisée'
  )
  const withMark = await screen()
  log('    (SUITE) :', JSON.stringify(withMark.continued))
  check(
    withMark.continued.length === 1 && withMark.continued[0].includes('MARIE (V.O.)'),
    '(SUITE) affiché après « MARIE (V.O.) » seulement'
  )
  await app.evaluate(`document.querySelector('.fl-continued')?.scrollIntoView({ block: 'center' })`)
  await sleep(300)
  await app.screenshot('automatismes-suite.png')

  // 3. Fenêtre PDF : la case « Nouvelle page à chaque acte » ajoute une page.
  const pdfState = () =>
    app.evaluate(`(() => ({
      count: document.querySelector('.pdf-page-count')?.textContent ?? null,
      boxes: [...document.querySelectorAll('.pdf-options input')].map((i) => i.checked),
      labels: [...document.querySelectorAll('.pdf-options label')].map((l) => l.textContent)
    }))()`)
  const waitCount = async (previous) => {
    for (let i = 0; i < 40; i++) {
      const s = await pdfState()
      if (s.count && s.count !== previous) return s
      await sleep(250)
    }
    return pdfState()
  }
  await app.menu('Fichier', 'Exporter le scénario en PDF…')
  const before = await waitCount(null)
  log('    PDF :', JSON.stringify(before))
  check(
    before.labels.includes('Nouvelle page à chaque acte'),
    'case « Nouvelle page à chaque acte »'
  )
  check(before.boxes[2] === false, 'décochée par défaut')
  await app.click('.pdf-options label:nth-of-type(3) input')
  const after = await waitCount(before.count)
  log(`    pages : ${before.count} → ${after.count}`)
  check(parseInt(after.count) === parseInt(before.count) + 1, 'une page de plus avec l’option')
  await sleep(1500)
  await app.screenshot('automatismes-pdf.png')
  await app.dialogButton('Enregistrer')
  await sleep(1500)
  await app.dialogButton('Fermer')
  await sleep(800)

  const project = JSON.parse(readFileSync(join(dataDir, 'projet.json'), 'utf8'))
  check(project.exportPdf.nouvellePageParActe === true, 'option mémorisée dans projet.json')

  // 4. L'écran suit : un trait de page juste au-dessus de « Acte deux ».
  const acts = await screen()
  log('    traits :', JSON.stringify(acts.breaks))
  check(acts.breaks.length === 2, 'deux traits de page à l’écran')
  check(
    acts.breaks.some((b) => b.below.includes('Acte deux')),
    'le trait passe au-dessus du bandeau « Acte deux »'
  )
  await showDual()
  await app.screenshot('automatismes-actes.png')

  // 5. Rien n'a été écrit dans le scénario : un seul (SUITE), celui de l'élève.
  const text = readFileSync(join(dataDir, 'scenario.fountain'), 'utf8')
  check((text.match(/\(SUITE\)/g) ?? []).length === 1, 'aucun (SUITE) ajouté au fichier')
  check(text.includes('MARIE ^'), 'le ^ reste dans le fichier')
}
