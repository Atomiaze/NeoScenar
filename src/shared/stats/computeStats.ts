// Statistiques du scénario (étape 13B) : tout est tiré du texte Fountain analysé et de sa pagination,
// les mêmes que ceux de l'éditeur et du navigateur. Calcul pur, recalculé à l'ouverture du module.

import {
  estimateDurations,
  getCharacters,
  getLocations,
  getScenes,
  parseInline,
  type FountainDocument,
  type FountainElement,
  type Pagination
} from '@neoscenar/fountain'
import { PLACEHOLDER_HEADING, parseSceneNumber, sceneLabel } from '../scriptLink'
import { numberKey } from '../decoupage/order'
import { nameKey } from '../research/sheetNames'

export type IntExt = 'int' | 'ext' | 'mixed' | 'unknown'
export type DayNight = 'day' | 'night' | 'other' | 'unknown'

export interface SpeechStat {
  name: string
  replies: number
  words: number
  seconds: number
}

export interface ActivityScene {
  /** Index de l'en-tête dans document.elements. */
  index: number
  label: string
}

export interface ActivityRow {
  name: string
  /** Une case par scène : parle, seulement nommé dans une action, ou absent. */
  cells: ('speaks' | 'named' | null)[]
}

export interface SceneBar {
  index: number
  /** Ligne de l'en-tête dans le texte (à partir de 1). */
  line: number
  label: string
  heading: string
  seconds: number
  /** Index de l'acte (section de niveau 1) qui contient la scène ; null hors de tout acte. */
  actIndex: number | null
  intExt: IntExt
  dayNight: DayNight
}

export interface LocationStat {
  name: string
  scenes: number
  seconds: number
}

export interface ScriptStats {
  pages: number
  seconds: number
  /** Somme des durées des plans du découpage ; null si aucun plan n'a de durée. */
  shotSeconds: number | null
  sceneCount: number
  speakingCharacters: number
  locationCount: number
  speech: SpeechStat[]
  activityScenes: ActivityScene[]
  activity: ActivityRow[]
  scenes: SceneBar[]
  locations: LocationStat[]
}

const MARKED_TEXT = /\[\[[\s\S]*?\]\]|\/\*[\s\S]*?\*\//g
const DIALOGUE_TYPES: ReadonlySet<string> = new Set(['parenthetical', 'dialogue', 'lyrics'])

/** Mots d'un texte, sans notes, texte mis de côté ni marqueurs de mise en forme. */
export function countWords(text: string): number {
  let words = 0
  for (const line of text.replace(MARKED_TEXT, '').split('\n')) {
    const plain = parseInline(line)
      .filter((span) => span.type === 'text')
      .map((span) => span.text)
      .join('')
    words += plain.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length
  }
  return words
}

function plainText(element: FountainElement): string {
  return element.text.replace(MARKED_TEXT, '')
}

export function intExtOf(prefix: string): IntExt {
  const upper = prefix.toUpperCase()
  const int = /\bINT/.test(upper)
  const ext = /\bEXT/.test(upper)
  if (int && ext) return 'mixed'
  return int ? 'int' : ext ? 'ext' : 'unknown'
}

export function dayNightOf(time: string): DayNight {
  const upper = time.toUpperCase()
  if (upper === '') return 'unknown'
  if (/\bNUIT\b/.test(upper)) return 'night'
  if (/\bJOUR\b/.test(upper)) return 'day'
  return 'other'
}

/** Vrai si `name` (en majuscules) apparaît comme mot entier dans `text` (en majuscules). */
function mentions(text: string, name: string): boolean {
  let from = text.indexOf(name)
  while (from >= 0) {
    const before = text[from - 1]
    const after = text[from + name.length]
    if (!(before && /[\p{L}\p{N}]/u.test(before)) && !(after && /[\p{L}\p{N}]/u.test(after))) {
      return true
    }
    from = text.indexOf(name, from + 1)
  }
  return false
}

/** Index de l'acte (section de niveau 1) de chaque élément, ou null avant le premier acte. */
function actIndexes(doc: FountainDocument): (number | null)[] {
  let current: number | null = null
  return doc.elements.map((element, index) => {
    if (element.type === 'section' && (element.section?.level ?? 1) === 1) current = index
    return current
  })
}

/**
 * `shotSecondsByScene` : durée des plans du découpage par clé de numéro (« 30 »), pour les cartes qui
 * ne sont pas orphelines ; une scène orpheline n'est pas dans le texte et n'apparaît donc jamais ici.
 */
export function computeStats(
  doc: FountainDocument,
  pagination: Pagination,
  shotSecondsByScene: ReadonlyMap<string, number> = new Map()
): ScriptStats {
  const durations = estimateDurations(doc, pagination)
  const secondsPerLine = 60 / pagination.linesPerPage
  const scenes = getScenes(doc)
  const acts = actIndexes(doc)
  const secondsOfScene = new Map(durations.scenes.map((scene) => [scene.index, scene.seconds]))

  // Temps de parole : un bloc = personnage, didascalies et répliques qui le suivent.
  const speech = new Map<string, SpeechStat>()
  const speakers = getCharacters(doc).map((character) => character.name)
  doc.elements.forEach((element, index) => {
    if (element.type !== 'character') return
    const name = (element.character?.name ?? '').trim()
    if (name === '') return
    const key = nameKey(name)
    const stat = speech.get(key) ?? { name, replies: 0, words: 0, seconds: 0 }
    stat.replies++
    stat.seconds += durations.elementLines[index] * secondsPerLine
    for (let next = index + 1; next < doc.elements.length; next++) {
      const following = doc.elements[next]
      if (!DIALOGUE_TYPES.has(following.type)) break
      stat.seconds += durations.elementLines[next] * secondsPerLine
      if (following.type !== 'parenthetical') stat.words += countWords(following.text)
    }
    speech.set(key, stat)
  })
  const speechList = [...speech.values()].sort(
    (a, b) => b.seconds - a.seconds || b.words - a.words || a.name.localeCompare(b.name, 'fr')
  )
  // Les noms de personnages gardent la forme choisie par getCharacters (majuscules de préférence).
  const shownName = new Map(speakers.map((name) => [nameKey(name), name]))
  for (const stat of speechList) stat.name = shownName.get(nameKey(stat.name)) ?? stat.name

  // Activité : une colonne par scène, une ligne par personnage qui parle.
  const activityScenes: ActivityScene[] = scenes.map((scene) => {
    const number = scene.info.number === null ? null : parseSceneNumber(scene.info.number)
    return { index: scene.index, label: number ? sceneLabel(number) : String(scene.order) }
  })
  const upperNames = speechList.map((stat) => stat.name.toUpperCase())
  const activity: ActivityRow[] = speechList.map((stat) => ({
    name: stat.name,
    cells: scenes.map(() => null)
  }))
  scenes.forEach((scene, column) => {
    const speaking = new Set<string>()
    let actionText = ''
    for (const element of scene.elements) {
      if (element.type === 'character' && element.character) {
        speaking.add(nameKey(element.character.name))
      } else if (element.type === 'action') actionText += `\n${plainText(element).toUpperCase()}`
      if (element.type === 'section') break
    }
    activity.forEach((row, rowIndex) => {
      if (speaking.has(nameKey(row.name))) row.cells[column] = 'speaks'
      else if (mentions(actionText, upperNames[rowIndex])) row.cells[column] = 'named'
    })
  })

  // Dynamique : une barre par scène.
  const bars: SceneBar[] = scenes.map((scene, order) => ({
    index: scene.index,
    line: scene.heading.position?.startLine ?? 1,
    label: activityScenes[order].label,
    heading: scene.heading.text.replace(MARKED_TEXT, '').replace(/\s+/g, ' ').trim(),
    seconds: secondsOfScene.get(scene.index) ?? 0,
    actIndex: acts[scene.index],
    intExt: intExtOf(scene.info.prefix),
    dayNight: dayNightOf(scene.info.time)
  }))

  // Lieux : nombre de scènes et durée totale.
  const locationSeconds = new Map<string, number>()
  for (const scene of scenes) {
    const key = nameKey(scene.info.location)
    locationSeconds.set(
      key,
      (locationSeconds.get(key) ?? 0) + (secondsOfScene.get(scene.index) ?? 0)
    )
  }
  const locations: LocationStat[] = getLocations(doc)
    // L'en-tête provisoire des cartes n'est pas un lieu.
    .filter(({ name }) => nameKey(name) !== nameKey(PLACEHOLDER_HEADING))
    .map(({ name, scenes: count }) => ({
      name,
      scenes: count,
      seconds: locationSeconds.get(nameKey(name)) ?? 0
    }))
    .sort(
      (a, b) => b.seconds - a.seconds || b.scenes - a.scenes || a.name.localeCompare(b.name, 'fr')
    )

  let shotSeconds = 0
  for (const seconds of shotSecondsByScene.values()) shotSeconds += seconds

  return {
    pages: pagination.pages.length,
    seconds: durations.totalSeconds,
    shotSeconds: shotSeconds > 0 ? shotSeconds : null,
    sceneCount: scenes.length,
    speakingCharacters: speechList.length,
    locationCount: locations.length,
    speech: speechList,
    activityScenes,
    activity,
    scenes: bars,
    locations
  }
}

/** Durées des plans par numéro de scène, sans les cartes orphelines. */
export function shotSecondsByNumber(
  cards: readonly {
    number: number
    letter: string
    orphan: boolean
    shots: { duration: number | null }[]
  }[]
): Map<string, number> {
  const result = new Map<string, number>()
  for (const card of cards) {
    if (card.orphan) continue
    const seconds = card.shots.reduce((total, shot) => total + (shot.duration ?? 0), 0)
    if (seconds > 0) result.set(numberKey(card), seconds)
  }
  return result
}
