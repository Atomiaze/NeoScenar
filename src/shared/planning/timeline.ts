// Ligne du temps (Gantt) : calculs purs. Les jours sont des entiers (jours depuis le 1er janvier
// 1970, en UTC) : pas de fuseau ni d'heure d'été, une date AAAA-MM-JJ = un numéro de jour.

import type { Task } from './types'

const DAY_MS = 86_400_000

export function dayNumber(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number)
  return Math.round(Date.UTC(year, month - 1, day) / DAY_MS)
}

export function isoFromDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10)
}

function dayOf(year: number, monthIndex: number, date: number): number {
  return Math.round(Date.UTC(year, monthIndex, date) / DAY_MS)
}

/** Lundi = 0 … dimanche = 6. */
function weekdayIndex(day: number): number {
  return (new Date(day * DAY_MS).getUTCDay() + 6) % 7
}

// ---------------------------------------------------------------------------------------------
// Zoom, étendue, graduation

/** Préréglages du menu, et « custom » (zoom libre à la molette ou au pincement : « Personnalisé »). */
export type TimelineZoom = 'week' | 'month' | 'year' | 'civil' | 'custom'

/** Pixels par jour de chaque zoom. « année scolaire » : 1er septembre → 30 juin sur un écran courant. */
export const PIXELS_PER_DAY: Record<Exclude<TimelineZoom, 'custom'>, number> = {
  week: 56,
  month: 14,
  year: 3.4,
  civil: 2.8
}

/** Zoom libre : de quelques jours (≈ 200 px par jour) à environ deux ans (≈ 1,5 px par jour) par écran. */
export const MIN_PIXELS_PER_DAY = 1.5
export const MAX_PIXELS_PER_DAY = 200

export function clampPixelsPerDay(pixelsPerDay: number): number {
  return Math.min(MAX_PIXELS_PER_DAY, Math.max(MIN_PIXELS_PER_DAY, pixelsPerDay))
}

/**
 * Facteur de zoom d'un cran de molette (`deltaY` > 0 = éloigner) ; un pincement du trackpad
 * (molette avec Ctrl) envoie de petites valeurs, d'où un coefficient plus fort.
 */
export function wheelZoomFactor(deltaY: number, pinch: boolean): number {
  const clamped = Math.max(-300, Math.min(300, deltaY))
  return Math.exp(-clamped * (pinch ? 0.01 : 0.0015))
}

/**
 * Défilement qui garde un même jour sous le pointeur après un changement de zoom ou d'étendue.
 * `anchorDay` : jour (fractionnaire) sous le pointeur ; `pointerX` : position du pointeur dans la
 * zone défilante ; `labelWidth` : colonne des phases, fixe à gauche.
 */
export function scrollLeftForAnchor(
  anchorDay: number,
  pointerX: number,
  range: DayRange,
  pixelsPerDay: number,
  labelWidth: number
): number {
  return Math.max(0, Math.round(labelWidth + (anchorDay - range.start) * pixelsPerDay - pointerX))
}

/** Jour (fractionnaire) sous un pointeur, d'après le défilement actuel. */
export function dayUnderPointer(
  scrollLeft: number,
  pointerX: number,
  range: DayRange,
  pixelsPerDay: number,
  labelWidth: number
): number {
  return range.start + (scrollLeft + pointerX - labelWidth) / pixelsPerDay
}

/** Part de la largeur visible, depuis la gauche, où se place « Aujourd'hui » à l'ouverture. */
export const TODAY_VIEW_RATIO = 0.25

export interface DayRange {
  /** Premier jour affiché. */
  start: number
  /** Dernier jour affiché (inclus). */
  end: number
}

export function rangeDays(range: DayRange): number {
  return range.end - range.start + 1
}

/** Année de départ de l'année scolaire d'un jour : du 1er août au 31 juillet (septembre → juin). */
function schoolYearStart(day: number): number {
  const date = new Date(day * DAY_MS)
  return date.getUTCMonth() >= 7 ? date.getUTCFullYear() : date.getUTCFullYear() - 1
}

/**
 * Étendue affichée : tout ce qui est daté et le jour d'aujourd'hui, avec de la marge.
 * Année scolaire : du 1er septembre au 30 juin ; année civile : du 1er janvier au 31 décembre
 * (plusieurs années si le planning les couvre).
 * `viewWidth` (pixels) garantit assez de place avant « Aujourd'hui » pour le placer au quart.
 */
export function timelineRange(
  zoom: TimelineZoom,
  dates: readonly string[],
  today: string,
  viewWidth: number,
  pixelsPerDay: number = PIXELS_PER_DAY.month
): DayRange {
  const days = [today, ...dates].map(dayNumber)
  const low = Math.min(...days)
  const high = Math.max(...days)
  if (zoom === 'year') {
    const first = schoolYearStart(low)
    const last = schoolYearStart(high)
    return {
      start: dayOf(first, 8, 1),
      end: Math.max(dayOf(last + 1, 5, 30), high)
    }
  }
  if (zoom === 'civil') {
    const year = (day: number): number => new Date(day * DAY_MS).getUTCFullYear()
    return { start: dayOf(year(low), 0, 1), end: dayOf(year(high), 11, 31) }
  }
  const pixels = pixelsPerDay
  const before = Math.ceil((viewWidth * TODAY_VIEW_RATIO) / pixels)
  // Un écran entier après aujourd'hui : sinon le défilement initial serait limité par la fin.
  const after = Math.ceil(viewWidth / pixels)
  const margin = pixels >= 30 ? 7 : 14
  const start = Math.min(low - margin, dayNumber(today) - before)
  const end = Math.max(high + margin, dayNumber(today) + after)
  return { start, end }
}

export function dayToX(day: number, range: DayRange, pixelsPerDay: number): number {
  return (day - range.start) * pixelsPerDay
}

/** Jour sous une abscisse (aimantation au jour : le jour entier qui contient le point). */
export function xToDay(x: number, range: DayRange, pixelsPerDay: number): number {
  return range.start + Math.floor(x / pixelsPerDay)
}

/** Décalage en jours d'un déplacement en pixels (arrondi au jour le plus proche). */
export function snapDelta(deltaPixels: number, pixelsPerDay: number): number {
  // « + 0 » évite un -0.
  return Math.round(deltaPixels / pixelsPerDay) + 0
}

/** Défilement initial : « Aujourd'hui » au quart de la largeur visible (jamais négatif). */
export function initialScrollLeft(
  range: DayRange,
  pixelsPerDay: number,
  today: string,
  viewWidth: number
): number {
  const x = dayToX(dayNumber(today), range, pixelsPerDay) + pixelsPerDay / 2
  return Math.max(0, Math.round(x - viewWidth * TODAY_VIEW_RATIO))
}

export interface Tick {
  day: number
  label: string
}

export interface Ticks {
  /** Graduation principale (étiquetée) : mois, ou semaines au zoom « semaine ». */
  major: Tick[]
  /** Graduation secondaire : semaines (mois et année), jours (semaine). */
  minor: Tick[]
}

const MONTH_NAMES = [
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
const WEEKDAY_NAMES = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']

function dayLabel(day: number): string {
  const date = new Date(day * DAY_MS)
  return `${date.getUTCDate()} ${MONTH_NAMES[date.getUTCMonth()]}`
}

/**
 * Graduation d'après l'échelle : à partir de 30 px par jour, les jours sont étiquetés et les
 * lundis forment la graduation principale ; en dessous, ce sont les mois (et les semaines en
 * graduation fine tant qu'elles restent lisibles).
 */
export function timelineTicks(range: DayRange, pixelsPerDay: number): Ticks {
  const major: Tick[] = []
  const minor: Tick[] = []
  if (pixelsPerDay >= 30) {
    for (let day = range.start; day <= range.end; day++) {
      const index = weekdayIndex(day)
      if (index === 0) major.push({ day, label: dayLabel(day) })
      else minor.push({ day, label: '' })
    }
    // Les jours de la semaine sont étiquetés (lun. 2…) : la graduation fine porte l'initiale.
    for (const tick of minor) tick.label = WEEKDAY_NAMES[weekdayIndex(tick.day)].slice(0, 3)
    return { major, minor }
  }
  // Mois : un trait par 1er du mois, étiqueté ; le premier mois affiché l'est aussi.
  const first = new Date(range.start * DAY_MS)
  let year = first.getUTCFullYear()
  let month = first.getUTCMonth()
  for (;;) {
    const day = dayOf(year, month, 1)
    if (day > range.end) break
    if (day >= range.start) {
      major.push({ day, label: `${MONTH_NAMES[month]}${month === 0 ? ` ${year}` : ''}` })
    }
    month++
    if (month === 12) {
      month = 0
      year++
    }
  }
  for (let day = range.start; day <= range.end; day++) {
    if (pixelsPerDay >= 2.5 && weekdayIndex(day) === 0) minor.push({ day, label: '' })
  }
  return { major, minor }
}

// ---------------------------------------------------------------------------------------------
// En-tête à trois lignes : année, mois, jour

export interface Segment {
  /** Premier et dernier jour (inclus), coupés aux bornes de l'étendue affichée. */
  start: number
  end: number
  label: string
}

/** Une année par segment (1er janvier → 31 décembre), pour la première ligne de l'en-tête. */
export function yearSegments(range: DayRange): Segment[] {
  const segments: Segment[] = []
  const last = new Date(range.end * DAY_MS).getUTCFullYear()
  for (let year = new Date(range.start * DAY_MS).getUTCFullYear(); year <= last; year++) {
    segments.push({
      start: Math.max(dayOf(year, 0, 1), range.start),
      end: Math.min(dayOf(year, 11, 31), range.end),
      label: String(year)
    })
  }
  return segments
}

/** Un mois par segment, pour la deuxième ligne de l'en-tête (l'année est sur la première). */
export function monthSegments(range: DayRange): Segment[] {
  const segments: Segment[] = []
  const first = new Date(range.start * DAY_MS)
  let year = first.getUTCFullYear()
  let month = first.getUTCMonth()
  for (;;) {
    const start = dayOf(year, month, 1)
    if (start > range.end) break
    segments.push({
      start: Math.max(start, range.start),
      end: Math.min(dayOf(year, month + 1, 1) - 1, range.end),
      label: MONTH_NAMES[month]
    })
    month++
    if (month === 12) {
      month = 0
      year++
    }
  }
  return segments
}

/**
 * Troisième ligne : tous les jours quand ils sont assez larges (avec le nom du jour à partir de
 * 48 px), seulement les lundis quand ils le sont moins, rien quand ils ne seraient plus lisibles.
 */
export function dayLabels(range: DayRange, pixelsPerDay: number): Tick[] {
  if (pixelsPerDay < 7) return []
  const everyDay = pixelsPerDay >= 22
  const named = pixelsPerDay >= 48
  const ticks: Tick[] = []
  for (let day = range.start; day <= range.end; day++) {
    if (!everyDay && weekdayIndex(day) !== 0) continue
    const number = String(new Date(day * DAY_MS).getUTCDate())
    ticks.push({
      day,
      label: named ? `${WEEKDAY_NAMES[weekdayIndex(day)].slice(0, 3)} ${number}` : number
    })
  }
  return ticks
}

// ---------------------------------------------------------------------------------------------
// Ce que dessine une tâche

export type MarkKind = 'bar' | 'diamond'

export interface TaskMark {
  kind: MarkKind
  /** Premier et dernier jour (inclus) ; égaux pour un losange ou une barre d'un jour. */
  start: number
  end: number
}

/**
 * Début et échéance = barre ; échéance seule = losange ; début seul = barre d'un jour (la tâche
 * est datée, on la voit). Sans aucune date, rien n'est dessiné.
 */
export function taskMark(task: Pick<Task, 'debut' | 'echeance'>): TaskMark | null {
  if (task.echeance !== null) {
    const due = dayNumber(task.echeance)
    if (task.debut === null) return { kind: 'diamond', start: due, end: due }
    return { kind: 'bar', start: Math.min(dayNumber(task.debut), due), end: due }
  }
  if (task.debut !== null) {
    const start = dayNumber(task.debut)
    return { kind: 'bar', start, end: start }
  }
  return null
}

export interface LaneItem {
  id: string
  start: number
  /** Dernier jour occupé, étiquette comprise. */
  end: number
}

/** Rangées de la phase : une tâche va sur la première rangée où elle ne recouvre rien. */
export function assignLanes(items: readonly LaneItem[]): {
  lanes: Map<string, number>
  count: number
} {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end)
  const laneEnds: number[] = []
  const lanes = new Map<string, number>()
  for (const item of sorted) {
    let lane = laneEnds.findIndex((end) => end < item.start)
    if (lane < 0) {
      lane = laneEnds.length
      laneEnds.push(item.end)
    } else {
      laneEnds[lane] = item.end
    }
    lanes.set(item.id, lane)
  }
  return { lanes, count: Math.max(laneEnds.length, 1) }
}

// ---------------------------------------------------------------------------------------------
// Gestes

export type DragMode =
  | 'move' // barre ou losange entier
  | 'resize-start' // bord gauche d'une barre
  | 'resize-end' // bord droit d'une barre
  | 'diamond-to-bar' // poignée gauche d'un losange : ajoute un début

/** Dates d'une tâche après un geste (seules les dates changent). */
export interface DragResult {
  debut: string | null
  echeance: string | null
}

/**
 * Dates après un glissement de `delta` jours, ou `null` si rien ne change. Le début ne dépasse
 * jamais l'échéance : le glissement s'arrête à la date limite.
 */
export function applyDrag(
  task: Pick<Task, 'debut' | 'echeance'>,
  mode: DragMode,
  delta: number
): DragResult | null {
  const debut = task.debut === null ? null : dayNumber(task.debut)
  const echeance = task.echeance === null ? null : dayNumber(task.echeance)
  let next: { debut: number | null; echeance: number | null }

  if (mode === 'move') {
    if (debut === null && echeance === null) return null
    next = {
      debut: debut === null ? null : debut + delta,
      echeance: echeance === null ? null : echeance + delta
    }
  } else if (mode === 'resize-start') {
    const base = debut ?? echeance
    if (base === null) return null
    const limit = echeance ?? Number.POSITIVE_INFINITY
    next = { debut: Math.min(base + delta, limit), echeance }
  } else if (mode === 'resize-end') {
    if (echeance === null) {
      // Barre d'un jour (début seul) : tirer le bord droit ajoute une échéance.
      if (debut === null || delta <= 0) return null
      next = { debut, echeance: debut + delta }
    } else {
      next = { debut, echeance: Math.max(echeance + delta, debut ?? Number.NEGATIVE_INFINITY) }
    }
  } else {
    // diamond-to-bar : seulement vers la gauche, jusqu'à l'échéance.
    if (echeance === null || delta >= 0) return null
    next = { debut: echeance + delta, echeance }
  }

  const result: DragResult = {
    debut: next.debut === null ? null : isoFromDay(next.debut),
    echeance: next.echeance === null ? null : isoFromDay(next.echeance)
  }
  return result.debut === task.debut && result.echeance === task.echeance ? null : result
}

/**
 * Dates d'une tâche créée en glissant dans une rangée vide, de `from` à `to` (jours, dans
 * n'importe quel sens). Un seul jour = échéance seule (losange).
 */
export function datesFromRowDrag(from: number, to: number): DragResult {
  const first = Math.min(from, to)
  const last = Math.max(from, to)
  return first === last
    ? { debut: null, echeance: isoFromDay(last) }
    : { debut: isoFromDay(first), echeance: isoFromDay(last) }
}
