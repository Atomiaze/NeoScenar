// Étape 10E : documents (dossiers, sous-dossiers, notes, galerie d'images), avec le dossier
// « Repérages été » (accents et espaces), ajouts faits dans le Finder, renommage, suppression.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

const ROOT = join(import.meta.dirname, '..', '..', '..')

export default async function ({ app, check, newProject }) {
  const projectFile = newProject()
  const data = join(dirname(projectFile), 'neoscenar')
  const docs = (...parts) => join(data, 'documents', ...parts)

  const tool = (text) =>
    app.evaluate(
      `[...document.querySelectorAll('.research-module .toolbar button')].find((b) => b.textContent.trim() === ${JSON.stringify(text)})?.click()`
    )
  const typeName = (value) =>
    app.evaluate(`(() => {
      const input = document.querySelector('.dialog input')
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)})
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })()`)
  const typeNote = (value) =>
    app.evaluate(`(() => {
      const area = document.querySelector('.doc-note-text')
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(area, ${JSON.stringify(value)})
      area.dispatchEvent(new Event('input', { bubbles: true }))
    })()`)
  const clickRow = (selector, text) =>
    app.evaluate(
      `[...document.querySelectorAll(${JSON.stringify(selector)})].find((r) => r.textContent.trim() === ${JSON.stringify(text)})?.click()`
    )
  const rows = (selector) =>
    app.evaluate(
      `[...document.querySelectorAll(${JSON.stringify(selector)})].map((r) => r.textContent.trim())`
    )
  const create = async (button, title, name) => {
    await tool(button)
    await sleep(300)
    check((await app.dialog())?.title === title, `fenêtre « ${title} »`)
    await typeName(name)
    await sleep(100)
    await app.dialogButton('Créer')
    await sleep(800)
  }

  await app.openProject(projectFile)
  await app.module('Données du projet')
  await sleep(500)
  await app.evaluate(`document.querySelectorAll('.research-branch-title')[5].click()`)
  await sleep(300)

  // Dossier à la racine, puis sous-dossier dans le dossier choisi.
  await create('Nouveau dossier', 'Nouveau dossier', 'Repérages été')
  check(existsSync(docs('Repérages été')), 'vrai dossier documents/Repérages été')
  await create('Nouveau dossier', 'Nouveau dossier', 'Plage')
  check(existsSync(docs('Repérages été', 'Plage')), 'sous-dossier créé dans le dossier choisi')

  // Note dans « Repérages été ».
  await clickRow('.doc-folder-row', 'Repérages été')
  await sleep(300)
  await create('Nouvelle note', 'Nouvelle note', 'Idées de plans')
  check(existsSync(docs('Repérages été', 'Idées de plans.md')), 'note Idées de plans.md créée')
  await typeNote('Contre-jour sur la plage.\n\nPrévoir un réflecteur.')
  await sleep(1500)
  check(
    readFileSync(docs('Repérages été', 'Idées de plans.md'), 'utf8') ===
      'Contre-jour sur la plage.\n\nPrévoir un réflecteur.',
    'texte de la note enregistré tel quel (texte simple)'
  )

  // Doublon refusé (autre casse).
  await clickRow('.doc-folder-row', 'Repérages été')
  await sleep(300)
  await tool('Nouveau dossier')
  await sleep(300)
  await typeName('plage')
  await app.dialogButton('Créer')
  await sleep(500)
  const refused = await app.evaluate(`document.querySelector('.dialog .field-error')?.textContent`)
  check(refused === '« Plage » existe déjà à cet endroit.', `doublon refusé : ${refused}`)
  await app.dialogButton('Annuler')

  // Galerie : on dépose une image, puis on la retire.
  const png = readFileSync(join(ROOT, 'build', 'icon.png')).toString('base64')
  await app.evaluate(`(async () => {
    const bytes = Uint8Array.from(atob(${JSON.stringify(png)}), (c) => c.charCodeAt(0))
    const transfer = new DataTransfer()
    transfer.items.add(new File([bytes], 'plage matin.png', { type: 'image/png' }))
    document.querySelector('.research-gallery').dispatchEvent(
      new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }))
  })()`)
  await sleep(1200)
  check(existsSync(docs('Repérages été', 'plage matin.png')), 'image posée dans le dossier')
  check(
    (await app.evaluate(`document.querySelectorAll('.research-image').length`)) === 1,
    'image affichée dans la galerie'
  )
  await app.screenshot('recherches-documents.png')

  // Ajouts faits dans le Finder : dossier, note et image, vus au retour dans l'appli.
  mkdirSync(docs('Ajouté dans le Finder'))
  writeFileSync(docs('Ajouté dans le Finder', 'Liste.md'), '- repérer\n')
  writeFileSync(docs('Repérages été', 'plage soir.png'), Buffer.from(png, 'base64'))
  await app.evaluate(`window.dispatchEvent(new Event('focus'))`)
  await sleep(800)
  check(
    (await rows('.doc-folder-row')).includes('Ajouté dans le Finder'),
    'dossier ajouté dans le Finder visible au retour'
  )
  check(
    (await app.evaluate(`document.querySelectorAll('.research-image').length`)) === 2,
    'image ajoutée dans le Finder visible dans la galerie'
  )

  // Retrait d'une image : déplacée dans sauvegardes/, jamais supprimée.
  await app.evaluate(`document.querySelector('.research-image-remove').click()`)
  await sleep(800)
  check(
    readdirSync(docs('Repérages été')).filter((name) => name.endsWith('.png')).length === 1,
    'image retirée de la galerie'
  )
  check(
    readdirSync(join(data, 'sauvegardes', 'documents_images_retirees')).length === 1,
    'image gardée dans sauvegardes/documents_images_retirees'
  )

  // Renommage du dossier : la note ouverte suit.
  await clickRow('.doc-note-row', 'Idées de plans')
  await sleep(300)
  await clickRow('.doc-folder-row', 'Repérages été')
  await sleep(300)
  await tool('Renommer')
  await sleep(300)
  await typeName('Repérages hiver')
  await app.dialogButton('Renommer')
  await sleep(800)
  check(
    existsSync(docs('Repérages hiver', 'Idées de plans.md')),
    'dossier renommé avec son contenu'
  )
  check(!existsSync(docs('Repérages été')), "l'ancien nom a disparu")

  // Suppression confirmée d'une note, avec copie.
  await clickRow('.doc-note-row', 'Idées de plans')
  await sleep(300)
  await tool('Supprimer')
  await sleep(300)
  check((await app.dialog())?.title === 'Supprimer la note', 'confirmation de suppression')
  await app.dialogButton('Supprimer')
  await sleep(800)
  check(!existsSync(docs('Repérages hiver', 'Idées de plans.md')), 'note supprimée')
  check(
    readdirSync(join(data, 'sauvegardes', 'documents_supprimes')).length === 1,
    'copie dans sauvegardes/documents_supprimes'
  )
  await app.screenshot('recherches-documents-fin.png')
}
