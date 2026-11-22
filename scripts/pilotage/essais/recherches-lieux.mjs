// Étape 10B : fiches Lieux (création, saisie, image, ajouts faits dans Obsidian conservés,
// réouverture, suppression avec copie), et cohabitation avec les Personnages.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

const ROOT = join(import.meta.dirname, '..', '..', '..')

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const data = join(dirname(projectFile), 'neoscenar')
  const sheetFile = join(data, 'lieux', 'MAISON - CUISINE.md')
  const readSheet = () => readFileSync(sheetFile, 'utf8')

  const setValue = (element, proto, value) =>
    `(() => {
      const element = ${element}
      if (!element) return 'introuvable'
      Object.getOwnPropertyDescriptor(${proto}.prototype, 'value').set.call(element, ${JSON.stringify(value)})
      element.dispatchEvent(new Event('input', { bubbles: true }))
      return 'ok'
    })()`
  const type = (selector, value) =>
    app.evaluate(
      setValue(`document.querySelector(${JSON.stringify(selector)})`, 'HTMLInputElement', value)
    )
  const labelled = (label, tag) =>
    `[...document.querySelectorAll('.research-fields label.field')]
      .find((f) => f.querySelector('.field-label')?.textContent === ${JSON.stringify(label)})
      ?.querySelector('${tag}')`
  const typeIn = (label, tag, value) =>
    app.evaluate(
      setValue(
        labelled(label, tag),
        tag === 'textarea' ? 'HTMLTextAreaElement' : 'HTMLInputElement',
        value
      )
    )
  const valueOf = (label, tag) => app.evaluate(`(${labelled(label, tag)})?.value ?? null`)
  const clickBranch = (index) =>
    app.evaluate(`document.querySelectorAll('.research-branch-title')[${index} + 3].click()`)

  await app.openProject(projectFile)
  await app.module('Données du projet')
  await sleep(500)

  // La branche Lieux est active ; « Nouveau » y crée un lieu.
  await clickBranch(1)
  await sleep(200)
  await app.click('.research-module .toolbar button')
  await sleep(300)
  check((await app.dialog())?.title === 'Nouveau lieu', 'fenêtre « Nouveau lieu »')
  await type('.dialog input', 'MAISON - CUISINE')
  await sleep(100)
  await app.dialogButton('Créer')
  await sleep(800)
  check(existsSync(sheetFile), 'fichier lieux/MAISON - CUISINE.md créé')
  check(readSheet().includes('type: lieu'), 'type: lieu')
  check(!readSheet().includes('couleur'), 'pas de couleur pour un lieu')

  // Même nom, autre casse : refusé.
  await app.click('.research-module .toolbar button')
  await sleep(300)
  await type('.dialog input', 'maison - cuisine')
  await app.dialogButton('Créer')
  await sleep(500)
  const refused = await app.evaluate(`document.querySelector('.dialog .field-error')?.textContent`)
  check(refused === 'Une fiche « MAISON - CUISINE » existe déjà.', `doublon refusé : ${refused}`)
  await app.dialogButton('Annuler')

  // Saisie.
  await typeIn('Résumé', 'input', 'Cuisine étroite, années 70.')
  await typeIn('Description', 'textarea', 'Carrelage jaune.')
  await typeIn('Repérage', 'textarea', 'Lundi 9 h, prises près de la fenêtre.')
  await sleep(1500)
  const saved = readSheet()
  check(saved.includes('resume: Cuisine étroite, années 70.'), 'résumé enregistré')
  check(saved.includes('## Description\n\nCarrelage jaune.\n'), 'description enregistrée')
  check(
    saved.includes('## Repérage\n\nLundi 9 h, prises près de la fenêtre.\n'),
    'repérage enregistré'
  )

  // Image.
  const png = readFileSync(join(ROOT, 'build', 'icon.png')).toString('base64')
  await app.evaluate(`(async () => {
    const bytes = Uint8Array.from(atob(${JSON.stringify(png)}), (c) => c.charCodeAt(0))
    const transfer = new DataTransfer()
    transfer.items.add(new File([bytes], 'cuisine.png', { type: 'image/png' }))
    document.querySelector('.research-gallery').dispatchEvent(
      new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }))
  })()`)
  await sleep(1500)
  check(existsSync(join(data, 'lieux', 'images', 'cuisine.png')), 'image copiée dans lieux/images/')
  check(readSheet().includes('![](images/cuisine.png)'), 'image référencée en Markdown')
  await app.screenshot('recherches-lieu.png')

  // Obsidian ajoute une propriété et une section, puis l'élève continue.
  writeFileSync(
    sheetFile,
    readSheet()
      .replace('auto: false', 'auto: false\ntags: [intérieur]')
      .concat('\n## Notes\n\nÀ revoir.\n')
  )
  await app.evaluate(`window.dispatchEvent(new Event('focus'))`)
  await sleep(800)
  await typeIn('Description', 'textarea', 'Carrelage jaune, évier en grès.')
  await sleep(1500)
  const merged = readSheet()
  check(/tags: \[ ?intérieur ?\]/.test(merged), 'propriété ajoutée dans Obsidian conservée')
  check(merged.includes('## Notes\n\nÀ revoir.'), 'section ajoutée dans Obsidian conservée')
  check(merged.includes('évier en grès'), 'modification faite dans NeoScenar écrite')

  // Un personnage et un lieu cohabitent dans l'arbre.
  await clickBranch(0)
  await sleep(200)
  await app.click('.research-module .toolbar button')
  await sleep(300)
  check(
    (await app.dialog())?.title === 'Nouveau personnage',
    'la branche Personnages crée un personnage'
  )
  await type('.dialog input', 'MARIE')
  await app.dialogButton('Créer')
  await sleep(800)
  check(existsSync(join(data, 'personnages', 'MARIE.md')), 'personnage créé à côté du lieu')
  await app.screenshot('recherches-arbre.png')

  // Fermer et rouvrir le projet.
  await app.menu('Fichier', 'Fermer le projet')
  await sleep(800)
  await app.openProject(projectFile)
  await app.module('Données du projet')
  await sleep(800)
  const rows = await app.evaluate(
    `[...document.querySelectorAll('.sheet-row')].map((r) => r.textContent)`
  )
  log('    liste :', JSON.stringify(rows))
  // Étape 10C : les lieux du scénario d'essai (A, C, GRENIER) ont aussi reçu une fiche.
  check(rows.length === 5, 'les deux fiches sont relues, avec les 3 lieux du scénario')
  await app.evaluate(
    `[...document.querySelectorAll('.sheet-row')].find((r) => r.textContent.startsWith('MAISON - CUISINE')).click()`
  )
  await sleep(300)
  check((await valueOf('Repérage', 'textarea')).startsWith('Lundi 9 h'), 'repérage relu')
  check(
    (await app.evaluate(`document.querySelectorAll('.research-image img').length`)) === 1,
    'image relue'
  )

  // Suppression.
  await app.click('.research-module .toolbar button:nth-of-type(2)')
  await sleep(300)
  await app.dialogButton('Supprimer')
  await sleep(800)
  check(!existsSync(sheetFile), 'lieu supprimé')
  const backups = readdirSync(join(data, 'sauvegardes', 'fiches_supprimees', 'lieux'))
  check(
    backups.length === 1 && backups[0].endsWith('_MAISON - CUISINE.md'),
    'copie dans sauvegardes/'
  )
  check(existsSync(join(data, 'lieux', 'images', 'cuisine.png')), 'l’image reste en place')
  check(existsSync(join(data, 'personnages', 'MARIE.md')), 'le personnage est intact')
}
