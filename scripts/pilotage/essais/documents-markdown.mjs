// Étape 18C-2 : synopsis, pitch et note d'intention (éditeur Markdown) : mise en forme pendant la
// frappe, fichiers neoscenar/synopsis.md, pitch.md et note-intention.md, rien d'écrit sans saisie,
// relecture d'un fichier modifié ailleurs, annulation par le menu.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const data = join(dirname(projectFile), 'neoscenar')
  const file = (name) => join(data, name)
  const read = (name) => readFileSync(file(name), 'utf8')

  await app.openProject(projectFile)
  await app.module('Données du projet')
  await sleep(800)

  const clickEntry = (label) =>
    app.evaluate(
      `[...document.querySelectorAll('.research-tree .research-branch-title')].find((b) => b.textContent.replace(/\\d+$/, '').trim() === ${JSON.stringify(label)})?.click()`
    )
  const type = async (text) => {
    await app.page.send('Input.insertText', { text })
    await sleep(150)
  }
  const enter = async () => {
    const params = { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }
    await app.page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...params })
    await app.page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...params })
    await sleep(150)
  }
  const tool = (label) =>
    app.evaluate(
      `document.querySelector('.md-toolbar [aria-label=${JSON.stringify(label)}]')?.click()`
    )
  const view = () =>
    app.evaluate(`({
      lines: [...document.querySelectorAll('.md-editor-host .cm-line')].map((l) => ({ text: l.textContent, cls: l.className })),
      bold: [...document.querySelectorAll('.md-bold')].map((e) => e.textContent),
      italic: [...document.querySelectorAll('.md-italic')].map((e) => e.textContent),
      title: document.querySelector('.research-sheet h2')?.textContent,
      active: document.querySelector('.research-branch-title.active')?.textContent.trim(),
      spell: document.querySelector('.md-editor-host .cm-content')?.getAttribute('spellcheck')
    })`)

  // 1. Visite des trois documents : rien n'est écrit.
  for (const label of ['Synopsis', 'Pitch', 'Note d’intention']) {
    await clickEntry(label)
    await sleep(500)
    const v = await view()
    check(v.title === label && v.active === label, `${label} : vue et rubrique active`)
    check(v.spell === 'true', `${label} : correcteur actif`)
  }
  await sleep(1200)
  check(
    !existsSync(file('synopsis.md')) &&
      !existsSync(file('pitch.md')) &&
      !existsSync(file('note-intention.md')),
    'aucun fichier créé sans saisie'
  )

  // 2. Synopsis : titre à la barre d'outils, gras et italique tapés à la main, ligne.
  await clickEntry('Synopsis')
  await sleep(500)
  await app.mouseClick('.md-editor-host .cm-content')
  await type('Le départ')
  await tool('Titre 1')
  await enter()
  await enter()
  await type('Un homme **fort** et une femme *douce*.')
  await enter()
  await enter()
  await type('---')
  await enter()
  await type('Sous-titre')
  await tool('Titre 2')
  await enter()
  await type('Mot')
  // Sélection du mot par Maj + flèche gauche (3 fois), puis gras par la barre d'outils.
  for (let i = 0; i < 3; i++) {
    const p = { key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37, modifiers: 8 }
    await app.page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...p })
    await app.page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...p })
  }
  await tool('Italique (Cmd/Ctrl + I)')
  await sleep(1500)
  const v = await view()
  log('lignes :', JSON.stringify(v.lines))
  check(v.lines[0].cls.includes('md-h1'), 'ligne 1 en titre 1')
  check(
    v.bold.includes('**fort**') && v.italic.includes('*douce*'),
    'gras et italique mis en forme'
  )
  check(
    v.lines.some((l) => l.cls.includes('md-rule')),
    'ligne horizontale'
  )
  check(
    v.lines.some((l) => l.cls.includes('md-h2') && l.text.startsWith('## Sous-titre')),
    'titre 2 par la barre'
  )
  check(v.italic.includes('*Mot*'), 'italique par la barre d’outils sur la sélection')
  const expected =
    '# Le départ\n\nUn homme **fort** et une femme *douce*.\n\n---\n## Sous-titre\n*Mot*'
  check(
    read('synopsis.md') === expected,
    `synopsis.md attendu (reçu : ${JSON.stringify(read('synopsis.md'))})`
  )
  check(
    !existsSync(file('pitch.md')) && !existsSync(file('note-intention.md')),
    'pitch et note encore absents'
  )
  await app.screenshot('documents-markdown-synopsis.png')

  // 3. Pitch modifié ailleurs avant d'être ouvert, puis synopsis modifié ailleurs pendant qu'il est ouvert.
  writeFileSync(file('pitch.md'), '# Pitch Obsidian\n\nTexte **ailleurs**.', 'utf8')
  await clickEntry('Pitch')
  await sleep(700)
  let p = await view()
  check(
    p.lines[0].text === '# Pitch Obsidian' && p.bold.includes('**ailleurs**'),
    'pitch écrit ailleurs : visible'
  )
  await clickEntry('Synopsis')
  await sleep(600)
  writeFileSync(file('synopsis.md'), 'Réécrit dans Obsidian', 'utf8')
  await app.evaluate(`window.dispatchEvent(new Event('focus'))`)
  await sleep(700)
  p = await view()
  check(
    p.lines.length === 1 && p.lines[0].text === 'Réécrit dans Obsidian',
    'synopsis modifié ailleurs : relu au retour'
  )
  await sleep(1200)
  check(
    read('synopsis.md') === 'Réécrit dans Obsidian',
    'la relecture ne réécrit pas le fichier autrement'
  )

  // 4. Annuler (menu Édition) dans l'éditeur Markdown.
  await app.mouseClick('.md-editor-host .cm-content')
  await app.page.send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown',
    key: 'End',
    code: 'End',
    windowsVirtualKeyCode: 35
  })
  await app.page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'End', code: 'End' })
  await type(' plus')
  await sleep(300)
  check((await view()).lines[0].text === 'Réécrit dans Obsidian plus', 'texte ajouté')
  await app.menu('Édition', 'Annuler')
  await sleep(400)
  const undone = (await view()).lines[0].text
  log('après Annuler :', undone)
  check(undone === 'Réécrit dans Obsidian', 'menu Annuler défait la frappe dans l’éditeur Markdown')

  // 5. Note d'intention : fichier à nom sans espace ni accent.
  await clickEntry('Note d’intention')
  await sleep(500)
  await app.mouseClick('.md-editor-host .cm-content')
  await type('Mon intention')
  await sleep(1500)
  check(read('note-intention.md') === 'Mon intention', 'note-intention.md écrit')
  check(
    !existsSync(file('pitch.md')) || read('pitch.md').startsWith('# Pitch Obsidian'),
    'pitch intact'
  )
}
