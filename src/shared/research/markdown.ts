// Découpage d'un fichier Markdown en propriétés YAML, texte d'introduction et sections « ## … ».
// Tout est gardé ligne à ligne, pour réécrire à l'identique ce qui n'a pas été modifié.

export interface SplitFile {
  /** Marque d'ordre des octets en tête du fichier (rare), remise à la réécriture. */
  bom: string
  /** Texte YAML entre les deux « --- » ; null s'il n'y a pas de propriétés. */
  yaml: string | null
  /** Lignes du corps (après les propriétés). */
  body: string[]
}

const FRONTMATTER_FENCE = '---'

export function splitFile(raw: string): SplitFile {
  const bom = raw.startsWith('﻿') ? '﻿' : ''
  const text = raw.slice(bom.length)
  const lines = text.split(/\r\n?|\n/)
  if (lines[0]?.trimEnd() === FRONTMATTER_FENCE) {
    const end = lines.findIndex(
      (line, index) => index > 0 && (line.trimEnd() === FRONTMATTER_FENCE || line === '...')
    )
    if (end > 0) {
      return { bom, yaml: lines.slice(1, end).join('\n'), body: lines.slice(end + 1) }
    }
  }
  return { bom, yaml: null, body: lines }
}

export function joinFile(file: SplitFile): string {
  const lines =
    file.yaml === null
      ? file.body
      : [FRONTMATTER_FENCE, ...file.yaml.split('\n'), FRONTMATTER_FENCE, ...file.body]
  // Toujours « \n », même si le fichier avait des fins de ligne de Windows (étape 16A).
  return file.bom + lines.join('\n')
}

export interface Section {
  /** Titre sans les « ## » (« Description »). */
  heading: string
  /** Ligne du titre telle qu'écrite. */
  headingLine: string
  /** Lignes qui suivent, jusqu'au titre suivant. */
  lines: string[]
}

export interface Sections {
  /** Lignes avant la première section (texte libre). */
  preamble: string[]
  sections: Section[]
}

const HEADING = /^##[ \t]+(.*?)[ \t#]*$/
const CODE_FENCE = /^\s*(```|~~~)/

/** Seuls les titres de niveau 2 hors des blocs de code délimitent les sections. */
export function splitSections(body: string[]): Sections {
  const result: Sections = { preamble: [], sections: [] }
  let inCode = false
  for (const line of body) {
    if (CODE_FENCE.test(line)) inCode = !inCode
    const match = inCode ? null : HEADING.exec(line)
    if (match) result.sections.push({ heading: match[1], headingLine: line, lines: [] })
    else (result.sections.at(-1)?.lines ?? result.preamble).push(line)
  }
  return result
}

export function joinSections({ preamble, sections }: Sections): string[] {
  return [...preamble, ...sections.flatMap((section) => [section.headingLine, ...section.lines])]
}

/** Comparaison des titres : sans tenir compte de la casse ni des espaces autour. */
export function sameHeading(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase('fr') === b.trim().toLocaleLowerCase('fr')
}

export function findSection(sections: Sections, heading: string): Section | undefined {
  return sections.sections.find((section) => sameHeading(section.heading, heading))
}

/** Texte d'une section, sans les lignes vides du début et de la fin. */
export function sectionText(lines: string[]): string {
  let start = 0
  let end = lines.length
  while (start < end && lines[start].trim() === '') start++
  while (end > start && lines[end - 1].trim() === '') end--
  return lines.slice(start, end).join('\n')
}

/** Lignes d'une section pour un texte : une ligne vide avant, une après (comme Obsidian). */
export function sectionLines(text: string): string[] {
  const trimmed = sectionText(text.split(/\r?\n/))
  return trimmed === '' ? [''] : ['', ...trimmed.split('\n'), '']
}
