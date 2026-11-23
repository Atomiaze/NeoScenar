// Sous-étape 18C-13 : scène brouillon. Absente de l'éditeur, grisée avec son étiquette dans le
// navigateur, ni paginée ni comptée ; marquer / retirer le statut par le clic droit du navigateur,
// Cmd + Z en une étape ; le curseur saute la scène ; les cartes restent liées.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

// Scène B assez longue pour occuper plus d'une page.
const LONG = Array.from({ length: 40 }, (_, i) => `Longue action ${i + 1} de la scène B.\n`).join(
  '\n'
)
const SCRIPT = [
  'INT. A - JOUR #10#',
  '',
  'Action A.',
  '',
  'INT. B - JOUR #20#',
  '[[BROUILLON]]',
  '',
  LONG,
  'INT. C - JOUR #30#',
  '',
  'Action C.',
  ''
].join('\n')

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const fountainFile = join(dirname(projectFile), 'neoscenar', 'scenario.fountain')
  writeFileSync(fountainFile, SCRIPT)
  await app.openProject(projectFile)
  await app.module('Scénario')
  await sleep(1500)

  const saved = async () => {
    await sleep(1800)
    return readFileSync(fountainFile, 'utf8')
  }
  const state = () =>
    app.evaluate(`({
      summary: document.querySelector('.navigator-summary').textContent,
      pages: document.querySelector('.page-indicator')?.textContent ?? '',
      drafts: [...document.querySelectorAll('.navigator-row.scene.draft')].map((row) =>
        row.querySelector('.navigator-heading').textContent + ' / ' +
        (row.querySelector('.navigator-draft-tag')?.textContent ?? '')),
      editor: [...document.querySelectorAll('.cm-line')].map((line) => line.textContent).join('|')
    })`)
  const rightClick = async (text) => {
    const box = await app.evaluate(`(() => {
      const row = [...document.querySelectorAll('.navigator-row')]
        .find((r) => r.textContent.includes(${JSON.stringify(text)}))
      const b = row.getBoundingClientRect()
      return { x: b.left + 60, y: b.top + b.height / 2 }
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
  const key = async (key, code, vk) => {
    const params = { key, code, windowsVirtualKeyCode: vk }
    await app.page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...params })
    await app.page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...params })
    await sleep(150)
  }

  // 1. B est un brouillon dans le fichier.
  let now = await state()
  log('départ :', JSON.stringify({ ...now, editor: now.editor.slice(0, 120) }))
  check(
    now.drafts.length === 1 && now.drafts[0] === 'INT. B - JOUR / Brouillon',
    'B grisée avec « Brouillon »'
  )
  check(
    !now.editor.includes('INT. B') && !now.editor.includes('Longue action'),
    'B absente de l’éditeur'
  )
  check(now.editor.includes('INT. C'), 'C affichée')
  check(now.summary.startsWith('Scènes : 2'), 'navigateur : 2 scènes comptées')
  check(now.pages.includes('/ 1'), `une seule page (${now.pages})`)
  await app.screenshot('brouillon-1-depart.png')

  // 2. Le curseur saute la scène : de « Action A. », deux fois flèche bas = en-tête de C.
  await app.mouseClick('.cm-line', 'Action A.')
  await sleep(200)
  await key('ArrowDown', 'ArrowDown', 40)
  await key('ArrowDown', 'ArrowDown', 40)
  const current = await app.navigatorCurrent()
  log('après deux flèches :', current)
  check(current?.includes('INT. C'), 'le curseur passe de A à C sans entrer dans B')
  // Taper sur la ligne vide entre A et C : B reste un brouillon intact.
  await key('ArrowUp', 'ArrowUp', 38)
  await app.page.send('Input.insertText', { text: 'Ajout.' })
  let file = await saved()
  log('après frappe :', JSON.stringify(file.slice(0, 90)))
  check(
    file.includes('Ajout.\n\nINT. B - JOUR #20#\n[[BROUILLON]]'),
    'frappe au-dessus : brouillon intact'
  )
  await app.menu('Édition', 'Annuler')
  file = await saved()
  check(file === SCRIPT, 'Annuler : texte de départ')

  // 3. Clic droit sur C : « Marquer comme brouillon ».
  const items = await rightClick('INT. C')
  log('menu :', items)
  check(items.includes('Marquer comme brouillon'), 'menu : Marquer comme brouillon')
  await app.mouseClick('.context-menu [role="menuitem"]', 'Marquer comme brouillon')
  file = await saved()
  now = await state()
  check(file.includes('INT. C - JOUR #30#\n[[BROUILLON]]\n'), 'C : note écrite sous l’en-tête')
  check(!now.editor.includes('INT. C') && now.drafts.length === 2, 'C masquée et grisée')
  check(now.summary.startsWith('Scènes : 1'), 'navigateur : 1 scène comptée')
  await app.screenshot('brouillon-2-deux.png')

  // 4. Annuler : une seule étape.
  await app.menu('Édition', 'Annuler')
  file = await saved()
  check(file === SCRIPT, 'Annuler : C n’est plus un brouillon')

  // 5. Retirer le statut de B.
  const itemsB = await rightClick('INT. B')
  check(itemsB.includes('Retirer le statut brouillon'), 'menu : Retirer le statut brouillon')
  await app.mouseClick('.context-menu [role="menuitem"]', 'Retirer le statut brouillon')
  file = await saved()
  now = await state()
  check(file === SCRIPT.replace('[[BROUILLON]]\n', ''), 'B : note retirée, texte d’origine')
  check(now.editor.includes('INT. B') && now.drafts.length === 0, 'B de nouveau dans l’éditeur')
  check(now.summary.startsWith('Scènes : 3'), 'navigateur : 3 scènes')
  check(!now.pages.includes('/ 1'), `plus d’une page (${now.pages})`)
  await app.menu('Édition', 'Annuler')
  await saved()

  // 6. Les cartes restent liées, aucune orpheline.
  await app.module('Cartes')
  await sleep(800)
  const cards = await app.sceneCards()
  log('cartes :', cards)
  check(cards.length === 3, 'trois cartes, aucune perdue')
  const orphans = await app.evaluate(
    `document.querySelectorAll('.card.orphan, [data-orphan="true"]').length`
  )
  check(orphans === 0, 'aucune carte orpheline')
}
