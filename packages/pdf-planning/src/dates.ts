// Jours comptés en entiers (depuis le 1er janvier 1970, en UTC) : pas de fuseau ni d'heure d'été.

import type { IsoDate } from './types.ts'

const DAY_MS = 86_400_000

export function dayNumber(iso: IsoDate): number {
  const [year, month, day] = iso.split('-').map(Number)
  return Math.round(Date.UTC(year, month - 1, day) / DAY_MS)
}

export function dateOf(day: number): Date {
  return new Date(day * DAY_MS)
}

/** Lundi = 0 … dimanche = 6. */
export function weekday(day: number): number {
  return (dateOf(day).getUTCDay() + 6) % 7
}

export interface MonthSpan {
  year: number
  /** 0 = janvier. */
  month: number
  /** Premier et dernier jour, coupés aux bornes. */
  start: number
  end: number
}

/** Mois couverts par l'étendue [start, end]. */
export function monthSpans(start: number, end: number): MonthSpan[] {
  const spans: MonthSpan[] = []
  let year = dateOf(start).getUTCFullYear()
  let month = dateOf(start).getUTCMonth()
  for (;;) {
    const first = Math.round(Date.UTC(year, month, 1) / DAY_MS)
    if (first > end) break
    const next = Math.round(Date.UTC(year, month + 1, 1) / DAY_MS)
    spans.push({ year, month, start: Math.max(first, start), end: Math.min(next - 1, end) })
    month++
    if (month === 12) {
      month = 0
      year++
    }
  }
  return spans
}
