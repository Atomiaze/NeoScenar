// Étape 10bB : formulaire du générique (entrée « Générique » de Recherches). On remplit des
// rubriques, une rubrique ajoutée, une musique, une mention et un logo ; un interprète ajouté dans
// une fiche apparaît dans la distribution ; on rouvre le projet et tout est là.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

const ROOT = join(import.meta.dirname, '..', '..', '..')

export default async function ({ app, check, newProject }) {
  const projectFile = newProject()
  const data = join(dirname(projectFile), 'neoscenar')
  const creditsFile = join(data, 'generique.json')
  const readCredits = () => JSON.parse(readFileSync(creditsFile, 'utf8'))

  // Saisie dans un champ contrôlé par React : valeur posée par le prototype, puis « input ».
  const typeInto = (elementExpression, value) =>
    app.evaluate(`(() => {
      const element = ${elementExpression}
      if (!element) return 'introuvable'
      const proto = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement
      Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(element, ${JSON.stringify(value)})
      element.dispatchEvent(new Event('input', { bubbles: true }))
      return 'ok'
    })()`)
  // Rubrique du formulaire repérée par l'intitulé par défaut (placeholder du champ « Intitulé »).
  const rubric = (original) =>
    `[...document.querySelectorAll('.credits-rubric')].find((r) => r.querySelector('input')?.placeholder === ${JSON.stringify(original)})`
  const click = (expression) => app.evaluate(`${expression}?.click()`)
  const openCredits = async () => {
    await app.module('Données du projet')
    await sleep(500)
    await app.evaluate(
      `[...document.querySelectorAll('.research-branch-title')].find((b) => b.textContent.trim() === 'Générique')?.click()`
    )
    await sleep(800)
  }

  writeFileSync(
    join(data, 'scenario.fountain'),
    'Title: Film essai\n\nINT. A - JOUR #10#\n\nMARIE\nBonjour.\n\nTOM\nSalut.\n\nLUCIE\nÇa va ?\n'
  )
  await app.openProject(projectFile)
  await openCredits()

  const blocks = await app.evaluate(`document.querySelectorAll('.credits-block').length`)
  check(blocks === 12, `12 blocs repliables (${blocks})`)
  const optional = await app.evaluate(
    `[...document.querySelectorAll('.credits-block')].filter((b) => b.querySelector('.field-inline input') && !b.open).length`
  )
  check(optional >= 2, 'blocs facultatifs fermés (Animation, Documentaire)')

  // Distribution : trois personnages sans interprète, avec avertissement.
  const warning = await app.evaluate(
    `document.querySelector('.credits-cast + .warning-text')?.textContent`
  )
  check(warning?.startsWith('3 personnages sans interprète'), `avertissement : ${warning}`)

  // Le nom du personnage ouvre sa fiche ; on y ajoute l'interprète.
  await click(
    `[...document.querySelectorAll('.credits-cast .link-button')].find((b) => b.textContent === 'MARIE')`
  )
  await sleep(500)
  const typed = await typeInto(
    `[...document.querySelectorAll('.research-fields label.field')].find((f) => f.querySelector('.field-label')?.textContent === 'Interprète')?.querySelector('input')`,
    'Léa Dupont'
  )
  check(typed === 'ok', 'fiche MARIE ouverte depuis la distribution')
  await sleep(1000)
  await openCredits()
  const cast = await app.evaluate(`document.querySelector('.credits-cast')?.textContent ?? ''`)
  check(
    cast.includes('Léa Dupont'),
    'l’interprète ajouté dans la fiche apparaît dans la distribution'
  )
  check(
    (
      await app.evaluate(`document.querySelector('.credits-cast + .warning-text')?.textContent`)
    )?.startsWith('2 personnages'),
    'plus que 2 personnages sans interprète'
  )

  // Nom affiché corrigé, ordre d'apparition.
  await typeInto(`document.querySelector('.credits-cast input[aria-label$="MARIE"]')`, 'Marie-Jo')
  await click(`document.querySelectorAll('input[name="credits-order"]')[1]`)

  // Rubrique du modèle, rubrique ajoutée, musique, mention.
  await typeInto(
    `${rubric('Directeur de la photographie')}?.querySelector('textarea')`,
    'Tom Martin\nSara Leroy'
  )
  await click(
    `[...document.querySelectorAll('.credits-block')].find((b) => b.querySelector('summary').textContent === 'Image')
      ?.querySelector(':scope > button.tool-button')`
  )
  await sleep(300)
  await typeInto(
    `[...document.querySelectorAll('.credits-rubric')].find((r) => r.querySelector('input')?.placeholder === 'Intitulé de la rubrique')?.querySelector('input')`,
    'Lumière d’appoint'
  )
  await typeInto(
    `[...document.querySelectorAll('.credits-rubric')].find((r) => r.querySelector('input')?.value === 'Lumière d’appoint')?.querySelector('textarea')`,
    'Paul'
  )
  await click(
    `[...document.querySelectorAll('.credits-block button.tool-button')].find((b) => b.textContent === 'Ajouter une musique')`
  )
  await sleep(300)
  await typeInto(`document.querySelector('.credits-music input')`, 'Clair de lune')
  await typeInto(
    `[...document.querySelectorAll('.research-fields label.field, .credits-rubric label.field')].find((f) => f.querySelector('.field-label')?.textContent === 'Tourné à')?.querySelector('input')`,
    'Liège'
  )

  // Logo déposé (nom avec espace et accent : le fichier copié n'en a pas).
  const png = readFileSync(join(ROOT, 'build', 'icon.png')).toString('base64')
  await app.evaluate(`(async () => {
    const bytes = Uint8Array.from(atob(${JSON.stringify(png)}), (c) => c.charCodeAt(0))
    const transfer = new DataTransfer()
    transfer.items.add(new File([bytes], 'Logo école.png', { type: 'image/png' }))
    document.querySelector('.research-gallery').dispatchEvent(
      new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }))
  })()`)
  await sleep(2000)
  check(
    existsSync(join(data, 'generique', 'logos', 'Logo_ecole.png')),
    'logo copié sans accent ni espace'
  )
  await app.screenshot('generique-formulaire.png')

  const saved = readCredits()
  const chief = saved.rubriques.find((r) => r.id === 'image.chef-op')
  check(chief?.noms.join('|') === 'Tom Martin|Sara Leroy', 'rubrique du modèle enregistrée')
  const added = saved.rubriques.find((r) => r.bloc === 'image')
  check(
    added?.intitule === 'Lumière d’appoint' && added.noms[0] === 'Paul',
    'rubrique ajoutée enregistrée'
  )
  check(saved.musiques[0]?.titre === 'Clair de lune', 'musique enregistrée')
  check(saved.mentions.tourneA === 'Liège', 'mention enregistrée')
  check(saved.acteurs.nomsAffiches.MARIE === 'Marie-Jo', 'nom affiché corrigé enregistré')
  check(saved.options.ordreActeurs === 'apparition', 'ordre des acteurs enregistré')
  check(saved.logos[0] === 'generique/logos/Logo_ecole.png', 'logo enregistré')

  // On rouvre le projet : tout est là.
  await app.openProject(projectFile)
  await openCredits()
  const chiefText = await app.evaluate(
    `${rubric('Directeur de la photographie')}?.querySelector('textarea')?.value`
  )
  check(chiefText === 'Tom Martin\nSara Leroy', 'après réouverture : rubrique du modèle')
  check(
    (await app.evaluate(`document.querySelector('.credits-music input')?.value`)) ===
      'Clair de lune',
    'après réouverture : musique'
  )
  check(
    (await app.evaluate(
      `document.querySelectorAll('.research-gallery .research-image img').length`
    )) === 1,
    'après réouverture : logo affiché'
  )
  check(
    (await app.evaluate(
      `document.querySelector('.credits-cast input[aria-label$="MARIE"]')?.value`
    )) === 'Marie-Jo',
    'après réouverture : nom affiché'
  )
  await app.screenshot('generique-reouvert.png')
}
