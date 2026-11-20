// Formats des fichiers d'un projet NeoScenar.
// Toute modification incompatible de ces formats doit augmenter PROJECT_FORMAT_VERSION.

import type { PdfExportOptions } from './pdfExport'
import type { PlanningExportOptions } from './planningExport'
import type { StoryboardExportOptions } from './storyboardExport'

/** Version du format des fichiers de projet gérée par cette version de l'application. */
export const PROJECT_FORMAT_VERSION = 1

/** Nom du dossier de données de NeoScenar, à la racine du dossier du film. */
export const DATA_FOLDER_NAME = 'neoscenar'

/** Extension du fichier qu'on ouvre (double-clic dans le Finder). */
export const PROJECT_FILE_EXTENSION = 'neoscenar'

/** Valeur du champ « type » du fichier .neoscenar, pour reconnaître un projet. */
export const PROJECT_FILE_TYPE = 'neoscenar-projet'

/** Noms des fichiers du dossier neoscenar/. */
export const PROJECT_FILES = {
  scenario: 'scenario.fountain',
  project: 'projet.json',
  decoupage: 'decoupage.json'
} as const

/** Sous-dossiers créés dans neoscenar/ (chemins relatifs, séparés par « / »). */
export const DATA_SUBFOLDERS = [
  'personnages/images',
  'lieux/images',
  'documents',
  'storyboard/scans',
  'storyboard/vignettes',
  'blender',
  'versions',
  'sauvegardes',
  'exports'
] as const

export type ProjectType = 'film' | 'animation' | 'mixte' | 'personnalise'

export const PROJECT_TYPES: readonly ProjectType[] = ['film', 'animation', 'mixte', 'personnalise']

/** Fichier « Nom.neoscenar » : identifie le projet. C'est le fichier qu'on ouvre. */
export interface ProjectFile {
  type: typeof PROJECT_FILE_TYPE
  formatVersion: number
  /** Nom du dossier de données, relatif au dossier du film (toujours « neoscenar »). */
  dataFolder: string
}

/** Fichier neoscenar/projet.json : informations générales du projet. */
export interface ProjectData {
  formatVersion: number
  /** Identifiant unique et permanent du projet (UUID). */
  id: string
  /** Titre d'origine, avec accents et espaces (« Mon Film d'été »). */
  title: string
  /** Nom du dossier du film créé à partir du titre (« Mon_Film_d_ete »). */
  folderName: string
  projectType: ProjectType
  /** Identifiant du modèle de dossiers utilisé à la création (« saint-luc »). */
  template: string
  /** Dates au format ISO 8601 (« 2026-11-17T15:40:12.000Z »). */
  createdAt: string
  modifiedAt: string
  logline: string
  synopsis: string
  settings: ProjectSettings
  /** Dossiers du film créés par NeoScenar (« 04_Son »…), relatifs au dossier du film. */
  filmFolders: string[]
  /** Dernier export vers Blender, ou null. Ajouté à l'étape 5a. */
  lastBlenderExport: BlenderExportRecord | null
  /** Options du dernier export PDF du scénario. Ajouté à l'étape 9B. */
  exportPdf: PdfExportOptions
  /** Options du dernier export PDF du storyboard. Ajouté à l'étape 11B. */
  exportStoryboard: StoryboardExportOptions
  /** Dernier export du planning (étape 15E-2). Absent des projets plus anciens : valeurs par défaut. */
  exportPlanning?: PlanningExportOptions
}

export interface BlenderExportRecord {
  /** Date ISO 8601 de l'export. */
  exportedAt: string
  /** Fichier .blend visé, relatif au dossier du film, séparé par « / ». */
  blendPath: string
}

export interface ProjectSettings {
  /** Images par seconde. */
  fps: number
  /** Définition en pixels. */
  resolution: { width: number; height: number }
}

/** Fichier neoscenar/decoupage.json : scènes et plans du découpage technique. */
export interface Decoupage {
  formatVersion: number
  /** Une fois verrouillés, les numéros existants ne changent plus. */
  numbersLocked: boolean
  /**
   * Vrai une fois le découpage relié au scénario (première liaison faite, étape 8). Tant qu'il est
   * faux, le premier rapprochement relie les scènes aux cartes dans l'ordre.
   */
  scriptLinked: boolean
  /**
   * Scènes dans l'ordre du film (celui du scénario). Les numéros sont uniques, mais pas forcément
   * croissants : une scène déplacée quand les numéros sont verrouillés garde son numéro.
   */
  scenes: Scene[]
}

/** Numéro affiché d'une scène ou d'un plan : 10 et « A » donnent S_0010A ou P_0010A. */
export interface ItemNumber {
  number: number
  /** Lettre ajoutée quand il n'y a plus de numéro libre (« A »), ou chaîne vide. */
  letter: string
}

export interface Scene extends ItemNumber {
  /** Identifiant interne permanent (UUID), distinct du numéro affiché. */
  id: string
  /** Titre libre donné par l'étudiant. */
  name: string
  /** En-tête de scène, en majuscules (« INT. CUISINE - JOUR »). Ajouté à l'étape 2. */
  heading: string
  /** Couleur de fond de la carte (« #f2c94c »), ou null pour la couleur par défaut. */
  color: string | null
  /** Plans dans l'ordre de montage. */
  shots: Shot[]
  /**
   * Carte orpheline : sa scène n'est plus dans le scénario (étape 8). Mémorisé pour ne signaler,
   * à l'ouverture ou après un rechargement, que les cartes qui viennent de le devenir.
   */
  orphan: boolean
}

/** Plan, avec les champs de sa fiche détaillée (cahier des charges, section 5). */
export interface Shot extends ItemNumber {
  /** Identifiant interne permanent (UUID), distinct du numéro affiché. */
  id: string
  name: string
  color: string | null
  /**
   * Vignette PNG aux proportions du projet, chemin relatif au dossier neoscenar/
   * (« storyboard/vignettes/<id>_<horodatage>.png »).
   */
  thumbnail: string | null
  /**
   * Image d'origine importée, conservée telle quelle pour pouvoir recadrer à nouveau
   * (« storyboard/originaux/<id>_<horodatage>.jpg »). Ajouté à l'étape 3.
   */
  thumbnailSource: string | null
  /** Dernier cadre utilisé pour fabriquer la vignette depuis l'image d'origine. Étape 3. */
  thumbnailCrop: ThumbnailCrop | null
  /** Durée en secondes. */
  duration: number | null
  /** Échelle de plan (« Gros plan »…), texte libre ou choisi dans la liste. */
  shotSize: string | null
  /** Mouvement de caméra (« Panoramique »…). */
  cameraMovement: string | null
  /** Angle de prise de vue (« Plongée »…). */
  cameraAngle: string | null
  /** Sons, bruitages, dialogues. */
  sound: string
  music: string
  description: string
}

/** Rotation ajoutée par l'élève, en degrés dans le sens des aiguilles d'une montre. */
export type ThumbnailRotation = 0 | 90 | 180 | 270

/** Cadre en fractions (0 à 1) de la largeur et de la hauteur de l'image après rotation. */
export interface CropFrame {
  x: number
  y: number
  width: number
  height: number
}

/** Fabrication d'une vignette à partir de son image d'origine. */
export interface ThumbnailCrop {
  /** Appliquée après l'orientation EXIF de la photo. */
  rotation: ThumbnailRotation
  /** « crop » : on garde le cadre ; « fit » : toute l'image, avec des bandes. */
  mode: 'crop' | 'fit'
  /** Dernier cadre utilisé (gardé aussi en mode « fit », pour y revenir). */
  frame: CropFrame
  /** Couleur des bandes en mode « fit ». */
  bands: 'white' | 'black'
  /** Recadré automatiquement (import de plusieurs images) : badge « À vérifier ». */
  auto: boolean
}
