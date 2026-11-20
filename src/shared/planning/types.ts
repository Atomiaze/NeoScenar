// Planning du projet (étape 15) : phases de production et tâches, dans neoscenar/planning.json.
// Clés en français, comme projet.json et generique.json.

/** Version du format de planning.json gérée par cette version de l'application. */
export const PLANNING_FORMAT_VERSION = 1

/** Fichier du planning, dans neoscenar/. */
export const PLANNING_FILE = 'planning.json'

/** Date au format AAAA-MM-JJ (échéances en dates fixes). */
export type IsoDate = string

export interface Phase {
  /** Identifiant interne permanent (UUID, invisible), comme les cartes et les plans. */
  id: string
  nom: string
  /** Couleur de la palette des cartes (#rrggbb). */
  couleur: string
  /** Rang d'affichage (1, 2, 3…), toujours renuméroté sans trou. */
  ordre: number
}

export interface Task {
  /** Identifiant interne permanent (UUID). Pas de numéro affiché : les tâches sont triées par date. */
  id: string
  /** Identifiant de la phase. */
  phase: string
  titre: string
  debut: IsoDate | null
  echeance: IsoDate | null
  faite: boolean
  /** Noms tels qu'écrits au générique. */
  personnes: string[]
  /** Vrai = validée par l'enseignant. Une tâche validée est toujours faite (jamais en retard). */
  validee: boolean
  note: string
}

export interface Planning {
  version: number
  phases: Phase[]
  taches: Task[]
  /** Plan de tournage : défini en 15D, conservé tel quel d'ici là. */
  tournage: Record<string, unknown>
}

export type TaskState = 'a-faire' | 'en-retard' | 'faite'

export interface PhaseProgress {
  total: number
  done: number
  late: number
  /** 0 à 1 ; 0 pour une phase sans tâche. */
  ratio: number
}

/** Une personne de l'équipe technique du générique, avec ses rubriques. */
export interface CrewMember {
  nom: string
  /** Intitulés de ses rubriques (« Chef opérateur », « Montage »…), dans l'ordre du générique. */
  rubriques: string[]
}

/** Personne d'une tâche, et si elle figure encore au générique. */
export interface TaskPerson {
  nom: string
  auGenerique: boolean
}
