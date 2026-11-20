// Essai 7 de l'étape 8C, depuis le module Scénario : Édition > Dupliquer la scène (Cmd + D) agit
// sur la scène du curseur, pas sur la carte sélectionnée dans les Cartes, et toute fenêtre
// s'affiche dans le module visible.

import { sleep } from '../application.mjs'

const NO_ROOM = 'Il n’y a plus de numéro de scène libre à cet endroit. Renuméroter les scènes ?'

export default async function ({ app, check, log, newProject }) {
  await app.openProject(newProject())

  // Une autre carte (S_0010) est sélectionnée dans les Cartes : elle ne doit pas être dupliquée.
  await app.click('[data-card-id="S10"]')
  check((await app.menuLabels('Édition')).includes('Dupliquer'), 'Cartes : menu « Dupliquer »')

  await app.module('Scénario')
  await sleep(800)
  check(
    (await app.menuLabels('Édition')).includes('Dupliquer la scène'),
    'Scénario : menu « Dupliquer la scène »'
  )
  await app.mouseClick('.cm-line', 'Deux.')
  await sleep(300)
  check((await app.navigatorCurrent())?.startsWith('S_0020'), 'curseur dans S_0020 (navigateur)')

  const headings = async () =>
    (await app.scriptLines()).filter((line) => line.includes('INT. GRENIER - NUIT'))
  for (let i = 1; i <= 9; i++) {
    await app.menu('Édition', 'Dupliquer la scène')
    await sleep(500)
    if (await app.dialog()) break
  }
  const copies = await headings()
  log('    en-têtes « GRENIER » :', copies.join(' | '))
  check(copies.length === 10, 'neuf copies de S_0020 dans le scénario')
  check(
    copies.map((line) => line.slice(0, 6)).join(' ') ===
      'S_0020 S_0021 S_0022 S_0023 S_0024 S_0025 S_0026 S_0027 S_0028 S_0029',
    'copies dans l’ordre, numéros qui se suivent (S_0021 à S_0029)'
  )

  // Dixième : plus de numéro libre. La fenêtre s'affiche ici, dans le Scénario.
  await app.menu('Édition', 'Dupliquer la scène')
  await sleep(500)
  const noRoom = await app.dialog()
  await app.screenshot('scenario-plus-de-numero.png')
  check(noRoom?.title === NO_ROOM, 'fenêtre « plus de numéro libre » visible dans le Scénario')
  await app.dialogButton('Non')
  await sleep(300)
  check((await app.dialog()) === null, 'fenêtre fermée par « Non »')
  await app.menu('Édition', 'Dupliquer la scène')
  await sleep(500)
  check(
    (await app.dialog())?.title === NO_ROOM,
    'Cmd + D de nouveau : la fenêtre revient (jamais bloqué en silence)'
  )
  await app.dialogButton('Non')

  // Curseur avant la première scène : un message.
  await app.mouseClick('.cm-line', 'Texte avant la première scène.')
  await sleep(300)
  await app.menu('Édition', 'Dupliquer la scène')
  await sleep(500)
  const outside = await app.dialog()
  check(
    outside?.text.includes('Placez le curseur dans une scène'),
    'curseur hors scène : « Placez le curseur dans une scène »'
  )
  await app.dialogButton('Fermer')

  // Dans les Cartes : la carte et ses plans ont été copiés ; la dernière copie est sélectionnée.
  await app.module('Cartes')
  await sleep(800)
  const cards = await app.sceneCards()
  log('    cartes :', cards.join(', '))
  check(
    cards.includes('S_0029 [sélectionnée]'),
    'Cartes : la dernière copie (S_0029) est sélectionnée'
  )
  check(
    !cards.some((card) => card.startsWith('S_0011')),
    'S_0010 (sélectionnée avant) n’a pas été copiée'
  )
  check((await app.dialog()) === null, 'aucune fenêtre restée ouverte en arrière-plan')
}
