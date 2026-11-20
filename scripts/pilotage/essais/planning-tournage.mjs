// Étape 15D : plan de tournage. 15D-2 : vue « Tournage » (scènes à planifier, jours, glisser-déposer,
// totaux, interprètes, muets, avertissements, Cmd + Z) et rangée « Jours de tournage » du Gantt.
// 15D-3 : relecture au retour dans l'appli et après l'enregistrement du scénario, retrait des scènes
// dont la carte est supprimée.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { closeLinkBanner, sleep } from '../application.mjs'

const SCRIPT = `Title: Film essai

INT. A - JOUR #10#

Marie entre.

MARIE
Bonjour.

PAUL
Salut.

INT. GRENIER - NUIT #20#

Deux.

EXT. JARDIN - JOUR #30#

PAUL
Il pleut.
`

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const data = join(dirname(projectFile), 'neoscenar')
  writeFileSync(join(data, 'scenario.fountain'), SCRIPT)
  mkdirSync(join(data, 'personnages'), { recursive: true })
  writeFileSync(
    join(data, 'personnages', 'MARIE.md'),
    '---\ninterprete: Léa Martin\nauto: false\n---\n'
  )
  writeFileSync(
    join(data, 'personnages', 'LUCIE.md'),
    '---\ninterprete: Zoé Petit\nauto: false\n---\n'
  )
  const planningFile = join(data, 'planning.json')
  const disk = () => JSON.parse(readFileSync(planningFile, 'utf8'))
  const days = () => disk().tournage?.jours ?? []
  /** L'enregistrement automatique attend 500 ms : on relit le fichier jusqu'à ce que la condition soit vraie. */
  const settled = async (condition) => {
    for (let i = 0; i < 20; i++) {
      try {
        if (condition()) return true
      } catch {
        // fichier en cours d'écriture
      }
      await sleep(150)
    }
    return false
  }

  const undo = async () => {
    await app.evaluate(`document.activeElement?.blur?.()`)
    const labels = await app.menuLabels('Édition')
    const entry = labels.find((label) => label.startsWith('Annuler'))
    return app.menu('Édition', entry.replace(' (désactivé)', ''))
  }
  /** Glisser-déposer HTML (événements du navigateur, comme planning-moteur.mjs). */
  const dropScene = (sceneSelector, targetSelector, after = true) =>
    app.evaluate(`(() => {
      const scene = document.querySelector(${JSON.stringify(sceneSelector)})
      const target = document.querySelector(${JSON.stringify(targetSelector)})
      if (!scene || !target) return 'introuvable'
      const r = target.getBoundingClientRect()
      const point = { clientX: r.left + r.width / 2, clientY: ${after} ? r.bottom - 2 : r.top + 2 }
      const dt = new DataTransfer()
      scene.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }))
      target.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true, ...point }))
      target.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true, ...point }))
      return 'ok'
    })()`)
  const unplannedLabels = () =>
    app.evaluate(
      `[...document.querySelectorAll('[data-shooting="unplanned"] .shooting-scene')].map((e) => e.dataset.scene)`
    )
  const dayLabels = (index) =>
    app.evaluate(
      `[...document.querySelectorAll('.shooting-day')[${index}].querySelectorAll('.shooting-scene')].map((e) => e.dataset.scene)`
    )
  const dayText = (index, selector) =>
    app.evaluate(
      `document.querySelectorAll('.shooting-day')[${index}]?.querySelector(${JSON.stringify(selector)})?.textContent ?? null`
    )

  await app.openProject(projectFile)
  await sleep(600)
  await app.module('Planification')
  await sleep(800)
  // Le bandeau des nouvelles fiches se ferme seul après 10 s et décale la page : fermé tout de suite
  // (le glisser du Gantt, plus bas, se fait à la souris).
  check(await closeLinkBanner(app), 'bandeau des fiches fermé')
  await app.click('[data-view="shooting"]')
  await sleep(800)

  // 1. Scènes à planifier, longueurs
  check(
    JSON.stringify(await unplannedLabels()) === '["S_0010","S_0020","S_0030"]',
    `les trois scènes sont à planifier (${await unplannedLabels()})`
  )
  const lengths = await app.evaluate(
    `[...document.querySelectorAll('[data-shooting="unplanned"] [data-length]')].map((e) => e.textContent)`
  )
  check(
    lengths.every((l) => /^\d|\//.test(l)),
    `chaque scène a une longueur (${lengths.join(' | ')})`
  )
  check(
    (await app.evaluate(
      `document.querySelector('[data-unplanned-count]').dataset.unplannedCount`
    )) === '3',
    'compteur : 3 scènes à planifier'
  )
  check(
    (
      await app.evaluate(`document.querySelector('.shooting-warnings')?.textContent ?? ''`)
    ).includes('PAUL'),
    'avertissement : PAUL sans interprète'
  )

  // 2. Filtres et regroupement
  await app.evaluate(`(() => {
    const select = [...document.querySelectorAll('.shooting-filters select')][2]
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set
    setter.call(select, 'night'); select.dispatchEvent(new Event('change', { bubbles: true }))
  })()`)
  await sleep(200)
  check(
    JSON.stringify(await unplannedLabels()) === '["S_0020"]',
    'filtre NUIT : seule S_0020 reste'
  )
  await app.click('.shooting-filter-actions .link-button')
  await app.click('.shooting-filter-actions input[type="checkbox"]')
  await sleep(200)
  const groups = await app.evaluate(
    `[...document.querySelectorAll('.shooting-group')].map((g) => g.dataset.group)`
  )
  check(JSON.stringify(groups) === '["A","GRENIER","JARDIN"]', `regrouper par lieu (${groups})`)
  await app.click('.shooting-filter-actions input[type="checkbox"]')

  // 3. Deux jours : le second est daté du lendemain du premier
  await app.click('[data-new-day]')
  await sleep(300)
  await app.click('[data-new-day]')
  await settled(() => days().length === 2)
  const created = days()
  check(created.length === 2, 'deux jours créés dans planning.json')
  const shift = (a, b) => (Date.parse(b) - Date.parse(a)) / 86_400_000
  check(
    created[0]?.date && created[1]?.date && shift(created[0].date, created[1].date) === 1,
    `le second jour est le lendemain (${created.map((d) => d.date).join(', ')})`
  )

  // 4. Glisser-déposer
  check(
    (await dropScene(
      '[data-shooting="unplanned"] [data-scene="S_0030"]',
      '.shooting-day:nth-child(1) .shooting-day-end'
    )) === 'ok',
    'dépôt de S_0030 dans le jour 1'
  )
  await sleep(300)
  await dropScene(
    '[data-shooting="unplanned"] [data-scene="S_0010"]',
    '.shooting-day:nth-child(1) .shooting-day-end'
  )
  await sleep(300)
  check(
    JSON.stringify(await dayLabels(0)) === '["S_0030","S_0010"]',
    `jour 1 : S_0030 puis S_0010 (${await dayLabels(0)})`
  )
  // S_0010 remontée avant S_0030 (dépôt dans la moitié haute de la première scène)
  await dropScene(
    '.shooting-day:nth-child(1) [data-scene="S_0010"]',
    '.shooting-day:nth-child(1) li[data-index="0"]',
    false
  )
  await sleep(300)
  check(
    JSON.stringify(await dayLabels(0)) === '["S_0010","S_0030"]',
    `changement d'ordre dans le jour (${await dayLabels(0)})`
  )
  check(
    await settled(() => days()[0].scenes.length === 2),
    'planning.json : deux scènes dans le jour 1'
  )
  const called = await dayText(0, '[data-called]')
  check(called?.includes('Léa Martin (MARIE)'), `interprètes convoqués : ${called}`)
  check(
    (await dayText(0, '.shooting-day-info.warning'))?.includes('PAUL'),
    'PAUL signalé sans interprète dans le jour'
  )
  const total = await dayText(0, '[data-total]')
  check(total?.startsWith('Total :'), `total du jour : ${total}`)

  // Vers le jour 2, puis Cmd + Z
  await dropScene(
    '.shooting-day:nth-child(1) [data-scene="S_0030"]',
    '.shooting-day:nth-child(2) .shooting-day-end'
  )
  await sleep(300)
  check(JSON.stringify(await dayLabels(1)) === '["S_0030"]', 'S_0030 déplacée dans le jour 2')
  await undo()
  await sleep(400)
  check(
    JSON.stringify(await dayLabels(0)) === '["S_0010","S_0030"]' &&
      JSON.stringify(await dayLabels(1)) === '[]',
    'Cmd + Z ramène S_0030 dans le jour 1'
  )
  // Retour dans les scènes à planifier
  await dropScene('.shooting-day:nth-child(1) [data-scene="S_0030"]', '[data-shooting="unplanned"]')
  await sleep(300)
  check(
    JSON.stringify(await unplannedLabels()) === '["S_0020","S_0030"]',
    'S_0030 redéposée dans les scènes à planifier'
  )

  // 5. Panneau d'une scène : muet
  await app.click('.shooting-day:nth-child(1) [data-scene="S_0010"]')
  await sleep(300)
  check(
    (await app.evaluate(`document.querySelector('[data-scene-panel]')?.dataset.scenePanel`)) ===
      'S_0010',
    'panneau de la scène S_0010'
  )
  await app.evaluate(`(() => {
    const select = document.querySelector('[data-add-mute]')
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set
    setter.call(select, 'LUCIE'); select.dispatchEvent(new Event('change', { bubbles: true }))
  })()`)
  await sleep(400)
  check(
    await settled(() => JSON.stringify(disk().tournage.muets[days()[0].scenes[0]]) === '["LUCIE"]'),
    'muet LUCIE enregistré dans planning.json'
  )
  check(
    (await dayText(0, '[data-called]'))?.includes('Zoé Petit (LUCIE)'),
    'l’interprète du muet est convoqué'
  )
  await app.screenshot('planning-tournage-vue.png')

  // 6. Gantt : rangée « Jours de tournage » sous la phase Tournage
  await app.click('[data-view="timeline"]')
  await sleep(700)
  const rows = await app.evaluate(
    `[...document.querySelectorAll('.timeline-row')].map((r) => r.dataset.phase ?? 'JOURS')`
  )
  check(
    rows.indexOf('JOURS') === rows.indexOf('Tournage') + 1,
    `rangée des jours sous « Tournage » (${rows.join(', ')})`
  )
  const marks = await app.evaluate(
    `[...document.querySelectorAll('.timeline-shooting-day')].map((g) => g.dataset.ganttDay)`
  )
  check(marks.length === 2, `deux jours dans le Gantt (${marks})`)
  const mark = await app.evaluate(`(() => {
    const r = document.querySelector('.timeline-shooting-mark').getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  })()`)
  const firstDate = days()[0].date
  const under = await app.evaluate(
    `document.elementFromPoint(${mark.x}, ${mark.y})?.getAttribute('class')`
  )
  check(under?.includes('timeline-shooting-mark'), `le pointeur est sur le jour (${under})`)
  await app.mouseDrag(mark, { x: mark.x + 14 * 3, y: mark.y })
  check(
    await settled(() => shift(firstDate, days()[0].date) === 3),
    `glisser décale le jour de 3 jours (${days()[0].date})`
  )
  await undo()
  check(await settled(() => days()[0].date === firstDate), 'Cmd + Z rend sa date au jour')
  await app.screenshot('planning-tournage-gantt.png')

  // Clic : ouvre le Plan de tournage
  // Position relue : les jours ont pu changer de ligne dans la rangée après le glisser.
  const again = await app.evaluate(`(() => {
    const r = document.querySelector('.timeline-shooting-mark').getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  })()`)
  await app.mouseDrag(again, again, 1)
  await sleep(600)
  check(
    (await app.evaluate(`document.querySelector('[data-planning="shooting"]') !== null`)) === true,
    'un clic sur un jour ouvre le Plan de tournage'
  )

  // ---------------------------------------------------------------------------------------------
  // 15D-3 : relecture au retour dans NeoScenar et après l'enregistrement du scénario ; scène dont la
  // carte est supprimée retirée de son jour (bandeau qui la nomme, « Annuler »).
  const scenarioFile = join(data, 'scenario.fountain')
  const comeBack = async () => {
    await app.evaluate(`window.dispatchEvent(new Event('focus'))`)
    await sleep(1800)
  }
  const lengthOf = (cardId) =>
    app.evaluate(
      `document.querySelector('[data-planning="shooting"] [data-card-id="${cardId}"] [data-length]')?.textContent ?? null`
    )
  const day2 = days()[1].id
  const dayIndex = (id) =>
    app.evaluate(
      `[...document.querySelectorAll('.shooting-day')].findIndex((d) => d.dataset.dayId === ${JSON.stringify(id)})`
    )
  await dropScene(
    '[data-shooting="unplanned"] [data-scene="S_0020"]',
    `.shooting-day[data-day-id="${day2}"] .shooting-day-end`
  )
  await sleep(300)
  await dropScene(
    '[data-shooting="unplanned"] [data-scene="S_0030"]',
    `.shooting-day[data-day-id="${day2}"] .shooting-day-end`
  )
  check(
    await settled(() => days()[1].scenes.join() === 'S20,S30'),
    'jour 2 : S_0020 et S_0030 (cartes S20, S30)'
  )
  check(
    await settled(
      () =>
        JSON.stringify(disk().tournage.reperes?.S20) ===
        '{"numero":"S_0020","entete":"INT. GRENIER - NUIT"}'
    ),
    `repère de S_0020 mémorisé (${JSON.stringify(disk().tournage.reperes)})`
  )

  // 7. Réplique ajoutée et interprète changé « dans Obsidian » (aucune carte ne change) : retour.
  const before10 = await lengthOf('S10')
  const long = 'Une très longue réplique qui prend plusieurs lignes dans la page du scénario. '
  writeFileSync(
    scenarioFile,
    readFileSync(scenarioFile, 'utf8').replace(
      'PAUL\nSalut.\n',
      `PAUL\nSalut.\n\nMARIE\n${long.repeat(12)}\n`
    )
  )
  writeFileSync(
    join(data, 'personnages', 'MARIE.md'),
    '---\ninterprete: Léa Durand\nauto: false\n---\n'
  )
  await comeBack()
  const after10 = await lengthOf('S10')
  check(
    before10 !== null && after10 !== null && after10 !== before10,
    `retour dans l'appli : longueur de S_0010 relue (${before10} → ${after10})`
  )
  check(
    (await dayText(await dayIndex(days()[0].id), '[data-called]'))?.includes('Léa Durand (MARIE)'),
    'retour dans l’appli : interprète relu dans la fiche'
  )

  // 8. Nouvelle scène, puis renumérotation (JARDIN remonte en tête) : les jours ne changent pas.
  const daysBefore = JSON.stringify(days().map((d) => d.scenes))
  writeFileSync(
    scenarioFile,
    `${readFileSync(scenarioFile, 'utf8')}\nINT. CAVE - NUIT #40#\n\nTrois.\n`
  )
  await comeBack()
  check(
    (await unplannedLabels()).includes('S_0040'),
    `nouvelle scène proposée (${await unplannedLabels()})`
  )
  const text = readFileSync(scenarioFile, 'utf8')
  const garden = 'EXT. JARDIN - JOUR #30#\n\nPAUL\nIl pleut.\n'
  writeFileSync(
    scenarioFile,
    text.replace(garden, '').replace('INT. A - JOUR #10#', `${garden}\nINT. A - JOUR #10#`)
  )
  await comeBack()
  await closeLinkBanner(app, 500)
  const gardenLabel = await app.evaluate(
    `document.querySelector('[data-planning="shooting"] [data-card-id="S30"]')?.dataset.scene`
  )
  log(
    `    JARDIN s'affiche ${gardenLabel} ; scénario : ${readFileSync(scenarioFile, 'utf8').match(/#\d+#/g)}`
  )
  check(
    JSON.stringify(days().map((d) => d.scenes)) === daysBefore,
    'renumérotation : les jours gardent leurs scènes (identifiants de cartes)'
  )
  check(
    await settled(() => disk().tournage.reperes.S30.numero === gardenLabel),
    `renumérotation : le repère suit le numéro affiché (${gardenLabel})`
  )
  await app.screenshot('planning-tournage-relu.png')

  // 9. GRENIER supprimé du scénario : sa carte (avec un plan) devient orpheline, reste dans son jour.
  writeFileSync(
    scenarioFile,
    readFileSync(scenarioFile, 'utf8').replace(/INT\. GRENIER - NUIT #\d+#\n\nDeux\.\n\n/, '')
  )
  await comeBack()
  check(
    (await app.evaluate(
      `document.querySelector('.shooting-day [data-card-id="S20"]')?.classList.contains('missing')`
    )) === true,
    'carte orpheline : la scène reste dans son jour, « disparue du scénario »'
  )
  check(days()[1].scenes.includes('S20'), 'planning.json : S20 toujours dans le jour 2')

  // 10. La carte orpheline est supprimée dans les Cartes : retirée du jour au retour dans Planification.
  await app.evaluate(
    `[...document.querySelectorAll('.link-banner button')].find((b) => b.textContent === 'Voir')?.click()`
  )
  await sleep(800)
  await app.click('.orphan-box .orphan-actions button:last-child')
  await sleep(400)
  if (await app.dialog()) await app.dialogButton('Supprimer')
  await sleep(1500)
  check(
    !(await app.sceneCards()).some((card) => card.startsWith('S_0020')),
    'Cartes : la carte de GRENIER est supprimée'
  )
  check(
    !(await app.evaluate(`document.querySelector('.link-banner')?.textContent ?? ''`)).includes(
      'S_0020'
    ),
    'bandeau 8D : la carte supprimée n’est plus signalée orpheline'
  )
  await app.module('Planification')
  await sleep(1000)
  const removal = await app.evaluate(
    `document.querySelector('[data-shooting-removal] span')?.textContent ?? null`
  )
  check(
    removal?.includes('S_0020 INT. GRENIER - NUIT'),
    `bandeau : la scène retirée est nommée (${removal})`
  )
  check(
    await settled(() => !days()[1].scenes.includes('S20')),
    'planning.json : S20 retirée du jour 2'
  )
  await app.screenshot('planning-tournage-retrait.png')
  await app.evaluate(
    `[...document.querySelectorAll('[data-shooting-removal] button')].find((b) => b.textContent === 'Annuler').click()`
  )
  check(
    await settled(() => days()[1].scenes.includes('S20')),
    '« Annuler » : S20 revient dans le jour 2'
  )
  await sleep(300)
  check(
    (await app.evaluate(
      `document.querySelector('.shooting-day [data-card-id="S20"]')?.dataset.scene`
    )) === 'S_0020',
    'la scène revenue garde son nom (repère)'
  )
  // Les cartes changent encore : la scène dont le retrait a été annulé n'est pas retirée de nouveau.
  writeFileSync(
    scenarioFile,
    `${readFileSync(scenarioFile, 'utf8')}\nINT. TOIT - NUIT #50#\n\nQuatre.\n`
  )
  await comeBack()
  await sleep(600)
  check(
    days()[1].scenes.includes('S20') &&
      (await app.evaluate(`document.querySelector('[data-shooting-removal]')`)) === null,
    'retrait annulé : pas de nouveau retrait quand les cartes changent'
  )

  // 11. Réplique tapée dans l'éditeur (dernière scène, S_0050) puis enregistrée : longueur relue.
  const lengthByLabel = (label) =>
    app.evaluate(
      `document.querySelector('[data-planning="shooting"] [data-scene="${label}"] [data-length]')?.textContent ?? null`
    )
  const before50 = await lengthByLabel('S_0050')
  await app.module('Scénario')
  await sleep(800)
  await closeLinkBanner(app, 500)
  // L'éditeur ne dessine que les lignes visibles : on va d'abord tout en bas.
  await app.evaluate(`document.querySelector('.cm-scroller').scrollTop = 1e7`)
  await sleep(400)
  const lineBox = await app.evaluate(`(() => {
    const line = [...document.querySelectorAll('.cm-line')].findLast((l) => l.textContent === 'Quatre.')
    line.scrollIntoView({ block: 'center' })
    const r = line.getBoundingClientRect()
    return { x: r.right - 2, y: r.top + r.height / 2 }
  })()`)
  for (const type of ['mousePressed', 'mouseReleased'])
    await app.page.send('Input.dispatchMouseEvent', {
      type,
      ...lineBox,
      button: 'left',
      clickCount: 1
    })
  await sleep(200)
  await app.page.send('Input.insertText', { text: `\n\nPAUL\n${long.repeat(10)}\n` })
  await sleep(3000)
  check(
    readFileSync(scenarioFile, 'utf8').includes(long.repeat(10)),
    'éditeur : la réplique est enregistrée'
  )
  await app.module('Planification')
  await sleep(1000)
  const after50 = await lengthByLabel('S_0050')
  check(
    before50 !== null && after50 !== null && after50 !== before50,
    `après l'enregistrement : longueur de S_0050 relue (${before50} → ${after50})`
  )
  await app.screenshot('planning-tournage-apres-editeur.png')
}
