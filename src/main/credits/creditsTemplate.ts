import { basename } from 'node:path'
import { fr } from '../../renderer/i18n/fr'
import { PROJECT_TYPES } from '../../shared/projectTypes'
import type {
  CreditsTemplate,
  TemplateBlock,
  TemplateRubric,
  TemplateTexts
} from '../../shared/credits/types'
import { ProjectError } from '../project/errors'
import { createChecker, readJsonFile } from '../project/jsonChecker'

// Modèle de générique (resources/modeles/generique-saint-luc.json), modifiable par l'enseignant.
// Une erreur nomme le champ fautif, pour qu'il puisse réparer le fichier.

const TEXT_KEYS: readonly (keyof TemplateTexts)[] = [
  'fiction',
  'animaux',
  'tourneA',
  'copyright',
  'ligneEcole',
  'musiqueInterprete',
  'musiqueAuteurs',
  'musiqueAutorisation',
  'presente',
  'presentent',
  'unFilmDe',
  'realisePar',
  'et'
]

type Checker = ReturnType<typeof createChecker>

function parseRubric(check: Checker, raw: unknown, path: string): TemplateRubric {
  const value = check.object(raw, path)
  const rubric: TemplateRubric = {
    id: check.string(value.id, `${path}.id`),
    intitule: check.string(value.intitule, `${path}.intitule`)
  }
  if (value.source !== undefined)
    rubric.source = check.oneOf(value.source, ['acteurs', 'figurants'] as const, `${path}.source`)
  return rubric
}

function parseBlock(check: Checker, raw: unknown, path: string): TemplateBlock {
  const value = check.object(raw, path)
  const block: TemplateBlock = {
    id: check.string(value.id, `${path}.id`),
    titre: check.string(value.titre, `${path}.titre`),
    rubriques: check
      .array(value.rubriques, `${path}.rubriques`)
      .map((rubric, index) => parseRubric(check, rubric, `${path}.rubriques[${index}]`))
  }
  if (value.facultatif !== undefined)
    block.facultatif = check.boolean(value.facultatif, `${path}.facultatif`)
  if (value.afficheSiType !== undefined)
    block.afficheSiType = check
      .array(value.afficheSiType, `${path}.afficheSiType`)
      .map((type, index) => check.oneOf(type, PROJECT_TYPES, `${path}.afficheSiType[${index}]`))
  if (value.special !== undefined)
    block.special = check.oneOf(value.special, ['musiques', 'mentions'] as const, `${path}.special`)
  return block
}

export function parseCreditsTemplate(raw: unknown, fileName: string): CreditsTemplate {
  const check = createChecker(fileName)
  const data = check.root(raw)
  const textsRaw = check.object(data.textes, 'textes')
  const textes = Object.fromEntries(
    TEXT_KEYS.map((key) => [key, check.string(textsRaw[key], `textes.${key}`)])
  ) as unknown as TemplateTexts
  const cartons = check.object(data.cartons, 'cartons')
  const template: CreditsTemplate = {
    formatVersion: check.formatVersion(data),
    id: check.string(data.id, 'id'),
    name: check.string(data.name, 'name'),
    textes,
    logoEcole: check.nullableString(data.logoEcole, 'logoEcole'),
    cartons: {
      production: check.string(cartons.production, 'cartons.production'),
      realisation: check.string(cartons.realisation, 'cartons.realisation')
    },
    blocs: check
      .array(data.blocs, 'blocs')
      .map((block, index) => parseBlock(check, block, `blocs[${index}]`))
  }
  const ids = template.blocs.flatMap((block) => block.rubriques.map((rubric) => rubric.id))
  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index)
  if (duplicate !== undefined) check.fail(duplicate)
  return template
}

/** Lit le modèle de générique. Un modèle abîmé donne un message destiné à l'enseignant. */
export async function loadCreditsTemplate(path: string): Promise<CreditsTemplate> {
  try {
    return parseCreditsTemplate(await readJsonFile(path, basename(path)), basename(path))
  } catch (error) {
    const detail = error instanceof Error ? ` (${error.message})` : ''
    throw new ProjectError(`${fr.errors.creditsTemplateUnreadable}${detail}`)
  }
}
