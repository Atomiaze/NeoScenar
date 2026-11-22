// Entrées et plan de pages de l'export PDF.

import type { FountainDocument, Pagination, ResolvedLayout } from '@neoscenar/fountain'

export interface PdfOptions {
  /** Imprimer la page de titre (si le scénario en a une). */
  pageDeTitre: boolean
  /** « fountain » : le numéro écrit dans le texte (#30#) ; « continue » : 1, 2, 3 dans l'ordre du texte. */
  numerotation: 'fountain' | 'continue'
  /** Imprimer le scénario (étape 18C-4 : on peut n'exporter que des documents). */
  scenario: boolean
}

/** Morceau de mise en forme dans une ligne de document (positions dans `text`). */
export interface DocumentMark {
  from: number
  to: number
  bold: boolean
  italic: boolean
}

/** Ligne d'un document (synopsis, pitch…), déjà lue du Markdown. */
export type DocumentLine =
  | { kind: 'heading'; level: 1 | 2 | 3; text: string; marks: DocumentMark[] }
  | { kind: 'text'; text: string; marks: DocumentMark[] }
  | { kind: 'rule' }
  | { kind: 'blank' }

/** Document imprimé avant le scénario ; `title` est imprimé en titre 1 en haut de sa première page. */
export interface PdfTextDocument {
  title: string
  lines: DocumentLine[]
}

/** Textes ajoutés à la page de titre (jamais écrits dans le Fountain). */
export interface TitleExtras {
  tagLine: string | null
  logLine: string | null
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
  /** Documents à imprimer, dans l'ordre, entre la page de titre et le scénario. */
  documents?: PdfTextDocument[]
  titleExtras?: TitleExtras
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

/** Trait horizontal (ligne horizontale des documents), en points depuis le HAUT de la page. */
export interface RulePlan {
  x1: number
  x2: number
  y: number
}

export interface PagePlan {
  runs: TextRun[]
  rules?: RulePlan[]
}

export interface DocumentInfo {
  title: string
  author: string
}
