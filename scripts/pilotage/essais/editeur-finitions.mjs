// Étape 13A : ligne en cours surlignée (réglable), trait de page entre les lignes, sans toucher au texte.

import { copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

const ROOT = join(import.meta.dirname, '..', '..', '..')

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  // « Le Dernier Bus » : 7 pages, des majuscules accentuées (É, À) en début de ligne et de page.
  copyFileSync(
    join(ROOT, 'packages', 'fountain', 'tests', 'exemples', 'le-dernier-bus.fountain'),
    join(dirname(projectFile), 'neoscenar', 'scenario.fountain')
  )
  await app.openProject(projectFile)
  await app.module('Scénario')
  await sleep(1500)

  // 1. Ligne en cours : un fond sur la ligne du curseur, par défaut.
  const active = `(() => {
    const line = document.querySelector('.cm-activeLine')
    return line ? getComputedStyle(line).backgroundColor : null
  })()`
  const on = await app.evaluate(active)
  log(`    fond de la ligne en cours : ${on}`)
  check(on !== null && on !== 'rgba(0, 0, 0, 0)', 'la ligne du curseur est surlignée par défaut')
  await app.screenshot('ligne-en-cours.png')

  // La case de « Réglages… » est cochée, puis décochée : le fond disparaît tout de suite.
  await app.menu('NeoScenar', 'Réglages…')
  await sleep(500)
  const box = `document.querySelector('.dialog input[type=checkbox]')`
  check(
    (await app.evaluate(`${box}?.checked`)) === true,
    'Réglages : case « Surligner la ligne » cochée'
  )
  await app.evaluate(`${box}.click()`)
  await sleep(300)
  check(
    (await app.evaluate(`!document.querySelector('.highlight-line')`)) === true,
    'case décochée : classe retirée'
  )
  check(
    (await app.evaluate(`window.neoscenar.getHighlightActiveLine()`)) === false,
    'préférence mémorisée'
  )
  await app.screenshot('reglages.png')
  await app.evaluate(`${box}.click()`)
  await sleep(300)
  await app.dialogButton('Fermer')

  // Réglage décoché : plus de fond. Rouvert : la case reflète la préférence.
  await app.evaluate(`window.neoscenar.setHighlightActiveLine(false)`)
  await app.evaluate(
    `document.querySelector('.script-editor-host').classList.remove('highlight-line')`
  )
  const off = await app.evaluate(active)
  check(off !== on, `sans le réglage, le fond change (${off})`)
  await app.evaluate(`window.neoscenar.setHighlightActiveLine(true)`)
  check(
    (await app.evaluate(`window.neoscenar.getHighlightActiveLine()`)) === true,
    'préférence relue'
  )

  // 2. Trait de page : à la limite haute de la ligne qui ouvre la page (écart en pixels).
  const seen = new Map()
  for (let y = 0; y < 60000; y += 500) {
    await app.evaluate(`document.querySelector('.cm-scroller').scrollTop = ${y}`)
    await sleep(120)
    const found = await app.evaluate(`(() => {
      const rows = [...document.querySelectorAll('.cm-line')].map((line) => {
        const r = line.getBoundingClientRect()
        return { top: r.top, bottom: r.bottom, text: line.textContent, heading: line.className.includes('scene_heading') }
      })
      return [...document.querySelectorAll('.fl-page-break')].map((b) => {
        const top = b.getBoundingClientRect().top
        const below = rows.filter((r) => r.bottom > top + 1).sort((a, b2) => a.top - b2.top)[0]
        return { page: b.textContent, d: below ? Math.round((top - below.top) * 10) / 10 : null,
                 text: (below?.text ?? '').slice(0, 24), heading: below?.heading }
      })
    })()`)
    for (const g of found) seen.set(g.page, g)
  }
  const list = [...seen.values()]
  check(list.length > 0, `${list.length} traits de page relevés`)
  const crooked = list.filter((g) => !g.heading && Math.abs(g.d) > 0.5)
  check(crooked.length === 0, 'chaque trait est exactement à la limite haute de sa ligne')
  for (const g of list)
    log(`    page ${g.page} écart ${g.d} ${g.heading ? '[en-tête]' : ''} « ${g.text} »`)
  await app.screenshot('trait-de-page.png')
}
