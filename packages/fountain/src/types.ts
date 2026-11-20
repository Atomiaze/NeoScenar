// Structure de données d'un scénario Fountain analysé.

export type ElementType =
  | 'scene_heading'
  | 'action'
  | 'character'
  | 'parenthetical'
  | 'dialogue'
  | 'lyrics'
  | 'transition'
  | 'centered'
  | 'page_break'
  | 'section'
  | 'synopsis'
  | 'note'
  | 'boneyard'

/**
 * Position d'un élément dans le texte d'origine.
 * Les lignes sont numérotées à partir de 1 ; endLine est la dernière ligne de l'élément lui-même
 * (sans les lignes vides qui le suivent). Les décalages couvrent tout le texte source de l'élément :
 * texteOriginal.slice(startOffset, endOffset) === element.raw.
 */
export interface Position {
  startLine: number
  endLine: number
  startOffset: number
  endOffset: number
}

/** Note [[…]] ou texte mis de côté /*…*\/ repéré dans le texte d'origine (décalages absolus). */
export interface MarkedText {
  start: number
  end: number
  /** Contenu, sans les marqueurs. */
  text: string
}

export interface SceneHeadingInfo {
  /** Préfixe tel qu'écrit : « INT. », « EXT. », « INT./EXT. »… ; vide pour un en-tête forcé sans préfixe. */
  prefix: string
  /** Tout ce qui se trouve entre le préfixe et le dernier « - ». */
  location: string
  /** Dernier segment après « - » ; vide s'il n'y a pas de « - ». */
  time: string
  /** Numéro de scène écrit entre # en fin de ligne (« 12A »), ou null. */
  number: string | null
}

export interface CharacterInfo {
  /** Nom sans les extensions : « ÉLODIE ». */
  name: string
  /** Extensions entre parenthèses : ['V.O.'], ['SUITE']… */
  extensions: string[]
  /** Dialogue simultané (^ en fin de ligne). */
  dual: boolean
}

export interface FountainElement {
  type: ElementType
  /** Texte utile, sans les marqueurs de forçage ou de syntaxe (!, @, >, ~, ., =, #). Fins de ligne en « \n ». */
  text: string
  /** Un marqueur de forçage (!, @, ., >) était présent. */
  forced: boolean
  /**
   * Texte source exact : lignes de l'élément, fins de ligne et lignes vides qui le suivent.
   * Absent pour un élément créé ou modifié par programme : il sera alors réécrit proprement.
   */
  raw?: string
  position?: Position
  /** Notes [[…]] contenues dans l'élément, même au milieu d'une ligne. */
  notes: MarkedText[]
  /** Textes mis de côté /*…*\/ contenus dans l'élément. */
  boneyards: MarkedText[]
  scene?: SceneHeadingInfo
  character?: CharacterInfo
  section?: { level: number }
}

export interface TitlePageEntry {
  key: string
  /** Valeur ; les valeurs sur plusieurs lignes sont jointes par « \n ». */
  value: string
  /** Texte source exact de l'entrée ; absent si l'entrée a été créée ou modifiée par programme. */
  raw?: string
}

export interface TitlePage {
  entries: TitlePageEntry[]
  /** Texte source exact de toute la page de titre, lignes vides finales comprises ; absent si modifiée. */
  raw?: string
}

export interface FountainDocument {
  /** Le fichier commençait par une marque d'ordre des octets (BOM). */
  bom: boolean
  /** Fin de ligne majoritaire du fichier, utilisée pour le texte produit par programme. */
  lineEnding: '\n' | '\r\n' | '\r'
  titlePage: TitlePage | null
  /** Lignes vides placées avant le premier élément (quand il n'y a pas de page de titre). */
  leading: string
  elements: FountainElement[]
}
