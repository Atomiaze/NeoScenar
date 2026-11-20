import { open, rename, rm } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { basename, dirname, join } from 'node:path'

/** Opérations disque utilisées par writeFileSafely, remplaçables dans les tests. */
export interface SafeWriteOperations {
  writeAndFlush(path: string, content: string | Uint8Array): Promise<void>
  rename(from: string, to: string): Promise<void>
  remove(path: string): Promise<void>
}

const defaultOperations: SafeWriteOperations = {
  async writeAndFlush(path, content) {
    // « wx » : on ne réutilise jamais un fichier existant.
    const handle = await open(path, 'wx')
    try {
      await handle.writeFile(content, typeof content === 'string' ? 'utf8' : undefined)
      await handle.sync()
    } finally {
      await handle.close()
    }
  },
  rename: (from, to) => rename(from, to),
  remove: (path) => rm(path, { force: true })
}

/**
 * Enregistrement sûr : écrit dans un fichier temporaire du même dossier, puis le renomme à la place
 * de l'ancien. Une coupure pendant l'écriture laisse donc toujours l'ancien fichier intact.
 * Tous les fichiers des projets doivent être écrits par cette fonction (texte ou image).
 */
export async function writeFileSafely(
  filePath: string,
  content: string | Uint8Array,
  operations: SafeWriteOperations = defaultOperations
): Promise<void> {
  const temporaryPath = join(dirname(filePath), `.${basename(filePath)}.${randomUUID()}.tmp`)
  try {
    await operations.writeAndFlush(temporaryPath, content)
    await operations.rename(temporaryPath, filePath)
  } catch (error) {
    await operations.remove(temporaryPath).catch(() => undefined)
    throw error
  }
}

/** Écrit un objet en JSON lisible (indentation de 2, fin de ligne finale). */
export function writeJsonSafely(filePath: string, data: unknown): Promise<void> {
  return writeFileSafely(filePath, `${JSON.stringify(data, null, 2)}\n`)
}
