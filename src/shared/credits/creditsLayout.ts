// Mise en page du générique (étape 10bC) : déroulant de fin et cartons de début. Logique pure : la
// mesure du texte et la taille des logos sont fournies par l'appelant (canvas dans l'interface,
// valeurs fictives dans les tests). Toutes les mesures sont proportionnelles à la largeur du
// projet : un projet 4K donne la même mise en page qu'en Full HD, deux fois plus grande.

import type {
  AssembledCredits,
  CreditsLayout,
  CreditsSection,
  CreditsSize,
  StartCard,
  StartCardKind
} from './types'

export type FontWeight = 'normal' | 'bold'
export type TextAlign = 'left' | 'center' | 'right'

export interface LayoutTools {
  /** Largeur du texte en pixels, dans la police du générique. */
  measure(text: string, weight: FontWeight, size: number): number
  /** Taille d'origine d'un logo (pour ses proportions), ou null s'il est illisible. */
  logoSize(path: string): { width: number; height: number } | null
}

export type LayoutItem =
  | {
      kind: 'text'
      text: string
      /** Point d'ancrage selon `align`. */
      x: number
      /** Ligne de base. */
      y: number
      size: number
      weight: FontWeight
      align: TextAlign
    }
  | { kind: 'logo'; path: string; x: number; y: number; width: number; height: number }

export interface PlacedLayout {
  width: number
  height: number
  items: LayoutItem[]
}

export interface RollLayout extends PlacedLayout {
  /** Hauteurs où l'on peut couper sans trancher une rubrique (entre deux sections). */
  cuts: number[]
  /** Hauteurs entre deux lignes : seulement si une section dépasse à elle seule la limite. */
  lineCuts: number[]
}

/** Hauteur maximale d'un PNG : au-delà, le déroulant est coupé en plusieurs parties. */
export const MAX_PNG_HEIGHT = 16384

/** Temps qu'une ligne met à traverser l'écran, en secondes. */
export const SECONDS_PER_SCREEN = 8

/** Corps du texte, en part de la largeur du projet. */
export const SIZE_RATIO: Record<CreditsSize, number> = {
  petite: 0.018,
  moyenne: 0.023,
  grande: 0.03
}

const LINE = 1.4 // interligne, en corps
const BASELINE = 0.75 // ligne de base dans la boîte d'une ligne, en interlignes
const HEADING = 0.8 // corps des intitulés (capitales grasses)
const MENTION = 0.8 // corps des mentions
const MARGIN = 0.08 // marges gauche et droite, en part de la largeur
const GUTTER = 0.025 // espace entre les deux colonnes, en part de la largeur
const LOGO_HEIGHT = 3 // hauteur des logos du déroulant, en corps
const LOGO_GAP = 1.5 // espace entre deux logos, en corps

// ---------------------------------------------------------------------------------------------
// Outils communs

/** Coupe un texte en lignes qui tiennent dans `maxWidth` (un mot trop long reste entier). */
export function wrapText(
  text: string,
  weight: FontWeight,
  size: number,
  maxWidth: number,
  tools: Pick<LayoutTools, 'measure'>
): string[] {
  const words = text.split(/\s+/).filter((word) => word !== '')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current === '' ? word : `${current} ${word}`
    if (current !== '' && tools.measure(candidate, weight, size) > maxWidth) {
      lines.push(current)
      current = word
    } else current = candidate
  }
  if (current !== '') lines.push(current)
  return lines
}

interface LogoBox {
  path: string
  width: number
  height: number
}

/**
 * Logos en rangées centrées, à hauteur commune : une nouvelle rangée commence quand la largeur
 * disponible est remplie. Un logo plus large que la rangée est réduit pour y tenir.
 */
function logoRows(
  paths: readonly string[],
  height: number,
  gap: number,
  maxWidth: number,
  tools: LayoutTools
): LogoBox[][] {
  const rows: LogoBox[][] = []
  let row: LogoBox[] = []
  let rowWidth = 0
  for (const path of paths) {
    const size = tools.logoSize(path)
    if (!size || size.width <= 0 || size.height <= 0) continue
    let box = { path, width: (size.width / size.height) * height, height }
    if (box.width > maxWidth)
      box = { path, width: maxWidth, height: maxWidth * (size.height / size.width) }
    const needed = row.length === 0 ? box.width : rowWidth + gap + box.width
    if (row.length > 0 && needed > maxWidth) {
      rows.push(row)
      row = [box]
      rowWidth = box.width
    } else {
      row.push(box)
      rowWidth = needed
    }
  }
  if (row.length > 0) rows.push(row)
  return rows
}

/** Place des rangées de logos à partir de `top` ; renvoie la hauteur occupée. */
function placeLogoRows(
  rows: LogoBox[][],
  top: number,
  width: number,
  gap: number,
  rowGap: number,
  items: LayoutItem[]
): number {
  let y = top
  rows.forEach((row, index) => {
    if (index > 0) y += rowGap
    const rowWidth = row.reduce((sum, box) => sum + box.width, 0) + gap * (row.length - 1)
    const rowHeight = Math.max(...row.map((box) => box.height))
    let x = (width - rowWidth) / 2
    for (const box of row) {
      items.push({ kind: 'logo', ...box, x, y: y + (rowHeight - box.height) / 2 })
      x += box.width + gap
    }
    y += rowHeight
  })
  return y - top
}

// ---------------------------------------------------------------------------------------------
// Déroulant de fin

export interface RollOptions {
  width: number
  taille: CreditsSize
  disposition: CreditsLayout
}

/** Le déroulant, ligne par ligne : chaque ligne occupe une boîte d'un interligne. */
class RollWriter {
  readonly items: LayoutItem[] = []
  readonly cuts: number[] = []
  readonly lineCuts: number[] = []
  y = 0
  readonly size: number
  readonly line: number
  readonly margin: number
  readonly left: number
  readonly right: number
  readonly columnWidth: number

  constructor(
    readonly options: RollOptions,
    readonly tools: LayoutTools
  ) {
    const { width } = options
    this.size = width * SIZE_RATIO[options.taille]
    this.line = this.size * LINE
    this.margin = width * MARGIN
    this.left = width / 2 - (width * GUTTER) / 2
    this.right = width / 2 + (width * GUTTER) / 2
    this.columnWidth = this.left - this.margin
  }

  get fullWidth(): number {
    return this.options.width - 2 * this.margin
  }

  wrap(text: string, weight: FontWeight, size: number, maxWidth: number): string[] {
    return wrapText(text, weight, size, maxWidth, this.tools)
  }

  text(text: string, row: number, x: number, align: TextAlign, weight: FontWeight, size: number) {
    const y = this.y + row * this.line + this.line * BASELINE
    this.items.push({ kind: 'text', text, x, y, size, weight, align })
  }

  /** Lignes centrées, à la suite. */
  centered(lines: string[], weight: FontWeight, size = this.size): void {
    lines.forEach((line, row) =>
      this.text(line, row, this.options.width / 2, 'center', weight, size)
    )
    this.advance(lines.length)
  }

  /** Avance de `rows` lignes ; chaque limite entre deux lignes est une coupure de secours. */
  advance(rows: number): void {
    for (let row = 0; row < rows; row++) {
      this.y += this.line
      this.lineCuts.push(this.y)
    }
  }

  /** Deux colonnes : `leftLines` alignées à droite, `rightLines` à gauche, sur les mêmes lignes. */
  columns(
    leftLines: string[],
    leftWeight: FontWeight,
    leftSize: number,
    rightLines: string[]
  ): void {
    leftLines.forEach((line, row) => this.text(line, row, this.left, 'right', leftWeight, leftSize))
    rightLines.forEach((line, row) => this.text(line, row, this.right, 'left', 'normal', this.size))
    this.advance(Math.max(leftLines.length, rightLines.length))
  }

  heading(intitule: string): string {
    return intitule.toLocaleUpperCase('fr')
  }

  section(section: CreditsSection): void {
    const headingSize = this.size * HEADING
    switch (section.kind) {
      case 'rubrique': {
        const title = this.heading(section.intitule)
        const isCast = section.entries.some((entry) => entry.personnage !== undefined)
        if (isCast) {
          // Distribution, quelle que soit la disposition : intitulé centré, puis personnage à
          // gauche et interprète à droite.
          this.centered(this.wrap(title, 'bold', headingSize, this.fullWidth), 'bold', headingSize)
          for (const entry of section.entries)
            this.columns(
              this.wrap(entry.personnage ?? '', 'normal', this.size, this.columnWidth),
              'normal',
              this.size,
              this.wrap(entry.nom, 'normal', this.size, this.columnWidth)
            )
          return
        }
        if (this.options.disposition === 'centree') {
          this.centered(this.wrap(title, 'bold', headingSize, this.fullWidth), 'bold', headingSize)
          for (const entry of section.entries)
            this.centered(this.wrap(entry.nom, 'normal', this.size, this.fullWidth), 'normal')
          return
        }
        this.columns(
          this.wrap(title, 'bold', headingSize, this.columnWidth),
          'bold',
          headingSize,
          section.entries.flatMap((entry) =>
            this.wrap(entry.nom, 'normal', this.size, this.columnWidth)
          )
        )
        return
      }
      case 'musique':
        if (section.titre !== '')
          this.centered(this.wrap(section.titre, 'bold', this.size, this.fullWidth), 'bold')
        for (const line of section.lignes)
          this.centered(
            this.wrap(`${line.libelle} ${line.valeur}`, 'normal', this.size, this.fullWidth),
            'normal'
          )
        return
      case 'mention': {
        const size = this.size * MENTION
        this.centered(this.wrap(section.texte, 'normal', size, this.fullWidth), 'normal', size)
        return
      }
      case 'logos': {
        const gap = this.size * LOGO_GAP
        const rows = logoRows(
          section.chemins,
          this.size * LOGO_HEIGHT,
          gap,
          this.fullWidth,
          this.tools
        )
        this.y += placeLogoRows(rows, this.y, this.options.width, gap, this.line / 2, this.items)
        return
      }
    }
  }

  /** Espace de `lines` interlignes ; on peut couper au milieu. */
  gap(lines: number): void {
    this.cuts.push(this.y + (lines * this.line) / 2)
    this.y += lines * this.line
  }
}

/** Déroulant de fin : largeur du projet, hauteur selon le contenu, sans marge en haut ni en bas. */
export function layoutRoll(
  credits: AssembledCredits,
  options: RollOptions,
  tools: LayoutTools
): RollLayout {
  const writer = new RollWriter(options, tools)
  const blocks = credits.blocs.filter((block) => block.sections.length > 0)
  blocks.forEach((block, blockIndex) => {
    if (blockIndex > 0) writer.gap(2)
    block.sections.forEach((section, sectionIndex) => {
      if (sectionIndex > 0) writer.gap(1)
      writer.section(section)
    })
  })
  return {
    width: options.width,
    height: Math.ceil(writer.y),
    items: writer.items,
    cuts: writer.cuts,
    lineCuts: writer.lineCuts
  }
}

/**
 * Parties du déroulant à exporter, de `MAX_PNG_HEIGHT` au plus : chaque coupure tombe entre deux
 * sections, le plus bas possible. Si la seule coupure possible laisse une partie de moins de la
 * moitié de la limite (section très haute), on coupe entre deux lignes ; à défaut (logos), net.
 */
export function splitRoll(
  height: number,
  cuts: readonly number[],
  lineCuts: readonly number[] = [],
  maxHeight = MAX_PNG_HEIGHT
): { top: number; height: number }[] {
  const parts: { top: number; height: number }[] = []
  let top = 0
  const lowest = (list: readonly number[], limit: number): number | null => {
    const candidates = list.map(Math.round).filter((cut) => cut > top && cut <= limit)
    return candidates.length > 0 ? Math.max(...candidates) : null
  }
  while (height - top > maxHeight) {
    const limit = top + maxHeight
    // Une coupure entre sections qui laisserait une partie trop courte cède la place à une coupure
    // entre deux lignes, plus bas.
    const section = lowest(cuts, limit)
    const end =
      (section !== null && section - top >= maxHeight / 2 ? section : null) ??
      lowest(lineCuts, limit) ??
      section ??
      limit
    parts.push({ top, height: end - top })
    top = end
  }
  parts.push({ top, height: height - top })
  return parts
}

/** Durée conseillée du défilement, en secondes : une ligne traverse l'écran en 8 s environ. */
export function advisedDuration(rollHeight: number, screenHeight: number): number {
  if (rollHeight <= 0 || screenHeight <= 0) return 0
  return Math.round((SECONDS_PER_SCREEN * (rollHeight + screenHeight)) / screenHeight)
}

// ---------------------------------------------------------------------------------------------
// Cartons de début

export interface CardOptions {
  width: number
  height: number
  taille: CreditsSize
}

const CARD_TEXT = 1.4 // corps des cartons, par rapport au déroulant
const CARD_TITLE = 2.8 // corps du titre
const CARD_LOGO = 5 // hauteur des logos, en corps du déroulant

/** Un carton au format du projet : son contenu centré dans l'image. */
export function layoutCard(
  card: StartCard,
  options: CardOptions,
  tools: LayoutTools
): PlacedLayout {
  const { width, height } = options
  const base = width * SIZE_RATIO[options.taille]
  const maxWidth = width * (1 - 2 * MARGIN)
  const items: LayoutItem[] = []

  if (card.kind === 'logos') {
    const gap = base * LOGO_GAP * 1.5
    const logoHeight = Math.min(base * CARD_LOGO, height * 0.25)
    const rows = logoRows(card.chemins, logoHeight, gap, maxWidth, tools)
    const rowGap = gap
    const total =
      rows.reduce((sum, row) => sum + Math.max(...row.map((box) => box.height)), 0) +
      rowGap * Math.max(0, rows.length - 1)
    placeLogoRows(rows, (height - total) / 2, width, gap, rowGap, items)
    return { width, height, items }
  }

  const isTitle = card.kind === 'titre'
  const size = base * (isTitle ? CARD_TITLE : CARD_TEXT)
  const weight: FontWeight = isTitle ? 'bold' : 'normal'
  const line = size * LINE
  const lines = card.lignes.flatMap((text) => wrapText(text, weight, size, maxWidth, tools))
  const top = (height - lines.length * line) / 2
  lines.forEach((text, row) =>
    items.push({
      kind: 'text',
      text,
      x: width / 2,
      y: top + row * line + line * BASELINE,
      size,
      weight,
      align: 'center'
    })
  )
  return { width, height, items }
}

// ---------------------------------------------------------------------------------------------
// Noms des fichiers exportés

const CARD_SLUGS: Record<StartCardKind, string> = {
  logos: 'logos',
  presente: 'presente',
  unFilmDe: 'un_film_de',
  acteursPrincipaux: 'acteurs',
  titre: 'titre',
  realisePar: 'realise_par'
}

/** « debut_01_presente.png », numéroté dans l'ordre des cartons exportés. */
export function cardFileName(kind: StartCardKind, index: number): string {
  return `debut_${String(index + 1).padStart(2, '0')}_${CARD_SLUGS[kind]}.png`
}

/** « generique_fin.png », ou « generique_fin_1.png », « _2 »… quand il est coupé. */
export function rollFileName(index: number, count: number): string {
  return count <= 1 ? 'generique_fin.png' : `generique_fin_${index + 1}.png`
}

/**
 * Fichiers PNG que NeoScenar écrit (et remplace) dans le dossier du générique : exactement les noms
 * qu'il produit, pour ne jamais toucher un fichier de l'élève au nom proche.
 */
export function isCreditsPngName(name: string): boolean {
  if (/^generique_fin(_[1-9]\d*)?\.png$/.test(name)) return true
  const card = /^debut_(\d{2})_([a-z_]+)\.png$/.exec(name)
  return card !== null && card[1] !== '00' && Object.values(CARD_SLUGS).includes(card[2]!)
}
