// Entrées et plan de pages de l'export PDF.

import type { FountainDocument, Pagination, ResolvedLayout } from '@neoscenar/fountain'

export interface PdfOptions {
  /** Imprimer la page de titre (si le scénario en a une). */
  pageDeTitre: boolean
  /** « fountain » : le numéro écrit dans le texte (#30#) ; « continue » : 1, 2, 3 dans l'ordre du texte. */
  numerotation: 'fountain' | 'continue'
}

/** Octets des quatre fichiers de la police (TrueType). */
export interface PdfFonts {
  regular: Uint8Array
  bold: Uint8Array
  italic: Uint8Array
  boldItalic: Uint8Array
}

export interface PdfInput {
  document: FountainDocument
  /** Pagination de `document` avec `layout` (la même que celle de l'éditeur). */
  pagination: Pagination
  layout: ResolvedLayout
  fonts: PdfFonts
  options: PdfOptions
}

/** Morceau de texte d'une même mise en forme, posé sur la page. */
export interface TextRun {
  text: string
  /** Bord gauche, en points depuis le bord gauche de la page. */
  x: number
  /** Ligne de base, en points depuis le HAUT de la page. */
  baseline: number
  bold: boolean
  italic: boolean
  underline: boolean
}

export interface PagePlan {
  runs: TextRun[]
}

export interface DocumentInfo {
  title: string
  author: string
}
