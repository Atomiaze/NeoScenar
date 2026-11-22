// Sous-ensemble de Markdown des documents du projet (synopsis, pitch, note d'intention) :
// titres 1 à 3, gras, italique et ligne horizontale. Le reste est du texte ordinaire, gardé tel quel.
// Fonctions pures : l'éditeur (CodeMirror) et les tests les utilisent, et le PDF (18C-4) aussi.

export type LineKind =
  { kind: 'heading'; level: 1 | 2 | 3; markerLength: number } | { kind: 'rule' } | { kind: 'text' }

const HEADING = /^(#{1,3}) (?=\S)/
const RULE = /^ {0,3}-{3,}[ \t]*$/

/** Nature d'une ligne : titre (« # », « ## », « ### » suivis d'une espace), ligne « --- », ou texte. */
export function lineKind(line: string): LineKind {
  const heading = HEADING.exec(line)
  if (heading) {
    return {
      kind: 'heading',
      level: heading[1].length as 1 | 2 | 3,
      markerLength: heading[0].length
    }
  }
  if (RULE.test(line)) return { kind: 'rule' }
  return { kind: 'text' }
}

/** Passage en gras ou en italique dans une ligne ; `markerLength` = longueur des étoiles de chaque côté. */
export interface InlineSpan {
  kind: 'bold' | 'italic'
  /** Début des étoiles ouvrantes, et fin des étoiles fermantes (positions dans la ligne). */
  from: number
  to: number
  markerLength: number
}

const INLINE =
  /\*\*\*(?=\S)([^*]+?)(?<=\S)\*\*\*|\*\*(?=\S)(.+?)(?<=\S)\*\*|\*(?=\S)([^*]+?)(?<=\S)\*/g

/** Gras (« **x** ») et italique (« *x* ») d'une ligne ; l'italique est cherché aussi dans le gras. */
export function inlineSpans(line: string, offset = 0): InlineSpan[] {
  const spans: InlineSpan[] = []
  for (const match of line.matchAll(INLINE)) {
    const from = offset + (match.index ?? 0)
    const to = from + match[0].length
    if (match[1] !== undefined) {
      // « ***x*** » : gras et italique ensemble.
      spans.push({ kind: 'bold', from, to, markerLength: 2 })
      spans.push({ kind: 'italic', from: from + 2, to: to - 2, markerLength: 1 })
    } else if (match[2] !== undefined) {
      spans.push({ kind: 'bold', from, to, markerLength: 2 })
      spans.push(...inlineSpans(match[2], from + 2))
    } else {
      spans.push({ kind: 'italic', from, to, markerLength: 1 })
    }
  }
  return spans
}

/** Une modification du texte : remplace [from, to[ par `insert`. */
export interface TextChange {
  from: number
  to: number
  insert: string
}

export interface EditResult {
  changes: TextChange[]
  /** Sélection après la modification (positions dans le nouveau texte). */
  anchor: number
  head: number
}

/** Titre de niveau `level` sur la ligne ; le même niveau une seconde fois retire le titre. */
export function toggleHeading(
  line: string,
  lineFrom: number,
  level: 1 | 2 | 3,
  cursor: number
): EditResult {
  const current = lineKind(line)
  const existing = current.kind === 'heading' ? current.markerLength : 0
  const insert =
    current.kind === 'heading' && current.level === level ? '' : `${'#'.repeat(level)} `
  const shift = insert.length - existing
  const position = Math.max(lineFrom, cursor + shift)
  return {
    changes: [{ from: lineFrom, to: lineFrom + existing, insert }],
    anchor: position,
    head: position
  }
}

function countBefore(text: string, position: number): number {
  let count = 0
  while (position - count > 0 && text[position - count - 1] === '*') count++
  return count
}

function countAfter(text: string, position: number): number {
  let count = 0
  while (text[position + count] === '*') count++
  return count
}

/**
 * Gras (`mark` = « ** ») ou italique (« * ») autour de la sélection ; refaire le geste l'enlève.
 * Sans sélection, les deux marques sont posées et le curseur se place entre elles.
 */
export function toggleInline(text: string, from: number, to: number, mark: '**' | '*'): EditResult {
  const before = countBefore(text, from)
  const after = countAfter(text, to)
  const around = Math.min(before, after)
  const active = mark === '**' ? around >= 2 : around % 2 === 1
  const length = mark.length
  if (active) {
    return {
      changes: [
        { from: from - length, to: from, insert: '' },
        { from: to, to: to + length, insert: '' }
      ],
      anchor: from - length,
      head: to - length
    }
  }
  return {
    changes: [
      { from, to: from, insert: mark },
      { from: to, to, insert: mark }
    ],
    anchor: from + length,
    head: to + length
  }
}

/**
 * Ligne horizontale sous la ligne du curseur (une ligne vide est simplement remplacée par « --- »).
 * Une ligne vide est laissée avant et après pour que « --- » ne soit pas lu comme un soulignement de titre.
 */
export function insertRule(line: string, lineFrom: number, followedByText: boolean): EditResult {
  const lineTo = lineFrom + line.length
  if (line.trim() === '') {
    const insert = followedByText ? '---\n' : '---'
    return {
      changes: [{ from: lineFrom, to: lineTo, insert }],
      anchor: lineFrom + insert.length,
      head: lineFrom + insert.length
    }
  }
  const insert = '\n\n---\n'
  return {
    changes: [{ from: lineTo, to: lineTo, insert }],
    anchor: lineTo + insert.length,
    head: lineTo + insert.length
  }
}

/** Applique des modifications (positions dans le texte d'origine), pour les tests. */
export function applyChanges(text: string, changes: readonly TextChange[]): string {
  let result = text
  for (const change of [...changes].sort((a, b) => b.from - a.from)) {
    result = result.slice(0, change.from) + change.insert + result.slice(change.to)
  }
  return result
}
