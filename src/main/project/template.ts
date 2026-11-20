import { basename } from 'node:path'
import { fr } from '../../renderer/i18n/fr'
import type { FolderTemplate } from '../../shared/folderTemplate'
import { ProjectError } from './errors'
import { readJsonFile } from './jsonChecker'
import { parseFolderTemplate } from './validators'

/** Lit le modèle de dossiers. Un modèle abîmé donne un message destiné à l'enseignant. */
export async function loadFolderTemplate(path: string): Promise<FolderTemplate> {
  try {
    return parseFolderTemplate(await readJsonFile(path, basename(path)), basename(path))
  } catch (error) {
    const detail = error instanceof Error ? ` (${error.message})` : ''
    throw new ProjectError(`${fr.errors.templateUnreadable}${detail}`)
  }
}
