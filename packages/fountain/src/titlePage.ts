import { isBlankLine, type LogicalLine } from './lines.ts'
import { SCENE_HEADING_START } from './syntax.ts'
import type { TitlePage, TitlePageEntry } from './types.ts'

const KEY_LINE = /^([\p{L}\p{N}][^:]*):(.*)$/su
const INDENTED = /^(?: {3,}|\t)/

function matchKey(content: string): { key: string; value: string } | null {
  if (/^\s/.test(content) || SCENE_HEADING_START.test(content)) return null
  const match = KEY_LINE.exec(content)
  return match ? { key: match[1].trim(), value: match[2].trim() } : null
}

/**
 * Page de titre : paires « Clé: valeur » au tout début du fichier, valeurs éventuellement sur
 * plusieurs lignes indentées, jusqu'à la première ligne vide.
 * Garde-fou : la première clé doit avoir une valeur (sinon « FADE IN: » serait pris pour une clé).
 */
export function parseTitlePage(
  text: string,
  lines: LogicalLine[]
): { titlePage: TitlePage | null; next: number } {
  if (lines.length === 0) return { titlePage: null, next: 0 }
  const first = matchKey(lines[0].content)
  // Le « : » d'une note ne fait pas une clé : « Il [[R:jaune]]pleut[[/R]]. » reste une action (13E).
  if (!first || !matchKey(lines[0].stripped)) return { titlePage: null, next: 0 }
  const hasValue =
    first.value !== '' ||
    (lines.length > 1 && !isBlankLine(lines[1]) && INDENTED.test(lines[1].content))
  if (!hasValue) return { titlePage: null, next: 0 }

  const entries: TitlePageEntry[] = []
  const entryStarts: number[] = []
  let i = 0
  while (i < lines.length && !isBlankLine(lines[i])) {
    const line = lines[i]
    const key = matchKey(line.content)
    if (key || entries.length === 0) {
      entries.push({ key: key?.key ?? '', value: key?.value ?? line.content.trim() })
      entryStarts.push(i)
    } else {
      const current = entries[entries.length - 1]
      const continuation = line.content.trim().replace(/\r\n?/g, '\n')
      current.value = current.value === '' ? continuation : `${current.value}\n${continuation}`
    }
    i++
  }
  const lastEntryLine = i - 1
  while (i < lines.length && isBlankLine(lines[i])) i++

  entries.forEach((entry, index) => {
    const startLine = lines[entryStarts[index]]
    const endLine =
      index + 1 < entries.length ? lines[entryStarts[index + 1] - 1] : lines[lastEntryLine]
    entry.raw = text.slice(startLine.start, endLine.end)
  })

  const end = i < lines.length ? lines[i].start : text.length
  return { titlePage: { entries, raw: text.slice(lines[0].start, end) }, next: i }
}
