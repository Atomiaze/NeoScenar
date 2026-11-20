// Vocabulaire du cours (échelles de plan, mouvements, angles), lu dans un fichier JSON livré avec
// l'application pour pouvoir être modifié sans toucher au code.

export interface VocabularyTerm {
  label: string
  /** Courte explication, affichée en infobulle dans la liste. */
  definition: string
}

export interface Vocabulary {
  formatVersion: number
  id: string
  name: string
  shotSizes: VocabularyTerm[]
  cameraMovements: VocabularyTerm[]
  cameraAngles: VocabularyTerm[]
  /** Moments proposés dans l'en-tête de scène, après « - » (JOUR, NUIT…). */
  sceneTimes: string[]
}

export const VOCABULARY_LISTS = ['shotSizes', 'cameraMovements', 'cameraAngles'] as const
