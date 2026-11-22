// 18B-1 : le trait de page ne traverse jamais l'accent d'une majuscule (É, À) en début de page.

import { copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

const ROOT = join(import.meta.dirname, '..', '..', '..')

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  copyFileSync(
    join(ROOT, 'packages', 'fountain', 'tests', 'exemples', 'le-dernier-bus.fountain'),
    join(dirname(projectFile), 'neoscenar', 'scenario.fountain')
  )
  await app.openProject(projectFile)
  await app.module('Scénario')
  await sleep(1500)

  // Pour chaque trait : la ligne d'affichage qui le suit, et l'écart entre le trait et le haut de cette ligne.
  const measure = `(() => {
    const lines = [...document.querySelectorAll('.cm-line')]
    return [...document.querySelectorAll('.fl-page-break')].map((b) => {
      const top = b.getBoundingClientRect().top
      const next = lines.map((l) => ({ t: l.textContent, r: l.getBoundingClientRect() }))
        .filter((l) => l.r.bottom > top + 1).sort((a, b) => a.r.top - b.r.top)[0]
      return next ? { text: next.t.slice(0, 30), gap: Math.round((top - next.r.top) * 10) / 10, rowH: Math.min(...lines.map((l) => l.getBoundingClientRect().height)) } : null
    })
  })()`
  async function pass(label) {
    const seen = new Map()
    const height = await app.evaluate(`document.querySelector('.cm-scroller').scrollHeight`)
    for (let y = 0; y < height; y += 300) {
      await app.evaluate(`document.querySelector('.cm-scroller').scrollTop = ${y}`)
      await sleep(250)
      for (const row of (await app.evaluate(measure)) ?? []) if (row) seen.set(row.text, row)
    }
    const rows = [...seen.values()]
    log(`    [${label}] traits mesurés : ${rows.length}`)
    check(rows.length >= 5, `[${label}] les traits de toutes les pages sont mesurés`)
    for (const row of rows) {
      log(`    « ${row.text} » : écart ${row.gap}px (rangée ${row.rowH}px)`)
      // Un écart d'un nombre entier de rangées est permis : en-tête de scène dont la 1re rangée est un blanc.
      check(
        Math.abs(row.gap / row.rowH - Math.round(row.gap / row.rowH)) < 0.05,
        `[${label}] trait entre deux rangées, hors des glyphes : « ${row.text} »`
      )
    }
    await app.screenshot(`trait-de-page-${label}.png`)
  }

  await pass('defaut')

  // Matrix + plus grande taille de texte.
  await app.menu('NeoScenar', 'Réglages…')
  await sleep(500)
  await app.evaluate(`document.querySelector('input[name="theme"][value="matrix"]').click()`)
  await sleep(500)
  await app.evaluate(`document.querySelector('.dialog button')?.click()`)
  await app.dialogButton?.('Fermer').catch?.(() => {})
  await sleep(300)
  for (let i = 0; i < 15; i++) await app.menu('Présentation', 'Agrandir')
  await sleep(800)
  log(
    `    taille du texte : ${await app.evaluate(`getComputedStyle(document.querySelector('.cm-line')).fontSize`)}`
  )
  await pass('matrix-grand')

  // Retour aux réglages d'avant.
  await app.menu('Présentation', 'Taille réelle')
  await app.menu('NeoScenar', 'Réglages…')
  await sleep(500)
  await app.evaluate(`document.querySelector('input[name="theme"][value="defaut"]').click()`)
  await sleep(500)
  const back = await app.evaluate(
    `document.documentElement.dataset.theme + ' ' + getComputedStyle(document.querySelector('.cm-line')).fontSize`
  )
  log(`    après remise : ${back}`)
  check(back.startsWith('defaut'), 'thème remis sur « Par défaut »')
}
