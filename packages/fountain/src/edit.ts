import { analyzeCharacter } from './character.ts'
import { analyzeSceneHeading } from './sceneHeading.ts'
import type { ElementType, FountainElement } from './types.ts'

export type ElementChanges = Partial<Omit<FountainElement, 'raw' | 'position'>>

/**
 * Crée un élément par programme. Il n'a pas de texte source : serialize le produira proprement.
 * Pour un en-tête ou un personnage, le texte fait foi (lieu, moment, nom, extensions en sont déduits).
 */
export function createElement(
  type: ElementType,
  text: string,
  extra: ElementChanges = {}
): FountainElement {
  return withDerivedInfo({ type, text, forced: false, notes: [], boneyards: [], ...extra }, extra)
}

/** Renvoie une copie modifiée de l'élément, sans texte source : elle sera réécrite proprement. */
export function updateElement(element: FountainElement, changes: ElementChanges): FountainElement {
  const updated: FountainElement = { ...element, ...changes, notes: [], boneyards: [] }
  delete updated.raw
  delete updated.position
  return withDerivedInfo(updated, changes)
}

function withDerivedInfo(element: FountainElement, changes: ElementChanges): FountainElement {
  if (element.type === 'scene_heading') {
    const analysis = analyzeSceneHeading(element.text)
    const number =
      changes.scene && 'number' in changes.scene
        ? changes.scene.number
        : (analysis.info.number ?? element.scene?.number ?? null)
    element.text = analysis.text
    element.scene = { ...analysis.info, number }
  } else {
    delete element.scene
  }

  if (element.type === 'character') {
    const analysis = analyzeCharacter(element.text)
    const dual =
      changes.character && 'dual' in changes.character
        ? changes.character.dual
        : analysis.info.dual || (element.character?.dual ?? false)
    element.text = analysis.text
    element.character = { ...analysis.info, dual }
  } else {
    delete element.character
  }

  if (element.type === 'section') element.section = { level: element.section?.level ?? 1 }
  else delete element.section
  return element
}
