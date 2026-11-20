import { paginate, parse, type ResolvedLayout } from '@neoscenar/fountain'
import { numberKey } from '../decoupage/order'
import type { ItemNumber } from '../projectTypes'
import { readScriptScenes } from './scriptScenes'
import { writtenLineCount } from './cardTextEdits'

export interface BlocksLength {
  /** Lignes écrites sous les en-têtes (lignes vides non comptées) : 0 si rien n'est écrit. */
  written: number
  /** Lignes occupées à l'impression, avec la même mise en page que l'éditeur. */
  printedLines: number
  linesPerPage: number
}

/**
 * Longueur du texte de scènes (pour prévenir avant de le supprimer) : seules les scènes présentes
 * dans le texte comptent.
 */
export function blocksLength(
  text: string,
  numbers: readonly ItemNumber[],
  layout: ResolvedLayout
): BlocksLength {
  const wanted = new Set(numbers.map(numberKey))
  const scenes = readScriptScenes(text).filter(
    (scene) => scene.number && wanted.has(numberKey(scene.number))
  )
  const written = scenes.reduce((total, scene) => total + writtenLineCount(text, scene.number!), 0)
  const blocks = scenes.map((scene) => text.slice(scene.block.from, scene.block.to)).join('')
  const pages = paginate(parse(blocks, { titlePage: false }), layout).pages
  const last = pages[pages.length - 1]
  const printedLines = last ? (pages.length - 1) * layout.linesPerPage + last.usedLines : 0
  return { written, printedLines, linesPerPage: layout.linesPerPage }
}
