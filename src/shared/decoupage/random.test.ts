import { describe, expect, it } from 'vitest'
import type { Decoupage } from '../projectTypes'
import { setColor } from './fields'
import { findDecoupageProblem } from './invariants'
import { renumberProject, renumberScene, setNumbersLocked } from './numbers'
import type { EditResult } from './result'
import { deleteItems, insertScenes, insertShots, moveScene, moveShots } from './structure'
import { allIds, counterIds, makeDecoupage } from './testFixtures'

// Suite aléatoire de plusieurs centaines d'opérations : après chacune, les numéros restent
// uniques et dans l'ordre, et les identifiants internes ne sont jamais réutilisés.

/** Générateur pseudo-aléatoire reproductible (même graine → même suite). */
function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32
    return state / 2 ** 32
  }
}

interface RunStats {
  applied: number
  /** Nombre maximal de plans atteint dans le découpage. */
  maxShots: number
  /** Vrai si au moins un numéro à lettre (P_0010A) est apparu. */
  sawLetter: boolean
}

function runRandomOperations(seed: number, steps: number): RunStats {
  const stats: RunStats = { applied: 0, maxShots: 0, sawLetter: false }
  const random = seededRandom(seed)
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]
  const int = (max: number): number => Math.floor(random() * (max + 1))
  const ids = counterIds()
  let decoupage: Decoupage = makeDecoupage({ '10': ['10'] })
  const everSeen = new Set(allIds(decoupage))

  const randomShotIds = (): string[] => {
    const shots = decoupage.scenes.flatMap((scene) => scene.shots.map((shot) => shot.id))
    return shots.filter(() => random() < 0.1).slice(0, 5)
  }

  const operations: (() => EditResult)[] = [
    () => {
      const scene = pick(decoupage.scenes)
      if (!scene) return insertScenes(decoupage, 0, 1, ids)
      return insertShots(
        decoupage,
        { sceneId: scene.id, index: int(scene.shots.length) },
        1 + int(3),
        ids,
        {
          renumber: random() < 0.5
        }
      )
    },
    () =>
      insertScenes(decoupage, int(decoupage.scenes.length), 1 + int(2), ids, {
        renumber: random() < 0.5
      }),
    () =>
      deleteItems(decoupage, {
        sceneIds: random() < 0.1 ? [pick(decoupage.scenes)?.id ?? ''] : [],
        shotIds: randomShotIds()
      }),
    () => {
      const moved = randomShotIds()
      const scene = pick(decoupage.scenes)
      if (!scene || moved.length === 0) return setNumbersLocked(decoupage, !decoupage.numbersLocked)
      const remaining = scene.shots.filter((shot) => !moved.includes(shot.id)).length
      return moveShots(
        decoupage,
        moved,
        { sceneId: scene.id, index: int(remaining) },
        { renumber: random() < 0.5 }
      )
    },
    () => {
      const scene = pick(decoupage.scenes)
      if (!scene) return setNumbersLocked(decoupage, false)
      return moveScene(decoupage, scene.id, int(decoupage.scenes.length - 1), {
        renumber: random() < 0.5
      })
    },
    () =>
      random() < 0.8
        ? renumberScene(decoupage, pick(decoupage.scenes)?.id ?? '')
        : renumberProject(decoupage),
    () => setNumbersLocked(decoupage, random() < 0.5),
    () => setColor(decoupage, randomShotIds(), random() < 0.5 ? '#f2c94c' : null)
  ]

  for (let step = 0; step < steps; step++) {
    const before = decoupage
    const snapshot = JSON.stringify(before)
    const result = pick(operations)()
    // L'original n'est jamais modifié, même quand l'opération est refusée.
    expect(JSON.stringify(before)).toBe(snapshot)
    if (!result.ok) continue
    decoupage = result.decoupage
    expect(findDecoupageProblem(decoupage), `étape ${step}`).toBeNull()
    for (const id of result.createdIds) {
      expect(everSeen.has(id), `identifiant réutilisé : ${id}`).toBe(false)
    }
    allIds(decoupage).forEach((id) => everSeen.add(id))
    const shots = decoupage.scenes.flatMap((scene) => scene.shots)
    stats.applied++
    stats.maxShots = Math.max(stats.maxShots, shots.length)
    stats.sawLetter ||= shots.some((shot) => shot.letter !== '')
  }
  return stats
}

describe('suite aléatoire d’opérations', () => {
  it.each([1, 2, 3, 42, 2026])('graine %i : 600 opérations sans incohérence', (seed) => {
    const stats = runRandomOperations(seed, 600)
    // Le test n'a de valeur que si les opérations s'appliquent vraiment.
    expect(stats.applied).toBeGreaterThan(300)
    expect(stats.maxShots).toBeGreaterThan(20)
  })

  it('les numéros à lettre (verrouillage) sont bien exercés', () => {
    const seeds = [1, 2, 3, 42, 2026]
    expect(seeds.some((seed) => runRandomOperations(seed, 600).sawLetter)).toBe(true)
  })
})
