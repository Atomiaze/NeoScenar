import { isCharacterText, removeMarkedText } from './syntax.ts'
import type { CharacterInfo } from './types.ts'

export interface CharacterAnalysis {
  /** Texte utile : nom et extensions, sans « @ » ni « ^ ». */
  text: string
  forced: boolean
  isCharacter: boolean
  info: CharacterInfo
}

export function analyzeCharacter(line: string): CharacterAnalysis {
  let text = line.trim()
  const forced = text.startsWith('@')
  if (forced) text = text.slice(1).trimStart()
  const dual = text.endsWith('^')
  if (dual) text = text.slice(0, -1).trimEnd()

  const visible = removeMarkedText(text).trim()
  const parenthesis = visible.indexOf('(')
  const name = (parenthesis < 0 ? visible : visible.slice(0, parenthesis)).trim()
  const extensions = [...visible.matchAll(/\(([^()]*)\)/g)]
    .map((match) => match[1].trim())
    .filter((extension) => extension !== '')
  return {
    text,
    forced,
    isCharacter: forced || isCharacterText(visible),
    info: { name, extensions, dual }
  }
}

/**
 * Analyse une ligne seule comme une ligne de personnage (aide pour l'éditeur).
 * Renvoie null si la ligne ne peut pas être un personnage (minuscules hors extensions, sans « @ »).
 */
export function parseCharacterLine(line: string): CharacterInfo | null {
  const analysis = analyzeCharacter(line)
  return analysis.isCharacter ? analysis.info : null
}
