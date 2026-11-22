// Lecture tolérante et écriture de `tournage` (planning.json). Les clés ajoutées ailleurs sont gardées
// par `mergePlanning` ; ici on ne touche qu'à `jours`, `muets` et `reperes`.

import { isIsoDate } from './planningData'
import type { ExtraPresent, SceneMark, Shooting, ShootingDay } from './shootingTypes'
import type { Planning } from './types'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parsePresents(raw: unknown): ExtraPresent[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const list: ExtraPresent[] = []
  for (const item of raw) {
    if (!isObject(item) || typeof item.id !== 'string' || item.id === '' || seen.has(item.id))
      continue
    if (typeof item.nom !== 'string' || item.nom.trim() === '') continue
    seen.add(item.id)
    list.push({ id: item.id, nom: item.nom, role: typeof item.role === 'string' ? item.role : '' })
  }
  return list
}

function parseDay(raw: unknown): ShootingDay | null {
  if (!isObject(raw) || typeof raw.id !== 'string' || raw.id === '') return null
  const scenes = Array.isArray(raw.scenes)
    ? raw.scenes.filter((id): id is string => typeof id === 'string' && id !== '')
    : []
  return {
    id: raw.id,
    date: isIsoDate(raw.date) ? raw.date : null,
    titre: typeof raw.titre === 'string' ? raw.titre : '',
    // Une scène écrite deux fois dans le même jour n'a pas de sens : la première est gardée.
    scenes: [...new Set(scenes)],
    note: typeof raw.note === 'string' ? raw.note : '',
    presents: parsePresents(raw.presents)
  }
}

/** Jours et muets d'un planning, lus sans erreur même si le fichier a été abîmé à la main. */
export function readShooting(planning: Planning): Shooting {
  const raw = planning.tournage
  const seen = new Set<string>()
  const jours = (Array.isArray(raw.jours) ? raw.jours : [])
    .map(parseDay)
    .filter((day): day is ShootingDay => day !== null && !seen.has(day.id) && !!seen.add(day.id))
  const muets: Record<string, string[]> = {}
  if (isObject(raw.muets))
    for (const [cardId, names] of Object.entries(raw.muets)) {
      if (!Array.isArray(names)) continue
      const kept = names.filter((n): n is string => typeof n === 'string' && n.trim() !== '')
      if (kept.length > 0) muets[cardId] = [...new Set(kept)]
    }
  const reperes: Record<string, SceneMark> = {}
  if (isObject(raw.reperes))
    for (const [cardId, mark] of Object.entries(raw.reperes))
      if (isObject(mark) && typeof mark.numero === 'string' && mark.numero !== '')
        reperes[cardId] = {
          numero: mark.numero,
          entete: typeof mark.entete === 'string' ? mark.entete : ''
        }
  return { jours, muets, reperes }
}

/** Planning dont `tournage` reçoit ces jours, muets et repères (les autres clés de `tournage` restent). */
export function withShooting(planning: Planning, shooting: Shooting): Planning {
  return { ...planning, tournage: { ...planning.tournage, ...shooting } }
}
