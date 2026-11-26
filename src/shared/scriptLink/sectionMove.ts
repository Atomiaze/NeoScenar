import { parse, type FountainDocument } from '@neoscenar/fountain'
import { numberKey } from '../decoupage/order'
import type { Decoupage, ItemNumber } from '../projectTypes'
import { blockRemoval, readSections, type SectionRef } from './cardTextEdits'
import { readScriptScenes } from './scriptScenes'
import { MAX_SECTION_LEVEL } from './sectionEdit'
import { applyTextChanges, insertLines, minimalTextChange, type TextChange } from './textChanges'

// Déplacer une section avec ses scènes depuis le navigateur (18C-16). Le bloc d'une section va de sa
// ligne jusqu'à la prochaine section de même niveau ou plus haut (ou la fin) : note de couleur,
// synopsis, scènes et sous-sections le suivent. Une section n'a pas de fin en Fountain : déposée entre
// deux scènes, elle avalerait celles qui la suivent. Elle ne se dépose donc que juste au-dessus d'une
// ligne de section (elle en prend le niveau), tout en bas (niveau 1) ou tout en haut (niveau 1 ; demande
// de David : les scènes sans section du début entrent alors dans la section). Les scènes gardent leur numéro
// dans le texte : le rapprochement qui suit (`input.drop`) renumérote celles du bloc, comme les Cartes.

export interface SectionBlock {
  /** Début de la ligne de section. */
  from: number
  /** Fin du bloc : début de la prochaine section de même niveau ou plus haut, ou fin du texte. */
  to: number
  /** Début de l'élément section (celui du navigateur). */
  start: number
  level: number
  /** Niveau le plus profond du bloc (la section ou ses sous-sections). */
  deepest: number
  /** Index des éléments section du bloc dans le document (la section d'abord). */
  sections: number[]
}

/** Pourquoi on ne peut pas déposer la section à cet endroit. */
export type SectionDropRefusal = 'inside' | 'notBeforeSection' | 'tooDeep'

export type SectionDrop =
  | { ok: false; refusal: SectionDropRefusal }
  | { ok: true; level: number; /** Même place, même niveau : rien à faire. */ same: boolean }

const parseBody = (text: string): FountainDocument => parse(text, { titlePage: false })
const levelOf = (doc: FountainDocument, index: number): number =>
  doc.elements[index].section?.level ?? 1
const lineStart = (text: string, offset: number): number => text.lastIndexOf('\n', offset - 1) + 1
const HASHES = /^(\s*)(#+)/

/** Début du premier élément du navigateur (section ou scène) ; null s'il n'y en a pas. */
function topStart(doc: FountainDocument): number | null {
  const first = doc.elements.find(
    (element) => element.type === 'section' || element.type === 'scene_heading'
  )
  return first?.position?.startOffset ?? null
}

/** Début du premier élément du navigateur dans `text` (tout en haut) ; null s'il n'y en a pas. */
export function navigatorTop(text: string): number | null {
  return topStart(parseBody(text))
}

function sectionIndexAt(doc: FountainDocument, start: number): number {
  return doc.elements.findIndex(
    (element) => element.type === 'section' && element.position?.startOffset === start
  )
}

/** Bloc de la section qui commence à `start` ; null s'il n'y a pas de section là. */
export function sectionBlock(
  text: string,
  start: number,
  doc: FountainDocument = parseBody(text)
): SectionBlock | null {
  const index = sectionIndexAt(doc, start)
  if (index < 0) return null
  const level = levelOf(doc, index)
  const sections = [index]
  let to = text.length
  for (let i = index + 1; i < doc.elements.length; i++) {
    if (doc.elements[i].type !== 'section') continue
    if (levelOf(doc, i) <= level) {
      to = lineStart(text, doc.elements[i].position!.startOffset)
      break
    }
    sections.push(i)
  }
  const deepest = Math.max(...sections.map((i) => levelOf(doc, i)))
  return { from: lineStart(text, start), to, start, level, deepest, sections }
}

/**
 * Peut-on déposer la section qui commence à `start` juste avant l'élément qui commence à `before`
 * (null : tout en bas) ? Si oui, avec quel niveau. Null s'il n'y a pas de section à `start`.
 */
export function sectionDrop(
  text: string,
  start: number,
  before: number | null
): SectionDrop | null {
  const doc = parseBody(text)
  const block = sectionBlock(text, start, doc)
  if (!block) return null
  let level = 1
  let at = text.length
  if (before !== null) {
    const target = sectionIndexAt(doc, before)
    if (target < 0 && before !== topStart(doc)) return { ok: false, refusal: 'notBeforeSection' }
    level = target < 0 ? 1 : levelOf(doc, target)
    at = lineStart(text, before)
    if (at > block.from && at < block.to) return { ok: false, refusal: 'inside' }
  }
  if (block.deepest + level - block.level > MAX_SECTION_LEVEL) {
    return { ok: false, refusal: 'tooDeep' }
  }
  const samePlace = at === block.from || at === block.to || (before === null && atEnd(text, block))
  return { ok: true, level, same: samePlace && level === block.level }
}

/** Le bloc finit le texte (seules des lignes vides le suivent). */
function atEnd(text: string, block: SectionBlock): boolean {
  return text.slice(block.to).trim() === ''
}

/** Lignes du texte, avec les sections du bloc décalées pour que la section ait le niveau `level`. */
function shiftedLines(
  text: string,
  doc: FountainDocument,
  block: SectionBlock,
  level: number
): string[] {
  const lines = text.split('\n')
  const delta = level - block.level
  if (delta === 0) return lines
  for (const i of block.sections) {
    const at = doc.elements[i].position!.startLine - 1
    const next = levelOf(doc, i) + delta
    lines[at] = lines[at].replace(HASHES, (_, space: string) => space + '#'.repeat(next))
  }
  return lines
}

/**
 * Déplace la section qui commence à `start` (avec tout son bloc) juste avant l'élément qui commence
 * à `before` (null : à la fin), en lui donnant le niveau `level` (ses sous-sections suivent).
 * Deux modifications (retrait, insertion) par rapport au texte reçu, ou une seule si le bloc reste à
 * sa place et ne change que de niveau. Vide si rien ne change ou si la section est introuvable.
 */
export function moveSectionBlock(
  text: string,
  start: number,
  before: number | null,
  level: number
): TextChange[] {
  const doc = parseBody(text)
  const block = sectionBlock(text, start, doc)
  if (!block) return []
  const position = before === null ? text.length : lineStart(text, before)
  if (position > block.from && position < block.to) return []
  const lines = shiftedLines(text, doc, block, level)
  const samePlace =
    position === block.from || position === block.to || (before === null && atEnd(text, block))
  if (samePlace) {
    const result = lines.join('\n')
    return result === text ? [] : [minimalTextChange(text, result)]
  }
  // Le bloc décalé : mêmes lignes que dans le texte d'origine, niveaux changés.
  const firstLine = text.slice(0, block.from).split('\n').length - 1
  const lastLine =
    block.to >= text.length ? lines.length : text.slice(0, block.to).split('\n').length - 1
  const moved = lines.slice(firstLine, lastLine).join('\n').replace(/\n+$/, '')
  return [blockRemoval(text, block), insertLines(text, position, moved)]
}

/** Numéros des scènes du bloc, dans l'ordre du texte (scènes sans numéro ignorées). */
export function sectionSceneNumbers(text: string, start: number): ItemNumber[] {
  const block = sectionBlock(text, start)
  if (!block) return []
  return readScriptScenes(text).flatMap((scene) =>
    scene.number && scene.line.from >= block.from && scene.line.from < block.to
      ? [scene.number]
      : []
  )
}

/** Déplacement des cartes qui correspond au déplacement du bloc. */
export interface CardsForSectionMove {
  /** Cartes déplacées, dans l'ordre (celles des scènes du bloc, et les orphelines rangées entre). */
  ids: string[]
  /** Place de la première une fois toutes retirées de la liste (celle qu'attend `moveScenes`). */
  index: number
}

/**
 * Cartes à déplacer pour suivre le bloc ; null si l'ordre des scènes ne change pas (seul le texte
 * bouge : la section change de place sans enjamber de scène, ou seulement de niveau) ou si le bloc
 * n'a pas de carte.
 */
export function cardsForSectionMove(
  text: string,
  decoupage: Decoupage,
  changes: readonly TextChange[],
  start: number
): CardsForSectionMove | null {
  const numbers = sectionSceneNumbers(text, start).map(numberKey)
  const keys = (source: string): string[] =>
    readScriptScenes(source).flatMap((scene) => (scene.number ? [numberKey(scene.number)] : []))
  const order = keys(applyTextChanges(text, changes))
  if (numbers.length === 0 || order.join('|') === keys(text).join('|')) return null
  const position = (key: string): number =>
    decoupage.scenes.findIndex((scene) => numberKey(scene) === key)
  const cardPositions = numbers.map(position).filter((at) => at >= 0)
  if (cardPositions.length === 0) return null
  // Les cartes du bloc, et les éventuelles orphelines rangées entre elles (par leur numéro).
  const first = Math.min(...cardPositions)
  const last = Math.max(...cardPositions)
  const moved = decoupage.scenes.slice(first, last + 1)
  const movedKeys = new Set(numbers)
  if (moved.some((scene) => !movedKeys.has(numberKey(scene)) && !scene.orphan)) return null
  const movedIds = new Set(moved.map((scene) => scene.id))
  const others = decoupage.scenes.filter((scene) => !movedIds.has(scene.id))
  // Juste après la carte de la scène qui précédera le bloc dans le texte, sinon tout en tête.
  const at = order.indexOf(numbers[0])
  let index = 0
  for (let i = at - 1; i >= 0; i--) {
    const found = others.findIndex((scene) => numberKey(scene) === order[i])
    if (found >= 0) {
      index = found + 1
      break
    }
  }
  return { ids: moved.map((scene) => scene.id), index }
}

/** Référence (titre et rang) de la section qui commence à `start` ; null s'il n'y en a pas. */
export function sectionRefAt(text: string, start: number): SectionRef | null {
  const line = readSections(text).find((section) => section.from === start)
  return line ? { title: line.title, occurrence: line.occurrence } : null
}

/** Début de la section désignée par `ref` ; null si elle n'est plus dans le texte. */
export function sectionStart(text: string, ref: SectionRef): number | null {
  return (
    readSections(text).find(
      (line) => line.title === ref.title && line.occurrence === ref.occurrence
    )?.from ?? null
  )
}

/** Déplacement d'une section décrit sans position (pour l'historique des Cartes). */
export interface SectionMove {
  section: SectionRef
  /** Section avant laquelle aller ; null : à la fin ; 'top' : tout en haut du navigateur. */
  before: SectionRef | 'top' | null
  level: number
}

/** Résultat d'un déplacement : modifications, et ce qui le défait. */
export interface SectionMoveResult {
  changes: TextChange[]
  inverse: SectionMove
  /**
   * Scènes sans section du début, avalées par la section déposée tout en haut : pour annuler, elles
   * retournent d'abord juste au-dessus de la section (avant `inverse`).
   */
  absorbed: ItemNumber[]
}

/**
 * Position `offset` du texte d'origine dans le texte modifié par `changes` (hors zones modifiées) ;
 * un texte inséré juste à cette position la précède.
 */
function mapOffset(changes: readonly TextChange[], offset: number): number {
  let shift = 0
  for (const change of changes) {
    if (change.to <= offset && (change.from < offset || change.from === change.to)) {
      shift += change.insert.length - (change.to - change.from)
    }
  }
  return offset + shift
}

/**
 * Applique `move` au texte et calcule le déplacement qui le défait (place et niveau d'origine).
 * Null si la section n'est plus dans le texte ou si rien ne change.
 */
export function moveSectionInverse(text: string, move: SectionMove): SectionMoveResult | null {
  const doc = parseBody(text)
  const start = sectionStart(text, move.section)
  const before =
    move.before === 'top' ? topStart(doc) : move.before ? sectionStart(text, move.before) : null
  if (start === null || (move.before && before === null)) return null
  const block = sectionBlock(text, start, doc)
  if (!block) return null
  const changes = moveSectionBlock(text, start, before, move.level)
  if (changes.length === 0) return null
  const next = doc.elements.find(
    (element) =>
      element.type === 'section' && lineStart(text, element.position!.startOffset) === block.to
  )
  const after = applyTextChanges(text, changes)
  const nextStart = next ? mapOffset(changes, next.position!.startOffset) : null
  // La section déplacée : la dernière de son niveau (ou plus haut) avant sa section suivante.
  const limit = before === null ? after.length : mapOffset(changes, before)
  const newDoc = parseBody(after)
  let movedStart: number | null = null
  for (const element of newDoc.elements) {
    if (element.type !== 'section' || element.position!.startOffset >= limit) continue
    if ((element.section?.level ?? 1) <= move.level) movedStart = element.position!.startOffset
  }
  const section = movedStart === null ? null : sectionRefAt(after, movedStart)
  if (!section) return null
  const backBefore = nextStart === null ? null : sectionRefAt(after, nextStart)
  return {
    changes,
    inverse: { section, before: backBefore, level: block.level },
    absorbed: before === null ? [] : absorbedScenes(text, doc, before)
  }
}

/** Numéros des scènes sans section qui commencent le texte à `top` (vide si `top` est une section). */
function absorbedScenes(text: string, doc: FountainDocument, top: number): ItemNumber[] {
  if (top !== topStart(doc) || sectionIndexAt(doc, top) >= 0) return []
  const firstSection = doc.elements.find((element) => element.type === 'section')
  const end = firstSection ? firstSection.position!.startOffset : text.length
  return readScriptScenes(text).flatMap((scene) =>
    scene.number && scene.line.from < end ? [scene.number] : []
  )
}
