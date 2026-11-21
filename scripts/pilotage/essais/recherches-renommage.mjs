// Étape 10D : renommage d'une fiche depuis son nom. Nom déjà pris refusé ; fenêtre avec les
// occurrences ; scénario, fiche et fichier renommés ; copie de sécurité ; « Annuler » du bandeau ;
// renommage d'un lieu (en-têtes et cartes) ; renommage direct sans occurrence.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const data = join(dirname(projectFile), 'neoscenar')
  const scenarioFile = join(data, 'scenario.fountain')
  const sheet = (kind, name) => join(data, kind, `${name}.md`)
  const scenario = () => readFileSync(scenarioFile, 'utf8')
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
  const closeBanner = () =>
    app.evaluate(`document.querySelector('.link-banner > button:last-child')?.click()`)
  const focusBack = () => app.evaluate(`window.dispatchEvent(new Event('focus'))`)
  const openSheet = async (name) => {
    await app.evaluate(
      `[...document.querySelectorAll('.sheet-row')].find((r) => r.querySelector('.sheet-row-name')?.textContent === ${JSON.stringify(name)})?.click()`
    )
    await sleep(300)
  }
  // Clic sur le nom en haut de la fiche, nouveau nom, puis Entrée.
  const typeName = async (name) => {
    await app.click('.sheet-name-button')
    await sleep(200)
    await app.evaluate(`(() => {
      const input = document.querySelector('.sheet-name-input')
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(name)})
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })()`)
    await sleep(800)
  }
  const nameError = () =>
    app.evaluate(`document.querySelector('.sheet-name-edit .field-error')?.textContent ?? null`)
  const backups = () =>
    readdirSync(join(data, 'sauvegardes')).filter((n) => n.startsWith('avant_renommage_'))

  await app.openProject(projectFile)
  await app.module('Scénario')
  await sleep(1500)
  // Le scénario est complété « dans Obsidian » : les fiches sont créées au retour dans l'appli.
  writeFileSync(
    scenarioFile,
    `${scenario().trimEnd()}\n\nINT. CHAMBRE DE MARIE - JOUR\n\nMarie entre. MARIETTE la suit.\n\nMARIE\nJe suis Marie. [[Marie à revoir]]\n\nPAUL\nBonjour marie.\n\nEXT. JARDIN - NUIT\n\nRetour au jardin.\n`
  )
  await focusBack()
  await sleep(2500)
  check(existsSync(sheet('personnages', 'MARIE')), 'fiche MARIE créée')
  check(existsSync(sheet('lieux', 'JARDIN')), 'fiche JARDIN créée')
  await closeBanner()

  // Nom déjà pris : refus.
  await app.module('Données du projet')
  await sleep(800)
  await openSheet('MARIE')
  await typeName('Paul')
  const refused = await nameError()
  log('    refus :', refused)
  check(refused?.includes('« PAUL » existe déjà'), 'nom déjà pris : refusé avec un message')
  check((await app.dialog()) === null, 'nom déjà pris : pas de fenêtre')
  await app.screenshot('renommage-refus.png')
  await app.evaluate(
    `document.querySelector('.sheet-name-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`
  )
  await sleep(200)

  // MARIE → MARION : la fenêtre compte les occurrences.
  const backupsBefore = backups().length
  await typeName('MARION')
  const dialog = await app.dialog()
  log('    fenêtre :', JSON.stringify(dialog))
  check(
    dialog?.text.includes('Remplacer MARIE par MARION dans le scénario ?'),
    'fenêtre : question'
  )
  check(dialog?.text.includes('1 nom de personnage'), 'fenêtre : 1 nom de personnage')
  check(dialog?.text.includes('(3 fois'), 'fenêtre : 3 fois dans le texte (note exclue)')
  check(dialog?.text.includes('1 en-tête de scène contient MARIE'), 'fenêtre : en-tête signalé')
  check(JSON.stringify(dialog?.buttons) === '["Annuler","Remplacer"]', 'deux boutons')
  await app.screenshot('renommage-fenetre.png')
  await app.dialogButton('Remplacer')
  await sleep(1500)

  const renamed = scenario()
  check(existsSync(sheet('personnages', 'MARION')), 'fichier MARION.md')
  check(!existsSync(sheet('personnages', 'MARIE')), 'plus de MARIE.md')
  check(readFileSync(sheet('personnages', 'MARION'), 'utf8').includes('nom: MARION'), 'nom: MARION')
  check(renamed.includes('\nMARION\nJe suis Marion. [[Marie à revoir]]'), 'personnage + dialogue')
  check(renamed.includes('Marion entre. MARIETTE la suit.'), 'action, mot entier')
  check(renamed.includes('Bonjour marion.'), 'casse respectée (marie → marion)')
  check(renamed.includes('INT. CHAMBRE DE MARIE - JOUR'), 'en-tête non modifié')
  check(backups().length === backupsBefore + 1, 'copie avant_renommage_ créée')
  const copy = join(data, 'sauvegardes', backups().sort().at(-1))
  check(existsSync(join(copy, 'personnages', 'MARIE.md')), 'la copie contient la fiche')
  check(
    readFileSync(join(copy, 'scenario.fountain'), 'utf8').includes('\nMARIE\n'),
    'et le scénario'
  )
  check(
    !existsSync(sheet('personnages', 'MARIE')) && !existsSync(sheet('lieux', 'MARIE')),
    'pas de fiche MARIE recréée'
  )
  const banner = await bannerText()
  log('    bandeau :', banner)
  check(banner?.includes('Fiche MARIE renommée en MARION, 4 remplacements'), 'bandeau')
  await app.screenshot('renommage-fait.png')

  // Annuler : tout redevient comme avant.
  check((await bannerButton('Annuler')) === 'ok', 'bouton Annuler du bandeau')
  await sleep(1500)
  check(existsSync(sheet('personnages', 'MARIE')), 'annulé : MARIE.md revenu')
  check(!existsSync(sheet('personnages', 'MARION')), 'annulé : plus de MARION.md')
  check(
    scenario() === readFileSync(join(copy, 'scenario.fountain'), 'utf8'),
    'annulé : scénario identique à la copie'
  )
  check(
    (await app.evaluate(`document.querySelector('.sheet-name-button')?.textContent`)) === 'MARIE',
    'annulé : la fiche ouverte s’appelle MARIE'
  )

  // Le remplacement est hors de l'historique de l'éditeur : Cmd + Z ne le défait pas.
  await typeName('MARION')
  await app.dialogButton('Remplacer')
  await sleep(1500)
  await app.module('Scénario')
  await sleep(800)
  await app.menu('Édition', 'Annuler')
  await sleep(1200)
  check(scenario().includes('\nMARION\n'), 'Cmd + Z dans l’éditeur ne défait pas le renommage')

  // Lieu : JARDIN → Parc ; l'en-tête et la carte suivent.
  await app.module('Données du projet')
  await sleep(500)
  await closeBanner()
  await openSheet('JARDIN')
  await typeName('PARC')
  const placeDialog = await app.dialog()
  log('    fenêtre lieu :', placeDialog?.text)
  check(placeDialog?.text.includes('1 en-tête de scène'), 'lieu : 1 en-tête')
  await app.dialogButton('Remplacer')
  await sleep(1500)
  check(scenario().includes('EXT. PARC - NUIT'), 'lieu : en-tête remplacé')
  check(scenario().includes('Retour au parc.'), 'lieu : action remplacée (minuscules)')
  check(
    existsSync(sheet('lieux', 'PARC')) && !existsSync(sheet('lieux', 'JARDIN')),
    'lieu : fichier renommé'
  )
  await app.module('Cartes')
  await sleep(800)
  check(
    await app.evaluate(`document.querySelector('.board, main')?.textContent.includes('PARC')`),
    'lieu : la carte affiche PARC'
  )
  await app.screenshot('renommage-lieu-cartes.png')

  // Sans occurrence : renommage direct, sans fenêtre.
  writeFileSync(sheet('personnages', 'ZOE'), '---\ntype: personnage\nnom: ZOE\nauto: false\n---\n')
  await focusBack()
  await app.module('Données du projet')
  await sleep(1500)
  await closeBanner()
  await app.click('.research-branch-title')
  await openSheet('ZOE')
  await typeName('Zoé')
  check((await app.dialog()) === null, 'sans occurrence : pas de fenêtre')
  check(existsSync(sheet('personnages', 'Zoé')), 'sans occurrence : Zoé.md')
  log('    bandeau :', await bannerText())
  check((await bannerText())?.includes('Fiche ZOE renommée en Zoé.'), 'sans occurrence : bandeau')
}
