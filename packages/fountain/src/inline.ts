// Découpe d'une ligne en morceaux mis en forme (gras, italique, souligné, notes), pour l'affichage.

export interface InlineSpan {
  type: 'text' | 'note' | 'boneyard'
  /** Texte affiché, sans les marqueurs de mise en forme ni les barres obliques d'échappement. */
  text: string
  bold: boolean
  italic: boolean
  underline: boolean
}

type Delimiter = '*' | '**' | '***' | '_'

/** Morceau mis en forme d'une ligne, avec sa position (pour l'éditeur). */
export interface InlineRange {
  from: number
  to: number
  bold: boolean
  italic: boolean
  underline: boolean
}

/** Mise en forme d'une ligne avec positions : morceaux de texte et marqueurs (*, **, _, \). */
export interface InlineLayout {
  /** Texte mis en forme (seulement les morceaux en gras, italique ou souligné). */
  styled: InlineRange[]
  /** Marqueurs de mise en forme appariés et barres obliques d'échappement. */
  markers: { from: number; to: number }[]
}

type Token = { start: number; end: number } & (
  | { kind: 'text'; value: string }
  | { kind: 'note' | 'boneyard'; value: string }
  | { kind: 'delimiter'; value: Delimiter; matched: boolean }
  | { kind: 'escape'; value: string }
)

export function parseInline(text: string): InlineSpan[] {
  const tokens = tokenize(typeof text === 'string' ? text : '')
  matchDelimiters(tokens)
  return buildSpans(tokens)
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  let buffer = ''
  let bufferStart = 0
  const flush = (at: number): void => {
    if (buffer !== '') tokens.push({ kind: 'text', value: buffer, start: bufferStart, end: at })
    buffer = ''
    bufferStart = at
  }

  let i = 0
  while (i < text.length) {
    const char = text[i]
    const next = text[i + 1]
    if (char === '\\' && (next === '*' || next === '_' || next === '\\')) {
      flush(i)
      tokens.push({ kind: 'escape', value: next, start: i, end: i + 2 })
      i += 2
      bufferStart = i
      continue
    }
    if (char === '[' && next === '[') {
      const close = text.indexOf(']]', i + 2)
      if (close >= 0) {
        flush(i)
        tokens.push({ kind: 'note', value: text.slice(i + 2, close), start: i, end: close + 2 })
        i = close + 2
        bufferStart = i
        continue
      }
    }
    if (char === '/' && next === '*') {
      const close = text.indexOf('*/', i + 2)
      if (close >= 0) {
        flush(i)
        tokens.push({ kind: 'boneyard', value: text.slice(i + 2, close), start: i, end: close + 2 })
        i = close + 2
        bufferStart = i
        continue
      }
    }
    if (char === '*' || char === '_') {
      let end = i
      while (text[end] === char) end++
      const run = text.slice(i, end)
      if ((char === '*' && run.length <= 3) || run === '_') {
        flush(i)
        tokens.push({ kind: 'delimiter', value: run as Delimiter, matched: false, start: i, end })
        bufferStart = end
      } else {
        if (buffer === '') bufferStart = i
        buffer += run
      }
      i = end
      continue
    }
    if (buffer === '') bufferStart = i
    buffer += char
    i++
  }
  flush(text.length)
  return tokens
}

/** Associe chaque marqueur ouvrant au prochain marqueur identique ; les marqueurs orphelins restent du texte. */
function matchDelimiters(tokens: Token[]): void {
  const open: number[] = []
  tokens.forEach((token, index) => {
    if (token.kind !== 'delimiter') return
    const opener = open.findLastIndex(
      (openIndex) => (tokens[openIndex] as { value: string }).value === token.value
    )
    if (opener < 0) {
      open.push(index)
      return
    }
    ;(tokens[open[opener]] as { matched: boolean }).matched = true
    token.matched = true
    open.length = opener
  })
}

function buildSpans(tokens: Token[]): InlineSpan[] {
  const spans: InlineSpan[] = []
  let bold = false
  let italic = false
  let underline = false

  const push = (type: InlineSpan['type'], text: string): void => {
    const last = spans[spans.length - 1]
    if (
      type === 'text' &&
      last?.type === 'text' &&
      last.bold === bold &&
      last.italic === italic &&
      last.underline === underline
    ) {
      last.text += text
    } else {
      spans.push({ type, text, bold, italic, underline })
    }
  }

  for (const token of tokens) {
    if (token.kind === 'delimiter') {
      if (!token.matched) push('text', token.value)
      else toggle(token.value)
    } else {
      push(token.kind === 'escape' ? 'text' : token.kind, token.value)
    }
  }
  return spans.filter((span) => span.type !== 'text' || span.text !== '')

  function toggle(delimiter: Delimiter): void {
    if (delimiter === '*') italic = !italic
    else if (delimiter === '**') bold = !bold
    else if (delimiter === '***') {
      bold = !bold
      italic = !italic
    } else underline = !underline
  }
}

/** Positions de la mise en forme d'une ligne (gras, italique, souligné) et de ses marqueurs. */
export function inlineLayout(text: string): InlineLayout {
  const tokens = tokenize(typeof text === 'string' ? text : '')
  matchDelimiters(tokens)
  const styled: InlineRange[] = []
  const markers: InlineLayout['markers'] = []
  let bold = false
  let italic = false
  let underline = false
  for (const token of tokens) {
    if (token.kind === 'delimiter' && token.matched) {
      markers.push({ from: token.start, to: token.end })
      if (token.value === '*' || token.value === '***') italic = !italic
      if (token.value === '**' || token.value === '***') bold = !bold
      if (token.value === '_') underline = !underline
      continue
    }
    if (token.kind === 'escape') markers.push({ from: token.start, to: token.start + 1 })
    if (bold || italic || underline) {
      const last = styled[styled.length - 1]
      if (
        last?.to === token.start &&
        last.bold === bold &&
        last.italic === italic &&
        last.underline === underline
      ) {
        last.to = token.end
      } else styled.push({ from: token.start, to: token.end, bold, italic, underline })
    }
  }
  return { styled, markers }
}
