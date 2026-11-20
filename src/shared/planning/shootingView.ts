// Ce que le plan de tournage affiche (étape 15D) : jours avec totaux, filtres, regroupement par lieu
// et avertissements. Calculs purs, sans rien écrire.

import type { Scene } from '../projectTypes'
import { nameKey } from '../research/sheetNames'
import { sceneLabel } from '../scriptLink/sceneNumber'
import type { DayNight, IntExt } from '../stats/computeStats'
import type {
  BreakdownScene,
  DayCalled,
  DayEntry,
  DayView,
  SceneMark,
  Shooting,
  ShootingDay,
  ShootingWarning
} from './shootingTypes'

/** « 3/8 », « 1 », « 1 3/8 » : longueur en huitièmes de page, telle qu'on la dit sur un tournage. */
export function formatEighths(eighths: number): string {
  const whole = Math.floor(eighths / 8)
  const rest = eighths % 8
  if (rest === 0) return String(whole)
  return whole === 0 ? `${rest}/8` : `${whole} ${rest}/8`
}

/** Jours par date (sans date à la fin), à date égale dans l'ordre d'origine. */
export function sortedDays(days: readonly ShootingDay[]): ShootingDay[] {
  return days
    .map((day, index) => ({ day, index }))
    .sort((a, b) => {
      if (a.day.date === b.day.date) return a.index - b.index
      if (a.day.date === null) return 1
      if (b.day.date === null) return -1
      return a.day.date < b.day.date ? -1 : 1
    })
    .map(({ day }) => day)
}

function entryOf(
  cardId: string,
  scenes: ReadonlyMap<string, BreakdownScene>,
  cards: ReadonlyMap<string, Scene>,
  marks: Readonly<Record<string, SceneMark>>
): DayEntry {
  const scene = scenes.get(cardId)
  if (scene)
    return {
      cardId,
      status: scene.eighths === null ? 'to-write' : 'ok',
      scene,
      label: scene.label,
      heading: scene.heading
    }
  // Carte orpheline : elle existe encore, sa scène n'est plus dans le scénario. Carte supprimée (retrait
  // annulé) : son dernier repère la nomme encore.
  const card = cards.get(cardId)
  const mark = marks[cardId]
  return {
    cardId,
    status: 'missing',
    scene: null,
    label: card ? sceneLabel(card) : (mark?.numero ?? null),
    heading: card?.heading ?? mark?.entete ?? ''
  }
}

function indexOf<T>(items: readonly T[], key: (item: T) => string): Map<string, T> {
  return new Map(items.map((item) => [key(item), item]))
}

/**
 * Un jour avec ses scènes, son total (scènes « ok » seulement : ni « disparue » ni « à écrire »), ses
 * lieux et ses interprètes convoqués.
 */
export function dayView(
  day: ShootingDay,
  scenes: readonly BreakdownScene[],
  cards: readonly Scene[],
  marks: Readonly<Record<string, SceneMark>> = {}
): DayView {
  return buildDayView(
    day,
    indexOf(scenes, (s) => s.cardId),
    indexOf(cards, (c) => c.id),
    marks
  )
}

function buildDayView(
  day: ShootingDay,
  scenes: ReadonlyMap<string, BreakdownScene>,
  cards: ReadonlyMap<string, Scene>,
  marks: Readonly<Record<string, SceneMark>>
): DayView {
  const entries = day.scenes.map((cardId) => entryOf(cardId, scenes, cards, marks))
  const counted = entries.filter((e) => e.status === 'ok' && e.scene)
  const locations = new Map<string, string>()
  const called = new Map<string, DayCalled>()
  const withoutInterpreter = new Map<string, string>()
  let eighths = 0
  for (const { scene } of counted) {
    if (!scene) continue
    eighths += scene.eighths ?? 0
    if (scene.location !== '' && !locations.has(nameKey(scene.location)))
      locations.set(nameKey(scene.location), scene.location)
    for (const character of scene.characters) {
      if (character.interprete === null) {
        if (!withoutInterpreter.has(nameKey(character.nom)))
          withoutInterpreter.set(nameKey(character.nom), character.nom)
        continue
      }
      const key = nameKey(character.interprete)
      const entry = called.get(key) ?? { interprete: character.interprete, personnages: [] }
      if (!entry.personnages.some((n) => nameKey(n) === nameKey(character.nom)))
        entry.personnages.push(character.nom)
      called.set(key, entry)
    }
  }
  return {
    day,
    entries,
    eighths,
    locations: [...locations.values()],
    called: [...called.values()],
    withoutInterpreter: [...withoutInterpreter.values()]
  }
}

/** Tous les jours, triés par date. */
export function dayViews(
  shooting: Shooting,
  scenes: readonly BreakdownScene[],
  cards: readonly Scene[]
): DayView[] {
  const byScene = indexOf(scenes, (s) => s.cardId)
  const byCard = indexOf(cards, (c) => c.id)
  return sortedDays(shooting.jours).map((day) =>
    buildDayView(day, byScene, byCard, shooting.reperes)
  )
}

/** Scènes qui ne sont dans aucun jour (« Scènes à planifier »), dans l'ordre du scénario. */
export function unplannedScenes(
  scenes: readonly BreakdownScene[],
  shooting: Shooting
): BreakdownScene[] {
  const planned = new Set(shooting.jours.flatMap((day) => day.scenes))
  return scenes.filter((scene) => !planned.has(scene.cardId))
}

export interface SceneFilter {
  /** Lieu exact (comparaison sans casse) ; vide = tous. */
  location?: string
  intExt?: IntExt
  dayNight?: DayNight
  /** Nom de personnage ; vide = tous. */
  character?: string
}

export function filterScenes(
  scenes: readonly BreakdownScene[],
  filter: SceneFilter
): BreakdownScene[] {
  return scenes.filter(
    (scene) =>
      (!filter.location || nameKey(scene.location) === nameKey(filter.location)) &&
      (!filter.intExt || scene.intExt === filter.intExt) &&
      (!filter.dayNight || scene.dayNight === filter.dayNight) &&
      (!filter.character ||
        scene.characters.some((c) => nameKey(c.nom) === nameKey(filter.character ?? '')))
  )
}

export interface LocationGroup {
  /** Lieu tel qu'écrit la première fois ; vide = scènes sans lieu (cartes à écrire), en dernier. */
  location: string
  scenes: BreakdownScene[]
}

/**
 * « Regrouper par lieu » : lieu exact, comme les fiches (MAISON et MAISON - CUISINE sont deux lieux).
 * Lieux dans l'ordre alphabétique, scènes dans l'ordre du scénario.
 */
export function groupByLocation(scenes: readonly BreakdownScene[]): LocationGroup[] {
  const groups = new Map<string, LocationGroup>()
  for (const scene of scenes) {
    const key = nameKey(scene.location)
    const group = groups.get(key) ?? { location: scene.location, scenes: [] }
    group.scenes.push(scene)
    groups.set(key, group)
  }
  return [...groups.values()].sort((a, b) => {
    if (a.location === '' || b.location === '') return a.location === '' ? 1 : -1
    return a.location.localeCompare(b.location, 'fr')
  })
}

/** Lieux, personnages (parlants ou muets) et nombre de scènes utiles aux filtres. */
export function filterChoices(scenes: readonly BreakdownScene[]): {
  locations: string[]
  characters: string[]
} {
  return {
    locations: groupByLocation(scenes)
      .map((g) => g.location)
      .filter((l) => l !== ''),
    characters: [
      ...new Map(
        scenes.flatMap((s) => s.characters).map((c) => [nameKey(c.nom), c.nom] as const)
      ).values()
    ].sort((a, b) => a.localeCompare(b, 'fr'))
  }
}

/** Avertissements, jamais bloquants. */
export function shootingWarnings(
  shooting: Shooting,
  scenes: readonly BreakdownScene[],
  cards: readonly Scene[]
): ShootingWarning[] {
  const byScene = indexOf(scenes, (s) => s.cardId)
  const byCard = indexOf(cards, (c) => c.id)
  const warnings: ShootingWarning[] = []

  const daysOf = new Map<string, string[]>()
  for (const day of shooting.jours)
    for (const cardId of day.scenes) daysOf.set(cardId, [...(daysOf.get(cardId) ?? []), day.id])
  for (const [cardId, dayIds] of daysOf)
    if (dayIds.length > 1) {
      const entry = entryOf(cardId, byScene, byCard, shooting.reperes)
      warnings.push({ kind: 'twice', cardId, label: entry.label ?? cardId, dayIds })
    }

  for (const day of shooting.jours)
    for (const cardId of day.scenes) {
      const entry = entryOf(cardId, byScene, byCard, shooting.reperes)
      if (entry.status === 'missing')
        warnings.push({ kind: 'missing', dayId: day.id, cardId, label: entry.label })
    }

  const noInterpreter = new Map<string, { nom: string; labels: string[] }>()
  const noSheet = new Map<string, { nom: string; labels: string[] }>()
  for (const scene of scenes)
    for (const character of scene.characters) {
      if (character.interprete !== null) continue
      const target = character.sansFiche ? noSheet : noInterpreter
      const item = target.get(nameKey(character.nom)) ?? { nom: character.nom, labels: [] }
      item.labels.push(scene.label)
      target.set(nameKey(character.nom), item)
    }
  for (const item of noInterpreter.values()) warnings.push({ kind: 'no-interpreter', ...item })
  for (const item of noSheet.values()) warnings.push({ kind: 'no-sheet', ...item })

  const unplanned = unplannedScenes(scenes, shooting).length
  if (unplanned > 0) warnings.push({ kind: 'unplanned', count: unplanned })
  return warnings
}
