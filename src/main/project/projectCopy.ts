import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { PROJECT_FILES } from '../../shared/projectTypes'
import { writeJsonSafely } from '../fs/safeWrite'
import type { LoadedProject } from './readProject'
import { parseJsonText } from '../../shared/lineEndings'

// Projets copiés (dossier dupliqué dans le Finder, copie sur une clé USB…) : la copie a le même
// identifiant que l'original. Un projet ouvert est donc reconnu par son chemin, et une copie reçoit
// un nouvel identifiant dès qu'on l'ouvre, pour que les deux projets restent indépendants.

/** Vrai si les deux chemins désignent le même fichier .neoscenar. */
export function sameProjectFile(a: string, b: string): boolean {
  return resolve(a) === resolve(b)
}

/** Projet déjà connu (projet ouvert ou projets récents des préférences). */
export interface KnownProject {
  id?: string
  filePath: string
}

/** Emplacements, autres que `filePath`, où l'identifiant `id` est déjà connu. */
export function otherLocations(
  id: string,
  filePath: string,
  known: readonly KnownProject[]
): string[] {
  const paths = known
    .filter((item) => item.id === id && !sameProjectFile(item.filePath, filePath))
    .map((item) => resolve(item.filePath))
  return [...new Set(paths)]
}

export interface CopyCheck {
  /** Projets déjà connus. */
  known: readonly KnownProject[]
  /** Identifiant actuel du projet à cet emplacement (null : disparu, donc projet déplacé). */
  idAt(projectFilePath: string): Promise<string | null>
}

/**
 * Vrai si le projet est une copie : son identifiant est connu à un autre emplacement, où le projet
 * existe toujours avec ce même identifiant. Si l'ancien emplacement a disparu, le projet a été
 * déplacé : il garde son identifiant.
 */
export async function isCopiedProject(loaded: LoadedProject, check: CopyCheck): Promise<boolean> {
  const { id } = loaded.project
  for (const other of otherLocations(id, loaded.projectFilePath, check.known))
    if ((await check.idAt(other)) === id) return true
  return false
}

/**
 * Donne un nouvel identifiant à une copie : seule la clé `id` de projet.json change (enregistrement
 * sûr), tout le reste du fichier est gardé tel quel.
 */
export async function giveNewId(loaded: LoadedProject): Promise<LoadedProject> {
  const path = join(loaded.dataDir, PROJECT_FILES.project)
  const raw = parseJsonText(await readFile(path, 'utf8')) as Record<string, unknown>
  const id = randomUUID()
  await writeJsonSafely(path, { ...raw, id })
  return { ...loaded, project: { ...loaded.project, id } }
}
