import { basename } from 'node:path'
import { fr } from '../renderer/i18n/fr'
import { VOCABULARY_LISTS, type Vocabulary, type VocabularyTerm } from '../shared/vocabulary'
import { ProjectError } from './project/errors'
import { createChecker, readJsonFile } from './project/jsonChecker'

/** Vérifie le contenu du fichier de vocabulaire. */
export function parseVocabulary(raw: unknown, fileName: string): Vocabulary {
  const check = createChecker(fileName)
  const data = check.root(raw)
  const formatVersion = check.formatVersion(data)
  const list = (key: (typeof VOCABULARY_LISTS)[number]): VocabularyTerm[] =>
    check.array(data[key], key).map((item, index) => {
      const term = check.object(item, `${key}[${index}]`)
      return {
        label: check.string(term['label'], `${key}[${index}].label`),
        definition: check.string(term['definition'], `${key}[${index}].definition`)
      }
    })
  return {
    formatVersion,
    id: check.string(data['id'], 'id'),
    name: check.string(data['name'], 'name'),
    shotSizes: list('shotSizes'),
    cameraMovements: list('cameraMovements'),
    cameraAngles: list('cameraAngles'),
    // Liste ajoutée à l'étape 7 : un ancien fichier sans elle reste lisible.
    sceneTimes:
      data['sceneTimes'] === undefined
        ? []
        : check
            .array(data['sceneTimes'], 'sceneTimes')
            .map((time, index) => check.string(time, `sceneTimes[${index}]`))
  }
}

/** Lit le vocabulaire livré. Un fichier abîmé donne un message destiné à l'enseignant. */
export async function loadVocabulary(path: string): Promise<Vocabulary> {
  try {
    return parseVocabulary(await readJsonFile(path, basename(path)), basename(path))
  } catch (error) {
    const detail = error instanceof Error ? ` (${error.message})` : ''
    throw new ProjectError(`${fr.errors.vocabularyUnreadable}${detail}`)
  }
}
