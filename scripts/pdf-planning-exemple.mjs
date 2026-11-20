// Outil de développement : écrit les PDF « Planning » et « Plan de tournage » du planning d'essai,
// et un calendrier .ics d'essai (à importer dans Calendrier ou Google Agenda).
// Utilisation : npm run pdf:planning:exemple → out/planning-exemple/
// Relancer la commande puis réimporter le .ics doit mettre à jour les événements, sans doublon.

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { exportPlanningPdf, exportShootingPdf } from '../packages/pdf-planning/src/index.ts'
import { planningInput, shootingInput } from '../packages/pdf-planning/tests/fixtures.ts'
import { buildIcs } from '../src/shared/planning/ics.ts'

const OUT = join(import.meta.dirname, '..', 'out', 'planning-exemple')
mkdirSync(OUT, { recursive: true })

writeFileSync(join(OUT, 'planning.pdf'), await exportPlanningPdf(planningInput()))
writeFileSync(
  join(OUT, 'planning-lea.pdf'),
  await exportPlanningPdf(planningInput({ person: 'Léa Martin' }))
)
writeFileSync(join(OUT, 'plan-de-tournage.pdf'), await exportShootingPdf(shootingInput()))

// Même forme que les événements écrits par l'application (planningCalendar), UID fixes.
const now = new Date()
const ics = buildIcs({
  name: 'Le Dernier Bus (essai) — planning',
  stamp: now,
  modifiedAt: now,
  events: [
    {
      uid: 'essai-synopsis@neoscenar',
      date: '2026-11-25',
      summary: '✓ Synopsis',
      description: 'Phase : Écriture\nPersonnes : Léa Martin\nFaite · Validée',
      categories: ['Écriture']
    },
    {
      uid: 'essai-version@neoscenar',
      date: '2026-11-27',
      summary:
        'Première version du scénario, avec les dialogues réécrits après la lecture en classe ; à rendre à l’enseignant',
      description:
        'Phase : Écriture\nPersonnes : Léa Martin, Noé Dubois\nDébut : 2026-11-02\n\nRelire les scènes 30 à 60 ; corriger, puis rendre.',
      categories: ['Écriture']
    },
    {
      uid: 'essai-jour-1@neoscenar',
      date: '2026-12-02',
      summary: 'Tournage — Jour 1 · La maison',
      description:
        'Scènes :\nS_0010 CUISINE (INT., JOUR, 3/8 p.)\nS_0030 SALON (INT., NUIT, 1 4/8 p.)\n\nTotal : 1 7/8 p.\nConvoqués : Léa Dupont (MARIE), Tom Leroy (PAUL)\n\nLieux : CUISINE, SALON\n\nRendez-vous à 8 h devant l’école.',
      location: 'CUISINE, SALON'
    }
  ]
})
writeFileSync(join(OUT, 'planning-essai.ics'), ics)
console.log(`Fichiers écrits dans ${OUT}`)
