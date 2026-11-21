// Étape 17B : retrait des éléments sous les titres de rubrique, rubrique active en couleur d'accent.

import { dirname, join } from 'node:path'
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { sleep } from '../application.mjs'

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const docs = join(dirname(projectFile), 'neoscenar', 'documents')
  mkdirSync(join(docs, 'Repérages'), { recursive: true })
  writeFileSync(join(docs, 'Repérages', 'Idées.md'), 'x')
  writeFileSync(join(docs, 'Note racine.md'), 'x')

  // Un personnage au nom très long (cue de dialogue), pour vérifier la coupure des lignes.
  const longName = 'MADAME ÉLISABETH-CHARLOTTE DE VILLENEUVE-SAINT-GEORGES-LE-GRAND'
  appendFileSync(
    join(dirname(projectFile), 'neoscenar', 'scenario.fountain'),
    `\n${longName}\nBonjour.\n`
  )
  await app.openProject(projectFile)
  await app.module('Données du projet')
  await sleep(800)

  const measure = () =>
    app.evaluate(`(() => {
      const left = (el) => el?.getBoundingClientRect().left ?? null
      const titles = [...document.querySelectorAll('.research-branch-title')]
      const textStart = (title) => {
        const range = document.createRange()
        const node = [...title.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim())
        range.selectNodeContents(node)
        return range.getBoundingClientRect().left
      }
      const branches = [...document.querySelectorAll('.research-branch')]
      const out = {}
      ;['personnages', 'lieux', 'documents'].forEach((name, i) => {
        const b = branches[i]
        const title = textStart(b.querySelector('.research-branch-title'))
        const dot = b.querySelector('.sheet-dot')
        const name_ = b.querySelector('.doc-chevron') ?? b.querySelector('.sheet-row-name')
        out[name] = { title, first: dot ? left(dot) : left(name_), count: b.querySelectorAll('.sheet-row').length }
      })
      return out
    })()`)
  const m = await measure()
  log(JSON.stringify(m))
  for (const [name, v] of Object.entries(m)) {
    if (v.count === 0) continue
    const gap = v.first - v.title
    check(gap >= 26 && gap <= 34, `${name} : retrait de ${Math.round(gap)} px sous le titre`)
  }
  // Personnage au nom long : pastille en retrait, le nom passe à la ligne sans dépasser le panneau.
  const long = await app.evaluate(`(() => {
    const tree = document.querySelector('.research-tree').getBoundingClientRect()
    const row = document.querySelector('.research-branch .sheet-dot')?.closest('.sheet-row')
    if (!row) return null
    const name = row.querySelector('.sheet-row-name').getBoundingClientRect()
    return { dotLeft: row.querySelector('.sheet-dot').getBoundingClientRect().left, nameRight: name.right, nameHeight: name.height, treeRight: tree.right, scroll: document.querySelector('.research-tree').scrollWidth > document.querySelector('.research-tree').clientWidth }
  })()`)
  log('personnage long :', JSON.stringify(long))
  check(long !== null, 'fiche du personnage au nom long présente')
  if (long) {
    check(long.nameRight <= long.treeRight, 'nom long : ne dépasse pas le panneau')
    check(long.nameHeight > 30, 'nom long : passe sur plusieurs lignes')
    check(!long.scroll, 'nom long : pas de défilement horizontal')
    check(
      Math.abs(long.dotLeft - m.personnages.title - 30) <= 4,
      `pastille en retrait de ${Math.round(long.dotLeft - m.personnages.title)} px`
    )
  }
  const empty = await app.evaluate(`(() => {
    const e = document.querySelector('.sheet-list-empty')
    return e ? e.getBoundingClientRect().left - e.closest('.research-branch').getBoundingClientRect().left : null
  })()`)
  log('message vide, décalage :', empty)

  const luminance = (css) => {
    const [r, g, b] = css
      .match(/\d+/g)
      .slice(0, 3)
      .map((v) => {
        const c = Number(v) / 255
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
      })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const ratio = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }
  for (const theme of ['defaut', 'cobalt', 'or', 'matrix', 'pinklady', 'forest', 'aqua']) {
    await app.evaluate(`window.neoscenar.setTheme(${JSON.stringify(theme)})`)
    await sleep(400)
    await app.evaluate(`document.querySelectorAll('.research-branch-title')[1].click()`)
    await sleep(300)
    const colors = await app.evaluate(`(() => {
      const t = document.querySelector('.research-branch-title.active')
      return { title: getComputedStyle(t).color, accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(), deco: getComputedStyle(t).textDecorationLine, panel: getComputedStyle(document.querySelector('.research-tree')).backgroundColor }
    })()`)
    log(theme, JSON.stringify(colors))
    check(colors.deco === 'underline', `${theme} : rubrique active soulignée`)
    const contrast = ratio(colors.title, colors.panel)
    log(`  ${theme} : contraste ${contrast.toFixed(2)}`)
    check(
      contrast >= 4.5,
      `${theme} : contraste de la rubrique active ${contrast.toFixed(2)} (≥ 4,5)`
    )
    await app.screenshot(`donnees-retrait-${theme}.png`)
  }
}
