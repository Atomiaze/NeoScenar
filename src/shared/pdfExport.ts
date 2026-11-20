// Export PDF du scénario : échanges entre la fenêtre d'export (interface) et le processus principal.

/** Options de l'export, mémorisées dans projet.json (mêmes valeurs que le module pdf-scenario). */
export interface PdfExportOptions {
  /** Imprimer la page de titre (si le scénario en a une). */
  pageDeTitre: boolean
  /** « fountain » : numéros écrits dans le texte ; « continue » : 1, 2, 3 (dans le PDF seulement). */
  numerotation: 'fountain' | 'continue'
  /**
   * Chaque acte commence une nouvelle page (étape 13D). Option du projet : elle change aussi la
   * pagination à l'écran, jamais le fichier.
   */
  nouvellePageParActe: boolean
}

export const DEFAULT_PDF_OPTIONS: PdfExportOptions = {
  pageDeTitre: true,
  numerotation: 'fountain',
  nouvellePageParActe: false
}

/** Ce que l'interface envoie : le texte ACTUEL de l'éditeur (même non enregistré) et les options. */
export interface PdfExportRequest {
  text: string
  options: PdfExportOptions
  /** Ajouter (SUITE) aux reprises de parole (préférence de l'application, comme à l'écran). */
  continued: boolean
}

export interface PdfPreview {
  /** Octets du PDF réel, affichés par la visionneuse PDF de Chromium. */
  bytes: Uint8Array
  pageCount: number
}

/** « project » : dans exports/ du projet ; « choose » : l'élève choisit l'emplacement. */
export type PdfSaveMode = 'project' | 'choose'

export interface PdfSavedFile {
  /** Chemin absolu (affichage dans l'info-bulle), relu par « Ouvrir » et « Afficher ». */
  path: string
  /** Relatif au dossier du film, avec « / » : c'est ce qui est affiché. */
  relativePath: string
}

export type PdfFileAction = 'open' | 'reveal'
