// Personnes du planning = noms du générique (rubriques de l'équipe technique, distribution exclue).
// Le planning n'a aucune liste de personnes à lui.

import type { CreditsData, CreditsTemplate } from '../credits/types'
import type { CrewMember, TaskPerson } from './types'

/** Bloc du modèle qui n'est pas de l'équipe technique. */
const CAST_BLOCK = 'distribution'

/** Clé de comparaison d'un nom : NFC, sans casse. */
export function personKey(name: string): string {
  return name.normalize('NFC').trim().toLocaleLowerCase('fr')
}

/**
 * Équipe technique : noms uniques (la première graphie rencontrée est gardée) avec leurs rubriques,
 * dans l'ordre du modèle puis des rubriques ajoutées. Le modèle donne l'intitulé et le bloc des
 * rubriques d'origine.
 */
export function crewMembers(credits: CreditsData, template: CreditsTemplate): CrewMember[] {
  const known = new Map<string, { bloc: string; intitule: string }>()
  for (const block of template.blocs)
    for (const rubric of block.rubriques)
      known.set(rubric.id, { bloc: block.id, intitule: rubric.intitule })

  const byId = new Map(credits.rubriques.map((rubric) => [rubric.id, rubric]))
  const ordered = [
    ...template.blocs.flatMap((block) => block.rubriques.map((rubric) => rubric.id)),
    ...credits.rubriques.filter((rubric) => !known.has(rubric.id)).map((rubric) => rubric.id)
  ]

  const members = new Map<string, CrewMember>()
  for (const id of ordered) {
    const data = byId.get(id)
    if (!data) continue
    const origin = known.get(id)
    const bloc = origin?.bloc ?? data.bloc
    if (bloc === CAST_BLOCK) continue
    const intitule = data.intitule ?? origin?.intitule ?? id
    for (const raw of data.noms) {
      const nom = raw.normalize('NFC').trim()
      if (nom === '') continue
      const key = personKey(nom)
      const member = members.get(key) ?? { nom, rubriques: [] }
      if (!member.rubriques.includes(intitule)) member.rubriques.push(intitule)
      members.set(key, member)
    }
  }
  return [...members.values()]
}

/** Personnes d'une tâche, chacune avec : figure-t-elle encore au générique ? (« plus au générique »). */
export function taskPeople(
  personnes: readonly string[],
  crew: readonly CrewMember[]
): TaskPerson[] {
  const keys = new Set(crew.map((member) => personKey(member.nom)))
  return personnes.map((nom) => ({ nom, auGenerique: keys.has(personKey(nom)) }))
}
