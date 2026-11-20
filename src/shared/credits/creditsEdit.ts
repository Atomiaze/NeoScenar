import type {
  CreditsData,
  CreditsRubricData,
  CreditsTemplate,
  PreexistingMusic,
  TemplateBlock
} from './types'

// Modifications du formulaire du générique (étape 10bB) : chaque fonction renvoie de nouvelles
// données sans toucher aux anciennes. Logique pure, testée sans interface.

/** Texte d'une zone « un nom par ligne » → noms (lignes vides retirées, espaces nettoyés). */
export function namesFromText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
}

export function namesToText(names: readonly string[]): string {
  return names.join('\n')
}

export function findRubric(data: CreditsData, id: string): CreditsRubricData | undefined {
  return data.rubriques.find((rubric) => rubric.id === id)
}

/** Rubrique du modèle : crée son entrée au premier changement, la retire si elle redevient vide. */
export function patchRubric(
  data: CreditsData,
  id: string,
  patch: Partial<Pick<CreditsRubricData, 'intitule' | 'noms'>>
): CreditsData {
  const existing = findRubric(data, id)
  const next: CreditsRubricData = { ...(existing ?? { id, intitule: null, noms: [] }), ...patch }
  const isEmpty = next.bloc === undefined && next.noms.length === 0 && !next.intitule?.trim()
  const others = data.rubriques.filter((rubric) => rubric.id !== id)
  if (isEmpty) return { ...data, rubriques: others }
  const rubriques = existing
    ? data.rubriques.map((rubric) => (rubric.id === id ? next : rubric))
    : [...others, next]
  return { ...data, rubriques }
}

/** Rubriques ajoutées à un bloc, dans leur ordre. */
export function addedRubrics(data: CreditsData, block: TemplateBlock): CreditsRubricData[] {
  const templateIds = new Set(block.rubriques.map((rubric) => rubric.id))
  return data.rubriques.filter((rubric) => rubric.bloc === block.id && !templateIds.has(rubric.id))
}

/** « Ajouter une rubrique » : une rubrique vide en fin de bloc. */
export function addRubric(data: CreditsData, blockId: string): CreditsData {
  const used = data.rubriques
    .map((rubric) => /^perso-(\d+)$/.exec(rubric.id)?.[1])
    .filter((digits): digits is string => digits !== undefined)
    .map(Number)
  const id = `perso-${Math.max(0, ...used) + 1}`
  return {
    ...data,
    rubriques: [...data.rubriques, { id, bloc: blockId, intitule: '', noms: [] }]
  }
}

export function removeRubric(data: CreditsData, id: string): CreditsData {
  return { ...data, rubriques: data.rubriques.filter((rubric) => rubric.id !== id) }
}

/** Monte (-1) ou descend (+1) une rubrique ajoutée parmi celles de son bloc. */
export function moveRubric(
  data: CreditsData,
  block: TemplateBlock,
  id: string,
  step: -1 | 1
): CreditsData {
  const added = addedRubrics(data, block)
  const from = added.findIndex((rubric) => rubric.id === id)
  const to = from + step
  if (from < 0 || to < 0 || to >= added.length) return data
  const target = added[to]
  const rubriques = [...data.rubriques]
  const a = rubriques.findIndex((rubric) => rubric.id === id)
  const b = rubriques.findIndex((rubric) => rubric.id === target.id)
  ;[rubriques[a], rubriques[b]] = [rubriques[b], rubriques[a]]
  return { ...data, rubriques }
}

/** Bloc facultatif affiché ou masqué par l'élève. */
export function setBlockShown(data: CreditsData, blockId: string, shown: boolean): CreditsData {
  const others = data.options.blocsAffiches.filter((id) => id !== blockId)
  return {
    ...data,
    options: { ...data.options, blocsAffiches: shown ? [...others, blockId] : others }
  }
}

/** Nom affiché d'un personnage : vide = nom de la fiche en casse de titre (correction retirée). */
export function setDisplayName(data: CreditsData, key: string, name: string): CreditsData {
  const nomsAffiches = { ...data.acteurs.nomsAffiches }
  if (name.trim() === '') delete nomsAffiches[key]
  else nomsAffiches[key] = name
  return { ...data, acteurs: { ...data.acteurs, nomsAffiches } }
}

export const EMPTY_MUSIC: PreexistingMusic = {
  titre: '',
  interprete: '',
  auteurs: '',
  autorisation: ''
}

export function addMusic(data: CreditsData): CreditsData {
  return { ...data, musiques: [...data.musiques, { ...EMPTY_MUSIC }] }
}

export function patchMusic(
  data: CreditsData,
  index: number,
  patch: Partial<PreexistingMusic>
): CreditsData {
  return {
    ...data,
    musiques: data.musiques.map((music, i) => (i === index ? { ...music, ...patch } : music))
  }
}

export function removeMusic(data: CreditsData, index: number): CreditsData {
  return { ...data, musiques: data.musiques.filter((_music, i) => i !== index) }
}

/** Logos : ajout en fin de liste (sans doublon), déplacement et retrait du lien (fichier gardé). */
export function addLogos(data: CreditsData, paths: readonly string[]): CreditsData {
  const fresh = paths.filter((path, i) => !data.logos.includes(path) && paths.indexOf(path) === i)
  return { ...data, logos: [...data.logos, ...fresh] }
}

export function moveLogo(data: CreditsData, index: number, step: -1 | 1): CreditsData {
  const to = index + step
  if (index < 0 || index >= data.logos.length || to < 0 || to >= data.logos.length) return data
  const logos = [...data.logos]
  ;[logos[index], logos[to]] = [logos[to], logos[index]]
  return { ...data, logos }
}

export function removeLogo(data: CreditsData, index: number): CreditsData {
  return { ...data, logos: data.logos.filter((_logo, i) => i !== index) }
}

/** Intitulé affiché d'une rubrique du modèle : celui de l'élève, sinon celui du modèle. */
export function rubricTitle(template: CreditsTemplate, data: CreditsData, id: string): string {
  const own = findRubric(data, id)?.intitule?.trim()
  if (own) return own
  for (const block of template.blocs)
    for (const rubric of block.rubriques) if (rubric.id === id) return rubric.intitule
  return ''
}
