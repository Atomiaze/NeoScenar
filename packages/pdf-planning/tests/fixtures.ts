// Planning d'essai (tests et `npm run pdf:planning:exemple`). Node seulement : lit la police Inter.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  PdfPhase,
  PdfShootingDay,
  PdfShootingScene,
  PdfTask,
  PlanningPdfInput,
  ShootingPdfInput
} from '../src/index.ts'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const font = (name: string): Uint8Array =>
  new Uint8Array(readFileSync(join(ROOT, 'resources', 'polices', 'inter', `Inter-${name}.ttf`)))

export const FONTS = { regular: font('Regular'), bold: font('Bold') }

export function task(title: string, fields: Partial<PdfTask> = {}): PdfTask {
  return {
    title,
    start: null,
    due: null,
    state: 'todo',
    validated: false,
    people: [],
    note: '',
    ...fields
  }
}

export const PHASES: PdfPhase[] = [
  {
    name: 'Écriture',
    color: '#e53935',
    tasks: [
      task('Synopsis', {
        due: '2026-09-25',
        state: 'done',
        validated: true,
        people: ['Léa Martin']
      }),
      task('Traitement', {
        start: '2026-09-28',
        due: '2026-10-16',
        state: 'done',
        people: ['Léa Martin', 'Noé Dubois']
      }),
      task('Première version du scénario, avec les dialogues réécrits après la lecture en classe', {
        start: '2026-10-19',
        due: '2026-11-13',
        state: 'late',
        people: ['Léa Martin'],
        note: 'Relire les scènes 30 à 60 avec Monsieur Delepinne avant la remise.'
      }),
      task('Version de tournage', { due: '2027-01-15' }),
      task('Idées en vrac', {})
    ]
  },
  {
    name: 'Préproduction',
    color: '#fb8c00',
    tasks: [
      task('Repérages', {
        start: '2026-11-02',
        due: '2026-11-27',
        people: ['Noé Dubois', 'Inès Leroy']
      }),
      task('Casting', { start: '2026-11-16', due: '2026-12-11', people: ['Inès Leroy'] }),
      task('Storyboard', { start: '2026-12-01', due: '2027-01-22', people: ['Hugo Petit'] }),
      task('Découpage technique', { due: '2027-01-29', people: ['Hugo Petit', 'Léa Martin'] }),
      task('Autorisations de tournage (mairie, école, parents)', { due: '2027-02-05' })
    ]
  },
  {
    name: 'Tournage',
    color: '#43a047',
    tasks: [
      task('Essais caméra', { due: '2027-02-12', people: ['Hugo Petit'] }),
      task('Préparer le matériel', { due: '2027-02-26' })
    ]
  },
  {
    name: 'Postproduction',
    color: '#1e88e5',
    tasks: [
      task('Dérushage', { start: '2027-03-15', due: '2027-03-26' }),
      task('Montage image', { start: '2027-03-29', due: '2027-04-30', people: ['Noé Dubois'] }),
      task('Montage son et mixage', { start: '2027-05-03', due: '2027-05-21' }),
      task('Étalonnage', { start: '2027-05-10', due: '2027-05-28' }),
      task('Générique', { due: '2027-05-28', people: ['Inès Leroy'] })
    ]
  },
  { name: 'Diffusion', color: '#8e24aa', tasks: [] }
]

export function planningInput(fields: Partial<PlanningPdfInput> = {}): PlanningPdfInput {
  return {
    title: 'Le Dernier Bus',
    exportDate: '2026-11-20',
    fonts: FONTS,
    person: null,
    range: { start: '2026-09-01', end: '2027-06-30' },
    phases: PHASES,
    shootingDays: ['2027-03-01', '2027-03-02', '2027-03-08'],
    shootingRowAfter: 2,
    ...fields
  }
}

export function scene(n: number, fields: Partial<PdfShootingScene> = {}): PdfShootingScene {
  return {
    label: `S_${String(n * 10).padStart(4, '0')}`,
    status: 'ok',
    location: 'CUISINE',
    intExt: 'int',
    dayNight: 'day',
    eighths: 3,
    people: ['Léa Dupont (MARIE)', 'Tom Leroy (PAUL)'],
    ...fields
  }
}

export const DAYS: PdfShootingDay[] = [
  {
    date: '2027-03-01',
    title: 'La maison',
    note: 'Rendez-vous à 8 h devant l’école.',
    scenes: [
      scene(1),
      scene(3, { eighths: 12, location: 'SALON', dayNight: 'night' }),
      scene(9, {
        status: 'to-write',
        location: '',
        intExt: 'unknown',
        dayNight: 'unknown',
        eighths: null,
        people: []
      })
    ],
    eighths: 15,
    locations: ['CUISINE', 'SALON'],
    called: ['Léa Dupont (MARIE)', 'Tom Leroy (PAUL)'],
    withoutInterpreter: [],
    presents: ['Marc — figurant']
  },
  {
    date: '2027-03-02',
    title: '',
    note: '',
    scenes: [
      scene(2, { location: 'RUE', intExt: 'ext', people: ['MARIE (sans interprète)'] }),
      scene(5, {
        status: 'missing',
        location: 'INT. GARAGE - NUIT',
        intExt: 'unknown',
        dayNight: 'unknown',
        eighths: null,
        people: []
      })
    ],
    eighths: 3,
    locations: ['RUE'],
    called: [],
    withoutInterpreter: ['MARIE'],
    presents: []
  },
  {
    date: null,
    title: 'Plans de coupe',
    note: '',
    scenes: [],
    eighths: 0,
    locations: [],
    called: [],
    withoutInterpreter: [],
    presents: []
  }
]

export function shootingInput(fields: Partial<ShootingPdfInput> = {}): ShootingPdfInput {
  return {
    title: 'Le Dernier Bus',
    exportDate: '2026-11-20',
    fonts: FONTS,
    days: DAYS,
    unplanned: 4,
    ...fields
  }
}
