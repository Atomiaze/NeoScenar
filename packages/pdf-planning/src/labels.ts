// Textes imprimés dans les PDF du planning. Le module étant indépendant de l'application, ils sont
// regroupés ici plutôt que dans src/renderer/i18n/fr.ts (comme pour le storyboard).

import type { IsoDate, PdfDayNight, PdfIntExt, PdfTaskState } from './types.ts'

export const LABELS = {
  planning: 'Planning',
  shooting: 'Plan de tournage',
  exported: (date: string): string => `Exporté le ${date}`,
  person: (name: string): string => `Tâches de : ${name}`,
  page: (n: number, total: number): string => `Page ${n} / ${total}`,
  continued: '(suite)',
  today: "Aujourd'hui",
  shootingRow: 'Jours de tournage',
  undated: (n: number): string => (n === 1 ? '1 tâche sans date' : `${n} tâches sans date`),
  noTask: 'Aucune tâche',
  progress: (done: number, total: number): string => `${done} / ${total} faites`,
  late: (n: number): string => `${n} en retard`,
  legend:
    'Losange : échéance · barre : du début à l’échéance · rouge : en retard · pâle : faite · coche turquoise : validée',
  columns: {
    task: 'Tâche',
    start: 'Début',
    due: 'Échéance',
    people: 'Personnes',
    state: 'État'
  },
  state: { todo: 'À faire', late: 'En retard', done: 'Faite' } satisfies Record<
    PdfTaskState,
    string
  >,
  validated: 'Validée',
  noDate: '—',
  shootingColumns: {
    scene: 'Scène',
    location: 'Lieu',
    intExt: 'INT/EXT',
    dayNight: 'J/N',
    pages: 'Pages',
    people: 'Interprètes'
  },
  intExt: { int: 'INT.', ext: 'EXT.', mixed: 'INT./EXT.', unknown: '—' } satisfies Record<
    PdfIntExt,
    string
  >,
  dayNight: { day: 'JOUR', night: 'NUIT', other: 'AUTRE', unknown: '—' } satisfies Record<
    PdfDayNight,
    string
  >,
  day: (n: number): string => `Jour ${n}`,
  dateToFix: 'date à fixer',
  toWrite: 'à écrire',
  missing: 'disparue du scénario',
  sceneToWrite: 'Scène à écrire',
  total: (eighths: number, scenes: number): string =>
    `Total : ${formatEighths(eighths)} ${eighths > 8 ? 'pages' : 'page'} · ${scenes} ${scenes > 1 ? 'scènes' : 'scène'}`,
  locations: 'Lieux : ',
  called: 'Convoqués : ',
  withoutInterpreter: 'Sans interprète : ',
  presents: 'Présents en plus : ',
  note: 'Note : ',
  days: (n: number): string => (n === 1 ? '1 jour de tournage' : `${n} jours de tournage`),
  unplanned: (n: number): string =>
    n === 0
      ? 'Toutes les scènes sont planifiées'
      : n === 1
        ? '1 scène à planifier'
        : `${n} scènes à planifier`,
  noDay: 'Aucun jour de tournage.'
} as const

const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre'
]
const SHORT_MONTHS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.'
]
const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

export function monthName(monthIndex: number, short: boolean): string {
  return (short ? SHORT_MONTHS : MONTHS)[monthIndex]
}

function parts(iso: IsoDate): { year: number; month: number; day: number; weekday: number } {
  const [year, month, day] = iso.split('-').map(Number)
  const weekday = (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7
  return { year, month: month - 1, day, weekday }
}

/** « 3 mars 2027 ». */
export function formatDate(iso: IsoDate): string {
  const { year, month, day } = parts(iso)
  return `${day === 1 ? '1er' : day} ${MONTHS[month]} ${year}`
}

/** « mardi 3 mars 2027 ». */
export function formatLongDate(iso: IsoDate): string {
  return `${WEEKDAYS[parts(iso).weekday]} ${formatDate(iso)}`
}

/** « 3/8 », « 1 », « 1 3/8 » : longueur en huitièmes de page. */
export function formatEighths(eighths: number): string {
  const whole = Math.floor(eighths / 8)
  const rest = eighths % 8
  if (rest === 0) return String(whole)
  return whole === 0 ? `${rest}/8` : `${whole} ${rest}/8`
}
