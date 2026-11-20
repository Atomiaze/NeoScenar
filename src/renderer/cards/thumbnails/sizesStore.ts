import type { Size } from '../../../shared/imageFormat'
import { createStore } from '../../state/createStore'

// Dimensions des vignettes, demandées au processus principal une seule fois par fichier
// (une vignette n'est jamais modifiée : son nom change à chaque import ou recadrage).

export const sizesStore = createStore<{ sizes: Readonly<Record<string, Size | null>> }>({
  sizes: {}
})

const requested = new Set<string>()

/** Demande les dimensions inconnues ; le magasin est mis à jour à l'arrivée. */
export async function requestSizes(paths: readonly string[]): Promise<void> {
  const missing = paths.filter((path) => !requested.has(path))
  if (missing.length === 0) return
  missing.forEach((path) => requested.add(path))
  const result = await window.neoscenar.getImageSizes(missing)
  if (result.ok) sizesStore.set({ sizes: { ...sizesStore.get().sizes, ...result.value } })
  else missing.forEach((path) => requested.delete(path))
}

/** Dimensions de toutes les vignettes demandées (attend la réponse si besoin). */
export async function sizesOf(paths: readonly string[]): Promise<Record<string, Size | null>> {
  await requestSizes(paths)
  const known = sizesStore.get().sizes
  // Une demande déjà en cours pour un autre appel : on redemande directement les manquantes.
  const unknown = paths.filter((path) => !(path in known))
  if (unknown.length === 0) return { ...known }
  const result = await window.neoscenar.getImageSizes(unknown)
  return result.ok ? { ...known, ...result.value } : { ...known }
}

/** Nouveau projet : on repart de zéro. */
export function resetSizes(): void {
  requested.clear()
  sizesStore.set({ sizes: {} })
}
