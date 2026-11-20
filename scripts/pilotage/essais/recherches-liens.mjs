// Étape 10C : liens entre le scénario et les fiches. Création automatique à l'enregistrement et au
// retour d'Obsidian, ressemblance MARI / MARIE (remplacement annulable), Cmd + clic, fiches
// inutilisées ou absentes du scénario, fiche complétée qui n'est plus « auto ».

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const data = join(dirname(projectFile), 'neoscenar')
  const scenarioFile = join(data, 'scenario.fountain')
  const sheet = (kind, name) => join(data, kind, `${name}.md`)
  const readSheet = (kind, name) => readFileSync(sheet(kind, name), 'utf8')
  const bannerText = () =>
    app.evaluate(`document.querySelector('.link-banner')?.textContent ?? null`)
  const bannerButton = (label) =>
    app.evaluate(`(() => {
      const button = [...document.querySelectorAll('.link-banner button')]
        .find((b) => b.textContent === ${JSON.stringify(label)})
      if (!button) return 'introuvable'
      button.click()
      return 'ok'
    })()`)
  // Frappe dans l'éditeur, sur la dernière ligne (vide) : le curseur finit sur une ligne vide.
  const typeAtEnd = async (text) => {
    const box = await app.evaluate(`(() => {
      const last = [...document.querySelectorAll('.cm-line')].at(-1)
      last.scrollIntoView({ block: 'center' })
      const r = last.getBoundingClientRect()
      return { x: r.left + 5, y: r.top + r.height / 2 }
    })()`)
    for (const type of ['mousePressed', 'mouseReleased']) {
      await app.page.send('Input.dispatchMouseEvent', {
        type,
        ...box,
        button: 'left',
        clickCount: 1
      })
    }
    await sleep(200)
    await app.page.send('Input.insertText', { text })
  }
  const focusBack = () => app.evaluate(`window.dispatchEvent(new Event('focus'))`)

  // Ouverture : les lieux du scénario d'essai (A, GRENIER, C) reçoivent une fiche vide.
  await app.openProject(projectFile)
  await app.module('Scénario')
  await sleep(1500)
  check(existsSync(sheet('lieux', 'GRENIER')), 'ouverture : fiche lieux/GRENIER.md créée')
  check(readSheet('lieux', 'GRENIER').includes('auto: true'), 'fiche créée avec auto: true')
  log('    bandeau :', await bannerText())

  // Une scène avec deux nouveaux personnages et un nouveau lieu : trois fiches à l'enregistrement.
  await app.evaluate(`document.querySelector('.link-banner > button:last-child')?.click()`)
  await app.module('Scénario')
  await sleep(800)
  await typeAtEnd(
    '\n\n\nINT. CUISINE - JOUR\n\nMARIE (V.O.)\nBonjour.\n\n@Paul ^\nSalut.\n\nMARIE (SUITE)\nÇa va ?\n'
  )
  await sleep(2500)
  check(existsSync(sheet('personnages', 'MARIE')), 'fiche MARIE créée (sans « (V.O.) »)')
  check(existsSync(sheet('personnages', 'Paul')), 'fiche Paul créée (sans « @ » ni « ^ »)')
  check(existsSync(sheet('lieux', 'CUISINE')), 'fiche lieux/CUISINE créée')
  const created = await bannerText()
  log('    bandeau :', created)
  check(created?.includes('3 nouvelles fiches'), 'bandeau : 3 nouvelles fiches')
  await app.screenshot('liens-nouvelles-fiches.png')

  // MARI à côté de MARIE : signalé, pas créé.
  await typeAtEnd('\n\nMARI\nTu viens ?\n')
  await sleep(2500)
  check(!existsSync(sheet('personnages', 'MARI')), 'MARI : pas de fiche créée')
  const similar = await bannerText()
  log('    bandeau :', similar)
  check(similar?.includes('MARI ressemble à la fiche MARIE'), 'ressemblance signalée')
  await app.screenshot('liens-ressemblance.png')

  // Remplacer, puis annuler.
  check(
    (await bannerButton('Remplacer MARI par MARIE dans le scénario')) === 'ok',
    'bouton Remplacer'
  )
  await sleep(1500)
  const lines = await app.scriptLines()
  check(!lines.includes('MARI') && lines.filter((l) => l === 'MARIE').length === 1, 'MARI → MARIE')
  check(
    readFileSync(scenarioFile, 'utf8').includes('\nMARIE\nTu viens ?'),
    'remplacement enregistré'
  )
  check((await bannerButton('Annuler')) === 'ok', 'bouton Annuler')
  await sleep(1500)
  check((await app.scriptLines()).includes('MARI'), 'Annuler remet MARI')
  check(readFileSync(scenarioFile, 'utf8').includes('\nMARI\nTu viens ?'), 'annulation enregistrée')

  // Même chose après une modification dans Obsidian.
  await app.evaluate(`document.querySelector('.link-banner > button:last-child')?.click()`)
  writeFileSync(
    scenarioFile,
    `${readFileSync(scenarioFile, 'utf8').trimEnd()}\n\nEXT. GARAGE - NUIT\n\nLUCIEN\nBonsoir.\n\nPAULE\nQui est là ?\n`
  )
  await focusBack()
  await sleep(2500)
  check(existsSync(sheet('lieux', 'GARAGE')), 'Obsidian : fiche GARAGE créée')
  check(existsSync(sheet('personnages', 'LUCIEN')), 'Obsidian : fiche LUCIEN créée')
  check(!existsSync(sheet('personnages', 'PAULE')), 'Obsidian : PAULE ressemble à Paul, non créée')
  log('    bandeau :', await bannerText())

  // Cmd + clic sur un personnage, puis sur un lieu d'en-tête.
  const cmdClick = async (text) => {
    const box = await app.evaluate(`(() => {
      const line = [...document.querySelectorAll('.cm-line')].find((l) => l.textContent.includes(${JSON.stringify(text)}))
      if (!line) return null
      line.scrollIntoView({ block: 'center' })
      const r = line.getBoundingClientRect()
      return { x: r.left + 10, y: r.top + r.height / 2 }
    })()`)
    if (!box) return 'introuvable'
    for (const type of ['mousePressed', 'mouseReleased']) {
      await app.page.send('Input.dispatchMouseEvent', {
        type,
        ...box,
        button: 'left',
        clickCount: 1,
        modifiers: 4
      })
    }
    return 'ok'
  }
  const selectedSheet = () =>
    app.evaluate(
      `document.querySelector('.sheet-row.selected .sheet-row-name')?.textContent ?? null`
    )
  check((await cmdClick('Paul ^')) === 'ok', 'ligne @Paul trouvée')
  await sleep(1000)
  check(
    (await selectedSheet()) === 'Paul',
    `Cmd + clic sur @Paul ouvre Paul (${await selectedSheet()})`
  )
  await app.module('Scénario')
  await sleep(800)
  await cmdClick('EXT. GARAGE')
  await sleep(1000)
  check((await selectedSheet()) === 'GARAGE', 'Cmd + clic sur l’en-tête ouvre GARAGE')

  // Fiche complétée par l'élève : auto: false.
  await app.evaluate(
    `[...document.querySelectorAll('.sheet-row')].find((r) => r.textContent.startsWith('Paul')).click()`
  )
  await sleep(300)
  await app.evaluate(`(() => {
    const input = [...document.querySelectorAll('.research-fields label.field')]
      .find((f) => f.querySelector('.field-label')?.textContent === 'Résumé')?.querySelector('input')
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Le voisin.')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })()`)
  await sleep(1500)
  check(readSheet('personnages', 'Paul').includes('auto: false'), 'Paul complétée : auto: false')

  // LUCIEN et Paul disparaissent du scénario (Obsidian) : LUCIEN vide → grisée, Paul → absente.
  writeFileSync(
    scenarioFile,
    readFileSync(scenarioFile, 'utf8')
      .replace('LUCIEN\nBonsoir.\n\n', '')
      .replace('@Paul ^\nSalut.\n\n', '')
  )
  await focusBack()
  await sleep(2500)
  const rows = await app.evaluate(
    `[...document.querySelectorAll('.sheet-row')].map((r) => r.className + ' | ' + r.textContent)`
  )
  log('    liste :', JSON.stringify(rows))
  check(
    rows.some((r) => r.includes('unused') && r.includes('LUCIEN') && r.endsWith('Supprimer')),
    'LUCIEN grisée avec « Supprimer »'
  )
  check(
    rows.some((r) => r.includes('Paul') && r.includes('absente du scénario')),
    'Paul marquée « absente du scénario »'
  )
  await app.screenshot('liens-fiches-inutilisees.png')
  await app.evaluate(
    `[...document.querySelectorAll('.sheet-row')].find((r) => r.textContent.startsWith('LUCIEN')).querySelector('.sheet-row-delete').click()`
  )
  await sleep(300)
  await app.dialogButton('Supprimer')
  await sleep(800)
  check(!existsSync(sheet('personnages', 'LUCIEN')), 'LUCIEN supprimée')
}
