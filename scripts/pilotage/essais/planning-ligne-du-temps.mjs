// Étape 15C : ligne du temps. Affichage, « Aujourd'hui » au quart, zoom, glisser (déplacer, étirer,
// losange, poignée gauche, création), Cmd + Z de chaque geste, clic et double-clic, règle début ≤ échéance.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { closeLinkBanner, sleep } from '../application.mjs'

const DAY = 86_400_000
const iso = (offset) => new Date(Date.now() + offset * DAY).toISOString().slice(0, 10)
// La date locale compte (le module la lit en local) : même calcul que l'application.
const local = (offset) => {
  const d = new Date(Date.now() + offset * DAY)
  const two = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`
}

export default async function ({ app, check, newProject }) {
  void iso
  const projectFile = newProject()
  const data = join(dirname(projectFile), 'neoscenar')
  mkdirSync(data, { recursive: true })
  const planningFile = join(data, 'planning.json')
  const names = ['Écriture', 'Préproduction', 'Tournage', 'Postproduction', 'Diffusion']
  const colors = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5']
  const task = (id, phase, titre, debut, echeance, extra = {}) => ({
    id,
    phase,
    titre,
    debut,
    echeance,
    faite: false,
    personnes: [],
    validee: false,
    note: '',
    ...extra
  })
  writeFileSync(
    planningFile,
    JSON.stringify({
      version: 1,
      phases: names.map((nom, i) => ({ id: `ph${i}`, nom, couleur: colors[i], ordre: i + 1 })),
      taches: [
        task('t1', 'ph0', 'Écrire', local(-10), local(5)),
        task('t2', 'ph1', 'Casting', null, local(20)),
        task('t3', 'ph0', 'Rendre le scénario', null, local(-3)),
        task('t5', 'ph4', 'Livrable final', null, local(40), { faite: true, validee: true }),
        task('t4', 'ph3', 'Sans date', null, null)
      ],
      tournage: {}
    })
  )
  const disk = () => JSON.parse(readFileSync(planningFile, 'utf8'))
  const diskTask = (id) => disk().taches.find((item) => item.id === id)
  const dayOf = (isoDate) => Math.round(Date.parse(isoDate + 'T00:00:00Z') / DAY)
  const shift = (a, b) => dayOf(b) - dayOf(a)

  const box = (selector) =>
    app.evaluate(`(() => {
      const e = document.querySelector(${JSON.stringify(selector)})
      if (!e) return null
      const r = e.getBoundingClientRect()
      return { x: r.left, y: r.top, w: r.width, h: r.height }
    })()`)
  const undo = async () => {
    await app.evaluate(`document.activeElement?.blur?.()`)
    const labels = await app.menuLabels('Édition')
    const entry = labels.find((label) => label.startsWith('Annuler'))
    return app.menu('Édition', entry.replace(' (désactivé)', ''))
  }
  const pxPerDay = () =>
    app.evaluate(`(() => {
      const ticks = [...document.querySelectorAll('.timeline-header .timeline-major')]
      return ticks.length
    })()`)
  void pxPerDay
  const MARK = (title) => `.timeline-task[data-task="${title}"] .timeline-mark`
  const HANDLE = (title, mode) => `.timeline-task[data-task="${title}"] [data-mode="${mode}"]`
  // Un jour au zoom « Mois » = 14 pixels.
  const DAYPX = 14

  await app.openProject(projectFile)
  await app.module('Planification')
  await sleep(900)
  // Le bandeau « nouvelles fiches » (10C) se ferme seul après 10 s et fait alors remonter toute la
  // vue de sa hauteur : s'il se fermait entre la mesure d'une barre et le clic, le clic tomberait à
  // côté (essai qui échouait au hasard). On le ferme avant de mesurer quoi que ce soit.
  check(await closeLinkBanner(app), 'le bandeau des fiches est fermé avant les gestes')
  await app.click('[data-view="timeline"]')
  await sleep(600)

  // 1. Affichage
  check((await box('[data-planning="timeline"]')) !== null, 'la ligne du temps s’affiche')
  check(
    (await app.evaluate(
      `document.querySelectorAll('.timeline-row:not(.timeline-shooting-row)').length`
    )) === 5,
    'une rangée par phase (plus la rangée « Jours de tournage », étape 15D)'
  )
  check(
    (await app.evaluate(
      `document.querySelector('.timeline-task[data-task="Écrire"]').dataset.kind`
    )) === 'bar',
    'début + échéance = barre'
  )
  check(
    (await app.evaluate(
      `document.querySelector('.timeline-task[data-task="Casting"]').dataset.kind`
    )) === 'diamond',
    'échéance seule = losange'
  )
  check(
    (await app.evaluate(
      `document.querySelector('.timeline-task[data-task="Livrable final"]').classList.contains('validated')`
    )) === true &&
      (
        await app.evaluate(
          `document.querySelector('.timeline-task[data-task="Livrable final"] .timeline-title').textContent`
        )
      ).startsWith('✓'),
    'une tâche validée a une coche discrète'
  )
  const cyan = await app.evaluate(`(() => {
    const task = document.querySelector('.timeline-task[data-task="Livrable final"]')
    return [
      getComputedStyle(task.querySelector('.timeline-mark')).stroke,
      getComputedStyle(task.querySelector('.timeline-check')).fill,
      getComputedStyle(task).opacity
    ]
  })()`)
  check(
    cyan[0] === 'rgb(0, 255, 255)' && cyan[1] === 'rgb(0, 255, 255)' && cyan[2] === '1',
    `liseret et coche en cyan 0,255,255, sans transparence (${cyan.join(' | ')})`
  )
  const header = await app.evaluate(`(() => ({
    years: [...document.querySelectorAll('.timeline-years .timeline-segment-label')].map((n) => n.textContent),
    months: [...document.querySelectorAll('.timeline-months .timeline-segment-label')].map((n) => n.textContent),
    days: document.querySelectorAll('.timeline-header .timeline-day').length
  }))()`)
  check(
    header.years.includes(String(new Date().getFullYear())) && /^\d{4}$/.test(header.years[0]),
    `l’en-tête a une ligne pour les années (${header.years.join(', ')})`
  )
  check(header.months.includes('nov.') || header.months.length > 3, 'une ligne pour les mois')
  check(header.days > 3, 'une ligne pour les jours (les lundis au zoom Mois)')
  check(
    (await app.evaluate(
      `document.querySelector('.timeline-task[data-task="Livrable final"]').dataset.state`
    )) === 'faite',
    'une tâche validée n’est jamais en retard'
  )
  check(
    (await app.evaluate(
      `document.querySelector('.timeline-task[data-task="Rendre le scénario"]').dataset.state`
    )) === 'en-retard',
    'une tâche en retard est marquée en retard'
  )
  check(
    (await app.evaluate(`document.body.textContent.includes('1 tâche sans date')`)) === true,
    'les tâches sans date sont comptées'
  )
  // « Aujourd'hui » au quart de la largeur visible
  const wrap = await box('.timeline')
  const badge = await box('.timeline-today-badge rect')
  const labelW = 150
  const ratio = (badge.x + badge.w / 2 - wrap.x - labelW) / (wrap.w - labelW)
  check(
    ratio > 0.2 && ratio < 0.3,
    `« Aujourd’hui » vers le quart de la largeur (${ratio.toFixed(2)})`
  )
  await app.screenshot('planning-gantt-1-mois.png')

  // Liseret et coche « validée » : couleur du thème (turquoise foncé en clair, cyan vif en sombre).
  const validatedColors = () =>
    app.evaluate(`(() => {
      const task = document.querySelector('.timeline-task[data-task="Livrable final"]')
      const probe = document.createElement('i')
      probe.style.color = 'var(--validee)'
      document.body.append(probe)
      const variable = getComputedStyle(probe).color
      probe.remove()
      return {
        variable,
        stroke: getComputedStyle(task.querySelector('.timeline-mark')).stroke,
        check: getComputedStyle(task.querySelector('.timeline-check')).fill
      }
    })()`)
  for (const [id, expected] of [
    ['aqua', 'rgb(0, 117, 127)'],
    ['pinklady', 'rgb(0, 117, 127)'],
    ['matrix', 'rgb(0, 255, 255)'],
    ['cobalt', 'rgb(0, 255, 255)']
  ]) {
    await app.evaluate(`window.neoscenar.setTheme(${JSON.stringify(id)})`)
    await sleep(700)
    const c = await validatedColors()
    check(
      c.variable === expected && c.stroke === expected && c.check === expected,
      `thème ${id} : liseret et coche en ${expected} (${c.stroke} | ${c.check})`
    )
    await app.screenshot(`planning-gantt-theme-${id}.png`)
  }
  await app.evaluate(`window.neoscenar.setTheme('defaut')`)
  await sleep(700)

  // 2. Déplacer une barre de 3 jours
  let bar = await box(MARK('Écrire'))
  const before = diskTask('t1')
  await app.mouseDrag(
    { x: bar.x + bar.w / 2, y: bar.y + bar.h / 2 },
    { x: bar.x + bar.w / 2 + 3 * DAYPX, y: bar.y + bar.h / 2 }
  )
  await sleep(1000)
  let after = diskTask('t1')
  check(
    shift(before.debut, after.debut) === 3 && shift(before.echeance, after.echeance) === 3,
    'glisser une barre déplace début et échéance ensemble'
  )

  // 3. Étirer le bord droit de 2 jours
  bar = await box(HANDLE('Écrire', 'resize-end'))
  const beforeEnd = diskTask('t1')
  await app.mouseDrag(
    { x: bar.x + bar.w / 2, y: bar.y + bar.h / 2 },
    { x: bar.x + bar.w / 2 + 2 * DAYPX, y: bar.y + bar.h / 2 }
  )
  await sleep(1000)
  after = diskTask('t1')
  check(
    shift(beforeEnd.echeance, after.echeance) === 2 && after.debut === beforeEnd.debut,
    'le bord droit change l’échéance'
  )

  // 4. Bord gauche tiré très loin à droite : s'arrête à l'échéance
  bar = await box(HANDLE('Écrire', 'resize-start'))
  await app.mouseDrag(
    { x: bar.x + bar.w / 2, y: bar.y + bar.h / 2 },
    { x: bar.x + bar.w / 2 + 25 * DAYPX, y: bar.y + bar.h / 2 }
  )
  await sleep(1000)
  after = diskTask('t1')
  check(after.debut === after.echeance, 'le début s’arrête à la date limite')

  // 5. Losange : déplacer, puis poignée gauche = début ajouté
  let diamond = await box(MARK('Casting'))
  const dBefore = diskTask('t2')
  await app.mouseDrag(
    { x: diamond.x + diamond.w / 2, y: diamond.y + diamond.h / 2 },
    { x: diamond.x + diamond.w / 2 + 5 * DAYPX, y: diamond.y + diamond.h / 2 }
  )
  await sleep(1000)
  const dMoved = diskTask('t2')
  check(
    shift(dBefore.echeance, dMoved.echeance) === 5 && dMoved.debut === null,
    'glisser un losange change l’échéance'
  )
  const handle = await box(HANDLE('Casting', 'diamond-to-bar'))
  await app.mouseDrag(
    { x: handle.x + handle.w / 2, y: handle.y + handle.h / 2 },
    { x: handle.x + handle.w / 2 - 4 * DAYPX, y: handle.y + handle.h / 2 }
  )
  await sleep(1000)
  const dBar = diskTask('t2')
  check(
    dBar.debut !== null && dBar.echeance === dMoved.echeance && dBar.debut < dBar.echeance,
    'la poignée gauche du losange ajoute un début'
  )
  check(
    (await app.evaluate(
      `document.querySelector('.timeline-task[data-task="Casting"]').dataset.kind`
    )) === 'bar',
    'le losange est devenu une barre'
  )

  // 6. Cmd + Z défait chaque geste, dans l'ordre inverse
  await undo()
  await sleep(900)
  check(diskTask('t2').debut === null, 'Cmd + Z : le début ajouté disparaît')
  await undo()
  await sleep(900)
  check(diskTask('t2').echeance === dBefore.echeance, 'Cmd + Z : le losange revient')

  // 7. Créer en glissant dans une rangée vide (phase Tournage)
  const countBefore = disk().taches.length
  const row = await box('.timeline-row[data-phase="Tournage"] svg')
  await app.mouseDrag(
    { x: row.x + 500, y: row.y + 20 },
    { x: row.x + 500 + 6 * DAYPX, y: row.y + 20 }
  )
  await sleep(1100)
  const created = disk().taches.find((item) => item.phase === 'ph2')
  check(
    disk().taches.length === countBefore + 1 && created,
    'glisser dans une rangée vide crée une tâche dans cette phase'
  )
  check(
    created &&
      created.debut !== null &&
      created.echeance !== null &&
      shift(created.debut, created.echeance) >= 5,
    'la tâche créée porte les dates glissées'
  )
  check((await box('.planning-panel')) !== null, 'le panneau de la tâche créée s’ouvre')
  await app.screenshot('planning-gantt-2-creation.png')
  await app.click('.planning-panel-head button')
  await sleep(900)
  await undo()
  await sleep(900)
  check(disk().taches.length === countBefore, 'Cmd + Z retire la tâche créée')

  // 8. Clic = panneau ; double-clic = dates au clavier
  bar = await box(MARK('Rendre le scénario'))
  await app.mouseDrag(
    { x: bar.x + bar.w / 2, y: bar.y + bar.h / 2 },
    { x: bar.x + bar.w / 2, y: bar.y + bar.h / 2 },
    1
  )
  await sleep(400)
  check(
    (await app.evaluate(
      `document.querySelector('.planning-panel .field input[type="text"]')?.value`
    )) === 'Rendre le scénario',
    'un clic ouvre le panneau de la tâche'
  )
  await app.click('.planning-panel-head button')
  await sleep(900)
  await app.evaluate(
    `document.querySelector('.timeline-task[data-task="Casting"]').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))`
  )
  await sleep(1000)
  check(
    (await app.evaluate(`document.activeElement?.type === 'date'`)) === true,
    'un double-clic met le curseur dans une date du panneau'
  )

  // 9. Début saisi après l'échéance : l'échéance prend la date du début, avec un message
  const dueNow = diskTask('t2').echeance
  const later = local(400)
  await app.evaluate(`(() => {
    const field = document.querySelectorAll('.planning-panel input[type="date"]')[0]
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(field, ${JSON.stringify(later)})
    field.dispatchEvent(new Event('input', { bubbles: true }))
  })()`)
  await sleep(1000)
  const fixed = diskTask('t2')
  check(
    fixed.debut === later && fixed.echeance === later && fixed.echeance !== dueNow,
    'début après échéance : l’échéance prend la date du début'
  )
  check(
    (
      await app.evaluate(`document.querySelector('.banner[role="status"]')?.textContent ?? ''`)
    ).includes('L’échéance'),
    'un court message l’explique'
  )
  await app.click('.planning-panel-head button')
  await sleep(900)

  // 9b. Gestes de vue : zoom à la molette, pincement, défilement, clic molette. Aucun ne touche une tâche.
  const ppd = async () =>
    Number(await app.evaluate(`document.querySelector('.timeline').dataset.pixelsPerDay`))
  const scrollLeft = () => app.evaluate(`document.querySelector('.timeline').scrollLeft`)
  const tasksOnDisk = () => JSON.stringify(disk().taches)
  const snapshot = tasksOnDisk()
  const frame = await box('.timeline')
  const todayLine = () => box('.timeline-row .timeline-today')
  const line = await todayLine()
  const at = { x: line.x + 1, y: frame.y + 300 }
  check((await ppd()) === 14, 'zoom de départ : Mois')
  await app.mouseWheel(at, { deltaY: -100 })
  await sleep(500)
  const zoomedIn = await ppd()
  const lineAfter = await todayLine()
  check(zoomedIn > 14, `molette : zoom avant (${zoomedIn.toFixed(1)} px/jour)`)
  check(
    Math.abs(lineAfter.x - line.x) <= 3,
    'zoom centré sur le pointeur : le jour sous la souris reste en place'
  )
  check(
    (await app.evaluate(`document.querySelector('[data-zoom]').value`)) === 'custom',
    'le menu affiche « Personnalisé »'
  )
  await app.mouseWheel(at, { deltaY: 20, modifiers: 2 })
  await sleep(500)
  check((await ppd()) < zoomedIn, 'pincement (Ctrl + molette) : zoom arrière')
  for (let i = 0; i < 40; i++) await app.mouseWheel(at, { deltaY: 300 })
  await sleep(600)
  check((await ppd()) === 1.5, `limite arrière : environ deux ans (${await ppd()})`)
  for (let i = 0; i < 80; i++) await app.mouseWheel(at, { deltaY: -300 })
  await sleep(800)
  check((await ppd()) === 200, `limite avant : quelques jours (${await ppd()})`)
  await app.screenshot('planning-gantt-5-zoom-libre.png')
  await app.evaluate(`(() => {
    const select = document.querySelector('[data-zoom]')
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, 'month')
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })()`)
  await sleep(700)
  check((await ppd()) === 14, 'le préréglage Mois remet l’échelle')
  await app.evaluate(`document.querySelector('.timeline').scrollLeft = 400`)
  await sleep(200)
  const scrollBefore = await scrollLeft()
  await app.mouseWheel(at, { deltaY: 120, modifiers: 8 })
  await sleep(300)
  const afterShift = await scrollLeft()
  check(afterShift > scrollBefore && (await ppd()) === 14, 'Maj + molette fait défiler sans zoomer')
  await app.mouseWheel(at, { deltaX: 80, deltaY: 0 })
  await sleep(300)
  check((await scrollLeft()) > afterShift, 'glissé horizontal à deux doigts : défilement')
  await app.evaluate(`document.querySelector('.timeline').scrollLeft = 0`)
  await sleep(300)
  // Le clic molette part d'un losange : il ne doit pas le déplacer.
  const bar2 = await box(MARK('Rendre le scénario'))
  const scrolled = await scrollLeft()
  await app.mouseDrag(
    { x: bar2.x + bar2.w / 2, y: bar2.y + bar2.h / 2 },
    { x: bar2.x + bar2.w / 2 - 120, y: bar2.y + bar2.h / 2 + 10 },
    8,
    'middle'
  )
  await sleep(300)
  check((await scrollLeft()) > scrolled + 80, 'clic molette glissé : la vue se déplace')
  await sleep(1000)
  check(tasksOnDisk() === snapshot, 'aucun de ces gestes ne modifie une tâche')

  // Le nom de l'année reste visible pendant le défilement (collé au bord gauche).
  await app.evaluate(`document.querySelector('.timeline').scrollLeft = 300`)
  await sleep(300)
  const yearBox = await box('.timeline-years .timeline-segment-label')
  const frameNow = await box('.timeline')
  check(
    yearBox !== null && yearBox.x >= frameNow.x + 150 - 1 && yearBox.x < frameNow.x + 400,
    'le nom de l’année reste collé au bord gauche en défilant'
  )
  await app.evaluate(`document.querySelector('.timeline').scrollLeft = 0`)
  // 10. Zoom : année scolaire (1er septembre → 30 juin), semaine
  await app.evaluate(`(() => {
    const select = document.querySelector('[data-zoom]')
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, 'year')
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })()`)
  await sleep(600)
  const yearLabels = await app.evaluate(
    `[...document.querySelectorAll('.timeline-months .timeline-segment-label')].map((n) => n.textContent)`
  )
  check(yearLabels[0] === 'sept.', `l’année scolaire commence en septembre (${yearLabels[0]})`)
  await app.screenshot('planning-gantt-3-annee.png')
  await app.evaluate(`(() => {
    const select = document.querySelector('[data-zoom]')
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, 'civil')
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })()`)
  await sleep(600)
  const civilLabels = await app.evaluate(
    `[...document.querySelectorAll('.timeline-months .timeline-segment-label')].map((n) => n.textContent)`
  )
  check(
    civilLabels[0].startsWith('janv.') && civilLabels[11] === 'déc.',
    `l’année civile va de janvier à décembre (${civilLabels[0]}…${civilLabels[11]})`
  )
  await app.evaluate(`(() => {
    const select = document.querySelector('[data-zoom]')
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, 'week')
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })()`)
  await sleep(600)
  check(
    (await app.evaluate(`document.querySelectorAll('.timeline-header .timeline-day').length`)) > 7,
    'zoom semaine : les jours sont étiquetés'
  )
  // L'étiquette « Aujourd'hui » est opaque et aucun numéro de jour n'en dépasse : rien d'illisible.
  const overlap = await app.evaluate(`(() => {
    const badge = document.querySelector('.timeline-today-badge rect').getBoundingClientRect()
    const fill = getComputedStyle(document.querySelector('.timeline-today-badge rect')).fill
    const hit = [...document.querySelectorAll('.timeline-header .timeline-day')].filter((n) => {
      const r = n.getBoundingClientRect()
      return r.right > badge.left && r.left < badge.right && r.bottom > badge.top && r.top < badge.bottom
    }).length
    return { hit, opaque: !fill.includes('rgba') && fill !== 'none' && fill !== 'transparent' }
  })()`)
  check(
    overlap.hit === 0 && overlap.opaque,
    "l'étiquette « Aujourd'hui » est opaque et ne laisse aucun chiffre dépasser"
  )
  await app.screenshot('planning-gantt-4-semaine.png')

  // 11. La liste reflète le Gantt
  await app.click('[data-view="list"]')
  await sleep(1000)
  check(
    (await app.evaluate(`document.querySelectorAll('.planning-task').length`)) === 5,
    'la liste montre les mêmes tâches'
  )
}
