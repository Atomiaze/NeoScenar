// Fusion des listes de noms proposés (scénario, fiches, vocabulaire du cours), partagée par
// l'éditeur de scénario et le champ « En-tête » des cartes : mêmes sources, mêmes propositions.

import type { NameLists } from './proposals'

/** Ajoute les noms qui n'y sont pas encore (MARIE du scénario et MARIE de sa fiche : une fois). */
export function mergeNames(
  list: readonly string[],
  names: readonly string[] | undefined
): readonly string[] {
  const seen = new Set(list.map((name) => name.toUpperCase()))
  const added = (names ?? []).filter((name) => {
    const key = name.toUpperCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return added.length > 0 ? [...list, ...added] : list
}

/** Réunit plusieurs sources, dans l'ordre : la première garde la priorité. */
export function mergeNameLists(sources: readonly Partial<NameLists>[]): NameLists {
  const lists: NameLists = { locations: [], characters: [], times: [] }
  for (const names of sources) {
    lists.locations = mergeNames(lists.locations, names.locations)
    lists.characters = mergeNames(lists.characters, names.characters)
    lists.times = mergeNames(lists.times, names.times)
  }
  return lists
}
