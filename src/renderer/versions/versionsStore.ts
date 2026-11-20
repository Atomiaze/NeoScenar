// Versions du projet (étape 13C) : fenêtre « Versions… », restauration et son bandeau « Annuler ».
// Restaurer remplace les fichiers sur le disque : la vue du projet est d'abord retirée (l'éditeur ne
// peut plus renvoyer l'ancien texte), puis recréée une fois le projet relu par le processus principal.

import type { VersionList } from '../../shared/api'
import type { VersionEntry } from '../../shared/versions/versions'
import { cardsStore } from '../cards/cardsStore'
import { fr } from '../i18n/fr'
import { scriptStore, scriptText } from '../script/scriptStore'
import { createStore } from '../state/createStore'

/** Bandeau affiché après une restauration. */
export interface RestoreBanner {
  /** Version restaurée ; null après une annulation. */
  name: string | null
  /** Version « Avant restauration » à remettre pour annuler ; null : rien à annuler. */
  beforeFolder: string | null
  /** Le projet a été modifié depuis : l'annulation directe n'est plus proposée. */
  undoImpossible: boolean
}

interface VersionsState {
  open: boolean
  list: VersionList | null
  /** Une opération est en cours (boutons grisés). */
  busy: boolean
  /** Message d'erreur montré dans la fenêtre. */
  error: string | null
  /** Message d'erreur montré hors de la fenêtre (restauration). */
  restoreError: string | null
  /** Vrai pendant une restauration : la vue du projet est retirée. */
  reloading: boolean
  /** Change à chaque restauration : la vue du projet est recréée (rechargement complet). */
  generation: number
  banner: RestoreBanner | null
}

export const versionsStore = createStore<VersionsState>({
  open: false,
  list: null,
  busy: false,
  error: null,
  restoreError: null,
  reloading: false,
  generation: 0,
  banner: null
})

export async function openVersions(): Promise<void> {
  versionsStore.set({ open: true, list: null, error: null, busy: false })
  await refreshVersions()
}

export function closeVersions(): void {
  versionsStore.set({ open: false, list: null, error: null, busy: false })
}

export async function refreshVersions(): Promise<void> {
  const result = await window.neoscenar.listVersions()
  if (!versionsStore.get().open) return
  if (result.ok) versionsStore.set({ list: result.value })
  else versionsStore.set({ error: result.error, list: { versions: [], suggestedName: '' } })
}

/** Enregistre une version ; vrai si elle est faite. */
export async function saveVersion(name: string, note: string): Promise<boolean> {
  versionsStore.set({ busy: true, error: null })
  const result = await window.neoscenar.saveVersion(name, note)
  versionsStore.set({ busy: false, error: result.ok ? null : result.error })
  if (result.ok) await refreshVersions()
  return result.ok
}

export async function deleteVersion(entry: VersionEntry): Promise<void> {
  versionsStore.set({ busy: true, error: null })
  const result = await window.neoscenar.deleteVersion(entry.folder)
  versionsStore.set({ busy: false, error: result.ok ? null : result.error })
  await refreshVersions()
}

export async function duplicateVersion(entry: VersionEntry): Promise<void> {
  versionsStore.set({ busy: true, error: null })
  const result = await window.neoscenar.duplicateVersion(entry.folder)
  // Réussite : le nouveau projet est ouvert, la fenêtre se ferme avec l'ancien projet.
  if (result === null || result.ok) versionsStore.set({ busy: false })
  else versionsStore.set({ busy: false, error: result.error })
}

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))

async function runRestore(folder: string, undo: boolean): Promise<void> {
  versionsStore.set({
    open: false,
    list: null,
    error: null,
    busy: false,
    reloading: true,
    banner: null
  })
  // La vue du projet (éditeur, cartes) disparaît avant que les fichiers soient remplacés.
  await nextFrame()
  const result = await window.neoscenar.restoreVersion(folder, undo)
  versionsStore.set((state) => ({
    reloading: false,
    generation: state.generation + 1,
    restoreError: result.ok ? null : result.error,
    banner: result.ok
      ? {
          name: undo ? null : result.value.name,
          beforeFolder: result.value.beforeFolder,
          undoImpossible: false
        }
      : null
  }))
}

export function restoreVersion(entry: VersionEntry): Promise<void> {
  return runRestore(entry.folder, false)
}

/** « Annuler » du bandeau : la version « Avant restauration » est remise, sans nouvelle version. */
export async function undoRestore(): Promise<void> {
  const banner = versionsStore.get().banner
  if (!banner?.beforeFolder || banner.undoImpossible) return
  await runRestore(banner.beforeFolder, true)
}

export function closeRestoreBanner(): void {
  versionsStore.set({ banner: null })
}

export function clearRestoreError(): void {
  versionsStore.set({ restoreError: null })
}

/** Projet fermé ou changé : le bandeau ne concerne plus rien. */
export function resetVersions(): void {
  versionsStore.set({ open: false, list: null, banner: null, error: null, busy: false })
}

/**
 * Dès que le scénario ou les cartes changent après la restauration (le rapprochement de
 * l'ouverture est déjà fait), l'annulation directe n'est plus proposée : elle effacerait ces
 * modifications. La version « Avant restauration » reste disponible dans la fenêtre.
 */
export function watchChangesAfterRestore(): () => void {
  const banner = versionsStore.get().banner
  if (!banner?.beforeFolder || banner.undoImpossible) return () => undefined
  const text = scriptText()
  const cards = cardsStore.get().history?.present
  const check = (): void => {
    const current = versionsStore.get().banner
    if (!current || current.undoImpossible) return
    if (scriptText() !== text || cardsStore.get().history?.present !== cards) {
      versionsStore.set({ banner: { ...current, undoImpossible: true } })
    }
  }
  const unsubscribers = [scriptStore.subscribe(check), cardsStore.subscribe(check)]
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
}

/** Texte du bandeau. */
export function restoreBannerText(banner: RestoreBanner): string {
  const t = fr.versions
  const main = banner.name === null ? t.restoreUndone : t.restored(banner.name)
  return banner.undoImpossible ? `${main} ${t.undoUnavailable}` : main
}
