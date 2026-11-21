// Noms proposés dans le champ « En-tête » des cartes : mêmes sources que dans l'éditeur
// (scénario, fiches Lieux, moments du cours), mais les lieux du scénario sont lus dans les en-têtes
// des autres cartes, qui viennent du Fountain.

import { parseSceneHeading } from '@neoscenar/fountain'
import { PLACEHOLDER_HEADING } from '../../shared/scriptLink/scriptScenes'
import type { Decoupage } from '../../shared/projectTypes'
import { mergeNameLists } from '../script/completion/nameLists'
import type { NameLists } from '../script/completion/proposals'

/** Lieux des en-têtes des autres scènes (la scène en cours est exclue, sinon son début serait proposé). */
export function locationsOfOtherScenes(decoupage: Decoupage, currentSceneId: string): string[] {
  const locations: string[] = []
  for (const scene of decoupage.scenes) {
    if (scene.id === currentSceneId || scene.heading === PLACEHOLDER_HEADING) continue
    const location = parseSceneHeading(scene.heading)?.location
    if (location) locations.push(location)
  }
  return locations
}

export function headingNameLists(
  decoupage: Decoupage,
  currentSceneId: string,
  sheetLocations: readonly string[],
  times: readonly string[]
): NameLists {
  return mergeNameLists([
    { locations: locationsOfOtherScenes(decoupage, currentSceneId) },
    { locations: sheetLocations, times }
  ])
}
