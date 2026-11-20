// Assemblage du générique : modèle + generique.json + fiches Personnages + scénario → blocs,
// rubriques et cartons de début prêts à exporter. Logique pure, sans interface ni disque.

import {
  getCharacters,
  parse,
  plainTitle,
  readTitlePage,
  splitTitlePage
} from '@neoscenar/fountain'
import type { ProjectType } from '../projectTypes'
import { nameKey } from '../research/sheetNames'
import type { Sheet } from '../research/types'
import { cleanNames, fillText, joinNames, schoolYear, titleCaseName } from './creditsNames'
import {
  START_CARDS,
  type AssembledCredits,
  type CreditsBlock,
  type CreditsData,
  type CreditsEntry,
  type CreditsSection,
  type CreditsTemplate,
  type CreditsWarning,
  type StartCard,
  type TemplateBlock
} from './types'

/** Ce que le générique lit d'une fiche Personnage. */
export interface CreditsCharacter {
  nom: string
  interprete: string
  role: string
}

export function creditsCharacter(sheet: Pick<Sheet, 'nom' | 'props'>): CreditsCharacter {
  return {
    nom: sheet.nom,
    interprete: sheet.props.interprete ?? '',
    role: sheet.props.role ?? ''
  }
}

export interface CreditsSources {
  template: CreditsTemplate
  data: CreditsData
  characters: readonly CreditsCharacter[]
  /** Texte complet de scenario.fountain. */
  script: string
  projectType: ProjectType
  /** Date du jour : année du © par défaut et année scolaire. */
  today: Date
}

/** Acteur retenu pour le générique. */
interface Actor {
  key: string
  /** Nom de la fiche (celui du scénario). */
  nom: string
  personnage: string
  interprete: string
  role: string
  /** Position de la première réplique dans le scénario. */
  appearance: number
}

/** Rang d'un rôle pour l'ordre « par importance » : un rôle vide ou inconnu compte comme secondaire. */
function roleRank(role: string): number {
  const value = role.trim().toLowerCase()
  if (value === 'principal') return 0
  if (value === 'figurant') return 2
  return 1
}

interface Cast {
  /** Acteurs hors figurants, dans l'ordre choisi par l'élève. */
  actors: Actor[]
  /** Acteurs principaux (carton de début), dans le même ordre. */
  leads: Actor[]
  /** Interprètes des figurants, dans l'ordre d'apparition. */
  extras: string[]
  extraActors: Actor[]
  warnings: CreditsWarning[]
}

/**
 * Acteurs du film : toute fiche avec un interprète est exportée, qu'il y ait une réplique ou non
 * (un rôle muet reste au générique ; ces fiches viennent après celles qui parlent, dans l'ordre
 * d'apparition). Un personnage qui parle mais n'a pas d'interprète est signalé.
 */
function castFrom(sources: CreditsSources): Cast {
  const { data, characters } = sources
  const inScript = getCharacters(parse(sources.script))
  const appearance = new Map(inScript.map((character, index) => [nameKey(character.name), index]))
  const sheets = new Map<string, CreditsCharacter>()
  for (const character of characters) {
    const key = nameKey(character.nom)
    if (!sheets.has(key)) sheets.set(key, character)
  }

  const warnings: CreditsWarning[] = []
  const all: Actor[] = []
  for (const character of inScript) {
    const key = nameKey(character.name)
    const sheet = sheets.get(key)
    const interprete = sheet?.interprete.trim() ?? ''
    const nom = sheet?.nom ?? character.name
    if (interprete === '') {
      warnings.push({ personnage: nom, raison: 'sans-interprete' })
      continue
    }
    all.push({
      key,
      nom,
      personnage: data.acteurs.nomsAffiches[key]?.trim() || titleCaseName(nom),
      interprete,
      role: sheet?.role ?? '',
      appearance: appearance.get(key) ?? 0
    })
  }
  for (const [key, sheet] of sheets) {
    const interprete = sheet.interprete.trim()
    if (appearance.has(key) || interprete === '') continue
    all.push({
      key,
      nom: sheet.nom,
      personnage: data.acteurs.nomsAffiches[key]?.trim() || titleCaseName(sheet.nom),
      interprete,
      role: sheet.role,
      appearance: inScript.length + all.length
    })
  }

  const extras = all.filter((actor) => roleRank(actor.role) === 2)
  const actors = all.filter((actor) => roleRank(actor.role) !== 2)
  // Tri stable : à rang égal, l'ordre d'apparition est gardé.
  if (data.options.ordreActeurs === 'importance')
    actors.sort((a, b) => roleRank(a.role) - roleRank(b.role))
  return {
    actors,
    leads: actors.filter((actor) => roleRank(actor.role) === 0),
    extras: extras.map((actor) => actor.interprete),
    extraActors: extras,
    warnings
  }
}

/** Vrai si le bloc est exporté (les blocs facultatifs sont masqués par défaut). */
export function isBlockShown(block: TemplateBlock, data: CreditsData, type: ProjectType): boolean {
  if (!block.facultatif) return true
  return (block.afficheSiType ?? []).includes(type) || data.options.blocsAffiches.includes(block.id)
}

function rubricSections(block: TemplateBlock, data: CreditsData, cast: Cast): CreditsSection[] {
  const templateIds = new Set(block.rubriques.map((rubric) => rubric.id))
  const saved = new Map(data.rubriques.map((rubric) => [rubric.id, rubric]))
  const sections: CreditsSection[] = []
  const push = (id: string, intitule: string, entries: CreditsEntry[]) => {
    if (entries.length > 0) sections.push({ kind: 'rubrique', id, intitule, entries })
  }

  for (const rubric of block.rubriques) {
    const own = saved.get(rubric.id)
    const intitule = own?.intitule?.trim() || rubric.intitule
    const names = cleanNames(own?.noms ?? [])
    if (rubric.source === 'acteurs')
      push(
        rubric.id,
        intitule,
        cast.actors.map((actor) => ({ personnage: actor.personnage, nom: actor.interprete }))
      )
    else if (rubric.source === 'figurants')
      push(
        rubric.id,
        intitule,
        cleanNames([...cast.extras, ...names]).map((nom) => ({ nom }))
      )
    else
      push(
        rubric.id,
        intitule,
        names.map((nom) => ({ nom }))
      )
  }

  // Rubriques ajoutées par l'élève, après celles du modèle, dans leur ordre.
  for (const rubric of data.rubriques)
    if (rubric.bloc === block.id && !templateIds.has(rubric.id))
      push(
        rubric.id,
        rubric.intitule?.trim() ?? '',
        cleanNames(rubric.noms).map((nom) => ({ nom }))
      )
  return sections
}

function musicSections(template: CreditsTemplate, data: CreditsData): CreditsSection[] {
  const { textes } = template
  return data.musiques.flatMap((music): CreditsSection[] => {
    const lignes = [
      { libelle: textes.musiqueInterprete, valeur: music.interprete.trim() },
      { libelle: textes.musiqueAuteurs, valeur: music.auteurs.trim() },
      { libelle: textes.musiqueAutorisation, valeur: music.autorisation.trim() }
    ].filter((line) => line.valeur !== '')
    const titre = music.titre.trim()
    return titre === '' && lignes.length === 0 ? [] : [{ kind: 'musique', titre, lignes }]
  })
}

/** Logos dans l'ordre de l'élève, le logo de l'école toujours en dernier. */
function orderedLogos(template: CreditsTemplate, data: CreditsData): string[] {
  const logos = data.logos.filter((logo) => logo.trim() !== '')
  const school = template.logoEcole
  if (school === null || !logos.includes(school)) return logos
  return [...logos.filter((logo) => logo !== school), school]
}

function mentionSections(sources: CreditsSources): CreditsSection[] {
  const { template, data, today } = sources
  const { textes } = template
  const { mentions } = data
  const texts: string[] = []
  if (mentions.tourneA.trim() !== '')
    texts.push(fillText(textes.tourneA, { lieu: mentions.tourneA.trim() }))
  if (mentions.fiction) texts.push(textes.fiction)
  if (mentions.animaux) texts.push(textes.animaux)
  const schoolLine = mentions.ligneEcole ?? textes.ligneEcole
  if (schoolLine.trim() !== '')
    texts.push(fillText(schoolLine, { anneeScolaire: schoolYear(today) }))
  if (mentions.copyrightTitulaire.trim() !== '')
    texts.push(
      fillText(textes.copyright, {
        annee: String(mentions.copyrightAnnee ?? today.getFullYear()),
        titulaire: mentions.copyrightTitulaire.trim()
      })
    )

  const sections: CreditsSection[] = texts
    .filter((texte) => texte.trim() !== '')
    .map((texte) => ({ kind: 'mention', texte }))
  const logos = orderedLogos(template, data)
  if (logos.length > 0) sections.push({ kind: 'logos', chemins: logos })
  return sections
}

function blockSections(block: TemplateBlock, sources: CreditsSources, cast: Cast) {
  const sections = rubricSections(block, sources.data, cast)
  if (block.special === 'musiques') sections.push(...musicSections(sources.template, sources.data))
  if (block.special === 'mentions') sections.push(...mentionSections(sources))
  return sections
}

/** Noms d'une rubrique du modèle (pour les cartons « présente », « Un film de »). */
function rubricNames(data: CreditsData, id: string): string[] {
  return cleanNames(data.rubriques.find((rubric) => rubric.id === id)?.noms ?? [])
}

function startCards(sources: CreditsSources, cast: Cast, titre: string): StartCard[] {
  const { template, data } = sources
  const { textes } = template
  // `plural` : texte utilisé dès deux noms (« Léa et Tom présentent »).
  const sentence = (text: string, rubricId: string, plural = text): string[] => {
    const names = rubricNames(data, rubricId)
    if (names.length === 0) return []
    return [fillText(names.length > 1 ? plural : text, { noms: joinNames(names, textes.et) })]
  }
  const cards: StartCard[] = []
  // L'ordre des cartons est fixe ; l'élève choisit seulement lesquels il veut.
  for (const kind of START_CARDS) {
    if (!data.cartonsDebut.includes(kind)) continue
    if (kind === 'logos') {
      const chemins = orderedLogos(template, data)
      if (chemins.length > 0) cards.push({ kind, chemins })
      continue
    }
    const lignes =
      kind === 'presente'
        ? sentence(textes.presente, template.cartons.production, textes.presentent)
        : kind === 'unFilmDe'
          ? sentence(textes.unFilmDe, template.cartons.realisation)
          : kind === 'realisePar'
            ? sentence(textes.realisePar, template.cartons.realisation)
            : kind === 'titre'
              ? titre === ''
                ? []
                : [titre]
              : cast.leads.map((actor) => actor.interprete)
    if (lignes.length > 0) cards.push({ kind, lignes })
  }
  return cards
}

/** Titre du film : la clé « Title: » de la page de titre du scénario, sans mise en forme. */
export function filmTitle(script: string): string {
  return plainTitle(readTitlePage(splitTitlePage(script).titlePage).Title)
}

export function assembleCredits(sources: CreditsSources): AssembledCredits {
  const cast = castFrom(sources)
  const titre = filmTitle(sources.script)
  const blocs: CreditsBlock[] = sources.template.blocs
    .filter((block) => isBlockShown(block, sources.data, sources.projectType))
    .map((block) => ({ id: block.id, sections: blockSections(block, sources, cast) }))
    .filter((block) => block.sections.length > 0)
  return {
    titre,
    cartons: startCards(sources, cast, titre),
    blocs,
    avertissements: cast.warnings
  }
}

/** Une ligne de la liste de distribution du formulaire (étape 10bB). */
export interface CastRow {
  /** Clé de la correction du nom affiché (dans generique.json). */
  key: string
  /** Nom de la fiche, pour l'ouvrir. */
  nom: string
  /** Nom tel qu'il sera affiché au générique (vide si le personnage n'y figure pas). */
  personnage: string
  interprete: string
  etat: 'acteur' | 'figurant' | 'sans-interprete'
}

export interface CastOverview {
  rows: CastRow[]
}

/** Personnages du scénario et de leurs fiches, tels que le générique les traitera. */
export function castOverview(sources: CreditsSources): CastOverview {
  const cast = castFrom(sources)
  const row = (actor: Actor, etat: CastRow['etat']): CastRow => ({
    key: actor.key,
    nom: actor.nom,
    personnage: actor.personnage,
    interprete: actor.interprete,
    etat
  })
  const missing: CastRow[] = cast.warnings
    .filter((warning) => warning.raison === 'sans-interprete')
    .map((warning) => ({
      key: nameKey(warning.personnage),
      nom: warning.personnage,
      personnage: '',
      interprete: '',
      etat: 'sans-interprete'
    }))
  return {
    rows: [
      ...cast.actors.map((actor) => row(actor, 'acteur')),
      ...cast.extraActors.map((actor) => row(actor, 'figurant')),
      ...missing
    ]
  }
}
