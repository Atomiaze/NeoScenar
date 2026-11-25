import { parse } from '@neoscenar/fountain'
import { compareItemNumbers, numberKey } from '../decoupage/order'
import type { ItemNumber } from '../projectTypes'
import { sceneNumberMarker } from './sceneNumber'
import { readScriptScenes, type ScriptScene } from './scriptScenes'
import { applyTextChanges, headingLine, insertLines, type TextChange } from './textChanges'

// Actions des cartes traduites en modifications du texte du scénario. Les scènes sont toujours
// retrouvées par leur numéro, jamais par une position mémorisée : le texte a pu changer entre-temps.
// Chaque fonction renvoie des modifications par rapport au texte reçu (vide ou null si la scène
// visée n'existe pas : l'action s'applique alors aux cartes seulement).

/**
 * Où placer un bloc : après le bloc d'une scène, juste avant une scène ou une section (pour remettre
 * un bloc exactement où il était, par exemple seul dans son acte), avant la première scène, ou à la
 * fin du scénario.
 */
export type BlockPlace =
  { after: ItemNumber } | { before: ItemNumber } | { beforeSection: SectionRef } | 'start' | 'end'

/** Une ligne de section (« # ACTE 2 ») : son texte, et combien de sections identiques la précèdent. */
export interface SectionRef {
  title: string
  occurrence: number
}

export interface SectionLine extends SectionRef {
  from: number
}

/** Lignes de section du texte, dans l'ordre, avec leur rang parmi les sections de même titre. */
export function readSections(text: string): SectionLine[] {
  const seen = new Map<string, number>()
  return parse(text, { titlePage: false }).elements.flatMap((element) => {
    if (element.type !== 'section' || !element.position) return []
    const occurrence = seen.get(element.text) ?? 0
    seen.set(element.text, occurrence + 1)
    return [{ title: element.text, occurrence, from: element.position.startOffset }]
  })
}

/** Une scène à insérer dans le texte : son en-tête (vide : à écrire) et son numéro. */
export interface HeadingToInsert {
  heading: string
  number: ItemNumber
}

function findScene(scenes: readonly ScriptScene[], number: ItemNumber): ScriptScene | undefined {
  const key = numberKey(number)
  return scenes.find((scene) => scene.number !== null && numberKey(scene.number) === key)
}

/** Position d'insertion, ou null si la scène de référence n'est plus dans le texte. */
function placePosition(
  text: string,
  scenes: readonly ScriptScene[],
  place: BlockPlace
): number | null {
  if (place === 'end') return text.length
  if (place === 'start') return scenes[0]?.line.from ?? text.length
  if ('after' in place) return findScene(scenes, place.after)?.block.to ?? null
  if ('before' in place) return findScene(scenes, place.before)?.line.from ?? null
  const { title, occurrence } = place.beforeSection
  return (
    readSections(text).find((line) => line.title === title && line.occurrence === occurrence)
      ?.from ?? null
  )
}

/**
 * Place qui correspond à un numéro (pour recréer l'en-tête d'une carte orpheline) : après la dernière
 * scène du texte qui a un numéro plus petit, sinon avant la première scène.
 */
export function placeForNumber(text: string, number: ItemNumber): BlockPlace {
  let place: BlockPlace = 'start'
  for (const scene of readScriptScenes(text)) {
    if (scene.number && compareItemNumbers(scene.number, number) < 0)
      place = { after: scene.number }
  }
  return place
}

/**
 * Insère des en-têtes (ajouter une ou plusieurs scènes, dupliquer, recréer l'en-tête d'une orpheline),
 * en une seule modification. Null si la scène de référence n'est plus dans le texte.
 */
export function insertHeadings(
  text: string,
  place: BlockPlace,
  headings: readonly HeadingToInsert[]
): TextChange | null {
  if (headings.length === 0) return null
  const position = placePosition(text, readScriptScenes(text), place)
  if (position === null) return null
  const lines = headings.map((item) => headingLine(item.heading, item.number)).join('\n\n')
  return insertLines(text, position, lines)
}

/** Texte d'un bloc, sans les lignes vides qui le terminent. */
function blockText(text: string, scene: ScriptScene): string {
  return text.slice(scene.block.from, scene.block.to).replace(/\n+$/, '')
}

/** Retire un bloc en gardant une ligne vide entre ce qui le précédait et ce qui le suivait. */
function removal(text: string, scene: ScriptScene): TextChange {
  return blockRemoval(text, scene.block)
}

/** Retire le texte de `block` (bloc d'une scène ou d'une section) ; voir `removal`. */
export function blockRemoval(text: string, block: { from: number; to: number }): TextChange {
  let { from } = block
  const { to } = block
  if (to >= text.length) {
    // Dernière scène : on retire aussi les lignes vides qui la précédaient.
    while (from > 0 && text[from - 1] === '\n') from--
    return { from, to, insert: from > 0 && text.endsWith('\n') ? '\n' : '' }
  }
  const before = text.slice(0, from)
  const insert = from === 0 || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
  return { from, to, insert }
}

/**
 * Place exacte du bloc d'une scène, d'après ce qui le suit : la scène suivante, la section suivante,
 * ou la fin du texte. Sert à l'annulation (remettre un bloc supprimé ou déplacé où il était).
 */
function placeOf(text: string, scenes: readonly ScriptScene[], scene: ScriptScene): BlockPlace {
  const next = scenes[scenes.indexOf(scene) + 1]
  if (next && next.line.from === scene.block.to && next.number) return { before: next.number }
  const section = readSections(text).find((line) => line.from === scene.block.to)
  if (section) return { beforeSection: { title: section.title, occurrence: section.occurrence } }
  return 'end'
}

/** Place actuelle du bloc d'une scène (voir placeOf), ou null si elle n'est pas dans le texte. */
export function scenePlace(text: string, number: ItemNumber): BlockPlace | null {
  const scenes = readScriptScenes(text)
  const scene = findScene(scenes, number)
  return scene ? placeOf(text, scenes, scene) : null
}

export interface RemovedBlock {
  change: TextChange
  /** Texte retiré, gardé dans l'historique des cartes pour le restituer à l'identique. */
  text: string
  /** Où le remettre en cas d'annulation. */
  place: BlockPlace
}

/** Supprimer une scène : retire tout son bloc de texte. Null si elle n'est pas dans le texte. */
export function removeSceneBlock(text: string, number: ItemNumber): RemovedBlock | null {
  const scenes = readScriptScenes(text)
  const scene = findScene(scenes, number)
  if (!scene) return null
  return {
    change: removal(text, scene),
    text: blockText(text, scene),
    place: placeOf(text, scenes, scene)
  }
}

/** Annuler une suppression : remet le bloc retiré à sa place (ou à la fin, si la place a disparu). */
export function restoreSceneBlock(text: string, removed: Omit<RemovedBlock, 'change'>): TextChange {
  const position = placePosition(text, readScriptScenes(text), removed.place) ?? text.length
  return insertLines(text, position, removed.text)
}

/** Bloc dont le numéro du marqueur est remplacé (ou ajouté). */
function renumberedBlock(text: string, scene: ScriptScene, number: ItemNumber): string {
  const marker = ` ${sceneNumberMarker(number)}`
  const changed = applyTextChanges(text, [
    scene.marker
      ? { ...scene.marker, insert: marker }
      : { from: scene.contentEnd, to: scene.contentEnd, insert: marker }
  ])
  const end = scene.block.to + changed.length - text.length
  return changed.slice(scene.block.from, end).replace(/\n+$/, '')
}

/**
 * Déplacer une scène : tout son bloc va à la nouvelle place (les lignes de section restent où elles
 * sont), avec son nouveau numéro s'il est donné. Deux modifications distinctes (retrait et insertion),
 * pour ne pas toucher au texte situé entre les deux. Vide si rien ne change.
 */
export function moveSceneBlock(
  text: string,
  number: ItemNumber,
  place: BlockPlace,
  newNumber?: ItemNumber
): TextChange[] {
  const scenes = readScriptScenes(text)
  const scene = findScene(scenes, number)
  if (!scene) return []
  const position = placePosition(text, scenes, place)
  if (position === null) return []
  const remove = removal(text, scene)
  const moved = newNumber ? renumberedBlock(text, scene, newNumber) : blockText(text, scene)
  // Même place : seul le numéro change éventuellement.
  if (position >= remove.from && position <= scene.block.to) {
    return newNumber ? renumberHeadings(text, [{ from: number, to: newNumber }]) : []
  }
  return [remove, insertLines(text, position, moved)]
}

/**
 * Modifier l'en-tête sur la carte : la ligne d'en-tête est réécrite, avec un point de forçage
 * seulement s'il est nécessaire ; le numéro est conservé. Null si rien ne change.
 */
export function rewriteHeading(
  text: string,
  number: ItemNumber,
  heading: string
): TextChange | null {
  const scene = findScene(readScriptScenes(text), number)
  if (!scene) return null
  const line = headingLine(heading, number)
  if (text.slice(scene.line.from, scene.contentEnd) === line) return null
  return { from: scene.line.from, to: scene.contentEnd, insert: line }
}

/** Renuméroter : tous les `#…#` concernés, en une seule fois. */
export function renumberHeadings(
  text: string,
  mapping: readonly { from: ItemNumber; to: ItemNumber }[]
): TextChange[] {
  const scenes = readScriptScenes(text)
  return mapping.flatMap(({ from, to }) => {
    const scene = findScene(scenes, from)
    if (!scene || numberKey(from) === numberKey(to)) return []
    const marker = ` ${sceneNumberMarker(to)}`
    return [{ from: scene.marker!.from, to: scene.marker!.to, insert: marker }]
  })
}

/**
 * Nombre de lignes écrites sous l'en-tête d'une scène (lignes vides non comptées) : pour prévenir
 * avant d'annuler l'ajout d'une scène dans laquelle l'élève a déjà écrit.
 */
export function writtenLineCount(text: string, number: ItemNumber): number {
  const scene = findScene(readScriptScenes(text), number)
  if (!scene) return 0
  return text
    .slice(scene.line.to, scene.block.to)
    .split('\n')
    .filter((line) => line.trim() !== '').length
}
