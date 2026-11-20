// Changement de type d'une ligne : le texte produit est relu par Fountain avec le type choisi.
// On ajuste la casse, les lignes vides autour, et on n'ajoute un marqueur de forçage (!, @, ., >)
// que si Fountain ne reconnaît pas le type sans lui.

import { parse, type ElementType, type FountainDocument } from '@neoscenar/fountain'
import { normalizeCharacterLine } from './characterExtensions'
import { blankLinesBetween } from './flow'

export interface ConversionContext {
  /** Type actuel de la ligne (tel qu'affiché). */
  from: ElementType
  to: ElementType
  /** Type de l'élément écrit au-dessus (null en début de scénario). */
  previous: ElementType | null
}

export interface Conversion {
  text: string
  /** Index (à partir de 0) de la ligne convertie dans le nouveau texte. */
  line: number
}

const FORCING: Partial<Record<ElementType, string>> = {
  action: '!',
  scene_heading: '.',
  character: '@',
  transition: '> '
}

/** Retire les marqueurs Fountain qui décident du type d'une ligne, pour la réécrire avec un autre type. */
export function stripTypeMarkers(line: string, from: ElementType): string {
  let text = line.trim()
  if (from === 'note') {
    const note = /^\[\[([\s\S]*)\]\]$/.exec(text)
    if (note) text = note[1].trim()
  }
  if (from === 'page_break' && /^={3,}$/.test(text)) return ''
  text = text.replace(/^(?:!|@|\.(?=[\p{L}\p{N}])|>|~|=|#+)\s*/u, '')
  if (from === 'centered') text = text.replace(/\s*<$/, '')
  if (from === 'parenthetical') {
    const inner = /^\((.*)\)$/.exec(text)
    if (inner) text = inner[1].trim()
  }
  return text
}

/** Majuscules, sauf les extensions entre parenthèses d'un personnage : « MARIE (off) ». */
export function uppercaseOutsideParentheses(text: string): string {
  let depth = 0
  let result = ''
  for (const char of text) {
    if (char === '(') depth++
    result += depth > 0 ? char : char.toUpperCase()
    if (char === ')' && depth > 0) depth--
  }
  return result
}

/** Texte de la ligne pour le type voulu, sans marqueur de forçage. */
export function formatForType(core: string, to: ElementType): string {
  switch (to) {
    case 'scene_heading':
    case 'transition':
      return core.toUpperCase()
    case 'character':
      return normalizeCharacterLine(core)
    case 'parenthetical':
      return core === '' ? '' : `(${core})`
    case 'centered':
      return `> ${core} <`
    case 'lyrics':
      return `~${core}`
    case 'synopsis':
      return `= ${core}`
    case 'section':
      return `# ${core}`
    case 'note':
      return `[[${core}]]`
    case 'page_break':
      return '==='
    default:
      return core
  }
}

/** Type de l'élément qui contient une ligne (numérotée à partir de 1), ou null pour une ligne vide. */
export function typeAtLine(doc: FountainDocument, lineNumber: number): ElementType | null {
  for (const element of doc.elements) {
    const position = element.position
    if (!position) continue
    if (position.startLine > lineNumber) return null
    if (lineNumber <= position.endLine) return element.type
  }
  return null
}

const IN_BLOCK: ReadonlySet<ElementType> = new Set([
  'character',
  'parenthetical',
  'dialogue',
  'lyrics'
])

function isBlank(line: string | undefined): boolean {
  return line !== undefined && line.trim() === ''
}

/** Ajuste les lignes vides avant et après la ligne convertie. Modifie `lines` ; renvoie le nouvel index. */
function adjustBlankLines(lines: string[], index: number, context: ConversionContext): number {
  let previous = index - 1
  while (previous >= 0 && isBlank(lines[previous])) previous--
  if (previous >= 0) {
    const blanks = index - 1 - previous
    const wanted = blankLinesBetween(context.previous, context.to)
    if (wanted === 0 && blanks > 0) {
      lines.splice(previous + 1, blanks)
      index -= blanks
    } else if (wanted === 1 && blanks === 0) {
      lines.splice(index, 0, '')
      index++
    }
  }
  // Le texte collé en dessous continuerait l'élément converti : il en est séparé, sauf dans un bloc
  // de dialogue où il devient naturellement la réplique.
  const after = lines[index + 1]
  if (
    context.from !== context.to &&
    after !== undefined &&
    !isBlank(after) &&
    !IN_BLOCK.has(context.to)
  ) {
    lines.splice(index + 1, 0, '')
  }
  return index
}

/**
 * Réécrit la ligne `index` (à partir de 0) du texte avec le type `context.to`. Une ligne vide garde
 * son contenu vide (le type est alors retenu par l'éditeur jusqu'à ce qu'on y écrive).
 */
export function convertLine(text: string, index: number, context: ConversionContext): Conversion {
  const lines = text.split('\n')
  const core = stripTypeMarkers(lines[index] ?? '', context.from)
  const line = adjustBlankLines(lines, index, context)
  if (core === '') {
    lines[line] = ''
    return { text: lines.join('\n'), line }
  }

  lines[line] = formatForType(core, context.to)
  const plain = lines.join('\n')
  if (typeAtLine(parse(plain, { titlePage: false }), line + 1) === context.to) {
    return { text: plain, line }
  }
  const marker = FORCING[context.to]
  if (!marker) return { text: plain, line }
  lines[line] = marker + lines[line]
  return { text: lines.join('\n'), line }
}
