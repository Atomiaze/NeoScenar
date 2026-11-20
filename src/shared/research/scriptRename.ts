// Remplacer un nom de personnage ou de lieu dans le scénario. Étape 10C (« Remplacer MARI par
// MARIE ») : seuls les éléments Personnage et les lieux des en-têtes changent. Étape 10D (renommage
// depuis la fiche) : en option, aussi le texte des actions et des dialogues, en mot entier.

import type { FountainDocument, FountainElement } from '@neoscenar/fountain'
import type { TextChange } from '../scriptLink/textChanges'
import { nameKey } from './sheetNames'
import type { SheetKind } from './types'

function firstLine(text: string, element: FountainElement): { start: number; line: string } | null {
  const start = element.position?.startOffset
  if (start === undefined) return null
  const end = text.indexOf('\n', start)
  return { start, line: text.slice(start, end < 0 ? text.length : end) }
}

/** Le nom écrit dans l'élément, s'il correspond (sans tenir compte de la casse), et où le chercher. */
function writtenName(
  element: FountainElement,
  kind: SheetKind,
  key: string
): { name: string; after: (line: string) => number } | null {
  if (kind === 'personnages' && element.type === 'character') {
    const name = element.character?.name ?? ''
    return nameKey(name) === key ? { name, after: () => 0 } : null
  }
  if (kind === 'lieux' && element.type === 'scene_heading' && element.scene) {
    const { location, prefix } = element.scene
    if (nameKey(location) !== key) return null
    // Le lieu vient après le préfixe (« INT. ») : on ne cherche pas le nom dans le préfixe.
    return {
      name: location,
      after: (line) => (prefix === '' ? 0 : line.indexOf(prefix) + prefix.length)
    }
  }
  return null
}

/** Modifications qui remplacent `from` par `to` dans `text` (le texte analysé dans `doc`). */
export function renameInScript(
  text: string,
  doc: FountainDocument,
  kind: SheetKind,
  from: string,
  to: string
): TextChange[] {
  const key = nameKey(from)
  const changes: TextChange[] = []
  for (const element of doc.elements) {
    const found = writtenName(element, kind, key)
    const first = found && firstLine(text, element)
    if (!found || !first) continue
    const index = first.line.indexOf(found.name, Math.max(0, found.after(first.line)))
    if (index < 0) continue
    const start = first.start + index
    changes.push({ from: start, to: start + found.name.length, insert: to })
  }
  return changes
}

/** Éléments dont le texte peut citer le nom (option « actions et dialogues » du renommage). */
const TEXT_TYPES = new Set(['action', 'dialogue', 'parenthetical', 'lyrics', 'centered'])

/**
 * Nouveau nom écrit comme l'ancien : MARIE → MARION, Marie → Marion, marie → marion. Une autre
 * écriture (MaRie) reçoit le nouveau nom tel qu'il est tapé dans la fiche.
 */
export function matchCase(written: string, to: string): string {
  const upper = written.toLocaleUpperCase('fr')
  const lower = written.toLocaleLowerCase('fr')
  if (upper === lower) return to
  if (written === upper) return to.toLocaleUpperCase('fr')
  if (written === lower) return to.toLocaleLowerCase('fr')
  const capitalized = written.charAt(0).toLocaleUpperCase('fr') + lower.slice(1)
  if (written === capitalized) {
    return to.charAt(0).toLocaleUpperCase('fr') + to.slice(1).toLocaleLowerCase('fr')
  }
  return to
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Le nom en mot entier (lettres accentuées comprises : MARIE ne trouve pas MARIETTE). */
function wholeWord(name: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(name)}(?![\\p{L}\\p{N}_])`, 'giu')
}

/** Occurrences du nom dans un élément, hors notes [[ ]] et texte mis de côté /* *\/. */
function wordMatches(text: string, element: FountainElement, pattern: RegExp): TextChange[] {
  const position = element.position
  if (!position) return []
  const hidden = [...element.notes, ...element.boneyards]
  const source = text.slice(position.startOffset, position.endOffset)
  const found: TextChange[] = []
  for (const match of source.matchAll(pattern)) {
    const from = position.startOffset + (match.index ?? 0)
    const to = from + match[0].length
    if (hidden.some((range) => from < range.end && to > range.start)) continue
    found.push({ from, to, insert: match[0] })
  }
  return found
}

/** Ce que le renommage d'une fiche changerait dans le scénario (fenêtre de confirmation). */
export interface RenamePlan {
  /** Éléments Personnage (personnage) ou lieux des en-têtes (lieu) : toujours remplacés. */
  always: TextChange[]
  /** Texte des actions et des dialogues : remplacé si l'option est cochée. */
  inText: TextChange[]
  /** Personnage seulement : en-têtes qui contiennent le nom (signalés, jamais modifiés). */
  headings: number
}

export function planRename(
  text: string,
  doc: FountainDocument,
  kind: SheetKind,
  from: string,
  to: string
): RenamePlan {
  const always = renameInScript(text, doc, kind, from, to).map((change) => ({
    ...change,
    insert: matchCase(text.slice(change.from, change.to), to)
  }))
  const pattern = wholeWord(from.trim())
  const inText: TextChange[] = []
  let headings = 0
  for (const element of doc.elements) {
    if (TEXT_TYPES.has(element.type)) {
      for (const match of wordMatches(text, element, pattern)) {
        inText.push({ ...match, insert: matchCase(match.insert, to) })
      }
    } else if (kind === 'personnages' && element.type === 'scene_heading') {
      if (wordMatches(text, element, pattern).length > 0) headings++
    }
  }
  return { always, inText, headings }
}
