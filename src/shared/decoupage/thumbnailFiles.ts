import type { Decoupage, Shot } from '../projectTypes'

// Fichiers de vignettes et duplication : les copies doivent avoir leurs propres fichiers.

export type ShotFiles = Pick<Shot, 'thumbnail' | 'thumbnailSource'>

/** Plans apparus dans `after` (copies) qui ont une vignette ou une image d'origine. */
export function newShotsWithImages(before: Decoupage, after: Decoupage): Shot[] {
  const known = new Set(before.scenes.flatMap((scene) => scene.shots.map((shot) => shot.id)))
  return after.scenes.flatMap((scene) =>
    scene.shots.filter(
      (shot) => !known.has(shot.id) && (shot.thumbnail !== null || shot.thumbnailSource !== null)
    )
  )
}

/** Remplace les chemins des fichiers de vignette des plans indiqués. */
export function withShotFiles(
  decoupage: Decoupage,
  files: Readonly<Record<string, ShotFiles>>
): Decoupage {
  return {
    ...decoupage,
    scenes: decoupage.scenes.map((scene) =>
      scene.shots.some((shot) => files[shot.id])
        ? {
            ...scene,
            shots: scene.shots.map((shot) =>
              files[shot.id] ? { ...shot, ...files[shot.id] } : shot
            )
          }
        : scene
    )
  }
}
