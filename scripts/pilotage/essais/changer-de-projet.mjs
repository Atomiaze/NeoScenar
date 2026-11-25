// Changer de projet (A → B) sans repasser par l'accueil, depuis chacun des modules : le module
// affiché, puis tous les autres, montrent B (scénario, cartes liées, fiches, planning, statistiques),
// et rien de A n'est écrit dans B. Défaut d'origine : depuis le Scénario, les cartes de B n'étaient
// pas liées à son scénario (le rapprochement croyait le texte déjà lu).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

const scene = (n, heading) => `${heading} #${n}#\n\n${heading.split(' ')[1]} parle.\n`

const PROJECTS = {
  A: { headings: ['INT. ALPHA - JOUR', 'INT. AMBRE - NUIT'], sheet: 'ALICE', task: 'Tâche Alpha' },
  B: {
    headings: [
      'INT. BRAVO - JOUR',
      'INT. BETA - NUIT',
      'EXT. BRUME - JOUR',
      'EXT. BAIE - NUIT',
      'INT. BULLE - JOUR'
    ],
    sheet: 'BORIS',
    task: 'Tâche Bravo'
  }
}

function makeProject(newProject, key, locked) {
  const { headings, sheet, task } = PROJECTS[key]
  const projectFile = newProject({ locked })
  const data = join(dirname(projectFile), 'neoscenar')
  writeFileSync(
    join(data, 'scenario.fountain'),
    headings.map((h, i) => scene((i + 1) * 10, h)).join('\n')
  )
  mkdirSync(join(data, 'personnages'), { recursive: true })
  writeFileSync(join(data, 'personnages', `${sheet}.md`), `# ${sheet}\n`)
  writeFileSync(
    join(data, 'planning.json'),
    JSON.stringify({
      version: 1,
      phases: [{ id: 'ph0', nom: 'Écriture', couleur: '#e53935', ordre: 1 }],
      taches: [
        {
          id: 't1',
          phase: 'ph0',
          titre: task,
          debut: null,
          echeance: null,
          faite: false,
          personnes: [],
          validee: false,
          note: ''
        }
      ],
      tournage: {}
    })
  )
  return { projectFile, data }
}

const bodyText = (app) => app.evaluate(`document.querySelector('.project-layout')?.innerText ?? ''`)

/** Vérifie ce que montre le module affiché : B, jamais A. */
async function checkModule(app, check, module, where) {
  const b = PROJECTS.B
  const a = PROJECTS.A
  if (module === 'Scénario') {
    const headings = await app.evaluate(
      `[...document.querySelectorAll('.navigator-heading')].map((h) => h.textContent)`
    )
    check(
      headings.join('|') === b.headings.join('|'),
      `${where} : navigateur de B (${headings.join('|')})`
    )
  } else if (module === 'Cartes') {
    const cards = (await app.sceneCards()).map((c) => c.replace(' [sélectionnée]', ''))
    const orphans = await app.evaluate(`document.querySelectorAll('.orphan-label').length`)
    check(
      cards.join(',') === 'S_0010,S_0020,S_0030,S_0040,S_0050' && orphans === 0,
      `${where} : cartes de B liées (${cards}, orphelines ${orphans})`
    )
  } else if (module === 'Données du projet') {
    const tree = await app.evaluate(`document.querySelector('.research-tree')?.textContent ?? ''`)
    check(
      tree.includes(b.sheet) && !tree.includes(a.sheet),
      `${where} : fiches de B (${tree.slice(0, 80)})`
    )
  } else if (module === 'Planification') {
    const text = await bodyText(app)
    check(text.includes(b.task) && !text.includes(a.task), `${where} : planning de B`)
  } else if (module === 'Statistiques') {
    const text = await bodyText(app)
    check(text.includes('BULLE') && !text.includes('ALPHA'), `${where} : statistiques de B`)
  }
}

const MODULES = ['Scénario', 'Cartes', 'Données du projet', 'Planification', 'Statistiques']

export default async function ({ app, check, log, newProject }) {
  for (const start of MODULES) {
    // A aux numéros verrouillés (cas où le défaut avait été vu), puis B.
    const a = makeProject(newProject, 'A', true)
    await app.openProject(a.projectFile)
    await app.module(start)
    await sleep(1500)
    const b = makeProject(newProject, 'B', false)
    await app.openProject(b.projectFile)
    await sleep(1500)
    log(`depuis ${start}`)
    await checkModule(app, check, start, `depuis ${start}, module resté affiché`)
    for (const other of MODULES) {
      await app.module(other)
      await sleep(other === 'Scénario' ? 1500 : 800)
      await checkModule(app, check, other, `depuis ${start}, puis ${other}`)
    }
    const decoupage = JSON.parse(readFileSync(join(b.data, 'decoupage.json'), 'utf8'))
    const script = readFileSync(join(b.data, 'scenario.fountain'), 'utf8')
    const planning = readFileSync(join(b.data, 'planning.json'), 'utf8')
    check(
      !decoupage.numbersLocked && !script.includes('ALPHA') && !planning.includes('Alpha'),
      `depuis ${start} : rien de A écrit dans B`
    )
  }
}
