import { basename } from 'node:path'
import { fr } from '../renderer/i18n/fr'
import { isValidSize, type FormatCatalog, type FormatPreset } from '../shared/imageFormat'
import { ProjectError } from './project/errors'
import { createChecker, readJsonFile } from './project/jsonChecker'

/** Vérifie le contenu du fichier des formats d'image. */
export function parseFormatCatalog(raw: unknown, fileName: string): FormatCatalog {
  const check = createChecker(fileName)
  const data = check.root(raw)
  const formatVersion = check.formatVersion(data)
  const presets: FormatPreset[] = check.array(data['presets'], 'presets').map((item, index) => {
    const field = `presets[${index}]`
    const preset = check.object(item, field)
    const parsed = {
      id: check.string(preset['id'], `${field}.id`),
      name: check.string(preset['name'], `${field}.name`),
      width: check.positiveInteger(preset['width'], `${field}.width`),
      height: check.positiveInteger(preset['height'], `${field}.height`)
    }
    return isValidSize(parsed) ? parsed : check.fail(field)
  })
  if (presets.length === 0) check.fail('presets')
  const defaultPresetId = check.string(data['defaultPresetId'], 'defaultPresetId')
  if (!presets.some((preset) => preset.id === defaultPresetId)) check.fail('defaultPresetId')
  const frameRates = check
    .array(data['frameRates'], 'frameRates')
    .map((value, index) => check.positiveNumber(value, `frameRates[${index}]`))
  const defaultFrameRate = check.positiveNumber(data['defaultFrameRate'], 'defaultFrameRate')
  if (!frameRates.includes(defaultFrameRate)) check.fail('defaultFrameRate')
  return { formatVersion, presets, defaultPresetId, frameRates, defaultFrameRate }
}

/** Lit les formats livrés. Un fichier abîmé donne un message destiné à l'enseignant. */
export async function loadFormatCatalog(path: string): Promise<FormatCatalog> {
  try {
    return parseFormatCatalog(await readJsonFile(path, basename(path)), basename(path))
  } catch (error) {
    const detail = error instanceof Error ? ` (${error.message})` : ''
    throw new ProjectError(`${fr.errors.formatsUnreadable}${detail}`)
  }
}
