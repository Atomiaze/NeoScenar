import { mkdir, readdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fr } from '../../renderer/i18n/fr'
import { isSafeRelativePath } from '../../shared/relativePath'
import { isCreditsPngName } from '../../shared/credits/creditsLayout'
import {
  CREDITS_EXPORT_FOLDER,
  CREDITS_LOGOS_FOLDER,
  CREDITS_TEXT_FILE
} from '../../shared/credits/types'
import { writeFileSafely } from '../fs/safeWrite'
import { ProjectError } from '../project/errors'

// Exports du générique (étape 10bC) dans 08_Graphisme/Generique/ : les PNG sont dessinés par
// l'interface, le processus principal vérifie leurs noms et les écrit.

export interface CreditsPngFile {
  name: string
  bytes: Uint8Array
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function exportFolder(rootDir: string): string {
  return join(rootDir, ...CREDITS_EXPORT_FOLDER.split('/'))
}

/** Vérifie ce qu'envoie l'interface : des PNG aux noms prévus, sans doublon. */
export function parsePngFiles(raw: unknown): CreditsPngFile[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new ProjectError(fr.creditsExport.invalid)
  const names = new Set<string>()
  return raw.map((entry: unknown) => {
    const file = entry as Partial<CreditsPngFile> | null
    const valid =
      file !== null &&
      typeof file === 'object' &&
      typeof file.name === 'string' &&
      isCreditsPngName(file.name) &&
      !names.has(file.name) &&
      file.bytes instanceof Uint8Array &&
      PNG_SIGNATURE.every((byte, index) => file.bytes![index] === byte)
    if (!valid) throw new ProjectError(fr.creditsExport.invalid)
    names.add(file.name!)
    return { name: file.name!, bytes: file.bytes! }
  })
}

/**
 * Écrit les PNG du générique et retire ceux d'un export précédent qui ne sont plus produits
 * (carton décoché, déroulant qui n'est plus coupé) : le dossier montre toujours le dernier export.
 * Renvoie le chemin du dossier, relatif au dossier du film.
 */
export async function writeCreditsPngs(rootDir: string, files: CreditsPngFile[]): Promise<string> {
  const folder = exportFolder(rootDir)
  await mkdir(folder, { recursive: true })
  const kept = new Set(files.map((file) => file.name))
  for (const name of await readdir(folder))
    if (isCreditsPngName(name) && !kept.has(name)) await rm(join(folder, name), { force: true })
  for (const file of files) await writeFileSafely(join(folder, file.name), file.bytes)
  return CREDITS_EXPORT_FOLDER
}

/** Écrit generique.txt (UTF-8) ; renvoie son chemin relatif au dossier du film. */
export async function writeCreditsText(rootDir: string, text: string): Promise<string> {
  const folder = exportFolder(rootDir)
  await mkdir(folder, { recursive: true })
  await writeFileSafely(join(folder, CREDITS_TEXT_FILE), text)
  return `${CREDITS_EXPORT_FOLDER}/${CREDITS_TEXT_FILE}`
}

/** Octets d'un logo du générique (chemin relatif à neoscenar/, dans generique/logos/ seulement). */
export async function readCreditsLogo(dataDir: string, path: unknown): Promise<Uint8Array> {
  const prefix = `${CREDITS_LOGOS_FOLDER}/`
  if (typeof path !== 'string' || !path.startsWith(prefix))
    throw new ProjectError(fr.images.unreadable)
  const name = path.slice(prefix.length)
  if (name.includes('/') || name.startsWith('.') || !isSafeRelativePath(path))
    throw new ProjectError(fr.images.unreadable)
  try {
    return new Uint8Array(await readFile(join(dataDir, ...CREDITS_LOGOS_FOLDER.split('/'), name)))
  } catch {
    throw new ProjectError(fr.images.unreadable)
  }
}

export function creditsExportFolder(rootDir: string): string {
  return exportFolder(rootDir)
}
