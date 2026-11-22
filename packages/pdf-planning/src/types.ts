// Entrées des deux PDF (planning, plan de tournage) et éléments posés sur les pages.
// Le module reçoit des données déjà choisies et triées : l'application décide quoi exporter.

/** Date au format AAAA-MM-JJ. */
export type IsoDate = string

export interface PdfFonts {
  regular: Uint8Array
  bold: Uint8Array
}

/** Commun aux deux PDF. */
export interface PdfCommon {
  /** Titre du film. */
  title: string
  /** Jour de l'export : date imprimée et trait « Aujourd'hui ». */
  exportDate: IsoDate
  fonts: PdfFonts
}

// ---------------------------------------------------------------------------------------------
// Planning

export type PdfTaskState = 'todo' | 'late' | 'done'

export interface PdfTask {
  title: string
  start: IsoDate | null
  due: IsoDate | null
  state: PdfTaskState
  validated: boolean
  people: string[]
  note: string
}

export interface PdfPhase {
  name: string
  /** #rrggbb (palette des cartes). */
  color: string
  /** Tâches de la phase, déjà triées. */
  tasks: PdfTask[]
}

export interface PlanningPdfInput extends PdfCommon {
  /** « Tâches de : Léa » ; null = tout le monde. */
  person: string | null
  /** Étendue de la ligne du temps (jours inclus). */
  range: { start: IsoDate; end: IsoDate }
  phases: PdfPhase[]
  /** Jours de tournage datés. */
  shootingDays: IsoDate[]
  /** Rang de la phase après laquelle vient la rangée des jours de tournage ; -1 = en bas. */
  shootingRowAfter: number
}

// ---------------------------------------------------------------------------------------------
// Plan de tournage

export type PdfIntExt = 'int' | 'ext' | 'mixed' | 'unknown'
export type PdfDayNight = 'day' | 'night' | 'other' | 'unknown'

export interface PdfShootingScene {
  /** « S_0030 » ; vide si inconnu. */
  label: string
  /** « ok » : comptée ; « to-write » : carte à écrire ; « missing » : disparue du scénario. */
  status: 'ok' | 'to-write' | 'missing'
  /** Lieu (scène « ok ») ou en-tête connu (scène disparue). */
  location: string
  intExt: PdfIntExt
  dayNight: PdfDayNight
  /** Longueur en huitièmes ; null = inconnue (à écrire, disparue). */
  eighths: number | null
  /** « Léa Dupont (MARIE) », « PAUL (sans interprète) »… */
  people: string[]
}

export interface PdfShootingDay {
  date: IsoDate | null
  title: string
  note: string
  scenes: PdfShootingScene[]
  /** Total des scènes « ok ». */
  eighths: number
  locations: string[]
  /** « Léa Dupont (MARIE, PAUL) ». */
  called: string[]
  withoutInterpreter: string[]
  /** « Marc — figurant » : présents ajoutés à la main pour ce jour. */
  presents: string[]
}

export interface ShootingPdfInput extends PdfCommon {
  days: PdfShootingDay[]
  /** Scènes qui ne sont dans aucun jour. */
  unplanned: number
}

// ---------------------------------------------------------------------------------------------
// Mise en page

export type FontFace = 'regular' | 'bold'

/** Largeur d'un texte en points. */
export type Measure = (text: string, face: FontFace, size: number) => number

/** Couleur #rrggbb. Les PDF n'utilisent jamais le thème : couleurs fixes ou couleurs des phases. */
export type Color = string

/** Élément posé sur la page. Positions en points, depuis le HAUT de la page. */
export type PageItem =
  | {
      type: 'text'
      text: string
      x: number
      baseline: number
      size: number
      face: FontFace
      color: Color
    }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number; color: Color; width: number }
  | {
      type: 'rect'
      x: number
      y: number
      width: number
      height: number
      fill: Color | null
      stroke: Color | null
      strokeWidth: number
    }
  | { type: 'diamond'; cx: number; cy: number; radius: number; fill: Color; stroke: Color | null }
  /** Coche dessinée (pas de caractère : la police n'en a pas besoin). `size` = côté de sa boîte. */
  | { type: 'check'; x: number; y: number; size: number; color: Color }

export interface PageLayout {
  items: PageItem[]
}
