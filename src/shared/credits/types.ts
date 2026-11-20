// Générique du film (étape 10b) : modèle de l'école, données de l'élève (neoscenar/generique.json)
// et résultat de l'assemblage, commun à l'export texte et à la mise en page PNG.

import type { ProjectType } from '../projectTypes'

/** Version du format de generique.json gérée par cette version de l'application. */
export const CREDITS_FORMAT_VERSION = 1

/** Fichier des données du générique, dans neoscenar/. */
export const CREDITS_FILE = 'generique.json'

/** Dossier des exports, relatif au dossier du film (séparé par « / »). */
export const CREDITS_EXPORT_FOLDER = '08_Graphisme/Generique'

/** Dossier des logos copiés dans le projet, relatif à neoscenar/ (séparé par « / »). */
export const CREDITS_LOGOS_FOLDER = 'generique/logos'

/** Fichier de l'export texte brut. */
export const CREDITS_TEXT_FILE = 'generique.txt'

// ---------------------------------------------------------------------------------------------
// Modèle (resources/modeles/generique-saint-luc.json), modifiable par l'enseignant.

/** Rubrique remplie automatiquement : acteurs (fiches) ou interprètes des figurants. */
export type RubricSource = 'acteurs' | 'figurants'

export interface TemplateRubric {
  /** Identifiant permanent (« image.chef-op ») : c'est lui qu'on retrouve dans generique.json. */
  id: string
  intitule: string
  source?: RubricSource
}

export interface TemplateBlock {
  id: string
  /** Nom du bloc dans le formulaire (jamais exporté). */
  titre: string
  /** Bloc masqué sauf pour certains types de projet ou si l'élève l'affiche. */
  facultatif?: boolean
  /** Types de projet pour lesquels un bloc facultatif est affiché d'office. */
  afficheSiType?: ProjectType[]
  /** Contenu ajouté après les rubriques : musiques préexistantes ou mentions et logos. */
  special?: 'musiques' | 'mentions'
  rubriques: TemplateRubric[]
}

/** Textes du modèle. « {…} » est remplacé à l'assemblage. */
export interface TemplateTexts {
  fiction: string
  animaux: string
  /** {lieu} */
  tourneA: string
  /** {annee}, {titulaire} */
  copyright: string
  /** {anneeScolaire} (« 2026-2027 ») ; vide = pas de ligne. */
  ligneEcole: string
  musiqueInterprete: string
  musiqueAuteurs: string
  musiqueAutorisation: string
  /** {noms} : un seul nom en production. */
  presente: string
  /** {noms} : au moins deux noms en production. */
  presentent: string
  unFilmDe: string
  realisePar: string
  /** Mot qui relie les deux derniers noms (« Léa et Tom »). */
  et: string
}

export interface CreditsTemplate {
  formatVersion: number
  id: string
  name: string
  textes: TemplateTexts
  /** Logo de l'école, relatif à neoscenar/ une fois copié ; toujours en dernier. */
  logoEcole: string | null
  /** Rubriques dont les noms remplissent les cartons « présente » et « Un film de ». */
  cartons: { production: string; realisation: string }
  blocs: TemplateBlock[]
}

// ---------------------------------------------------------------------------------------------
// Données de l'élève (neoscenar/generique.json). Clés en français, comme projet.json.

export type ActorOrder = 'importance' | 'apparition'
export type CreditsSize = 'petite' | 'moyenne' | 'grande'
export type CreditsLayout = 'deux-colonnes' | 'centree'
export type TextPresentation = 'dessus' | 'tabulation'

export const START_CARDS = [
  'logos',
  'presente',
  'unFilmDe',
  'acteursPrincipaux',
  'titre',
  'realisePar'
] as const
export type StartCardKind = (typeof START_CARDS)[number]

export interface CreditsOptions {
  ordreActeurs: ActorOrder
  taille: CreditsSize
  disposition: CreditsLayout
  /** Blocs facultatifs affichés par l'élève (« animation », « documentaire »). */
  blocsAffiches: string[]
}

export interface CreditsRubricData {
  id: string
  /** Bloc d'une rubrique ajoutée ; absent pour une rubrique du modèle. */
  bloc?: string
  /** null = intitulé du modèle. */
  intitule: string | null
  noms: string[]
}

export interface PreexistingMusic {
  titre: string
  interprete: string
  auteurs: string
  autorisation: string
}

export interface CreditsMentions {
  fiction: boolean
  animaux: boolean
  /** null = année en cours. */
  copyrightAnnee: number | null
  copyrightTitulaire: string
  tourneA: string
  /** Ligne de l'école : null = texte du modèle, '' = pas de ligne. */
  ligneEcole: string | null
}

export interface CreditsData {
  version: number
  modele: string
  options: CreditsOptions
  /** Noms des personnages corrigés par l'élève, par nom de fiche en capitales (« MARIE »). */
  acteurs: { nomsAffiches: Record<string, string> }
  /** Rubriques du modèle remplies ou renommées, puis rubriques ajoutées (dans leur ordre). */
  rubriques: CreditsRubricData[]
  musiques: PreexistingMusic[]
  mentions: CreditsMentions
  /** Logos, relatifs à neoscenar/ (« generique/logos/saint-luc.png »). */
  logos: string[]
  cartonsDebut: StartCardKind[]
}

/** Ce que l'interface reçoit pour afficher le formulaire. */
export interface CreditsContent {
  template: CreditsTemplate
  data: CreditsData
  projectType: ProjectType
}

// ---------------------------------------------------------------------------------------------
// Résultat de l'assemblage.

/** Une ligne de rubrique : un nom, précédé du personnage pour les acteurs. */
export interface CreditsEntry {
  personnage?: string
  nom: string
}

export type CreditsSection =
  | { kind: 'rubrique'; id: string; intitule: string; entries: CreditsEntry[] }
  /** Musique préexistante : titre puis lignes « libellé + valeur » non vides. */
  | { kind: 'musique'; titre: string; lignes: { libelle: string; valeur: string }[] }
  | { kind: 'mention'; texte: string }
  | { kind: 'logos'; chemins: string[] }

export interface CreditsBlock {
  id: string
  sections: CreditsSection[]
}

export type StartCard =
  { kind: 'logos'; chemins: string[] } | { kind: Exclude<StartCardKind, 'logos'>; lignes: string[] }

/** Personnage qui n'apparaît pas au générique, et pourquoi. */
export interface CreditsWarning {
  personnage: string
  raison: 'sans-interprete'
}

export interface AssembledCredits {
  titre: string
  cartons: StartCard[]
  blocs: CreditsBlock[]
  avertissements: CreditsWarning[]
}
