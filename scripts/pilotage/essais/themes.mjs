// Étape 14A : les sept thèmes. Choix dans « Réglages… » (immédiat), variables CSS posées sur <html>,
// nativeTheme, fond de la page et de la fenêtre, cartes qui gardent leurs couleurs, modules sans
// couleur oubliée (captures).

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

const electron = `process.mainModule.require('electron')`

// Valeurs attendues (src/shared/themes/themes.ts) : fond, texte, ton.
const THEMES = [
  ['cobalt', '#0f1b33', '#eaf0ff', 'dark'],
  ['or', '#17130c', '#f2e8d0', 'dark'],
  ['matrix', '#000000', '#4dff7a', 'dark'],
  ['pinklady', '#fdf1f5', '#3a1f2b', 'light'],
  ['forest', '#12201a', '#e6f0e8', 'dark'],
  ['aqua', '#f0f8fa', '#12313a', 'light']
]

const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  // Deux cartes colorées (palette des cartes) : leurs couleurs ne doivent jamais suivre le thème.
  const file = join(dirname(projectFile), 'neoscenar', 'decoupage.json')
  const decoupage = JSON.parse(readFileSync(file, 'utf8'))
  decoupage.scenes[0].color = '#ffd6d6'
  decoupage.scenes[1].shots[0].color = '#d6e4ff'
  writeFileSync(file, JSON.stringify(decoupage, null, 2))
  await app.openProject(projectFile)
  await app.module('Cartes')
  await sleep(600)

  const state = () =>
    app.evaluate(`(() => {
      const root = document.documentElement
      const style = getComputedStyle(root)
      return {
        theme: root.dataset.theme,
        background: style.getPropertyValue('--background').trim(),
        text: style.getPropertyValue('--text').trim(),
        bodyBackground: style.backgroundColor,
        scheme: root.style.colorScheme
      }
    })()`)
  const native = () =>
    app.main.evaluate(`(() => {
      const { nativeTheme, BrowserWindow } = ${electron}
      return { source: nativeTheme.themeSource, window: BrowserWindow.getAllWindows()[0].getBackgroundColor() }
    })()`)
  const cardColors = () =>
    app.evaluate(`[...document.querySelectorAll('.card.colored')].slice(0, 6)
      .map((c) => getComputedStyle(c).backgroundColor).join('|')`)

  // 1. Au départ : « Par défaut » (suit le Mac).
  let s = await state()
  check(s.theme === 'defaut', 'au départ : thème « Par défaut »')
  check(
    s.background === '#f6f5f2' || s.background === '#1d1f23',
    'Par défaut : clair ou sombre actuel'
  )
  check((await native()).source === 'system', 'Par défaut : nativeTheme suit le Mac')
  await app.screenshot('theme-defaut-cartes.png')
  const defaultCards = await cardColors()
  check(defaultCards.length > 0, 'des cartes colorées sont visibles pour la comparaison')

  // 2. Réglages : sept choix, anciens libellés disparus, appliqué tout de suite par la case.
  await app.menu('NeoScenar', 'Réglages…')
  await sleep(500)
  const labels = await app.evaluate(
    `[...document.querySelectorAll('input[name="theme"]')].map((i) => i.parentElement.textContent.trim())`
  )
  log('  choix :', labels.join(' | '))
  check(
    labels.length === 7 && labels[0].startsWith('Par défaut'),
    'Réglages : sept thèmes, « Par défaut » en tête'
  )
  check(
    !labels.some((l) => /Automatique|Clair|Sombre/.test(l)),
    "Réglages : plus d'Automatique / Clair / Sombre"
  )
  await app.evaluate(`document.querySelector('input[name="theme"][value="matrix"]').click()`)
  await sleep(500)
  s = await state()
  check(
    s.theme === 'matrix' && s.background === '#000000',
    'case « Matrix » : appliqué tout de suite, sans redémarrage'
  )
  await app.screenshot('theme-reglages-matrix.png')
  await app.click('.dialog button.primary')
  await sleep(300)

  // 3. Chaque thème : variables, nativeTheme, fond de fenêtre, cartes inchangées, captures.
  for (const [id, background, text, tone] of THEMES) {
    await app.evaluate(`window.neoscenar.setTheme(${JSON.stringify(id)})`)
    await sleep(500)
    s = await state()
    const n = await native()
    check(
      s.theme === id && s.background === background && s.text === text,
      `${id} : variables CSS posées`
    )
    check(s.bodyBackground === rgb(background), `${id} : fond de la page`)
    check(n.source === tone, `${id} : nativeTheme.themeSource = ${tone}`)
    check(n.window.toLowerCase() === background, `${id} : fond de la fenêtre ${n.window}`)
    check(
      s.scheme === (tone === 'dark' ? 'dark' : 'light'),
      `${id} : barres de défilement (${s.scheme})`
    )
    check((await cardColors()) === defaultCards, `${id} : les couleurs des cartes ne changent pas`)
    for (const [module, file] of [
      ['Cartes', 'cartes'],
      ['Scénario', 'scenario'],
      ['Statistiques', 'stats'],
      ['Recherches', 'recherches']
    ]) {
      await app.module(module)
      await sleep(700)
      await app.screenshot(`theme-${id}-${file}.png`)
    }
    await app.module('Cartes')
  }

  // 4. Le choix est mémorisé dans les préférences.
  const saved = await app.evaluate(`window.neoscenar.getTheme()`)
  check(saved === 'aqua', 'le dernier thème choisi est mémorisé (aqua)')
  await app.evaluate(`window.neoscenar.setTheme('defaut')`)
  await sleep(400)
  s = await state()
  check(s.theme === 'defaut', 'retour à « Par défaut »')
}
