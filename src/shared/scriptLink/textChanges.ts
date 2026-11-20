import { parseSceneHeading } from '@neoscenar/fountain'
import type { ItemNumber } from '../projectTypes'
import { sceneNumberMarker } from './sceneNumber'
import { PLACEHOLDER_HEADING } from './scriptScenes'

// Modifications du texte du scénario, sous la forme comprise par l'éditeur (CodeMirror) :
// remplacer les caractères de `from` à `to` du texte d'origine par `insert`.
// Le texte est celui de l'éditeur : corps du scénario, fins de ligne « \n ».

export interface TextChange {
  from: number
  to: number
  insert: string
}

/** Applique des modifications exprimées par rapport au même texte d'origine, sans chevauchement. */
export function applyTextChanges(text: string, changes: readonly TextChange[]): string {
  const sorted = [...changes].sort((a, b) => a.from - b.from || a.to - b.to)
  let result = ''
  let cursor = 0
  for (const change of sorted) {
    if (change.from < cursor) throw new Error('Modifications du texte qui se chevauchent')
    result += text.slice(cursor, change.from) + change.insert
    cursor = change.to
  }
  return result + text.slice(cursor)
}

/** Plus petite modification qui transforme `before` en `after`. */
export function minimalTextChange(before: string, after: string): TextChange {
  let start = 0
  const max = Math.min(before.length, after.length)
  while (start < max && before.charCodeAt(start) === after.charCodeAt(start)) start++
  let end = 0
  while (
    end < max - start &&
    before.charCodeAt(before.length - 1 - end) === after.charCodeAt(after.length - 1 - end)
  ) {
    end++
  }
  return { from: start, to: before.length - end, insert: after.slice(start, after.length - end) }
}

/**
 * Ligne d'en-tête écrite par NeoScenar : « INT. CUISINE - JOUR #30# ». Un point de forçage n'est
 * ajouté que si Fountain ne reconnaîtrait pas l'en-tête sans lui. Sans en-tête : `.SCÈNE À ÉCRIRE #30#`.
 */
export function headingLine(heading: string, number: ItemNumber): string {
  const text = heading.replace(/\s+/g, ' ').trim().toLocaleUpperCase('fr') || PLACEHOLDER_HEADING
  const forcing = parseSceneHeading(text) === null ? '.' : ''
  return `${forcing}${text} ${sceneNumberMarker(number)}`
}

/**
 * Insère des lignes complètes à `position` (début d'une ligne, ou fin du texte), entourées des lignes
 * vides nécessaires : le texte inséré est séparé de ce qui précède et de ce qui suit par une ligne
 * vide, pour que tout le reste du scénario soit relu à l'identique.
 */
export function insertLines(text: string, position: number, lines: string): TextChange {
  const before = text.slice(0, position)
  const atEnd = position >= text.length
  let prefix = ''
  if (before !== '') prefix = before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
  // En fin de texte, on garde l'habitude du fichier : finir ou non par une fin de ligne.
  const suffix = atEnd ? (text === '' || text.endsWith('\n') ? '\n' : '') : '\n\n'
  return { from: position, to: position, insert: prefix + lines + suffix }
}
