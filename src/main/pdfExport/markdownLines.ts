// Synopsis, pitch et note d'intention pour le PDF : le Markdown (sous-ensemble de markdownLite) devient
// des lignes sans marqueurs, avec leur mise en forme. Même lecture que l'éditeur, à l'écran.

import type { DocumentLine, DocumentMark } from '@neoscenar/pdf-scenario'
import { inlineSpans, lineKind } from '../../shared/markdown/markdownLite'

/** Texte d'une ligne sans les étoiles du gras et de l'italique, et la mise en forme de chaque caractère. */
export function stripInline(line: string): { text: string; marks: DocumentMark[] } {
  const spans = inlineSpans(line)
  const marker = new Set<number>()
  for (const span of spans) {
    for (let i = 0; i < span.markerLength; i++) {
      marker.add(span.from + i)
      marker.add(span.to - 1 - i)
    }
  }
  const inside = (kind: 'bold' | 'italic', i: number): boolean =>
    spans.some(
      (span) =>
        span.kind === kind && span.from + span.markerLength <= i && i < span.to - span.markerLength
    )
  let text = ''
  const marks: DocumentMark[] = []
  for (let i = 0; i < line.length; i++) {
    if (marker.has(i)) continue
    const bold = inside('bold', i)
    const italic = inside('italic', i)
    const last = marks.at(-1)
    if (bold || italic) {
      if (last && last.to === text.length && last.bold === bold && last.italic === italic) last.to++
      else marks.push({ from: text.length, to: text.length + 1, bold, italic })
    }
    text += line[i]
  }
  return { text, marks }
}

/** Lignes du document ; les lignes vides du début et de la fin ne sont pas gardées. */
export function markdownLines(source: string): DocumentLine[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const result: DocumentLine[] = lines.map((line): DocumentLine => {
    if (line.trim() === '') return { kind: 'blank' }
    const kind = lineKind(line)
    if (kind.kind === 'rule') return { kind: 'rule' }
    if (kind.kind === 'heading') {
      return { kind: 'heading', level: kind.level, ...stripInline(line.slice(kind.markerLength)) }
    }
    return { kind: 'text', ...stripInline(line) }
  })
  while (result[0]?.kind === 'blank') result.shift()
  while (result.at(-1)?.kind === 'blank') result.pop()
  return result
}
