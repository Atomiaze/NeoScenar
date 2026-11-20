import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fr } from '../../renderer/i18n/fr'
import {
  creditsFileVersion,
  defaultCreditsData,
  parseCreditsData,
  serializeCreditsData
} from '../../shared/credits/creditsData'
import {
  CREDITS_EXPORT_FOLDER,
  CREDITS_FILE,
  CREDITS_FORMAT_VERSION,
  CREDITS_TEXT_FILE,
  type CreditsData
} from '../../shared/credits/types'
import { writeFileSafely } from '../fs/safeWrite'
import { isNotFoundError, ProjectError } from '../project/errors'
import { parseJsonText } from '../../shared/lineEndings'

// neoscenar/generique.json sur le disque, et export texte dans 08_Graphisme/Generique/.

/** Contenu lu : les données connues, et le contenu brut à conserver à la réécriture. */
export interface CreditsFileContent {
  data: CreditsData
  raw: unknown
}

/** Lit generique.json ; un fichier absent donne un générique vide (il est créé au premier enregistrement). */
export async function readCreditsFile(dataFolder: string): Promise<CreditsFileContent> {
  let text: string
  try {
    text = await readFile(join(dataFolder, CREDITS_FILE), 'utf8')
  } catch (error) {
    if (isNotFoundError(error)) return { data: defaultCreditsData(), raw: {} }
    throw error
  }
  let raw: unknown
  try {
    raw = parseJsonText(text)
  } catch {
    throw new ProjectError(fr.errors.unreadableJson(CREDITS_FILE))
  }
  if (creditsFileVersion(raw) > CREDITS_FORMAT_VERSION)
    throw new ProjectError(fr.errors.creditsTooRecent)
  return { data: parseCreditsData(raw), raw }
}

/**
 * Enregistre le générique. Le fichier est relu juste avant : ce qu'un autre logiciel y a ajouté
 * entre-temps est conservé.
 */
export async function writeCreditsFile(dataFolder: string, data: CreditsData): Promise<void> {
  const { raw } = await readCreditsFile(dataFolder)
  await writeFileSafely(join(dataFolder, CREDITS_FILE), serializeCreditsData(raw, data))
}

/** Écrit generique.txt dans 08_Graphisme/Generique/ (créé si besoin) ; renvoie son chemin. */
export async function writeCreditsText(filmFolder: string, text: string): Promise<string> {
  const folder = join(filmFolder, ...CREDITS_EXPORT_FOLDER.split('/'))
  await mkdir(folder, { recursive: true })
  const path = join(folder, CREDITS_TEXT_FILE)
  await writeFileSafely(path, text)
  return path
}
