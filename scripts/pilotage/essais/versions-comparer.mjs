// Étape 13C (2e partie) : Consulter et Comparer sur « Le Dernier Bus ». Enregistrer une version, puis
// modifier le scénario sur le disque (scène modifiée, scène supprimée, scène déplacée, scène
// ajoutée), revenir dans l'appli (relecture) et comparer ; consulter la version en lecture seule.

import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

const ROOT = join(import.meta.dirname, '..', '..', '..')

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const data = join(dirname(projectFile), 'neoscenar')
  const scenarioPath = join(data, 'scenario.fountain')
  copyFileSync(
    join(ROOT, 'packages', 'fountain', 'tests', 'exemples', 'le-dernier-bus.fountain'),
    scenarioPath
  )

  const selectRow = (text) =>
    app.evaluate(`(() => {
      const row = [...document.querySelectorAll('.versions-table tbody tr')]
        .find((tr) => tr.textContent.includes(${JSON.stringify(text)}))
      if (!row) return 'introuvable'
      row.click()
      return 'ok'
    })()`)
  const compareItems = () =>
    app.evaluate(
      `[...document.querySelectorAll('.versions-compare-list li')].map((li) => li.textContent)`
    )

  await app.openProject(projectFile)
  await sleep(1500)
  if ((await app.dialog())?.buttons.includes('Continuer')) await app.dialogButton('Continuer')
  await sleep(1500)

  // 1. Version 1 : le scénario numéroté.
  await app.menu('Fichier', 'Versions…')
  await sleep(800)
  await app.dialogButton('Enregistrer une version…')
  await sleep(300)
  await app.dialogButton('Enregistrer')
  await sleep(1500)

  // 2. Aucune différence avec le scénario actuel.
  check((await selectRow('Version 1')) === 'ok', 'version choisie')
  await app.dialogButton('Comparer…')
  await sleep(1500)
  const empty = await app.evaluate(`document.querySelector('.dialog-body').textContent`)
  check(empty.includes('Aucune différence'), 'aucune différence juste après la version')
  await app.dialogButton('Retour')
  await sleep(300)
  await app.dialogButton('Fermer')

  // 3. Modifier le Fountain dans « un autre logiciel » : scènes repérées par leur numéro.
  const original = readFileSync(scenarioPath, 'utf8')
  const blocks = original.split(/(?=^(?:INT|EXT)[^\n]*#\d+[A-Z]?#\s*$)/m)
  const numbered = blocks
    .map((text, index) => ({ text, index, number: /#(\d+[A-Z]?)#/.exec(text.split('\n')[0])?.[1] }))
    .filter((block) => block.number)
  check(numbered.length >= 5, `scènes numérotées : ${numbered.length}`)
  const [first, second, third, fourth] = numbered
  log(
    `    modifiée ${first.number}, supprimée ${second.number}, ${fourth.number} remontée avant ${third.number}`
  )
  const edited = [...blocks]
  edited[first.index] = first.text.replace(/\n\n([^\n]+)/, '\n\nUne phrase ajoutée au début. $1')
  edited[second.index] = ''
  edited[third.index] = ''
  edited[fourth.index] = fourth.text + third.text
  edited.push('\n\nINT. GRENIER - NUIT #999#\n\nUne scène toute neuve.\n')
  writeFileSync(scenarioPath, edited.join(''))
  // Retour dans l'appli : le fichier est relu et rapproché.
  await app.evaluate(`window.dispatchEvent(new Event('focus'))`)
  await sleep(2500)
  const choice = await app.dialog()
  if (choice?.buttons.includes('Continuer')) await app.dialogButton('Continuer')
  await sleep(1000)

  // 4. Comparer Version 1 avec le scénario actuel.
  await app.menu('Fichier', 'Versions…')
  await sleep(800)
  await selectRow('Version 1')
  await app.dialogButton('Comparer…')
  await sleep(2000)
  const items = await compareItems()
  log(`    ${items.join(' | ')}`)
  const headingOf = (block) => block.text.split('\n')[0].replace(/\s*#[^#]+#\s*$/, '')
  const label = (number) => `S_${number.padStart(4, '0')}`
  const find = (badge, ...texts) =>
    items.find((item) => item.includes(badge) && texts.every((text) => item.includes(text)))
  check(find('modifiée', label(first.number)), `${label(first.number)} modifiée`)
  check(find('supprimée', headingOf(second)), `${headingOf(second)} supprimée`)
  // Le rapprochement a renuméroté la scène remontée : elle reste reconnue grâce à sa carte.
  const moved = find('déplacée', '→')
  check(moved, `scène déplacée avec ancien → nouveau numéro : ${moved}`)
  check(
    !items.some((item) => item.includes(headingOf(fourth)) && item.includes('supprimée')),
    'la scène renumérotée n’est pas vue comme supprimée'
  )
  check(
    items.some((item) => item.includes('GRENIER') && item.includes('ajoutée')),
    'scène ajoutée'
  )
  const summary = await app.evaluate(`document.querySelector('.dialog-body > p.muted').textContent`)
  log(`    ${summary}`)

  // Détail de la scène modifiée : mots ajoutés en vert.
  await app.evaluate(`[...document.querySelectorAll('.versions-compare-list li')]
    .find((li) => li.textContent.includes('modifiée')).click()`)
  await sleep(300)
  const added = await app.evaluate(
    `[...document.querySelectorAll('.versions-diff ins')].map((n) => n.textContent).join('')`
  )
  check(added.includes('phrase ajoutée'), `mots ajoutés : ${added.trim()}`)
  const color = await app.evaluate(
    `getComputedStyle(document.querySelector('.versions-diff ins')).color`
  )
  log(`    couleur des ajouts : ${color}`)
  await app.screenshot('versions-comparer.png')

  // Scène supprimée : tout en rouge barré.
  await app.evaluate(`[...document.querySelectorAll('.versions-compare-list li')]
    .find((li) => li.textContent.includes('supprimée')).click()`)
  await sleep(300)
  const removed = await app.evaluate(
    `getComputedStyle(document.querySelector('.versions-diff del')).textDecorationLine`
  )
  check(removed.includes('line-through'), 'texte retiré barré')
  await app.screenshot('versions-comparer-supprimee.png')
  await app.dialogButton('Retour')
  await sleep(300)

  // 5. Consulter la version : lecture seule, mise en page de l'éditeur.
  await selectRow('Version 1')
  await app.dialogButton('Consulter')
  await sleep(2000)
  // Les traits de page ne sont dessinés que pour la partie visible : on descend d'une page.
  await app.evaluate(`document.querySelector('.version-viewer .cm-scroller').scrollTop = 900`)
  await sleep(800)
  const viewer = await app.evaluate(`(() => {
    const content = document.querySelector('.version-viewer .cm-content')
    return {
      editable: content?.getAttribute('contenteditable'),
      text: content?.textContent ?? '',
      breaks: document.querySelectorAll('.version-viewer .fl-page-break').length,
      headings: document.querySelectorAll('.version-viewer .fl-scene_heading').length
    }
  })()`)
  log(
    `    contenteditable=${viewer.editable}, traits de page ${viewer.breaks}, en-têtes ${viewer.headings}`
  )
  check(viewer.editable === 'false', 'lecture seule')
  check(viewer.headings > 0, 'en-têtes mis en forme comme dans l’éditeur')
  check(viewer.breaks > 0, 'traits de page affichés')
  check(!viewer.text.includes('GRENIER'), 'le texte est celui de la version')
  await app.screenshot('versions-consulter.png')
  await app.dialogButton('Retour')
  await sleep(300)
  await app.dialogButton('Fermer')

  // La consultation n'a rien écrit.
  check(readFileSync(scenarioPath, 'utf8').includes('GRENIER'), 'scénario actuel intact')
}
