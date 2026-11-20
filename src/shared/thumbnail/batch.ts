import type { Decoupage, Shot } from '../projectTypes'

// Import de plusieurs images : une image par plan sélectionné, dans l'ordre du film.

/** Nom du fichier sans son dossier (chemins Mac, Linux ou Windows). */
export function fileBaseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

const collator = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' })

/** Tri « naturel » : « plan2 » avant « plan10 », sans tenir compte des majuscules. */
export function naturalSort(paths: readonly string[]): string[] {
  return [...paths].sort((a, b) => collator.compare(fileBaseName(a), fileBaseName(b)))
}

/** Plans sélectionnés, dans l'ordre du film (les scènes sélectionnées sont ignorées). */
export function selectedShotsInOrder(decoupage: Decoupage, ids: readonly string[]): Shot[] {
  const wanted = new Set(ids)
  return decoupage.scenes.flatMap((scene) => scene.shots.filter((shot) => wanted.has(shot.id)))
}

export interface BatchPlan {
  /** Image attribuée à chaque plan, dans l'ordre. */
  pairs: { shotId: string; path: string }[]
  /** Images en trop, ignorées. */
  ignored: number
  /** Plans qui ont déjà une vignette (elle sera remplacée). */
  replacing: number
}

export function planBatchImport(paths: readonly string[], shots: readonly Shot[]): BatchPlan {
  const sorted = naturalSort(paths)
  const pairs = shots
    .slice(0, sorted.length)
    .map((shot, index) => ({ shotId: shot.id, path: sorted[index] }))
  const targets = new Set(pairs.map((pair) => pair.shotId))
  return {
    pairs,
    ignored: Math.max(0, sorted.length - shots.length),
    replacing: shots.filter((shot) => targets.has(shot.id) && shot.thumbnail !== null).length
  }
}
