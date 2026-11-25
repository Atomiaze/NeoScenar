import { parse } from '@neoscenar/fountain'
import { numberKey } from '../decoupage/order'
import type { ItemNumber } from '../projectTypes'
import {
  insertHeadings,
  moveSceneBlock,
  placeForNumber,
  removeSceneBlock,
  renumberHeadings,
  restoreSceneBlock,
  rewriteHeading,
  scenePlace,
  type BlockPlace,
  type HeadingToInsert,
  type SectionRef
} from './cardTextEdits'
import { moveSectionInverse } from './sectionMove'
import { readScriptScenes, type ScriptScene } from './scriptScenes'
import { readSynopsis, setSynopsis } from './synopsis'
import { setDraft } from './draftScene'
import { applyTextChanges, type TextChange } from './textChanges'

// Effet d'une action des cartes sur le texte, décrit par les numéros de scène (jamais par une
// position) : il reste juste même si le texte a changé entre-temps. Appliquer une opération donne
// aussi son inverse, calculé sur le texte du moment : c'est ce que garde l'historique des cartes
// pour annuler, puis rétablir. Une scène qui n'est plus dans le texte est ignorée sans erreur.

export type TextOp =
  | { kind: 'insertHeadings'; place: BlockPlace; headings: HeadingToInsert[] }
  | { kind: 'removeBlocks'; numbers: ItemNumber[] }
  | { kind: 'restoreBlocks'; blocks: { text: string; place: BlockPlace }[] }
  | { kind: 'moveBlocks'; moves: BlockMove[] }
  | { kind: 'setHeading'; number: ItemNumber; heading: string }
  | { kind: 'setHeadingLine'; number: ItemNumber; line: string }
  | { kind: 'setDescription'; number: ItemNumber; description: string }
  | { kind: 'setDraft'; number: ItemNumber; draft: boolean }
  | { kind: 'renumber'; mapping: { from: ItemNumber; to: ItemNumber }[] }
  | { kind: 'moveSection'; section: SectionRef; before: SectionRef | null; level: number }
  | { kind: 'sequence'; ops: TextOp[] }

/** Déplacement d'un bloc ; avec `newNumber`, son `#…#` change aussi. */
export interface BlockMove {
  number: ItemNumber
  place: BlockPlace
  newNumber?: ItemNumber
}

export interface TextOpResult {
  text: string
  /**
   * Modifications successives : chaque liste est exprimée par rapport au texte laissé par la
   * précédente (l'éditeur les combine en une seule modification).
   */
  steps: TextChange[][]
  /** Opération qui défait celle-ci. */
  inverse: TextOp
}

const NOTHING: TextOp = { kind: 'sequence', ops: [] }

/** Rien d'utile à faire (sert à éviter une modification vide). */
export function isEmptyTextOp(op: TextOp): boolean {
  return op.kind === 'sequence' && op.ops.every(isEmptyTextOp)
}

/** Applique une suite de petites opérations, chacune sur le texte laissé par la précédente. */
class Builder {
  steps: TextChange[][] = []
  constructor(public text: string) {}
  push(changes: TextChange[]): void {
    if (changes.length === 0) return
    this.steps.push(changes)
    this.text = applyTextChanges(this.text, changes)
  }
}

function findScene(text: string, number: ItemNumber): ScriptScene | undefined {
  const key = numberKey(number)
  return readScriptScenes(text).find((scene) => scene.number && numberKey(scene.number) === key)
}

export function applyTextOp(text: string, op: TextOp): TextOpResult {
  const builder = new Builder(text)
  const inverse = run(builder, op)
  return { text: builder.text, steps: builder.steps, inverse }
}

function run(b: Builder, op: TextOp): TextOp {
  switch (op.kind) {
    case 'sequence': {
      const inverses = op.ops.map((item) => run(b, item))
      return { kind: 'sequence', ops: inverses.reverse() }
    }
    case 'insertHeadings': {
      if (op.headings.length === 0) return NOTHING
      // Scène de référence disparue entre-temps : à la place qui correspond au numéro.
      const change =
        insertHeadings(b.text, op.place, op.headings) ??
        insertHeadings(b.text, placeForNumber(b.text, op.headings[0].number), op.headings)
      if (!change) return NOTHING
      b.push([change])
      return { kind: 'removeBlocks', numbers: op.headings.map((item) => item.number) }
    }
    case 'removeBlocks': {
      const removed: { text: string; place: BlockPlace }[] = []
      for (const number of op.numbers) {
        const block = removeSceneBlock(b.text, number)
        if (!block) continue
        b.push([block.change])
        removed.push({ text: block.text, place: block.place })
      }
      // Les blocs sont remis dans l'ordre inverse : chaque place est alors celle qui a été notée.
      return { kind: 'restoreBlocks', blocks: removed.reverse() }
    }
    case 'restoreBlocks': {
      const numbers: ItemNumber[] = []
      for (const block of op.blocks) {
        b.push([restoreSceneBlock(b.text, block)])
        const number = readScriptScenes(block.text)[0]?.number
        if (number) numbers.push(number)
      }
      return { kind: 'removeBlocks', numbers: numbers.reverse() }
    }
    case 'moveBlocks': {
      const back: BlockMove[] = []
      for (const move of op.moves) {
        const from = scenePlace(b.text, move.number)
        if (!from) continue
        const changes = moveSceneBlock(b.text, move.number, move.place, move.newNumber)
        if (changes.length === 0) continue
        b.push(changes)
        back.push(
          move.newNumber
            ? { number: move.newNumber, place: from, newNumber: move.number }
            : { number: move.number, place: from }
        )
      }
      return { kind: 'moveBlocks', moves: back.reverse() }
    }
    case 'setHeading':
    case 'setHeadingLine': {
      const scene = findScene(b.text, op.number)
      if (!scene) return NOTHING
      const before = b.text.slice(scene.line.from, scene.contentEnd)
      const change =
        op.kind === 'setHeading'
          ? rewriteHeading(b.text, op.number, op.heading)
          : before === op.line
            ? null
            : { from: scene.line.from, to: scene.contentEnd, insert: op.line }
      if (!change) return NOTHING
      b.push([change])
      return { kind: 'setHeadingLine', number: op.number, line: before }
    }
    case 'setDescription': {
      const scene = findScene(b.text, op.number)
      if (!scene) return NOTHING
      const before = sceneDescription(b.text, op.number) ?? ''
      const change = setSynopsis(b.text, scene.line.from, op.description)
      if (!change) return NOTHING
      b.push([change])
      return { kind: 'setDescription', number: op.number, description: before }
    }
    case 'setDraft': {
      const scene = findScene(b.text, op.number)
      const change = scene ? setDraft(b.text, scene.line.from, op.draft) : null
      if (!change) return NOTHING
      b.push([change])
      return { kind: 'setDraft', number: op.number, draft: !op.draft }
    }
    case 'moveSection': {
      const moved = moveSectionInverse(b.text, op)
      if (!moved) return NOTHING
      b.push(moved.changes)
      return { kind: 'moveSection', ...moved.inverse }
    }
    case 'renumber': {
      const present = new Set(
        readScriptScenes(b.text).flatMap((scene) => (scene.number ? [numberKey(scene.number)] : []))
      )
      const done = op.mapping.filter(
        (item) => present.has(numberKey(item.from)) && numberKey(item.from) !== numberKey(item.to)
      )
      b.push(renumberHeadings(b.text, done))
      return { kind: 'renumber', mapping: done.map((item) => ({ from: item.to, to: item.from })) }
    }
  }
}

/** Description (synopsis) d'une scène, lignes jointes par « \n » ; null si la scène est absente. */
export function sceneDescription(text: string, number: ItemNumber): string | null {
  const scene = findScene(text, number)
  if (!scene) return null
  const doc = parse(text, { titlePage: false })
  const index = doc.elements.findIndex(
    (element) => element.position?.startOffset === scene.line.from
  )
  return index < 0 ? null : readSynopsis(doc, index).lines.join('\n')
}
