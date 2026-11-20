import { expect } from 'vitest'
import { createShot, type IdSource } from '../decoupage/factories'
import { parseNumber } from '../decoupage/testFixtures'
import { formatSceneNumber } from '../numbering'
import type { Decoupage, Scene } from '../projectTypes'
import { reconcile, type ReconcileContext, type ReconcileResult } from './reconcile'
import { applyTextChanges } from './textChanges'

// Outils des tests du lien scénario ↔ cartes.

/**
 * Cartes dans l'ordre donné (pas forcément croissant) : « 30 » est une carte vide, « 30* » une
 * carte qui a un nom (donc jamais supprimée en silence). Identifiants « S30 », « S30-P10 ».
 */
export function cards(
  numbers: readonly string[],
  options: { locked?: boolean; linked?: boolean } = {}
): Decoupage {
  const scenes: Scene[] = numbers.map((item) => {
    const named = item.endsWith('*')
    const text = named ? item.slice(0, -1) : item
    return {
      id: `S${text}`,
      ...parseNumber(text),
      name: named ? `Nom ${text}` : '',
      heading: '',
      color: null,
      shots: [createShot(`S${text}-P10`, { number: 10, letter: '' })],
      orphan: false
    }
  })
  return {
    formatVersion: 1,
    numbersLocked: options.locked ?? false,
    scriptLinked: options.linked ?? true,
    scenes
  }
}

/** Texte d'un scénario : chaque en-tête suivi d'une ligne d'action, une ligne vide entre les éléments. */
export function script(...headings: string[]): string {
  return headings.map((heading, i) => `${heading}\n\nAction ${i + 1}.\n`).join('\n')
}

export function labels(decoupage: Decoupage): string[] {
  return decoupage.scenes.map((scene) => formatSceneNumber(scene.number, scene.letter))
}

export interface Run {
  text: string
  result: ReconcileResult
}

/** Rapprochement, puis vérification qu'un second passage ne change plus rien. */
export function run(
  text: string,
  decoupage: Decoupage,
  ids: IdSource,
  context: ReconcileContext = {}
): Run {
  const result = reconcile(text, decoupage, context, ids)
  const next = applyTextChanges(text, result.textChanges)
  expectStable(next, result.decoupage, ids)
  return { text: next, result }
}

export function expectStable(text: string, decoupage: Decoupage, ids: IdSource): void {
  const again = reconcile(text, decoupage, {}, ids)
  expect(again.textChanges, 'second passage : texte modifié').toEqual([])
  expect(again.decoupage, 'second passage : découpage modifié').toBe(decoupage)
}
