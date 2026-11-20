// Étape 16B : police du scénario mesurée dans l'application, traits de page de « Le Dernier Bus »
// (référence à comparer sur Windows et Linux en 16D), et « Ajouter au dictionnaire » qui fonctionne.

import { copyFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const electron = `process.mainModule.require('electron')`

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  copyFileSync(
    join(ROOT, 'packages', 'fountain', 'tests', 'exemples', 'le-dernier-bus.fountain'),
    join(dirname(projectFile), 'neoscenar', 'scenario.fountain')
  )
  await app.openProject(projectFile)
  await app.module('Scénario')
  await sleep(1500)

  // 1. Police : Courier Prime livrée (jamais une police du système), 0,6 em par caractère.
  const font = await app.evaluate(`(async () => {
    await document.fonts.ready
    const content = document.querySelector('.cm-content')
    const style = getComputedStyle(content)
    const context = document.createElement('canvas').getContext('2d')
    context.font = style.font
    const size = parseFloat(style.fontSize)
    const loaded = [...document.fonts].filter(
      (face) => face.family.replace(/"/g, '') === 'Courier Prime' && face.status === 'loaded'
    ).length
    return {
      family: style.fontFamily,
      size,
      loaded,
      em: context.measureText('M'.repeat(100)).width / 100 / size,
      emAccents: context.measureText('ÉÀçœ'.repeat(25)).width / 100 / size,
      lineHeight: parseFloat(getComputedStyle(document.querySelector('.cm-line')).lineHeight)
    }
  })()`)
  log(`    police : ${JSON.stringify(font)}`)
  check(font.family.startsWith('"Courier Prime"'), 'page du scénario en Courier Prime')
  check(font.loaded >= 1, 'Courier Prime livrée chargée (pas de police de secours)')
  check(Math.abs(font.em - 0.6) < 0.001, `un caractère = 0,6 em (${font.em.toFixed(4)})`)
  check(Math.abs(font.emAccents - 0.6) < 0.001, 'majuscules accentuées : 0,6 em aussi')
  check(Math.abs(font.lineHeight - font.size) < 0.01, 'interligne = taille du caractère')

  // 2. Traits de page : première ligne de chaque page, en faisant défiler tout le scénario.
  const pages = {}
  const scroller = `document.querySelector('.cm-scroller')`
  // La hauteur totale grandit pendant le défilement (CodeMirror l'estime d'abord) : on va jusqu'au bout.
  for (let top = 0, atEnd = false; !atEnd; top += 400) {
    atEnd = await app.evaluate(`(() => {
      const element = ${scroller}
      element.scrollTop = ${top}
      return element.scrollTop + element.clientHeight >= element.scrollHeight - 1
    })()`)
    await sleep(120)
    const seen = await app.evaluate(`(() => {
      const lines = [...document.querySelectorAll('.cm-line')]
      return [...document.querySelectorAll('.fl-page-break')].map((mark) => {
        const y = mark.getBoundingClientRect().top
        const line = lines.find((item) => {
          const box = item.getBoundingClientRect()
          return y >= box.top - 1 && y < box.bottom - 1
        })
        return [mark.textContent, line ? line.textContent : null]
      })
    })()`)
    for (const [page, text] of seen) if (text !== null) pages[page] = text
  }
  const count = Object.keys(pages).length
  log(`    traits de page relevés : ${count}`)
  // « Le Dernier Bus » fait 7 pages : un trait au début des pages 2 à 7, aucun oublié.
  const numbers = Object.keys(pages).map((page) => parseInt(page, 10))
  check(
    count === 6 && numbers.every((page, index) => page === index + 2),
    'traits de page relevés : pages 2 à 7'
  )
  await app.evaluate(`${scroller}.scrollTop = 0`)
  await sleep(300)
  await app.screenshot('page-1.png')
  // Référence pour 16D : la même liste doit sortir sur Windows et sur Ubuntu.
  const reference = join(dirname(projectFile), 'traits-de-page.json')
  writeFileSync(reference, `${JSON.stringify(pages, null, 2)}\n`)
  log(`    référence écrite : ${reference}`)

  // 3. « Ajouter au dictionnaire » : le mot est retenu par la session, puis retiré (sur Mac, il passe
  // aussi dans le dictionnaire du système : on ne l'y laisse pas).
  const word = 'Zorglubesque'
  const added = await app.main.evaluate(`(async () => {
    const session = ${electron}.session.defaultSession
    const ok = session.addWordToSpellCheckerDictionary(${JSON.stringify(word)})
    await new Promise((resolve) => setTimeout(resolve, 500))
    const words = await session.listWordsInSpellCheckerDictionary()
    session.removeWordFromSpellCheckerDictionary(${JSON.stringify(word)})
    return { ok, listed: words.includes(${JSON.stringify(word)}) }
  })()`)
  check(added.ok && added.listed, 'Ajouter au dictionnaire : mot retenu')
}
