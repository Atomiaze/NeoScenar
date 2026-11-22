// Fiches du module Recherches : un fichier Markdown par personnage et par lieu,
// avec des propriétés YAML en tête, au format d'Obsidian.

/** Dossier des fiches, relatif à neoscenar/ (c'est aussi l'identifiant du type de fiche). */
export type SheetKind = 'personnages' | 'lieux'

/** Rôles proposés pour un personnage, dans l'ordre du tri de la liste. */
export const CHARACTER_ROLES = ['principal', 'secondaire', 'figurant'] as const
export type CharacterRole = (typeof CHARACTER_ROLES)[number]

/** Genres proposés pour un personnage (libellés écrits tels quels dans la fiche). « Non défini » = absent. */
export const CHARACTER_GENDERS = [
  'Femme',
  'Homme',
  'Non-binaire',
  'Genre Fluide',
  'Agenre',
  'Neutre',
  'Non défini'
] as const

/** Ce que NeoScenar connaît d'un type de fiche. */
export interface SheetSchema {
  /** Valeur de la propriété « type ». */
  type: string
  /** Propriétés éditées dans la fiche (texte), en plus de « nom » et « auto ». */
  props: readonly string[]
  /** Propriétés écrites comme un nombre quand elles n'en contiennent qu'un (« age: 16 »). */
  numericProps: readonly string[]
  /** Sections du corps éditées en texte simple : clé et titre « ## … ». */
  sections: readonly (readonly [key: string, heading: string])[]
}

/** Titre de la section qui contient les images (galerie). */
export const IMAGES_HEADING = 'Images'

/** Sous-dossier des images d'un type de fiche (« personnages/images/ »). */
export const SHEET_IMAGES_FOLDER = 'images'

export const SHEET_SCHEMAS: Record<SheetKind, SheetSchema> = {
  personnages: {
    type: 'personnage',
    props: ['interprete', 'age', 'role', 'genre', 'couleur', 'resume'],
    numericProps: ['age'],
    sections: [
      ['description', 'Description'],
      ['objectifs', 'Objectifs'],
      ['relations', 'Relations']
    ]
  },
  lieux: {
    type: 'lieu',
    props: ['resume'],
    numericProps: [],
    sections: [
      ['description', 'Description'],
      ['reperage', 'Repérage']
    ]
  }
}

/** Contenu d'une fiche tel que le moteur le lit (sans rien de ce qu'il ne connaît pas). */
export interface SheetContent {
  nom: string
  /** Propriétés connues, en texte ('' si absentes). */
  props: Record<string, string>
  /** Vrai : créée automatiquement et jamais complétée. */
  auto: boolean
  /** Texte des sections connues ('' si absentes). */
  sections: Record<string, string>
  /** Images de la section « ## Images », telles qu'écrites (« images/marie-1.jpg »). */
  images: string[]
  /**
   * Propriétés illisibles (erreur de syntaxe faite dans un autre logiciel) : la fiche est
   * affichée, mais NeoScenar ne la réécrit pas, pour ne rien abîmer.
   */
  unreadable: boolean
}

/** Image d'une fiche, avec de quoi l'afficher. */
export interface SheetImage {
  /** Chemin tel qu'écrit dans la fiche : c'est lui qui sert à la retirer. */
  ref: string
  /** Chemin relatif à neoscenar/ (« personnages/images/marie-1.jpg ») ; null si introuvable. */
  path: string | null
}

/** Fiche envoyée à l'interface. */
export interface Sheet extends Omit<SheetContent, 'images'> {
  kind: SheetKind
  /** Nom du fichier (« MARIE.md ») : identifiant de la fiche. */
  fileName: string
  images: SheetImage[]
}

/**
 * Modification d'une fiche : seuls les champs présents changent. Le reste du fichier (y compris ce
 * qui a été ajouté ailleurs entre-temps) est gardé tel quel.
 */
export interface SheetPatch {
  props?: Record<string, string>
  auto?: boolean
  sections?: Record<string, string>
  /** Nouvelle liste complète des images (chemins tels qu'écrits). */
  images?: string[]
}

/** Résultat d'un renommage de fiche (étape 10D). */
export interface SheetRename {
  sheet: Sheet
  /** Copie de sécurité « sauvegardes/avant_renommage_… », ou null (annulation). */
  backupFolder: string | null
}
