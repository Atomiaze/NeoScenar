import nodePath, { type PlatformPath } from 'node:path'
import { PROJECT_FILE_EXTENSION } from '../shared/projectTypes'

/**
 * Fichier .neoscenar passé en argument (double-clic sous Windows et Linux, ou lancement depuis un
 * terminal). Un chemin relatif est lu depuis le dossier où la commande a été lancée.
 */
export function projectFileFromArgs(
  args: readonly string[],
  workingDirectory: string,
  p: PlatformPath = nodePath
): string | null {
  const file = args.find(
    (arg) => !arg.startsWith('-') && arg.toLowerCase().endsWith(`.${PROJECT_FILE_EXTENSION}`)
  )
  return file === undefined ? null : p.resolve(workingDirectory, file)
}
