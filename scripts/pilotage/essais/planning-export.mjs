// Étape 15E-2 : fenêtre « Exporter le planning… » (menu Fichier et module Planification).
// Trois genres (Planning PDF, Plan de tournage PDF, Calendrier .ics), filtre « Tâches de : », prénom
// dans le nom du fichier, emplacement exports/ puis 01_Production/Planning/, options mémorisées.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { closeLinkBanner, sleep } from '../application.mjs'

const SCRIPT = `Title: Film essai

INT. A - JOUR #10#

Marie entre.

MARIE
Bonjour.

INT. GRENIER - NUIT #20#

Deux.

EXT. JARDIN - JOUR #30#

Trois.
`

const PHASES = ['Écriture', 'Préproduction', 'Tournage', 'Postproduction', 'Diffusion']

function localDay() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default async function ({ app, check, newProject }) {
  const projectFile = newProject()
  const film = dirname(projectFile)
  const data = join(film, 'neoscenar')
  writeFileSync(join(data, 'scenario.fountain'), SCRIPT)
  const task = (id, titre, echeance, personnes) => ({
    id,
    phase: 'ph1',
    titre,
    debut: null,
    echeance,
    faite: false,
    personnes,
    validee: false,
    note: ''
  })
  writeFileSync(
    join(data, 'planning.json'),
    JSON.stringify({
      version: 1,
      phases: PHASES.map((nom, i) => ({
        id: `ph${i + 1}`,
        nom,
        couleur: '#7e57c2',
        ordre: i + 1
      })),
      taches: [
        task('t1', 'Écrire le synopsis', '2026-12-01', ['Léa']),
        task('t2', 'Repérages', '2026-12-10', ['Paul']),
        task('t3', 'Dialogues', '2026-12-15', ['Léa'])
      ],
      tournage: {
        jours: [
          { id: 'j1', date: '2026-12-05', titre: 'Premier jour', scenes: ['S10', 'S20'], note: '' }
        ]
      }
    })
  )

  const state = () =>
    app.evaluate(`(() => ({
      open: !!document.querySelector('.planning-export-dialog'),
      frame: document.querySelector('.pdf-preview iframe')?.src ?? null,
      preview: document.querySelector('.pdf-preview')?.textContent ?? '',
      pages: document.querySelector('.pdf-page-count')?.textContent ?? null,
      destination: document.querySelector('[data-destination]')?.textContent ?? null,
      kind: document.querySelector('input[name="planning-export-kind"]:checked')?.value ?? null,
      person: document.querySelector('select[name="planning-export-person"]')?.value ?? null,
      personChoices: [...document.querySelectorAll('select[name="planning-export-person"] option')].map((o) => o.textContent),
      saveDisabled: document.querySelector('button[data-save]')?.disabled ?? null,
      error: document.querySelector('.planning-export-dialog .error-text')?.textContent ?? null
    }))()`)
  const waitPreview = async (isCalendar = false) => {
    for (let i = 0; i < 60; i++) {
      const s = await state()
      if (s.destination && (isCalendar ? s.preview.includes('événement') : s.frame && s.pages))
        return s
      await sleep(250)
    }
    return state()
  }
  const chooseKind = async (kind) => {
    await app.click(`input[name="planning-export-kind"][value="${kind}"]`)
    await sleep(700)
  }
  const choosePerson = async (value) => {
    await app.evaluate(`(() => {
      const select = document.querySelector('select[name="planning-export-person"]')
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set
      setter.call(select, ${JSON.stringify(value)})
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })()`)
    await sleep(700)
  }
  const files = (dir) => (existsSync(dir) ? readdirSync(dir) : [])
  const today = localDay()
  const exportsDir = join(data, 'exports')

  await app.openProject(projectFile)
  await sleep(800)

  // 1. Menu Fichier, valeurs par défaut, vrai PDF
  check(
    (await app.menuLabels('Fichier')).includes('Exporter le planning…'),
    'menu Fichier : « Exporter le planning… »'
  )
  await app.menu('Fichier', 'Exporter le planning…')
  const first = await waitPreview()
  check(first.open && first.frame?.startsWith('blob:'), 'la fenêtre s’ouvre avec un vrai PDF')
  check(first.kind === 'planning' && first.person === '', 'défauts : Planning, tout le monde')
  check(
    JSON.stringify(first.personChoices) === JSON.stringify(['Tout le monde', 'Léa', 'Paul']),
    `personnes proposées : ${first.personChoices}`
  )
  check(
    first.destination === `Fichier : neoscenar/exports/Film_essai_planning_${today}.pdf`,
    `destination : ${first.destination}`
  )
  await app.screenshot('planning-export-planning.png')

  // 2. Filtre « Tâches de : Léa » : le prénom entre dans le nom
  await choosePerson('Léa')
  const lea = await waitPreview()
  check(
    lea.destination === `Fichier : neoscenar/exports/Film_essai_planning_Lea_${today}.pdf`,
    `avec Léa : ${lea.destination}`
  )
  check(lea.saveDisabled === false, 'Enregistrer actif')
  await app.dialogButton('Enregistrer')
  await sleep(2000)
  check(
    JSON.stringify(files(exportsDir)) === JSON.stringify([`Film_essai_planning_Lea_${today}.pdf`]),
    `PDF dans exports/ : ${files(exportsDir)}`
  )
  const pdfName = files(exportsDir)[0]
  check(
    pdfName && readFileSync(join(exportsDir, pdfName)).subarray(0, 5).toString() === '%PDF-',
    'le fichier est un PDF'
  )
  check(
    (await app.evaluate(`document.querySelector('[data-saved-path]')?.textContent`)) ===
      `Le fichier est dans neoscenar/exports/Film_essai_planning_Lea_${today}.pdf`,
    'message « Export enregistré » avec le chemin'
  )
  await app.dialogButton('Fermer')
  const saved = JSON.parse(readFileSync(join(data, 'projet.json'), 'utf8'))
  check(
    saved.exportPlanning?.kind === 'planning' && saved.exportPlanning?.person === 'Léa',
    'options mémorisées dans projet.json'
  )

  // 3. Réouverture : options retrouvées ; calendrier .ics
  await app.menu('Fichier', 'Exporter le planning…')
  await sleep(600)
  const again = await waitPreview()
  check(
    again.kind === 'planning' && again.person === 'Léa',
    'réouverture : type et personne retrouvés'
  )
  await chooseKind('calendrier')
  const cal = await waitPreview(true)
  check(cal.kind === 'calendrier' && !cal.frame, 'calendrier : pas d’aperçu PDF')
  check(
    cal.preview.includes('3 événements'),
    `événements : 2 tâches de Léa + 1 jour (${cal.preview})`
  )
  check(
    cal.destination === 'Fichier : neoscenar/exports/Film_essai_planning_Lea.ics',
    `destination : ${cal.destination}`
  )
  await app.screenshot('planning-export-calendrier.png')
  await app.dialogButton('Enregistrer')
  await sleep(1500)
  const icsPath = join(exportsDir, 'Film_essai_planning_Lea.ics')
  check(existsSync(icsPath), '.ics écrit')
  if (existsSync(icsPath)) {
    const ics = readFileSync(icsPath, 'utf8')
    check(
      ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'),
      'fichier .ics en CRLF'
    )
    check((ics.match(/BEGIN:VEVENT/g) ?? []).length === 3, '3 événements')
    check(
      ics.includes('UID:t1@neoscenar') && !ics.includes('UID:t2@neoscenar'),
      'UID stables, tâche de Paul absente'
    )
    check(ics.includes('DTSTART;VALUE=DATE:20261205'), 'jour de tournage en journée entière')
  }
  await app.dialogButton('Afficher dans le dossier').catch(() => {})
  await app.dialogButton('Fermer')

  // 4. Plan de tournage : pas de filtre, nom sans personne
  await app.menu('Fichier', 'Exporter le planning…')
  await sleep(600)
  await chooseKind('tournage')
  const shoot = await waitPreview()
  check(shoot.person === null, 'plan de tournage : pas de menu « Tâches de : »')
  check(
    shoot.destination === `Fichier : neoscenar/exports/Film_essai_plan_de_tournage_${today}.pdf`,
    `destination : ${shoot.destination}`
  )
  await app.screenshot('planning-export-tournage.png')
  await app.dialogButton('Enregistrer')
  await sleep(2000)
  check(
    files(exportsDir).includes(`Film_essai_plan_de_tournage_${today}.pdf`),
    'PDF du plan de tournage écrit'
  )
  await app.dialogButton('Fermer')

  // 5. Dossier 01_Production : l'emplacement change
  mkdirSync(join(film, '01_Production'))
  await app.menu('Fichier', 'Exporter le planning…')
  await sleep(600)
  await chooseKind('planning')
  const prod = await waitPreview()
  check(
    prod.destination === `Fichier : 01_Production/Planning/Film_essai_planning_Lea_${today}.pdf`,
    `avec 01_Production : ${prod.destination}`
  )
  await app.dialogButton('Enregistrer')
  await sleep(2000)
  check(
    files(join(film, '01_Production', 'Planning')).length === 1,
    `PDF dans 01_Production/Planning/ : ${files(join(film, '01_Production', 'Planning'))}`
  )
  await app.dialogButton('Fermer')

  // 6. Bouton du module Planification
  await app.module('Planification')
  await sleep(800)
  await closeLinkBanner(app)
  check((await app.click('[data-export-planning]')) === 'ok', 'bouton « Exporter… » du module')
  const fromModule = await waitPreview()
  check(fromModule.open, 'la fenêtre s’ouvre depuis le module')
  await app.dialogButton('Annuler')
  check(!(await state()).open, 'Annuler ferme la fenêtre')
}
