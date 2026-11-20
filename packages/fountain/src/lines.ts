// Découpage du texte en lignes, sans jamais rien perdre.
// Les notes [[…]] et textes mis de côté /*…*/ peuvent s'étendre sur plusieurs lignes :
// les lignes qu'ils relient forment une seule « ligne logique », que l'analyseur classe d'un bloc.

export interface PhysicalLine {
  start: number
  /** Décalage juste avant la fin de ligne. */
  contentEnd: number
  /** Décalage juste après la fin de ligne. */
  end: number
}

export interface MarkedRange {
  kind: 'note' | 'boneyard'
  start: number
  end: number
  innerStart: number
  innerEnd: number
}

export interface LogicalLine {
  start: number
  contentEnd: number
  end: number
  /** Numéros (à partir de 1) de la première et de la dernière ligne physique. */
  firstLine: number
  lastLine: number
  content: string
  /** Contenu sans les notes ni les textes mis de côté : c'est lui qui sert à classer la ligne. */
  stripped: string
  ranges: MarkedRange[]
}

export function splitPhysicalLines(text: string, from: number): PhysicalLine[] {
  const lines: PhysicalLine[] = []
  const length = text.length
  let start = from
  for (let i = from; i < length; i++) {
    const code = text.charCodeAt(i)
    if (code === 10) {
      lines.push({ start, contentEnd: i, end: i + 1 })
      start = i + 1
    } else if (code === 13) {
      const end = text.charCodeAt(i + 1) === 10 ? i + 2 : i + 1
      lines.push({ start, contentEnd: i, end })
      start = end
      i = end - 1
    }
  }
  if (start < length) lines.push({ start, contentEnd: length, end: length })
  return lines
}

export function detectLineEnding(text: string, lines: PhysicalLine[]): '\n' | '\r\n' | '\r' {
  let lf = 0
  let crlf = 0
  let cr = 0
  for (const line of lines) {
    const size = line.end - line.contentEnd
    if (size === 2) crlf++
    else if (size === 1) {
      if (text.charCodeAt(line.contentEnd) === 10) lf++
      else cr++
    }
  }
  if (crlf > lf && crlf >= cr) return '\r\n'
  if (cr > lf && cr > crlf) return '\r'
  return '\n'
}

/**
 * Repère les notes et textes mis de côté refermés.
 * Un « /* » ou « [[ » jamais refermé reste du texte ordinaire.
 * Une note ne traverse jamais une vraie ligne vide (une ligne de deux espaces est permise).
 */
export function findMarkedRanges(text: string, from: number, lines: PhysicalLine[]): MarkedRange[] {
  const barriers: number[] = []
  for (const line of lines) {
    const content = text.slice(line.start, line.contentEnd)
    if (content.trim() === '' && content !== '  ') barriers.push(line.start)
  }

  const ranges: MarkedRange[] = []
  let i = from
  let noMoreBoneyard = false
  let noMoreNote = false
  let barrierIndex = 0
  let noteCloseCache = -1

  while (i < text.length) {
    const boneyard = noMoreBoneyard ? -1 : text.indexOf('/*', i)
    const note = noMoreNote ? -1 : text.indexOf('[[', i)
    if (boneyard < 0 && note < 0) break

    if (boneyard >= 0 && (note < 0 || boneyard < note)) {
      const close = text.indexOf('*/', boneyard + 2)
      if (close < 0) {
        noMoreBoneyard = true
        continue
      }
      ranges.push({
        kind: 'boneyard',
        start: boneyard,
        end: close + 2,
        innerStart: boneyard + 2,
        innerEnd: close
      })
      i = close + 2
      continue
    }

    // On garde en mémoire le dernier « ]] » trouvé pour ne pas reparcourir le texte à chaque « [[ ».
    if (noteCloseCache < note + 2) noteCloseCache = text.indexOf(']]', note + 2)
    if (noteCloseCache < 0) {
      noMoreNote = true
      continue
    }
    while (barrierIndex < barriers.length && barriers[barrierIndex] < note) barrierIndex++
    const limit = barrierIndex < barriers.length ? barriers[barrierIndex] : Infinity
    if (noteCloseCache >= limit) {
      i = note + 2
      continue
    }
    ranges.push({
      kind: 'note',
      start: note,
      end: noteCloseCache + 2,
      innerStart: note + 2,
      innerEnd: noteCloseCache
    })
    i = noteCloseCache + 2
  }
  return ranges
}

export function buildLogicalLines(
  text: string,
  lines: PhysicalLine[],
  ranges: MarkedRange[]
): LogicalLine[] {
  const result: LogicalLine[] = []
  let r = 0
  for (let k = 0; k < lines.length;) {
    let last = k
    const own: MarkedRange[] = []
    while (r < ranges.length && ranges[r].start < lines[last].end) {
      const range = ranges[r++]
      own.push(range)
      while (range.end > lines[last].contentEnd && last + 1 < lines.length) last++
    }
    const start = lines[k].start
    const contentEnd = lines[last].contentEnd
    const content = text.slice(start, contentEnd)
    result.push({
      start,
      contentEnd,
      end: lines[last].end,
      firstLine: k + 1,
      lastLine: last + 1,
      content,
      stripped: own.length === 0 ? content : removeRanges(text, start, contentEnd, own),
      ranges: own
    })
    k = last + 1
  }
  return result
}

function removeRanges(text: string, start: number, end: number, ranges: MarkedRange[]): string {
  let out = ''
  let cursor = start
  for (const range of ranges) {
    out += text.slice(cursor, range.start)
    cursor = range.end
  }
  return out + text.slice(cursor, end)
}

export function isBlankLine(line: LogicalLine): boolean {
  return line.content.trim() === ''
}
