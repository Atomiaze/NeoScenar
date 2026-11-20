// Saisie de la durée d'un plan dans la fiche : en secondes, avec virgule ou point.

export type DurationInput = { ok: true; value: number | null } | { ok: false }

/** « 3,5 » ou « 3.5 » → 3,5 s ; vide → pas de durée ; « abc » ou « -2 » → refusé. */
export function parseDurationInput(text: string): DurationInput {
  const trimmed = text.trim()
  if (trimmed === '') return { ok: true, value: null }
  if (!/^\d+([.,]\d*)?$|^[.,]\d+$/.test(trimmed)) return { ok: false }
  const value = Number(trimmed.replace(',', '.'))
  return Number.isFinite(value) && value >= 0 ? { ok: true, value } : { ok: false }
}

/** 3.5 → « 3,5 » (écriture française) ; null → champ vide. */
export function formatDurationInput(value: number | null): string {
  return value === null ? '' : String(value).replace('.', ',')
}
