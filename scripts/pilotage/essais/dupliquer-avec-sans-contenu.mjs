// Clic droit « Dupliquer avec contenu » / « Dupliquer sans contenu » sur une scène, dans les
// Cartes et dans le navigateur du Scénario : copie juste après l'original, numéro neuf, carte liée,
// pas de plans ; Édition > Annuler la défait, y compris depuis le Scénario.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

const SCRIPT =
  'Title: Film essai\n\nTexte avant la première scène.\n\nINT. A - JOUR #10#\n\nUn.\n\n' +
  'INT. GRENIER - NUIT #20#\n\n= Résumé du grenier.\n\nDeux.\n\nMARIE\nBonjour.\n\n' +
  'INT. C - JOUR #30#\n\nTrois.\n'

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const fountainFile = join(dirname(projectFile), 'neoscenar', 'scenario.fountain')
  writeFileSync(fountainFile, SCRIPT)
  await app.openProject(projectFile)
  await sleep(1200)

  const saved = async () => {
    await sleep(1800)
    return readFileSync(fountainFile, 'utf8')
  }
  const headings = (text) => [...text.matchAll(/^(?:INT|EXT)\..*#(\d+)#$/gm)].map((m) => m[1])
  const rightClick = async (rowSelector, text) => {
    const box = await app.evaluate(`(() => {
      const row = [...document.querySelectorAll(${JSON.stringify(rowSelector)})]
        .find((r) => r.textContent.includes(${JSON.stringify(text)}))
      const b = row.getBoundingClientRect()
      return { x: b.left + Math.min(60, b.width / 2), y: b.top + Math.min(20, b.height / 2) }
    })()`)
    for (const type of ['mousePressed', 'mouseReleased']) {
      await app.page.send('Input.dispatchMouseEvent', {
        type,
        ...box,
        button: 'right',
        buttons: type === 'mousePressed' ? 2 : 0,
        clickCount: 1
      })
    }
    await sleep(300)
    return app.evaluate(
      `[...document.querySelectorAll('.context-menu [role="menuitem"]')].map((b) => b.textContent)`
    )
  }
  // Le menu nomme l'action : « Annuler la duplication », « Rétablir la duplication ».
  const edit = async (verb) => {
    const label = (await app.menuLabels('Édition')).find((item) => item.startsWith(verb))
    log(`    menu : ${label}`)
    return app.menu('Édition', label)
  }
  const choose = (label) =>
    app.evaluate(`(() => {
      const item = [...document.querySelectorAll('.context-menu [role="menuitem"]')]
        .find((b) => b.textContent === ${JSON.stringify(label)})
      item.click()
      return 'ok'
    })()`)

  // --- Cartes : scène S_0020 (titre « Scène 20 », un plan avec vignette).
  await app.module('Cartes')
  await sleep(800)
  const sceneMenu = await rightClick('[data-card-id="S20"]', 'S_0020')
  log('    menu d’une scène :', sceneMenu.join(' | '))
  await app.screenshot('cartes-menu-dupliquer.png')
  check(
    sceneMenu.includes('Dupliquer avec contenu') && sceneMenu.includes('Dupliquer sans contenu'),
    'Cartes, scène : les deux entrées'
  )
  check(!sceneMenu.includes('Dupliquer'), 'Cartes, scène : plus de « Dupliquer » seul')
  await app.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`)
  await app.mouseClick('.board', '')
  const shotMenu = await rightClick('[data-card-id="S20-P10"]', '')
  check(shotMenu.includes('Dupliquer'), 'Cartes, plan : « Dupliquer » gardé')
  await app.mouseClick('.board', '')
  await sleep(200)

  await rightClick('[data-card-id="S20"]', 'S_0020')
  await choose('Dupliquer sans contenu')
  await sleep(500)
  const cards = await app.sceneCards()
  log('    cartes :', cards.join(', '))
  check(
    cards.some((card) => card.startsWith('S_0021')),
    'Cartes : copie S_0021'
  )
  let text = await saved()
  check(headings(text).join(' ') === '10 20 21 30', 'Fountain : S_0021 juste après S_0020')
  const copyBlock = text.slice(text.indexOf('#21#'), text.indexOf('INT. C'))
  log('    bloc de la copie :', JSON.stringify(copyBlock))
  check(copyBlock.includes('= Résumé du grenier.'), 'sans contenu : résumé copié')
  check(!copyBlock.includes('Deux.') && !copyBlock.includes('MARIE'), 'sans contenu : corps vide')
  const decoupage = JSON.parse(
    readFileSync(join(dirname(projectFile), 'neoscenar', 'decoupage.json'), 'utf8')
  )
  const copy = decoupage.scenes.find((scene) => scene.number === 21)
  check(copy?.name === 'Scène 20' && copy.shots.length === 0, 'carte copiée : titre, sans plans')
  await app.screenshot('cartes-apres-copie.png')

  // --- Scénario : clic droit sur S_0010 dans le navigateur, avec contenu.
  await app.module('Scénario')
  await sleep(1000)
  const navMenu = await rightClick('.navigator-row', 'S_0010')
  log('    menu du navigateur :', navMenu.join(' | '))
  check(
    navMenu.includes('Dupliquer avec contenu') && navMenu.includes('Dupliquer sans contenu'),
    'navigateur : les deux entrées'
  )
  await app.screenshot('navigateur-menu-dupliquer.png')
  await choose('Dupliquer avec contenu')
  await sleep(600)
  text = await saved()
  check(headings(text).join(' ') === '10 11 20 21 30', 'Fountain : S_0011 juste après S_0010')
  check(
    text.includes('INT. A - JOUR #11#\n\nUn.\n'),
    'avec contenu : texte complet de S_0010 dans la copie'
  )
  check(
    (await app.scriptLines()).some((line) => line.includes('INT. A - JOUR') && line.includes('11')),
    'éditeur : la copie est affichée'
  )
  await app.screenshot('scenario-apres-copie.png')

  // Édition > Annuler depuis le Scénario défait la duplication ; Rétablir la refait.
  await edit('Annuler')
  await sleep(400)
  check((await app.dialog()) === null, 'Annuler : aucune question')
  text = await saved()
  check(
    headings(text).join(' ') === '10 20 21 30',
    'Scénario, Annuler : la copie S_0011 est retirée'
  )
  await edit('Rétablir')
  await sleep(400)
  text = await saved()
  check(headings(text).join(' ') === '10 11 20 21 30', 'Scénario, Rétablir : la copie revient')
  await edit('Annuler')
  await sleep(400)

  // Cartes : Annuler retire aussi la première copie ; le texte revient à l'original.
  await app.module('Cartes')
  await sleep(800)
  await edit('Annuler')
  await sleep(400)
  text = await saved()
  check(text === SCRIPT, 'Cartes, Annuler : texte identique à celui de départ')
  const back = await app.sceneCards()
  check(back.length === 3, 'Cartes : trois cartes de nouveau')
  check(app.problems().length === 0, 'aucune erreur dans les consoles')
}
