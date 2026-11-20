import { useSyncExternalStore } from 'react'

// Petit magasin d'état partagé entre composants, sans bibliothèque : React fournit
// useSyncExternalStore pour qu'un composant se mette à jour quand l'état change.

export interface Store<T> {
  get(): T
  set(change: Partial<T> | ((state: T) => Partial<T>)): void
  subscribe(listener: () => void): () => void
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial
  const listeners = new Set<() => void>()
  return {
    get: () => state,
    set(change) {
      const patch = typeof change === 'function' ? change(state) : change
      state = { ...state, ...patch }
      listeners.forEach((listener) => listener())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  }
}

/**
 * Lit une partie de l'état. Le sélecteur doit renvoyer une valeur déjà présente dans l'état (pas un
 * nouvel objet à chaque appel), sinon le composant se redessinerait sans fin.
 */
export function useStore<T, U>(store: Store<T>, selector: (state: T) => U): U {
  const snapshot = (): U => selector(store.get())
  // Le troisième argument permet aussi un rendu hors de la fenêtre (tests des composants).
  return useSyncExternalStore(store.subscribe, snapshot, snapshot)
}
