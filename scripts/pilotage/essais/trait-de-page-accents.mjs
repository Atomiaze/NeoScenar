// 18B-1 puis correction iMac : le trait de page ne traverse jamais l'accent d'une majuscule (É, È, À)
// en début de page. On mesure le haut réel des glyphes (canvas, sur la police affichée) et le bas des
// descentes de la ligne précédente : le trait doit être au-dessus de l'accent, au milieu de l'espace
// libre, ou passer derrière le texte (mode de fusion) s'il n'y a pas la place.

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

  // Pour chaque trait visible : ligne qui le suit, haut réel de l'encre, bas réel de la ligne précédente.
  const measure = `(() => {
    const canvas = document.createElement('canvas').getContext('2d')
    const lines = [...document.querySelectorAll('.cm-line')]
    const ink = (line) => {
      const cs = getComputedStyle(line)
      canvas.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily
      const text = line.textContent
      const m = canvas.measureText(text)
      return { ascent: text ? m.actualBoundingBoxAscent : 0, descent: text ? m.actualBoundingBoxDescent : 0,
        fa: m.fontBoundingBoxAscent, fd: m.fontBoundingBoxDescent }
    }
    return [...document.querySelectorAll('.fl-page-break')].map((b) => {
      const top = b.getBoundingClientRect().top
      const i = lines.findIndex((l) => l.getBoundingClientRect().bottom > top + parseFloat(getComputedStyle(l).lineHeight) / 2)
      if (i < 1) return null
      const line = lines[i], r = line.getBoundingClientRect()
      const rowH = parseFloat(getComputedStyle(line).lineHeight)
      const k = Math.max(0, Math.round((top - r.top) / rowH))
      const rowTop = r.top + k * rowH
      const cur = ink(line), prev = ink(lines[i - 1])
      const baseline = rowTop + (rowH - cur.fa - cur.fd) / 2 + cur.fa
      return { text: line.textContent.slice(0, 30), top, rowTop, rowH, k,
        inkTop: baseline - cur.ascent, prevBottom: baseline - rowH + prev.descent,
        blend: b.style.mixBlendMode, x: r.left, width: r.width,
        textLeft: (() => { const g = document.createRange(); g.selectNodeContents(line); return g.getBoundingClientRect().left })() }
    })
  })()`

  async function pass(label) {
    const seen = new Map()
    const height = await app.evaluate(`document.querySelector('.cm-scroller').scrollHeight`)
    let shots = 0
    const window_height = await app.evaluate('window.innerHeight')
    for (let y = 0; y < height; y += 200) {
      await app.evaluate(`document.querySelector('.cm-scroller').scrollTop = ${y}`)
      await sleep(250)
      for (const row of (await app.evaluate(measure)) ?? []) {
        if (!row) continue
        const visible = row.top > 80 && row.top < window_height - 80
        if (seen.has(row.text) && !(visible && !seen.get(row.text).shot)) continue
        seen.set(row.text, { ...row, shot: seen.get(row.text)?.shot ?? false })
        // Capture zoomée (x4) autour des traits qui précèdent une majuscule accentuée.
        if (/^[ÉÈÀÊ]/.test(row.text) && visible && !seen.get(row.text).shot && shots < 2) {
          shots++
          seen.get(row.text).shot = true
          // L'éditeur ajuste le défilement après avoir dessiné de nouvelles lignes : on remesure avant de capturer.
          await sleep(500)
          const fresh = ((await app.evaluate(measure)) ?? []).find((r) => r && r.text === row.text)
          if (!fresh) continue
          Object.assign(row, fresh)
          const safe = row.text.slice(0, 6).replace(/[^\p{L}\d]/gu, '')
          await app.screenshot(`trait-de-page-${label}-${safe}.png`, {
            x: Math.max(0, row.textLeft - 30),
            y: row.top - 24,
            width: 140,
            height: 48,
            scale: 4
          })
        }
      }
    }
    const rows = [...seen.values()]
    log(`    [${label}] traits mesurés : ${rows.length}`)
    check(rows.length >= 5, `[${label}] les traits de toutes les pages sont mesurés`)
    let accented = 0
    for (const row of rows) {
      const overshoot = Math.round((row.rowTop - row.inkTop) * 10) / 10
      const free = Math.round((row.inkTop - row.prevBottom) * 10) / 10
      log(
        `    « ${row.text} » : accent dépasse de ${overshoot}px, espace libre ${free}px, trait à ${Math.round((row.top - row.inkTop) * 10) / 10}px du haut des glyphes${row.blend ? ` (derrière : ${row.blend})` : ''}`
      )
      if (overshoot > 0.3) {
        accented++
        check(
          row.top < row.inkTop - 0.2,
          `[${label}] trait au-dessus de l'accent : « ${row.text} »`
        )
        if (free >= 1) {
          check(
            row.top > row.prevBottom - 0.2 &&
              Math.abs(row.top - (row.inkTop + row.prevBottom) / 2) < 1,
            `[${label}] trait au milieu de l'espace libre : « ${row.text} »`
          )
        } else {
          check(
            row.blend === 'darken' || row.blend === 'lighten',
            `[${label}] pas de place : trait derrière le texte : « ${row.text} »`
          )
        }
      } else {
        // Rien ne dépasse : le trait reste à la limite des deux rangées.
        check(
          Math.abs(row.top - row.rowTop) < 0.6,
          `[${label}] trait à la limite des rangées : « ${row.text} »`
        )
      }
    }
    check(
      accented >= 2,
      `[${label}] au moins deux pages commencent par une majuscule accentuée (${accented})`
    )
    await app.screenshot(`trait-de-page-${label}.png`)
  }

  async function setTheme(value) {
    await app.menu('NeoScenar', 'Réglages…')
    await sleep(500)
    await app.evaluate(`document.querySelector('input[name="theme"][value="${value}"]').click()`)
    await sleep(500)
    await app.evaluate(`document.querySelector('.dialog button')?.click()`)
    await app.dialogButton?.('Fermer').catch?.(() => {})
    await sleep(300)
  }

  await pass('defaut-normal')
  await setTheme('matrix')
  await pass('matrix-normal')
  for (let i = 0; i < 15; i++) await app.menu('Présentation', 'Agrandir')
  await sleep(800)
  log(
    `    taille du texte : ${await app.evaluate(`getComputedStyle(document.querySelector('.cm-line')).fontSize`)}`
  )
  await pass('matrix-grand')
  await setTheme('defaut')
  await pass('defaut-grand')

  // Retour aux réglages d'avant.
  await app.menu('Présentation', 'Taille réelle')
  await sleep(300)
  const back = await app.evaluate(
    `document.documentElement.dataset.theme + ' ' + getComputedStyle(document.querySelector('.cm-line')).fontSize`
  )
  log(`    après remise : ${back}`)
  check(back.startsWith('defaut'), 'thème remis sur « Par défaut »')
}
