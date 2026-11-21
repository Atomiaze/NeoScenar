import { FORCED_SCENE_HEADING, removeMarkedText, SCENE_HEADING_START } from './syntax.ts'
import type { SceneHeadingInfo } from './types.ts'

const PREFIX = /^(?:int\.?\/ext|int|ext|est|i\/e)(?:\.|(?=\s)|$)/i
const SCENE_NUMBER = /\s*#([\p{L}\p{N}.-]+)#$/u
const SEPARATOR = /(?:^|\s+)[-–—](?:\s+|$)/g
const TRAILING_DASH = /[\s\-–—]+$/u

export interface SceneHeadingAnalysis {
  /** Texte utile : sans le point de forçage ni le numéro de scène. */
  text: string
  forced: boolean
  isHeading: boolean
  info: SceneHeadingInfo
}

export function analyzeSceneHeading(line: string): SceneHeadingAnalysis {
  let rest = line.trim()
  const forced = FORCED_SCENE_HEADING.test(rest)
  if (forced) rest = rest.slice(1)

  let number: string | null = null
  const numberMatch = SCENE_NUMBER.exec(rest)
  if (numberMatch) {
    number = numberMatch[1]
    rest = rest.slice(0, numberMatch.index)
  }

  const text = rest.trim()
  const visible = removeMarkedText(text).trim()
  const prefix = PREFIX.exec(visible)?.[0] ?? ''
  const { location, time } = splitLocationAndTime(visible.slice(prefix.length).trim())
  return {
    text,
    forced,
    isHeading: forced || SCENE_HEADING_START.test(visible),
    info: { prefix, location, time, number }
  }
}

/**
 * Règle de NeoScenar : le moment est le dernier segment après « - » (tiret entouré d'espaces),
 * le lieu est tout ce qui précède. « RUE SAINT-LUC - NUIT » → lieu « RUE SAINT-LUC », moment « NUIT ».
 * Un tiret final sans moment (« MAISON - », en cours de frappe) est un séparateur : le lieu ne garde
 * jamais de tiret ni d'espace en fin de nom.
 */
export function splitLocationAndTime(text: string): { location: string; time: string } {
  let last: RegExpExecArray | null = null
  for (const match of text.matchAll(SEPARATOR)) last = match as RegExpExecArray
  if (!last) return { location: text.replace(TRAILING_DASH, ''), time: '' }
  return {
    location: text.slice(0, last.index).replace(TRAILING_DASH, ''),
    time: text.slice(last.index + last[0].length).trim()
  }
}

/**
 * Analyse une ligne seule comme un en-tête de scène (aide pour l'éditeur).
 * Renvoie null si la ligne n'est pas un en-tête (ni préfixe reconnu, ni point de forçage).
 */
export function parseSceneHeading(line: string): SceneHeadingInfo | null {
  const analysis = analyzeSceneHeading(line)
  return analysis.isHeading ? analysis.info : null
}
