// Étape 8D : cartes orphelines. Le scénario est modifié « dans Obsidian » (directement sur le
// disque) pendant que le projet est ouvert : rechargement, rapprochement, bandeau, carte grisée,
// fiche, « Recréer l'en-tête », Annuler, avertissement de l'export Blender, réouverture.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

const ORPHANED = '1 carte devenue orpheline (absente du scénario) : S_0020'

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const data = join(dirname(projectFile), 'neoscenar')
  const scenarioFile = join(data, 'scenario.fountain')
  const readDecoupage = () => JSON.parse(readFileSync(join(data, 'decoupage.json'), 'utf8'))
  await app.openProject(projectFile)

  const banner = () =>
    app.evaluate(`(() => {
      const banner = document.querySelector('.link-banner')
      if (!banner) return null
      return {
        lines: [...banner.querySelectorAll('li')].map((li) => li.textContent),
        buttons: [...banner.querySelectorAll('button')].map((b) => b.textContent)
      }
    })()`)
  const bannerButton = (label) =>
    app.evaluate(`[...document.querySelectorAll('.link-banner button')]
      .find((b) => b.textContent === ${JSON.stringify(label)})?.click() ?? 'introuvable'`)
  const orphanRows = () =>
    app.evaluate(`[...document.querySelectorAll('.scene-row.orphan [data-card-kind="scene"]')]
      .map((card) => card.querySelector('.card-number').textContent)`)
  const comeBack = () => app.evaluate(`window.dispatchEvent(new Event('focus'))`)

  // Étape 10C : à l'ouverture, les lieux du scénario d'essai reçoivent une fiche (bandeau à fermer).
  await bannerButton('Fermer')
  await sleep(200)
  check((await banner()) === null, 'ouverture : aucun bandeau de cartes (rien de neuf)')

  // 1. S_0020 supprimée « dans Obsidian », puis retour dans NeoScenar (module Cartes affiché).
  const original = readFileSync(scenarioFile, 'utf8')
  writeFileSync(scenarioFile, original.replace('INT. GRENIER - NUIT #20#\n\nDeux.\n\n', ''))
  await comeBack()
  await sleep(1500)
  const shown = await banner()
  log('    bandeau :', JSON.stringify(shown))
  check(shown?.lines.includes(ORPHANED), 'bandeau : « 1 carte devenue orpheline… S_0020 »')
  check(shown?.buttons.join(',') === 'Voir,Fermer', 'bandeau : boutons « Voir » et « Fermer »')
  check(
    JSON.stringify(await orphanRows()) === '["S_0020"]',
    'Cartes : la rangée de S_0020 est grisée (orpheline)'
  )
  check(
    (await app.evaluate(
      `document.querySelector('[data-card-id="S20"] .orphan-label')?.textContent`
    )) === 'Absente du scénario',
    'Cartes : mention « Absente du scénario »'
  )
  await app.screenshot('orpheline-bandeau.png')
  const backups = readdirSync(join(data, 'sauvegardes'))
  log('    sauvegardes :', backups.join(', '))
  check(
    backups.some((name) => name.startsWith('avant_rapprochement_')),
    'copie avant_rapprochement'
  )
  await sleep(2000)
  check(
    readDecoupage().scenes.find((scene) => scene.id === 'S20')?.orphan === true,
    'decoupage.json : « orphan »: true pour S_0020'
  )

  // 2. Le bandeau reste affiché (plus de 10 s), même dans le Scénario ; « Voir » ramène aux Cartes.
  await app.module('Scénario')
  await sleep(10_000)
  check(
    (await banner())?.lines.includes(ORPHANED),
    'après 12 s, dans le Scénario : bandeau toujours là'
  )
  await bannerButton('Voir')
  await sleep(800)
  const cards = await app.sceneCards()
  log('    cartes :', cards.join(', '))
  check(cards.includes('S_0020 [sélectionnée]'), '« Voir » : Cartes affichées, S_0020 sélectionnée')
  const box = await app.evaluate(`document.querySelector('.orphan-box')?.textContent ?? null`)
  check(box?.includes('Absente du scénario'), 'fiche : encadré « Absente du scénario »')
  check(
    box?.includes('Recréer l’en-tête') && box?.includes('Supprimer la carte'),
    'fiche : les deux boutons'
  )
  await app.screenshot('orpheline-fiche.png')
  await bannerButton('Fermer')
  await sleep(300)
  check((await banner()) === null, '« Fermer » : bandeau fermé')

  // 3. Avertissement dans la fenêtre d'export Blender (sans exporter).
  await app.click('button[title="Exporter vers Blender…"]')
  await sleep(500)
  if ((await app.dialog())?.buttons.includes('Continuer sans verrouiller')) {
    await app.dialogButton('Continuer sans verrouiller')
    await sleep(500)
  }
  const exportDialog = await app.dialog()
  check(
    exportDialog?.text.includes('1 scène est absente du scénario : S_0020'),
    'export Blender : « 1 scène est absente du scénario : S_0020 »'
  )
  await app.screenshot('orpheline-export.png')
  await app.dialogButton('Annuler')
  await sleep(300)
  check((await app.dialog()) === null, 'export Blender : fenêtre fermée par « Annuler »')

  // 4. « Recréer l'en-tête », puis Annuler et Rétablir.
  await app.mouseClick('.orphan-box button', 'Recréer')
  await sleep(800)
  check((await orphanRows()).length === 0, 'Recréer l’en-tête : la carte n’est plus grisée')
  await app.module('Scénario')
  await sleep(800)
  const lines = await app.scriptLines()
  log('    en-têtes :', lines.filter((line) => line.startsWith('S_00')).join(' | '))
  const heading = lines.findIndex((line) => line.includes('INT. GRENIER - NUIT'))
  check(
    heading > lines.findIndex((line) => line.includes('INT. A - JOUR')) &&
      heading < lines.findIndex((line) => line.includes('INT. C - JOUR')),
    'Scénario : l’en-tête de S_0020 est revenu entre S_0010 et S_0030'
  )
  await app.module('Cartes')
  await sleep(500)
  const undoLabel = (await app.menuLabels('Édition')).find((label) => label.startsWith('Annuler'))
  log('    menu :', undoLabel)
  check(
    undoLabel === 'Annuler la recréation de l’en-tête',
    'menu « Annuler la recréation de l’en-tête »'
  )
  await app.menu('Édition', undoLabel)
  await sleep(800)
  check(
    JSON.stringify(await orphanRows()) === '["S_0020"]',
    'Annuler : S_0020 de nouveau orpheline'
  )
  check((await banner()) === null, 'Annuler : pas de bandeau (action de l’élève)')
  await sleep(2000)
  check(
    !readFileSync(scenarioFile, 'utf8').includes('GRENIER'),
    'Annuler : en-tête retiré du fichier'
  )

  // 5. Réouverture : l'orpheline est déjà connue, rien n'est signalé.
  await app.openProject(newProject())
  await sleep(500)
  await app.openProject(projectFile)
  await sleep(500)
  check(JSON.stringify(await orphanRows()) === '["S_0020"]', 'réouverture : S_0020 toujours grisée')
  check((await banner()) === null, 'réouverture : aucun bandeau (rien de neuf)')

  // 6. L'en-tête revient « dans Obsidian » : reconnectée, bandeau qui disparaît seul.
  writeFileSync(scenarioFile, original)
  await comeBack()
  await sleep(1500)
  const back = await banner()
  log('    bandeau :', JSON.stringify(back))
  check(
    back?.lines.includes('1 carte reconnectée à sa scène : S_0020'),
    'bandeau : « 1 carte reconnectée »'
  )
  check(back?.buttons.join(',') === 'Fermer', 'bandeau : sans « Voir »')
  check((await orphanRows()).length === 0, 'S_0020 n’est plus grisée')
  await sleep(10_000)
  check((await banner()) === null, 'bandeau disparu seul après 10 s')
}
