// Étape 10A : module Recherches, fiches Personnages (création, saisie, images, ajouts faits dans
// Obsidian conservés, réouverture, suppression avec copie de sécurité).

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

const ROOT = join(import.meta.dirname, '..', '..', '..')

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const data = join(dirname(projectFile), 'neoscenar')
  const sheetFile = join(data, 'personnages', 'MARIE.md')
  const readSheet = () => readFileSync(sheetFile, 'utf8')

  // Saisie dans un champ contrôlé par React : valeur posée par le prototype, puis « input ».
  const type = (selector, value) =>
    app.evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)})
      if (!element) return 'introuvable'
      const proto = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement
      Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(element, ${JSON.stringify(value)})
      element.dispatchEvent(new Event('input', { bubbles: true }))
      return 'ok'
    })()`)
  const labelled = (label, tag) =>
    `(() => [...document.querySelectorAll('.research-fields label.field')]
      .find((f) => f.querySelector('.field-label')?.textContent === ${JSON.stringify(label)})
      ?.querySelector('${tag}'))()`
  const typeIn = (label, tag, value) =>
    app.evaluate(`(() => {
      const element = ${labelled(label, tag)}
      if (!element) return 'introuvable'
      const proto = ${tag === 'textarea' ? 'HTMLTextAreaElement' : 'HTMLInputElement'}
      Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(element, ${JSON.stringify(value)})
      element.dispatchEvent(new Event('input', { bubbles: true }))
      return 'ok'
    })()`)
  const valueOf = (label, tag) => app.evaluate(`${labelled(label, tag)}?.value ?? null`)

  await app.openProject(projectFile)
  check((await app.module('Recherches')) === 'ok', 'l’icône Recherches ouvre le module')
  await sleep(500)
  check(
    (await app.evaluate(`document.querySelector('.research-tree')?.textContent ?? ''`)).includes(
      'Personnages'
    ),
    'arbre : Personnages, Lieux, Documents'
  )

  // Nouvelle fiche.
  await app.click('.research-module .toolbar button')
  await sleep(300)
  check((await app.dialog())?.title === 'Nouveau personnage', 'fenêtre « Nouveau personnage »')
  await type('.dialog input', 'MARIE')
  await sleep(100)
  await app.dialogButton('Créer')
  await sleep(800)
  check(existsSync(sheetFile), 'fichier personnages/MARIE.md créé')
  check(readSheet().includes('couleur: "#E07A5F"'), 'couleur proposée automatiquement')

  // Même nom, autre casse : refusé.
  await app.click('.research-module .toolbar button')
  await sleep(300)
  await type('.dialog input', 'marie')
  await sleep(100)
  await app.dialogButton('Créer')
  await sleep(500)
  const refused = await app.evaluate(`document.querySelector('.dialog .field-error')?.textContent`)
  check(refused === 'Une fiche « MARIE » existe déjà.', `doublon refusé : ${refused}`)
  await app.dialogButton('Annuler')

  // Saisie.
  await typeIn('Interprète', 'input', 'Léa Dupont')
  await typeIn('Âge', 'input', '16')
  await typeIn('Résumé', 'input', 'Lycéenne qui veut quitter sa ville.')
  await typeIn('Description', 'textarea', 'Elle rêve de Bruxelles.')
  await app.evaluate(`(() => {
    const select = ${labelled('Rôle', 'select')}
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, 'principal')
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })()`)
  await sleep(1500)
  const saved = readSheet()
  check(saved.includes('interprete: Léa Dupont'), 'interprète enregistré')
  check(saved.includes('age: 16\n'), 'âge enregistré comme un nombre')
  check(saved.includes('role: principal'), 'rôle enregistré')
  check(saved.includes('## Description\n\nElle rêve de Bruxelles.\n'), 'description enregistrée')
  check(
    (await app.evaluate(`document.querySelector('.save-indicator')?.textContent`)) === 'Enregistré',
    'indicateur « Enregistré »'
  )

  // Image glissée depuis une autre application (sans fichier) : copiée dans personnages/images/.
  const png = readFileSync(join(ROOT, 'build', 'icon.png')).toString('base64')
  await app.evaluate(`(async () => {
    const bytes = Uint8Array.from(atob(${JSON.stringify(png)}), (c) => c.charCodeAt(0))
    const transfer = new DataTransfer()
    transfer.items.add(new File([bytes], 'marie au lycée.png', { type: 'image/png' }))
    const zone = document.querySelector('.research-gallery')
    zone.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }))
  })()`)
  await sleep(1500)
  check(
    existsSync(join(data, 'personnages', 'images', 'marie au lycée.png')),
    'image copiée sous son nom d’origine'
  )
  check(readSheet().includes('![](<images/marie au lycée.png>)'), 'image référencée en Markdown')
  const shown = await app.evaluate(
    `document.querySelector('.research-image img')?.naturalWidth ?? 0`
  )
  check(shown > 0, `image affichée dans la galerie (${shown} px)`)
  await app.click('.research-image-open')
  await sleep(500)
  check((await app.dialog())?.title === 'marie au lycée.png', 'aperçu en grand au clic')
  await app.screenshot('recherches-apercu.png')
  await app.dialogButton('Fermer')

  // Obsidian ajoute une propriété et une section…
  writeFileSync(
    sheetFile,
    readSheet()
      .replace('auto: false', 'auto: false\ntags: [lycée]')
      .concat('\n## Costumes\n\nVeste rouge.\n')
  )
  await app.evaluate(`window.dispatchEvent(new Event('focus'))`)
  await sleep(800)
  // … puis l'élève continue dans NeoScenar.
  await typeIn('Objectifs', 'textarea', 'Partir.')
  await sleep(1500)
  const merged = readSheet()
  check(/tags: \[ ?lycée ?\]/.test(merged), 'propriété ajoutée dans Obsidian conservée')
  check(merged.includes('## Costumes\n\nVeste rouge.'), 'section ajoutée dans Obsidian conservée')
  check(merged.includes('## Objectifs\n\nPartir.\n'), 'modification faite dans NeoScenar écrite')
  await app.screenshot('recherches-fiche.png')

  // Fermer et rouvrir le projet : tout est relu.
  await app.menu('Fichier', 'Fermer le projet')
  await sleep(800)
  await app.openProject(projectFile)
  await app.module('Recherches')
  await sleep(800)
  await app.click('.sheet-row')
  await sleep(300)
  check(
    (await valueOf('Interprète', 'input')) === 'Léa Dupont',
    'interprète relu après réouverture'
  )
  check((await valueOf('Objectifs', 'textarea')) === 'Partir.', 'objectifs relus après réouverture')
  check(
    (await app.evaluate(`document.querySelectorAll('.research-image img').length`)) === 1,
    'image relue après réouverture'
  )
  const row = await app.evaluate(`document.querySelector('.sheet-row')?.textContent`)
  // MARIE n'est pas dans le scénario d'essai : elle est marquée « absente du scénario » (10C).
  check(
    row === 'MARIELycéenne qui veut quitter sa ville.absente du scénario',
    `liste : nom et résumé (${row})`
  )

  // Annuler (Cmd + Z) hors d'un champ : les cartes ne bougent pas.
  await app.menu('Édition', (await app.menuLabels('Édition'))[0].replace(' (désactivé)', ''))

  // Suppression confirmée, avec copie.
  await app.click('.research-module .toolbar button:nth-of-type(2)')
  await sleep(300)
  check((await app.dialog())?.title === 'Supprimer la fiche', 'suppression demandée')
  await app.dialogButton('Supprimer')
  await sleep(800)
  check(!existsSync(sheetFile), 'fiche supprimée')
  const backups = readdirSync(join(data, 'sauvegardes', 'fiches_supprimees', 'personnages'))
  log('    copie :', backups.join(', '))
  check(backups.length === 1 && backups[0].endsWith('_MARIE.md'), 'copie dans sauvegardes/')
  check(
    existsSync(join(data, 'personnages', 'images', 'marie au lycée.png')),
    'les images restent en place'
  )
}
