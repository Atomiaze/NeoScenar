// Entrées du générateur de planches et résultat de la mise en page.

/** « planches » : à dessiner, sans vignettes ; « storyboard » : avec les vignettes existantes. */
export type StoryboardKind = 'planches' | 'storyboard'

/** Un plan tel qu'il est imprimé : numéros déjà formatés, champs de la fiche en texte. */
export interface StoryboardShot {
  /** Identifiants internes permanents (repris dans le fichier d'impression). */
  shotId: string
  sceneId: string
  /** « S_0030 » et « P_0010 ». */
  sceneLabel: string
  shotLabel: string
  /** Nom libre du plan, ou chaîne vide. */
  name: string
  /** En-tête de la scène (« INT. CUISINE - JOUR »), ou chaîne vide. */
  sceneHeading: string
  /** Durée en secondes, ou null. */
  duration: number | null
  cameraMovement: string
  music: string
  shotSize: string
  sound: string
  cameraAngle: string
  description: string
}

export interface StoryboardOptions {
  /** Commencer chaque scène sur une nouvelle page. */
  newPagePerScene: boolean
}

/** Ce dont la mise en page a besoin (sans polices ni images). */
export interface LayoutInput {
  title: string
  /** Proportions du film (définition du projet). */
  format: { width: number; height: number }
  shots: StoryboardShot[]
  options: StoryboardOptions
}

export interface StoryboardFonts {
  regular: Uint8Array
  bold: Uint8Array
}

export interface StoryboardInput extends LayoutInput {
  kind: StoryboardKind
  /** Identifiant du projet (projet.json), repris dans le QR code. */
  projectId: string
  /** Identifiant de cette impression (nom du fichier impressions/<id>.json). */
  printId: string
  /** Date de l'export, ISO 8601. */
  createdAt: string
  fonts: StoryboardFonts
  /** Vignettes PNG par identifiant de plan (ignorées pour les planches à dessiner). */
  thumbnails: ReadonlyMap<string, Uint8Array>
}

export type FontFace = 'regular' | 'bold'

/** Largeur d'un texte en points, dans une police et une taille données. */
export type Measure = (text: string, face: FontFace, size: number) => number

export type InkColor = 'label' | 'ink' | 'muted'

/** Élément posé sur la page. Toutes les positions sont en points, depuis le HAUT de la page. */
export type PageItem =
  | {
      type: 'text'
      text: string
      x: number
      baseline: number
      size: number
      face: FontFace
      color: InkColor
    }
  | { type: 'rule'; x1: number; x2: number; y: number }
  | { type: 'frame'; x: number; y: number; width: number; height: number; thickness: number }
  | { type: 'cell'; shotId: string; x: number; y: number; width: number; height: number }

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** Case dessin d'un plan sur une page. */
export interface CellPlacement {
  shotId: string
  sceneId: string
  /** « S_0030 · P_0010 ». */
  label: string
  rect: Rect
}

export interface PageLayout {
  /** Numéro à partir de 1. */
  number: number
  items: PageItem[]
  cells: CellPlacement[]
}

export interface StoryboardLayout {
  pages: PageLayout[]
}

export interface StoryboardResult {
  /** Octets du PDF. */
  pdf: Uint8Array
  /** Contenu de storyboard/impressions/<printId>.json. */
  printRecord: PrintRecord
}

export interface MmRect {
  x: number
  y: number
  width: number
  height: number
}

export interface MmPoint {
  x: number
  y: number
}

/** Fichier d'impression : retrouve les cases dessin d'une page scannée (lu à l'étape 12). */
export interface PrintRecord {
  formatVersion: number
  printId: string
  projectId: string
  kind: StoryboardKind
  createdAt: string
  /** Définition du projet au moment de l'impression. */
  format: { width: number; height: number }
  paper: { widthMm: number; heightMm: number }
  marks: {
    sizeMm: number
    /** Centres des marques d'angle, en mm depuis le coin haut gauche de la feuille. */
    centersMm: { topLeft: MmPoint; topRight: MmPoint; bottomLeft: MmPoint; bottomRight: MmPoint }
  }
  /** Rappel lisible de l'origine des rectangles des cases. */
  origin: string
  pages: {
    number: number
    shots: { shotId: string; sceneId: string; label: string; cellMm: MmRect }[]
  }[]
}
