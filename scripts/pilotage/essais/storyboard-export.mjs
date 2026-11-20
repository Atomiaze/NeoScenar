// Étape 11B : fenêtre « Exporter le storyboard en PDF… » (menu Fichier et barre d'outils des Cartes).
// Formats 16:9 puis 9:16 : type, scènes choisies, « Enregistrer » grisé sans scène, fichiers écrits
// (PDF + storyboard/impressions/<id>.json), options relues à la réouverture.

import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

function setFormat(projectFile, width, height) {
  const path = join(dirname(projectFile), 'neoscenar', 'projet.json')
  const projet = JSON.parse(readFileSync(path, 'utf8'))
  projet.settings.resolution = { width, height }
  projet.id = randomUUID()
  writeFileSync(path, JSON.stringify(projet))
}

export default async function ({ app, check, log, newProject }) {
  const state = () =>
    app.evaluate(`(() => ({
      open: !!document.querySelector('.storyboard-dialog'),
      frame: document.querySelector('.pdf-preview iframe')?.src ?? null,
      pages: document.querySelector('.pdf-page-count')?.textContent ?? null,
      thumbs: document.querySelector('.storyboard-thumbs')?.textContent ?? null,
      unreadable: [...document.querySelectorAll('.storyboard-unreadable li')].map((l) => l.textContent),
      kind: document.querySelector('input[name="storyboard-kind"]:checked')?.nextSibling?.textContent ?? null,
      scope: document.querySelector('input[name="storyboard-scope"]:checked')?.nextSibling?.textContent ?? null,
      scenes: [...document.querySelectorAll('input[data-scene]')].map((i) => [i.dataset.scene, i.checked]),
      newPage: document.querySelector('input[name="storyboard-new-page"]')?.checked,
      saveDisabled: [...document.querySelectorAll('.dialog-actions button')]
        .filter((b) => ['Enregistrer', 'Enregistrer sous…'].includes(b.textContent))
        .map((b) => b.disabled)
    }))()`)
  const waitPreview = async () => {
    for (let i = 0; i < 60; i++) {
      const s = await state()
      if (s.frame && s.pages) return s
      await sleep(250)
    }
    return state()
  }
  const input = (selector) => app.click(selector)

  async function run(label, width, height) {
    log(`  — Format ${label}`)
    const projectFile = newProject()
    setFormat(projectFile, width, height)
    const data = join(dirname(projectFile), 'neoscenar')
    await app.openProject(projectFile)
    await app.module('Cartes')
    await sleep(800)

    check(
      (await app.menuLabels('Fichier')).includes('Exporter le storyboard en PDF…'),
      'menu Fichier : « Exporter le storyboard en PDF… »'
    )
    check(
      (await input('.toolbar .tool-button[title="Exporter le storyboard en PDF…"]')) === 'ok',
      'bouton dans la barre d’outils des Cartes'
    )
    const first = await waitPreview()
    check(first.open && first.frame?.startsWith('blob:'), 'la fenêtre s’ouvre avec un vrai PDF')
    check(
      first.kind?.includes('Planches') && first.scope === 'Tout le film' && first.newPage === false,
      'valeurs par défaut : planches, tout le film, pas de nouvelle page par scène'
    )
    check(first.thumbs === null, 'type Planches : pas de compteur de vignettes')
    await app.screenshot(`storyboard-${label.replace(':', '-')}-planches.png`)

    // Type Storyboard : « N vignettes sur M plans ».
    await input('input[name="storyboard-kind"]:not(:checked)')
    await sleep(900)
    const story = await waitPreview()
    check(story.thumbs === '1 vignette sur 3 plans', `compteur : ${story.thumbs}`)

    // Scènes choisies, aucune cochée : Enregistrer grisé.
    await input('input[name="storyboard-scope"]:not(:checked)')
    await sleep(600)
    const none = await state()
    check(
      none.scenes.length === 3 && none.scenes.every(([, c]) => !c),
      'trois scènes listées, aucune cochée'
    )
    check(none.saveDisabled.every(Boolean), 'aucune scène cochée : Enregistrer grisé')
    await app.screenshot(`storyboard-${label.replace(':', '-')}-aucune.png`)

    await app.evaluate(
      `[...document.querySelectorAll('.storyboard-check-all button')].find((b) => b.textContent === 'Tout cocher').click()`
    )
    await sleep(300)
    check(
      (await state()).scenes.every(([, c]) => c),
      '« Tout cocher » coche toutes les scènes'
    )
    await app.evaluate(
      `[...document.querySelectorAll('.storyboard-check-all button')].find((b) => b.textContent === 'Tout décocher').click()`
    )
    await sleep(300)
    const cleared = await state()
    check(
      cleared.scenes.every(([, c]) => !c) && cleared.saveDisabled.every(Boolean),
      '« Tout décocher » : rien de coché, Enregistrer grisé'
    )

    await input('input[data-scene="S_0010"]')
    await input('input[data-scene="S_0020"]')
    await sleep(1500)
    const two = await waitPreview()
    check(two.thumbs === '1 vignette sur 2 plans', `deux scènes : ${two.thumbs}`)
    check(
      two.saveDisabled.every((d) => !d),
      'Enregistrer actif'
    )

    await app.dialogButton('Enregistrer')
    await sleep(2000)
    const exportsDir = join(data, 'exports')
    const files = existsSync(exportsDir) ? readdirSync(exportsDir) : []
    check(
      files.length === 1 && /^Film_essai_storyboard_\d{4}-\d{2}-\d{2}\.pdf$/.test(files[0]),
      `PDF dans exports/ : ${files.join(', ')}`
    )
    check(
      files.length === 1 &&
        readFileSync(join(exportsDir, files[0])).subarray(0, 5).toString() === '%PDF-',
      'le fichier est un PDF'
    )
    const printsDir = join(data, 'storyboard', 'impressions')
    const prints = existsSync(printsDir) ? readdirSync(printsDir) : []
    check(prints.length === 1, `fichier d’impression : ${prints.join(', ')}`)
    if (prints.length === 1) {
      const record = JSON.parse(readFileSync(join(printsDir, prints[0]), 'utf8'))
      const shots = record.pages.flatMap((p) => p.shots)
      check(
        shots.map((s) => s.shotId).join() === 'S10-P10,S20-P10',
        'le JSON ne contient que les plans choisis'
      )
      const cell = shots[0].cellMm
      const ratio = cell.width / cell.height
      check(
        Math.abs(ratio - width / height) < 0.02,
        `case dessin au format ${label} (rapport ${ratio.toFixed(3)})`
      )
      log(`    pages : ${record.pages.length}, case : ${cell.width} × ${cell.height} mm`)
    }
    check(
      (await app.evaluate(`document.querySelector('.dialog')?.getAttribute('aria-label')`)) ===
        'PDF enregistré',
      'message « PDF enregistré »'
    )
    await app.dialogButton('Fermer')

    const saved = JSON.parse(readFileSync(join(data, 'projet.json'), 'utf8'))
    check(
      saved.exportStoryboard?.kind === 'storyboard' &&
        saved.exportStoryboard?.scope === 'scenes' &&
        saved.exportStoryboard?.sceneNumbers.join() === 'S_0010,S_0020',
      'options mémorisées dans projet.json (numéros de scène)'
    )

    // Réouverture de la fenêtre : options relues.
    await app.menu('Fichier', 'Exporter le storyboard en PDF…')
    const again = await waitPreview()
    check(
      again.kind?.includes('Storyboard') &&
        again.scope === 'Scènes choisies' &&
        again.scenes.map(([n, c]) => `${n}:${c}`).join() === 'S_0010:true,S_0020:true,S_0030:false',
      'réouverture : type, portée et scènes cochées retrouvés'
    )
    await app.dialogButton('Annuler')
    return projectFile
  }

  const wide = await run('16:9', 1920, 1080)
  await run('9:16', 1080, 1920)

  // Retour sur le premier projet : les options viennent du disque.
  await app.openProject(wide)
  await app.module('Cartes')
  await sleep(500)
  await app.menu('Fichier', 'Exporter le storyboard en PDF…')
  const back = await waitPreview()
  check(
    back.kind?.includes('Storyboard') && back.scenes.filter(([, c]) => c).length === 2,
    'projet rouvert : options relues'
  )
  await app.dialogButton('Annuler')
}
