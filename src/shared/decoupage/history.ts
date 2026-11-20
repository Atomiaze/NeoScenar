// Historique d'annulation, valable pendant la session (jamais enregistré dans le projet).

/** Nombre d'étapes conservées (la spécification en demande au moins 100). */
export const HISTORY_LIMIT = 200

interface HistoryEntry<T, E> {
  /** État avant (dans `past`) ou après (dans `future`) la modification. */
  state: T
  /** Nom de la modification, pour le menu (« Annuler l'ajout du plan »). */
  label: string
  /**
   * Effet à produire ailleurs en annulant (dans `past`) ou en rétablissant (dans `future`) : pour
   * les cartes, la modification du texte du scénario qui défait ou refait l'action (étape 8).
   */
  effect?: E
}

/** `E` : type de l'effet joint à chaque étape (voir HistoryEntry). */
export interface History<T, E = never> {
  past: HistoryEntry<T, E>[]
  present: T
  future: HistoryEntry<T, E>[]
  /** Clé de la dernière saisie, pour regrouper une frappe continue en une seule étape. */
  mergeKey: string | null
}

export function createHistory<T, E = never>(present: T): History<T, E> {
  return { past: [], present, future: [], mergeKey: null }
}

export interface CommitOptions<E = never> {
  label: string
  /**
   * Deux modifications successives avec la même clé ne font qu'une étape (saisie dans un champ) :
   * l'effet de la première, qui défait toute la saisie, est gardé.
   */
  mergeKey?: string
  /** Effet qui défera la modification (voir HistoryEntry). */
  effect?: E
}

/** Enregistre un nouvel état. Un état identique (même objet) ne crée pas d'étape. */
export function commit<T, E>(
  history: History<T, E>,
  next: T,
  options: CommitOptions<E>
): History<T, E> {
  if (next === history.present) return history
  const mergeKey = options.mergeKey ?? null
  if (mergeKey !== null && mergeKey === history.mergeKey && history.future.length === 0) {
    return { ...history, present: next }
  }
  const past = [
    ...history.past,
    { state: history.present, label: options.label, effect: options.effect }
  ]
  return {
    past: past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past,
    present: next,
    future: [],
    mergeKey
  }
}

/**
 * Remplace l'état présent sans créer d'étape d'annulation : changements qui ne viennent pas des
 * cartes (les cartes qui suivent le scénario, étape 8). La saisie en cours n'est pas interrompue.
 */
export function replacePresent<T, E>(history: History<T, E>, present: T): History<T, E> {
  return present === history.present ? history : { ...history, present }
}

/** Termine la saisie en cours : la prochaine frappe créera une nouvelle étape. */
export function breakMerge<T, E>(history: History<T, E>): History<T, E> {
  return history.mergeKey === null ? history : { ...history, mergeKey: null }
}

/** Annule la dernière étape ; `redoEffect` est l'effet qui la refera (calculé en l'annulant). */
export function undo<T, E>(history: History<T, E>, redoEffect?: E): History<T, E> {
  const entry = history.past[history.past.length - 1]
  if (!entry) return history
  return {
    past: history.past.slice(0, -1),
    present: entry.state,
    future: [...history.future, { state: history.present, label: entry.label, effect: redoEffect }],
    mergeKey: null
  }
}

/** Rétablit l'étape annulée ; `undoEffect` est l'effet qui la défera de nouveau. */
export function redo<T, E>(history: History<T, E>, undoEffect?: E): History<T, E> {
  const entry = history.future[history.future.length - 1]
  if (!entry) return history
  return {
    past: [...history.past, { state: history.present, label: entry.label, effect: undoEffect }],
    present: entry.state,
    future: history.future.slice(0, -1),
    mergeKey: null
  }
}

/** Nom de la modification qu'« Annuler » défera, ou null s'il n'y a rien à annuler. */
export function undoLabel<T, E>(history: History<T, E>): string | null {
  return history.past[history.past.length - 1]?.label ?? null
}

export function redoLabel<T, E>(history: History<T, E>): string | null {
  return history.future[history.future.length - 1]?.label ?? null
}

/** Effet de l'étape qu'« Annuler » défera (voir HistoryEntry). */
export function undoEffect<T, E>(history: History<T, E>): E | undefined {
  return history.past[history.past.length - 1]?.effect
}

/** Effet de l'étape que « Rétablir » refera. */
export function redoEffect<T, E>(history: History<T, E>): E | undefined {
  return history.future[history.future.length - 1]?.effect
}
