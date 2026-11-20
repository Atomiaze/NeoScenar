// Texte imprimé d'une ligne d'élément, avec la position de chaque caractère dans le texte source.
// Sert à couper les lignes (pagination) et à retrouver où commence chaque ligne coupée (traits de page).

import { inlineLayout } from './inline.ts'
import type { FountainElement } from './types.ts'

const MARKED_TEXT = /\[\[[\s\S]*?\]\]|\/\*[\s\S]*?\*\//g
const TAB = '    '
/** Remplace un caractère retiré sans changer l'appariement des marqueurs de mise en forme. */
const MASK = '\u0001'

/** Mise en forme d'un caractère imprimé, combinable : STYLE_BOLD | STYLE_ITALIC. */
export const STYLE_BOLD = 1
export const STYLE_ITALIC = 2
export const STYLE_UNDERLINE = 4

export interface VisibleLine {
  /** Texte de la ligne utile (element.text) tel qu'il est écrit. */
  written: string
  /** Texte imprimé : sans notes, texte mis de côté, marqueurs de mise en forme ; tabulations développées. */
  text: string
  /** Pour chaque caractère imprimé, sa position dans le texte source (absente sans position connue). */
  offsets?: number[]
  /** Pour chaque caractère imprimé, sa mise en forme (voir STYLE_BOLD…) ; 0 : texte normal. */
  styles: number[]
  /** Début de la ligne dans le texte source. */
  lineStart?: number
}

/** Lignes physiques de l'élément dans le texte source : début et contenu (sans fin de ligne). */
function sourceLines(element: FountainElement): { start: number; text: string }[] | null {
  const { raw, position } = element
  if (raw === undefined || position === undefined) return null
  const count = position.endLine - position.startLine + 1
  const lines: { start: number; text: string }[] = []
  const pattern = /\r\n|\r|\n/g
  let start = 0
  while (lines.length < count) {
    const match = pattern.exec(raw)
    const end = match ? match.index : raw.length
    lines.push({ start: position.startOffset + start, text: raw.slice(start, end) })
    if (!match) break
    start = match.index + match[0].length
  }
  return lines.length === count ? lines : null
}

/**
 * Position de chaque caractère de `written` dans `source` : le texte utile est le texte source moins
 * ses marqueurs de forçage (!, @, ., >, <, ~, =, #12#) et ses espaces de bord.
 */
function alignInSource(written: string, source: string): number[] {
  const at = source.indexOf(written)
  if (at >= 0) return Array.from(written, (_, i) => at + i)
  // Le « ! » d'une action forcée est au milieu de « written » : on suit les caractères un à un.
  const map: number[] = []
  let j = 0
  for (const char of written) {
    while (j < source.length && source[j] !== char) j++
    map.push(Math.min(j, source.length))
    j++
  }
  return map
}

/** Lignes d'un élément, texte imprimé et positions source. */
export function visibleLines(element: FountainElement): VisibleLine[] {
  const text = element.text.replace(/\r\n?/g, '\n')
  // Notes et textes mis de côté, même sur plusieurs lignes, masqués caractère par caractère.
  const masked = text.replace(MARKED_TEXT, (match) => match.replace(/[^\n]/g, MASK))
  const sources = sourceLines(element)
  const writtenLines = text.split('\n')
  const sameCount = sources !== null && sources.length === writtenLines.length

  return masked.split('\n').map((line, i) => {
    const written = writtenLines[i]
    const inline = inlineLayout(line)
    const removed = new Set<number>()
    for (const marker of inline.markers) {
      for (let k = marker.from; k < marker.to; k++) removed.add(k)
    }
    const styleAt = new Map<number, number>()
    for (const range of inline.styled) {
      const style =
        (range.bold ? STYLE_BOLD : 0) |
        (range.italic ? STYLE_ITALIC : 0) |
        (range.underline ? STYLE_UNDERLINE : 0)
      for (let k = range.from; k < range.to; k++) styleAt.set(k, style)
    }
    const source = sameCount ? sources[i] : null
    const toSource = source ? alignInSource(written, source.text) : null
    let visible = ''
    const offsets: number[] = []
    const styles: number[] = []
    for (let k = 0; k < line.length; k++) {
      if (line[k] === MASK || removed.has(k)) continue
      const chars = line[k] === '\t' ? TAB : line[k]
      visible += chars
      for (let n = 0; n < chars.length; n++) styles.push(styleAt.get(k) ?? 0)
      if (toSource && source)
        for (let n = 0; n < chars.length; n++) offsets.push(source.start + toSource[k])
    }
    return source
      ? { written, text: visible, offsets, styles, lineStart: source.start }
      : { written, text: visible, styles }
  })
}
