// Lecture et réécriture de neoscenar/generique.json. La lecture est tolérante : un champ abîmé à la
// main reprend sa valeur par défaut au lieu de bloquer l'élève. La réécriture pose les champs
// connus par-dessus le fichier d'origine : ce qui a été ajouté ailleurs est conservé.

import {
  CREDITS_FORMAT_VERSION,
  START_CARDS,
  type CreditsData,
  type CreditsMentions,
  type CreditsOptions,
  type CreditsRubricData,
  type PreexistingMusic,
  type StartCardKind
} from './types'

type JsonObject = Record<string, unknown>

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asObject(value: unknown): JsonObject {
  return isObject(value) ? value : {}
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

/** Générique vide d'un nouveau projet. */
export function defaultCreditsData(templateId = 'saint-luc'): CreditsData {
  return {
    version: CREDITS_FORMAT_VERSION,
    modele: templateId,
    options: {
      ordreActeurs: 'importance',
      taille: 'moyenne',
      disposition: 'deux-colonnes',
      blocsAffiches: []
    },
    acteurs: { nomsAffiches: {} },
    rubriques: [],
    musiques: [],
    mentions: {
      fiction: true,
      animaux: false,
      copyrightAnnee: null,
      copyrightTitulaire: '',
      tourneA: '',
      ligneEcole: null
    },
    logos: [],
    cartonsDebut: []
  }
}

function parseOptions(raw: unknown, fallback: CreditsOptions): CreditsOptions {
  const value = asObject(raw)
  return {
    ordreActeurs: oneOf(value.ordreActeurs, ['importance', 'apparition'], fallback.ordreActeurs),
    taille: oneOf(value.taille, ['petite', 'moyenne', 'grande'], fallback.taille),
    disposition: oneOf(value.disposition, ['deux-colonnes', 'centree'], fallback.disposition),
    blocsAffiches: strings(value.blocsAffiches)
  }
}

function parseRubric(raw: unknown): CreditsRubricData | null {
  if (!isObject(raw) || typeof raw.id !== 'string' || raw.id === '') return null
  const rubric: CreditsRubricData = {
    id: raw.id,
    intitule: typeof raw.intitule === 'string' ? raw.intitule : null,
    noms: strings(raw.noms)
  }
  if (typeof raw.bloc === 'string') rubric.bloc = raw.bloc
  return rubric
}

function parseMusic(raw: unknown): PreexistingMusic | null {
  if (!isObject(raw)) return null
  return {
    titre: text(raw.titre),
    interprete: text(raw.interprete),
    auteurs: text(raw.auteurs),
    autorisation: text(raw.autorisation)
  }
}

function parseMentions(raw: unknown, fallback: CreditsMentions): CreditsMentions {
  const value = asObject(raw)
  const year = value.copyrightAnnee
  return {
    fiction: typeof value.fiction === 'boolean' ? value.fiction : fallback.fiction,
    animaux: typeof value.animaux === 'boolean' ? value.animaux : fallback.animaux,
    copyrightAnnee: typeof year === 'number' && Number.isInteger(year) ? year : null,
    copyrightTitulaire: text(value.copyrightTitulaire),
    tourneA: text(value.tourneA),
    ligneEcole: typeof value.ligneEcole === 'string' ? value.ligneEcole : null
  }
}

function parseDisplayNames(raw: unknown): Record<string, string> {
  const names: Record<string, string> = {}
  for (const [key, value] of Object.entries(asObject(raw)))
    if (typeof value === 'string') names[key] = value
  return names
}

/** Données lues dans le contenu brut de generique.json (déjà décodé du JSON). */
export function parseCreditsData(raw: unknown): CreditsData {
  const value = asObject(raw)
  const fallback = defaultCreditsData()
  return {
    version: CREDITS_FORMAT_VERSION,
    modele: text(value.modele, fallback.modele) || fallback.modele,
    options: parseOptions(value.options, fallback.options),
    acteurs: { nomsAffiches: parseDisplayNames(asObject(value.acteurs).nomsAffiches) },
    rubriques: (Array.isArray(value.rubriques) ? value.rubriques : [])
      .map(parseRubric)
      .filter((rubric): rubric is CreditsRubricData => rubric !== null),
    musiques: (Array.isArray(value.musiques) ? value.musiques : [])
      .map(parseMusic)
      .filter((music): music is PreexistingMusic => music !== null),
    mentions: parseMentions(value.mentions, fallback.mentions),
    logos: strings(value.logos),
    cartonsDebut: strings(value.cartonsDebut).filter((card): card is StartCardKind =>
      (START_CARDS as readonly string[]).includes(card)
    )
  }
}

/** Version du format écrite dans le fichier (0 si absente) : un fichier plus récent n'est pas réécrit. */
export function creditsFileVersion(raw: unknown): number {
  const version = asObject(raw).version
  return typeof version === 'number' ? version : 0
}

/** Éléments d'une liste, chacun posé sur l'élément d'origine qui a la même clé. */
function mergeList<T extends object>(
  original: unknown,
  items: readonly T[],
  keyOf: (item: JsonObject | T, index: number) => string | null
): JsonObject[] {
  const previous = new Map<string, JsonObject>()
  if (Array.isArray(original))
    original.forEach((item, index) => {
      if (!isObject(item)) return
      const key = keyOf(item, index)
      if (key !== null && !previous.has(key)) previous.set(key, item)
    })
  return items.map((item, index) => {
    const key = keyOf(item, index)
    return { ...(key === null ? {} : previous.get(key)), ...item }
  })
}

/**
 * Contenu à écrire : les données connues posées sur le contenu d'origine, avec les clés inconnues
 * conservées à la racine, dans les objets et dans les éléments des listes.
 */
export function mergeCreditsData(original: unknown, data: CreditsData): JsonObject {
  const base = asObject(original)
  const acteurs = asObject(base.acteurs)
  return {
    ...base,
    version: CREDITS_FORMAT_VERSION,
    modele: data.modele,
    options: { ...asObject(base.options), ...data.options },
    acteurs: { ...acteurs, nomsAffiches: { ...data.acteurs.nomsAffiches } },
    rubriques: mergeList(base.rubriques, data.rubriques, (item) =>
      typeof item.id === 'string' ? item.id : null
    ),
    // Les musiques n'ont pas d'identifiant : on les rapproche par leur position.
    musiques: mergeList(base.musiques, data.musiques, (_item, index) => String(index)),
    mentions: { ...asObject(base.mentions), ...data.mentions },
    logos: [...data.logos],
    cartonsDebut: [...data.cartonsDebut]
  }
}

/** Texte du fichier : JSON indenté, terminé par un retour à la ligne. */
export function serializeCreditsData(original: unknown, data: CreditsData): string {
  return `${JSON.stringify(mergeCreditsData(original, data), null, 2)}\n`
}
