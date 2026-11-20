import type { Decoupage } from '../projectTypes'
import type { AllocationProblem } from './allocate'

/**
 * Raisons pour lesquelles une opération est refusée :
 * - needs-renumber : plus de numéro libre ; l'interface propose de renuméroter ;
 * - no-room : numéros verrouillés et plus aucune lettre disponible à cet endroit ;
 * - locked : opération interdite quand les numéros sont verrouillés ;
 * - not-found : élément inconnu (il a peut-être été supprimé entre-temps) ;
 * - invalid : valeur incorrecte (nombre d'éléments, durée…).
 */
export type EditProblem = AllocationProblem | 'locked' | 'not-found' | 'invalid'

export type EditResult =
  | {
      ok: true
      /** Nouveau découpage ; l'original n'est jamais modifié. Identique s'il n'y a rien à changer. */
      decoupage: Decoupage
      /** Identifiants des éléments créés (pour les sélectionner). */
      createdIds: string[]
      /** Duplication : pour chaque scène copiée, l'identifiant de la scène d'origine (voir duplicate). */
      copiedFrom?: Record<string, string>
    }
  | { ok: false; problem: EditProblem }

export function success(decoupage: Decoupage, createdIds: string[] = []): EditResult {
  return { ok: true, decoupage, createdIds }
}

export function failure(problem: EditProblem): EditResult {
  return { ok: false, problem }
}
