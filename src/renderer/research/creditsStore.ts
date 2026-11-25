import type { CreditsContent, CreditsData } from '../../shared/credits/types'
import { createStore } from '../state/createStore'
import { showResearchError } from './researchStore'

// État du formulaire du générique (étape 10bB). Chaque modification est appliquée à l'écran tout
// de suite, puis envoyée au processus principal qui l'enregistre automatiquement.

interface CreditsState {
  content: CreditsContent | null
  /** Texte du scénario, pour la liste des personnages. */
  script: string
  /** Augmente quand les données ont changé sur le disque : les zones de texte repartent de là. */
  revision: number
}

export const creditsStore = createStore<CreditsState>({ content: null, script: '', revision: 0 })

/** Change à chaque projet quitté : une lecture tardive de l'ancien projet est ignorée. */
let generation = 0

export function unloadCredits(): void {
  generation++
  creditsStore.set({ content: null, script: '', revision: 0 })
}

/** Relit le générique et le scénario (ouverture du module, retour dans l'application). */
export async function loadCredits(): Promise<void> {
  const mine = generation
  // Ce qui est en attente est écrit d'abord : la relecture ne doit pas effacer une saisie.
  await window.neoscenar.flushSheets()
  if (mine !== generation) return
  const [credits, script] = await Promise.all([
    window.neoscenar.getCredits(),
    window.neoscenar.getScenario()
  ])
  if (mine !== generation) return
  if (!credits.ok) {
    showResearchError(credits.error)
    return
  }
  creditsStore.set((state) => {
    const changed = JSON.stringify(state.content?.data) !== JSON.stringify(credits.value.data)
    return {
      content: credits.value,
      script: script.ok ? script.value : '',
      revision: changed ? state.revision + 1 : state.revision
    }
  })
}

export function changeCredits(change: (data: CreditsData) => CreditsData): void {
  const content = creditsStore.get().content
  if (!content) return
  const data = change(content.data)
  if (data === content.data) return
  creditsStore.set({ content: { ...content, data } })
  void window.neoscenar.updateCredits(data).then((result) => {
    if (!result.ok) showResearchError(result.error)
  })
}
