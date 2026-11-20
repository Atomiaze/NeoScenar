import { randomUUID } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fr } from '../../renderer/i18n/fr'
import {
  parsePlanning,
  planningFileVersion,
  serializePlanning
} from '../../shared/planning/planningData'
import { PLANNING_FILE, PLANNING_FORMAT_VERSION, type Planning } from '../../shared/planning/types'
import { writeFileSafely } from '../fs/safeWrite'
import { isNotFoundError, ProjectError } from '../project/errors'
import { parseJsonText } from '../../shared/lineEndings'

// neoscenar/planning.json sur le disque.

const uuidSource = { newId: (): string => randomUUID() }

/** Contenu lu : les données connues, et le contenu brut à conserver à la réécriture. */
export interface PlanningFileContent {
  planning: Planning
  raw: unknown
}

/** Lit planning.json ; un fichier absent donne un planning neuf (créé au premier enregistrement). */
export async function readPlanningFile(dataFolder: string): Promise<PlanningFileContent> {
  let text: string
  try {
    text = await readFile(join(dataFolder, PLANNING_FILE), 'utf8')
  } catch (error) {
    if (isNotFoundError(error)) return { planning: parsePlanning({}, uuidSource), raw: {} }
    throw error
  }
  let raw: unknown
  try {
    raw = parseJsonText(text)
  } catch {
    throw new ProjectError(fr.errors.unreadableJson(PLANNING_FILE))
  }
  if (planningFileVersion(raw) > PLANNING_FORMAT_VERSION)
    throw new ProjectError(fr.errors.planningTooRecent)
  return { planning: parsePlanning(raw, uuidSource), raw }
}

/**
 * Enregistre le planning. Le fichier est relu juste avant : ce qu'un autre logiciel y a ajouté
 * entre-temps est conservé.
 */
export async function writePlanningFile(dataFolder: string, planning: Planning): Promise<void> {
  const { raw } = await readPlanningFile(dataFolder)
  await writeFileSafely(join(dataFolder, PLANNING_FILE), serializePlanning(raw, planning))
}

/** Date de modification de planning.json en millisecondes (0 si le fichier n'existe pas encore). */
export async function planningFileStamp(dataFolder: string): Promise<number> {
  try {
    return (await stat(join(dataFolder, PLANNING_FILE))).mtimeMs
  } catch (error) {
    if (isNotFoundError(error)) return 0
    throw error
  }
}
