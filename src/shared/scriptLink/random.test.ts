import { describe, expect, it } from 'vitest'
import { duplicateItems } from '../decoupage/duplicate'
import { updateScene } from '../decoupage/fields'
import { findDecoupageProblem } from '../decoupage/invariants'
import { renumberProject, setNumbersLocked } from '../decoupage/numbers'
import { numberKey } from '../decoupage/order'
import { deleteItems, insertScenes, insertShots, moveScene } from '../decoupage/structure'
import { counterIds } from '../decoupage/testFixtures'
import type { EditResult } from '../decoupage/result'
import type { Decoupage } from '../projectTypes'
import { cardsTextOp } from './cardsTextOp'
import { isEmptyCard } from './emptyCard'
import { reconcile, type ReconcileContext } from './reconcile'
import { readScriptScenes, type TextRange } from './scriptScenes'
import { cards } from './testHelpers'
import { applyTextChanges, insertLines, type TextChange } from './textChanges'
import { applyTextOp, type TextOp } from './textOps'

// Garanties du rapprochement (spécification de l'étape 8, § 3), vérifiées sur des milliers de suites
// d'opérations aléatoires : taper, couper, coller, copier, supprimer, déplacer, annuler, et les actions
// des cartes. Après chaque opération et son rapprochement :
// - chaque scène du texte a un numéro valide et unique ;
// - chaque carte non orpheline correspond à exactement une scène, dans l'ordre du scénario ;
// - aucun plan n'est jamais perdu (sauf suppression demandée dans les cartes) ;
// - un second rapprochement ne change plus rien.
// Les actions des cartes passent par cardsTextOp, et leur annulation (Cmd + Z dans les cartes) par
// l'opération inverse sur le texte, comme dans l'application.

/** Générateur pseudo-aléatoire reproductible (même graine → même suite). */
function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32
    return state / 2 ** 32
  }
}

const HEADINGS = ['INT. CUISINE - JOUR', 'EXT. RUE - NUIT', 'INT. SALON - SOIR', '.FLASHBACK']
const WRITTEN_NUMBERS = ['#30#', '#3.1#', '#0030#', '#A2#', '#15#', '#20A#', '#30a#', '#7#']

interface World {
  text: string
  decoupage: Decoupage
  clipboard: string | null
  /** Textes précédents, pour simuler « Annuler » dans l'éditeur. */
  undoStack: string[]
  /** Dernière duplication : l'original et sa copie, pour dupliquer de nouveau (Cmd + D répété). */
  lastDuplicate: { original: string; copy: string } | null
  /** Historique des cartes : découpage d'avant et effet inverse sur le texte. */
  cardsUndo: { decoupage: Decoupage; inverse: TextOp | null }[]
  orphanIds: Set<string>
}

interface Step {
  text?: string
  decoupage?: Decoupage
  context?: ReconcileContext
  /** Plans supprimés volontairement depuis les cartes. */
  removedShots?: string[]
  /**
   * Annulation dans les cartes : ce qui ne doit pas se perdre, ce sont les plans avec contenu de
   * l'état restauré (une carte redevenue vide et absente du texte est supprimée, c'est la règle).
   */
  restored?: Decoupage
}

function runRandom(
  seed: number,
  steps: number
): {
  applied: number
  orphansSeen: number
  lockedSteps: number
  repeatedDuplicates: number
  outOfRoom: number
} {
  const random = seededRandom(seed)
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]
  const int = (max: number): number => Math.floor(random() * (max + 1))
  const ids = counterIds(`g${seed}`)
  const world: World = {
    text: '',
    decoupage: cards(['10'], { linked: false }),
    clipboard: null,
    undoStack: [],
    lastDuplicate: null,
    cardsUndo: [],
    orphanIds: new Set()
  }
  const stats = { applied: 0, orphansSeen: 0, lockedSteps: 0, repeatedDuplicates: 0, outOfRoom: 0 }
  let counter = 0

  const scenes = (): ReturnType<typeof readScriptScenes> => readScriptScenes(world.text)
  const boundaries = (): number[] => [
    ...scenes().map((scene) => scene.line.from),
    world.text.length
  ]
  const linkedCards = (): Decoupage['scenes'] =>
    world.decoupage.scenes.filter((scene) => !world.orphanIds.has(scene.id))
  const editText = (changes: TextChange[], context?: ReconcileContext): Step => ({
    text: applyTextChanges(world.text, changes),
    context
  })
  /** Action des cartes : effet sur le texte déduit des deux découpages, gardé pour l'annulation. */
  const cardsAction = (result: EditResult, removedShots?: string[]): Step | null => {
    if (!result.ok || result.decoupage === world.decoupage) return null
    const linked = new Set(
      scenes().flatMap((scene) => (scene.number ? [numberKey(scene.number)] : []))
    )
    const op = cardsTextOp(world.decoupage, result.decoupage, linked)
    const edit = op ? applyTextOp(world.text, op) : null
    world.cardsUndo.push({ decoupage: world.decoupage, inverse: edit?.inverse ?? null })
    return { decoupage: result.decoupage, text: edit?.text ?? world.text, removedShots }
  }
  /** Copies faites pendant la suite : copie → scène d'origine (comme la séance de l'application). */
  const copiedFrom = new Map<string, string>()
  const duplicateScene = (id: string): Step | null => {
    const result = duplicateItems(world.decoupage, [id], ids, {
      renumber: random() < 0.5,
      copiedFrom
    })
    // Plus de numéro libre : refus attendu (l'interface propose de renuméroter ou affiche un
    // message) ; jamais une autre erreur.
    if (!result.ok) {
      expect(['needs-renumber', 'no-room']).toContain(result.problem)
      stats.outOfRoom++
      return null
    }
    if (
      world.lastDuplicate &&
      [world.lastDuplicate.original, world.lastDuplicate.copy].includes(id)
    ) {
      stats.repeatedDuplicates++
    }
    Object.entries(result.copiedFrom ?? {}).forEach(([copyId, from]) =>
      copiedFrom.set(copyId, from)
    )
    const copy = result.createdIds[result.createdIds.length - 1]
    const original = world.lastDuplicate?.copy === id ? world.lastDuplicate.original : id
    world.lastDuplicate = { original, copy }
    return cardsAction(result)
  }
  const pasteAt = (block: string): Step => {
    const change = insertLines(world.text, pick(boundaries()), block)
    const range: TextRange = { from: change.from, to: change.from + change.insert.length }
    return editText([change], { insertedRanges: [range] })
  }

  const operations: (() => Step | null)[] = [
    // Taper un nouvel en-tête (parfois avec un numéro écrit à la main, valide ou non).
    () => {
      const number = random() < 0.3 ? ` ${pick(WRITTEN_NUMBERS)}` : ''
      const block = `${pick(HEADINGS)}${number}\n\nAction ${++counter}.`
      return editText([insertLines(world.text, pick(boundaries()), block)])
    },
    // Couper une scène.
    () => {
      const scene = pick(scenes())
      if (!scene) return null
      world.clipboard = world.text.slice(scene.block.from, scene.block.to).replace(/\n+$/, '')
      return editText([{ from: scene.block.from, to: scene.block.to, insert: '' }])
    },
    // Copier une scène.
    () => {
      const scene = pick(scenes())
      if (scene)
        world.clipboard = world.text.slice(scene.block.from, scene.block.to).replace(/\n+$/, '')
      return null
    },
    // Coller.
    () => (world.clipboard ? pasteAt(world.clipboard) : null),
    // Effacer une ligne d'en-tête (le texte de la scène rejoint la précédente).
    () => {
      const scene = pick(scenes())
      if (!scene) return null
      return editText([{ from: scene.line.from, to: scene.line.to, insert: 'Ligne d’action.' }])
    },
    // Abîmer ou retirer un numéro, comme dans un autre éditeur.
    () => {
      const scene = pick(scenes())
      if (!scene?.marker) return null
      const insert = random() < 0.5 ? '' : ` ${pick(WRITTEN_NUMBERS)}`
      return editText([{ ...scene.marker, insert }])
    },
    // Annuler dans l'éditeur.
    () => {
      const previous = world.undoStack.pop()
      return previous === undefined ? null : { text: previous }
    },
    // Cartes : donner du contenu à une scène (nom, plans).
    () => {
      const card = pick(world.decoupage.scenes)
      if (!card) return null
      return cardsAction(
        random() < 0.5
          ? updateScene(world.decoupage, card.id, { name: `Nom ${++counter}` })
          : insertShots(
              world.decoupage,
              { sceneId: card.id, index: card.shots.length },
              1 + int(2),
              ids
            )
      )
    },
    // Cartes : verrouiller ou déverrouiller.
    () => cardsAction(setNumbersLocked(world.decoupage, !world.decoupage.numbersLocked)),
    // Cartes : ajouter une ou deux scènes.
    () =>
      cardsAction(
        insertScenes(world.decoupage, int(world.decoupage.scenes.length), 1 + int(1), ids, {
          renumber: random() < 0.5
        })
      ),
    // Cartes : dupliquer une scène.
    () => {
      const card = pick(world.decoupage.scenes)
      return card ? duplicateScene(card.id) : null
    },
    // Cartes : Cmd + D répété sur la même scène, en resélectionnant l'original ou en gardant la
    // copie sélectionnée ; faute de place, renumérotation acceptée ou refusée, comme l'élève.
    () => {
      const last = world.lastDuplicate
      const exists = (id: string): boolean => world.decoupage.scenes.some((s) => s.id === id)
      if (!last || !exists(last.original) || !exists(last.copy)) return null
      return duplicateScene(random() < 0.5 ? last.original : last.copy)
    },
    // Cartes : modifier l'en-tête d'une scène.
    () => {
      const card = pick(world.decoupage.scenes)
      if (!card) return null
      return cardsAction(
        updateScene(world.decoupage, card.id, { heading: pick(HEADINGS).replace('.', '') })
      )
    },
    // Cartes : supprimer une ou deux scènes (et leur texte).
    () => {
      const picked = [pick(world.decoupage.scenes), pick(world.decoupage.scenes)].slice(
        0,
        1 + int(1)
      )
      if (!picked[0]) return null
      const sceneIds = [...new Set(picked.map((scene) => scene.id))]
      return cardsAction(
        deleteItems(world.decoupage, { sceneIds, shotIds: [] }),
        picked.flatMap((scene) => scene.shots.map((shot) => shot.id))
      )
    },
    // Cartes : déplacer une scène (texte compris).
    () => {
      const card = pick(world.decoupage.scenes)
      if (!card) return null
      const index = int(world.decoupage.scenes.length - 1)
      return cardsAction(moveScene(world.decoupage, card.id, index, { renumber: random() < 0.5 }))
    },
    // Cartes : renuméroter tout le projet (texte compris).
    () => cardsAction(renumberProject(world.decoupage)),
    // Annuler dans les cartes : découpage d'avant, effet inverse sur le texte, puis rapprochement.
    () => {
      const entry = world.cardsUndo.pop()
      if (!entry) return null
      return {
        decoupage: entry.decoupage,
        text: entry.inverse ? applyTextOp(world.text, entry.inverse).text : world.text,
        context: { knownCards: world.decoupage.scenes },
        restored: entry.decoupage
      }
    }
  ]

  for (let step = 0; step < steps; step++) {
    // Le scénario grossit sans limite si on n'en retire jamais : au-delà de 30 scènes, on coupe.
    const operation = scenes().length > 30 ? operations[1] : pick(operations)
    const before = world.text
    const precious = new Set(
      world.decoupage.scenes
        .filter((scene) => !isEmptyCard(scene))
        .flatMap((scene) => scene.shots.map((shot) => shot.id))
    )
    const change = operation()
    if (!change) continue
    if (change.restored) {
      precious.clear()
      change.restored.scenes
        .filter((scene) => !isEmptyCard(scene))
        .forEach((scene) => scene.shots.forEach((shot) => precious.add(shot.id)))
    }
    const text = change.text ?? world.text
    if (text !== before) world.undoStack.push(before)
    const result = reconcile(text, change.decoupage ?? world.decoupage, change.context ?? {}, ids)
    world.text = applyTextChanges(text, result.textChanges)
    world.decoupage = result.decoupage
    world.orphanIds = new Set(result.orphanIds)
    const where = `graine ${seed}, étape ${step}`

    // Chaque scène du texte a un numéro valide et unique.
    const textScenes = readScriptScenes(world.text)
    expect(
      textScenes.every((scene) => scene.number !== null),
      where
    ).toBe(true)
    const keys = textScenes.map((scene) => numberKey(scene.number!))
    expect(new Set(keys).size, where).toBe(keys.length)

    // Chaque carte non orpheline correspond à exactement une scène, dans l'ordre du scénario.
    expect(linkedCards().map(numberKey), where).toEqual(keys)
    expect(
      linkedCards().map((card) => card.heading),
      where
    ).toEqual(textScenes.map((scene) => scene.heading))
    expect(findDecoupageProblem(world.decoupage), where).toBeNull()

    // Aucun plan n'est jamais perdu.
    const shots = new Set(
      world.decoupage.scenes.flatMap((scene) => scene.shots.map((shot) => shot.id))
    )
    for (const id of change.removedShots ?? []) precious.delete(id)
    for (const id of precious) expect(shots.has(id), `${where} : plan perdu ${id}`).toBe(true)

    // Un second rapprochement ne change plus rien.
    const again = reconcile(world.text, world.decoupage, {}, ids)
    expect(again.textChanges, where).toEqual([])
    expect(again.decoupage, where).toBe(world.decoupage)

    // L'état « orpheline » mémorisé est exact : rien de neuf à signaler au rapprochement suivant.
    expect(
      world.decoupage.scenes.filter((scene) => scene.orphan).map((scene) => scene.id),
      where
    ).toEqual(again.orphanIds)
    expect(again.summary.orphaned, where).toEqual([])
    expect(again.summary.reconnected, where).toEqual([])

    stats.applied++
    stats.orphansSeen += world.orphanIds.size > 0 ? 1 : 0
    stats.lockedSteps += world.decoupage.numbersLocked ? 1 : 0
  }
  return stats
}

describe('rapprochement : suites aléatoires d’opérations', () => {
  const seeds = Array.from({ length: 20 }, (_, i) => i + 1)

  it.each(seeds)('graine %i : 300 opérations sans incohérence', (seed) => {
    const stats = runRandom(seed, 300)
    // Le test n'a de valeur que si les opérations s'appliquent vraiment, dans des situations variées.
    expect(stats.applied).toBeGreaterThan(150)
  })

  it('les cas délicats sont bien exercés (orphelines, numéros verrouillés)', () => {
    const totals = seeds.slice(0, 5).map((seed) => runRandom(seed, 300))
    expect(totals.some((stats) => stats.orphansSeen > 20)).toBe(true)
    expect(totals.some((stats) => stats.lockedSteps > 50)).toBe(true)
    // Cmd + D répété, jusqu'à manquer de place.
    expect(totals.reduce((sum, stats) => sum + stats.repeatedDuplicates, 0)).toBeGreaterThan(20)
    expect(totals.reduce((sum, stats) => sum + stats.outOfRoom, 0)).toBeGreaterThan(0)
  })
})
