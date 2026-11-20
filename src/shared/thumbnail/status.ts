import { sameAspect, type Size } from '../imageFormat'
import type { Decoupage, Shot } from '../projectTypes'

// État d'une vignette par rapport au format du projet.

/**
 * - recrop : ses proportions ne sont plus celles du projet (changement de format) ;
 * - check : recadrée automatiquement au centre lors d'un import multiple.
 */
export type ThumbnailBadge = 'recrop' | 'check'

/** Dimensions connues des vignettes (chemin → taille, ou null si illisible). */
export type ThumbnailSizes = Readonly<Record<string, Size | null | undefined>>

export function thumbnailBadge(
  shot: Pick<Shot, 'thumbnail' | 'thumbnailCrop'>,
  sizes: ThumbnailSizes,
  project: Size
): ThumbnailBadge | null {
  if (!shot.thumbnail) return null
  const size = sizes[shot.thumbnail]
  if (size && !sameAspect(size, project)) return 'recrop'
  if (shot.thumbnailCrop?.auto) return 'check'
  return null
}

/** Chemins de toutes les vignettes du découpage, sans doublon. */
export function thumbnailPaths(decoupage: Decoupage): string[] {
  const paths = decoupage.scenes.flatMap((scene) =>
    scene.shots.flatMap((shot) => (shot.thumbnail ? [shot.thumbnail] : []))
  )
  return [...new Set(paths)]
}

/** Nombre de plans dont la vignette n'aurait pas les proportions `size`. */
export function countMismatchedThumbnails(
  decoupage: Decoupage,
  sizes: ThumbnailSizes,
  size: Size
): number {
  return decoupage.scenes
    .flatMap((scene) => scene.shots)
    .filter((shot) => {
      const thumbnailSize = shot.thumbnail ? sizes[shot.thumbnail] : null
      return thumbnailSize ? !sameAspect(thumbnailSize, size) : false
    }).length
}
