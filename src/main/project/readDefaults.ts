import type { JsonObject } from './jsonChecker'

// Ajouts compatibles au format : un champ apparu après coup (sans changer formatVersion) peut
// manquer dans un fichier plus ancien. À la lecture, il reçoit alors la valeur indiquée ici.
// Pour un futur ajout compatible, il suffit d'ajouter une ligne dans le bon tableau.

export const READ_DEFAULTS = {
  project: {
    // Étape 5a : dernier export vers Blender.
    lastBlenderExport: null,
    // Étape 9B : options de l'export PDF.
    exportPdf: { pageDeTitre: true, numerotation: 'fountain', nouvellePageParActe: false },
    // Étape 11B : options de l'export PDF du storyboard.
    exportStoryboard: { kind: 'planches', scope: 'all', sceneNumbers: [], newPagePerScene: false }
  },
  decoupage: {
    // Étape 8 : lien avec le scénario.
    scriptLinked: false
  },
  scene: {
    // Étape 2 : en-tête de scène.
    heading: '',
    // Étape 8 : carte orpheline (scène absente du scénario).
    orphan: false
  },
  shot: {
    // Étape 3 : image d'origine et cadre de la vignette.
    thumbnailSource: null,
    thumbnailCrop: null
  }
} satisfies Record<string, JsonObject>

/** Copie de l'objet où chaque champ absent reçoit sa valeur par défaut. */
export function withDefaults(object: JsonObject, defaults: JsonObject): JsonObject {
  const result: JsonObject = { ...object }
  for (const [key, value] of Object.entries(defaults)) {
    if (result[key] === undefined) result[key] = structuredClone(value)
  }
  return result
}
