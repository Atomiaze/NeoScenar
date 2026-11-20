// Profil de mise en page (par exemple « Scénario Final Draft (A4) ») : mesures de la page et de chaque élément.
// Le profil est un fichier JSON livré avec l'application ; ce module ne le lit pas lui-même (aucune dépendance),
// il reçoit son contenu et en déduit les mesures en caractères utilisées par la pagination et l'éditeur.

import type { ElementType } from './types.ts'

/** Éléments imprimés ; les autres (notes, sections, synopsis, texte mis de côté) n'occupent aucune ligne. */
export type PrintedElementType = Extract<
  ElementType,
  | 'scene_heading'
  | 'action'
  | 'character'
  | 'parenthetical'
  | 'dialogue'
  | 'lyrics'
  | 'transition'
  | 'centered'
>

export const PRINTED_TYPES: readonly PrintedElementType[] = [
  'scene_heading',
  'action',
  'character',
  'parenthetical',
  'dialogue',
  'lyrics',
  'transition',
  'centered'
]

export type TextAlign = 'left' | 'right' | 'center'

export interface ElementStyle {
  /** Retrait depuis la marge gauche du texte, en millimètres (KIT définit ses retraits en mm). */
  indentMm: number
  /** Largeur en caractères ; absente : jusqu'au bord droit du texte. */
  widthCh?: number
  align: TextAlign
  uppercase: boolean
  italic?: boolean
  /** Lignes vides avant l'élément (supprimées en haut de page, et à l'intérieur d'un bloc de dialogue). */
  spaceBefore: number
}

export interface LayoutProfile {
  formatVersion: number
  id: string
  name: string
  page: { widthPt: number; heightPt: number }
  font: { family: string; sizePt: number; charWidthPt: number; lineHeightPt: number }
  /** Marge gauche et haut de la première ligne en points, largeur du texte en caractères. */
  text: { leftPt: number; topPt: number; widthCh: number; linesPerPage: number }
  /** Numéro de scène dans la marge gauche : position de son bord droit. */
  sceneNumber: { rightPt: number }
  /** Numéro de page en haut à droite. */
  pageNumber: { topPt: number; rightPt: number }
  elements: Record<PrintedElementType, ElementStyle>
}

export interface ResolvedStyle {
  /** Retrait exact en caractères (fractionnaire), pour l'écran et le PDF. */
  indentCh: number
  /** Nombre entier de caractères par ligne, pour la coupure des mots. */
  wrapWidth: number
  align: TextAlign
  uppercase: boolean
  italic: boolean
  spaceBefore: number
}

export interface ResolvedLayout {
  profile: LayoutProfile
  linesPerPage: number
  textWidthCh: number
  styles: Record<PrintedElementType, ResolvedStyle>
}

const POINTS_PER_MM = 72 / 25.4
// Tolérance pour les arrondis : 61 − 20,08 ch donne 40 caractères, pas 41.
const EPSILON = 1e-6

export function mmToCh(mm: number, charWidthPt: number): number {
  return (mm * POINTS_PER_MM) / charWidthPt
}

/** Convertit les mesures du profil en caractères. */
export function resolveLayout(profile: LayoutProfile): ResolvedLayout {
  const textWidthCh = profile.text.widthCh
  const styles = {} as Record<PrintedElementType, ResolvedStyle>
  for (const type of PRINTED_TYPES) {
    const style = profile.elements[type]
    const indentCh = mmToCh(style.indentMm, profile.font.charWidthPt)
    const available = Math.floor(textWidthCh - indentCh + EPSILON)
    styles[type] = {
      indentCh,
      wrapWidth: Math.max(1, Math.min(style.widthCh ?? available, available)),
      align: style.align,
      uppercase: style.uppercase,
      italic: style.italic ?? false,
      spaceBefore: style.spaceBefore
    }
  }
  return { profile, linesPerPage: profile.text.linesPerPage, textWidthCh, styles }
}
