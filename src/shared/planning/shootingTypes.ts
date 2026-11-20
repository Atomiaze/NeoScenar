// Plan de tournage (étape 15D) : types. Les jours sont écrits dans planning.json, clé `tournage` ;
// les scènes y sont repérées par l'identifiant permanent de leur carte (jamais par leur numéro),
// pour survivre aux renumérotations.

import type { DayNight, IntExt } from '../stats/computeStats'
import type { IsoDate } from './types'

export interface ShootingDay {
  /** Identifiant interne permanent (UUID). */
  id: string
  date: IsoDate | null
  /** Intitulé facultatif (« Jour 1 — la maison »). */
  titre: string
  /** Identifiants de cartes, dans l'ordre de tournage. */
  scenes: string[]
  note: string
}

/**
 * Numéro et en-tête d'une scène planifiée, tels qu'ils étaient vus la dernière fois. Seul moyen de
 * nommer une scène dont la carte a été supprimée (bandeau « retirée », jour qui la montre encore).
 */
export interface SceneMark {
  /** « S_0030 ». */
  numero: string
  /** En-tête sans le numéro (« INT. CUISINE - JOUR »). */
  entete: string
}

/** Contenu de `tournage` : jours, personnages muets ajoutés à la main, repères des scènes planifiées. */
export interface Shooting {
  jours: ShootingDay[]
  /** Par identifiant de carte : noms de fiches Personnages (muets dans cette scène). */
  muets: Record<string, string[]>
  /** Par identifiant de carte : numéro et en-tête des scènes placées dans un jour (étape 15D-3). */
  reperes: Record<string, SceneMark>
}

/** Un personnage d'une scène, avec son interprète (null = sans interprète ou fiche disparue). */
export interface SceneCharacter {
  nom: string
  interprete: string | null
  /** Ajouté à la main dans le plan de tournage (le Fountain n'est jamais modifié). */
  muet: boolean
  /** Muet dont la fiche n'existe plus : signalé « plus de fiche ». */
  sansFiche: boolean
}

/** Une scène du scénario telle que le plan de tournage la voit. */
export interface BreakdownScene {
  cardId: string
  /** « S_0030 ». */
  label: string
  /** En-tête sans le numéro (« INT. CUISINE - JOUR »). */
  heading: string
  intExt: IntExt
  dayNight: DayNight
  /** Lieu tel qu'écrit dans l'en-tête, vide pour une carte « SCÈNE À ÉCRIRE ». */
  location: string
  /** Longueur en huitièmes de page ; null = « à écrire » (carte sans scène écrite). */
  eighths: number | null
  /** Personnages qui parlent, puis les muets ajoutés. */
  characters: SceneCharacter[]
}

/** Fiche Personnage, réduite à ce dont le dépouillement a besoin. */
export interface CharacterSheetInfo {
  nom: string
  interprete: string
}

export type DayEntryStatus = 'ok' | 'to-write' | 'missing'

export interface DayEntry {
  cardId: string
  status: DayEntryStatus
  /** Présente pour « ok » et « to-write ». */
  scene: BreakdownScene | null
  /** Numéro affiché ; null si la carte n'existe plus du tout. */
  label: string | null
  heading: string
}

export interface DayCalled {
  interprete: string
  personnages: string[]
}

export interface DayView {
  day: ShootingDay
  entries: DayEntry[]
  /** Total en huitièmes : scènes « ok » seulement. */
  eighths: number
  /** Lieux des scènes « ok », sans doublon, dans l'ordre. */
  locations: string[]
  called: DayCalled[]
  /** Personnages convoqués sans interprète. */
  withoutInterpreter: string[]
}

export type ShootingWarning =
  | { kind: 'twice'; cardId: string; label: string; dayIds: string[] }
  | { kind: 'missing'; dayId: string; cardId: string; label: string | null }
  | { kind: 'no-interpreter'; nom: string; labels: string[] }
  | { kind: 'no-sheet'; nom: string; labels: string[] }
  | { kind: 'unplanned'; count: number }
