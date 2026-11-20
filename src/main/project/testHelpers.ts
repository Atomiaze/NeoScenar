import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import type { CreateProjectRequest } from '../../shared/api'
import type { FolderTemplate } from '../../shared/folderTemplate'
import type { ContentSources } from './initialContent'
import { loadFolderTemplate } from './template'

// Outils communs aux tests : dossier temporaire, modèle réel, identifiants prévisibles.

export const TEMPLATE_PATH = join(
  __dirname,
  '..',
  '..',
  '..',
  'resources',
  'modeles',
  'saint-luc.json'
)

export function loadTestTemplate(): Promise<FolderTemplate> {
  return loadFolderTemplate(TEMPLATE_PATH)
}

export function makeTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'neoscenar-test-'))
}

export function removeDir(path: string): Promise<void> {
  return rm(path, { recursive: true, force: true })
}

export function fixedSources(): ContentSources {
  let counter = 0
  return {
    now: () => new Date('2026-11-17T15:40:12.000Z'),
    newId: () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`
  }
}

export function request(
  location: string,
  overrides: Partial<CreateProjectRequest> = {}
): CreateProjectRequest {
  return {
    title: 'Mon Film d’été',
    location,
    projectType: 'animation',
    folders: [],
    withReadme: true,
    settings: { fps: 25, resolution: { width: 1920, height: 1080 } },
    ...overrides
  }
}

/** Liste récursive des fichiers et dossiers, relative à root, avec « / » comme séparateur. */
export async function listTree(root: string): Promise<string[]> {
  const result: string[] = []
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir)) {
      const path = join(dir, entry)
      const isDir = (await stat(path)).isDirectory()
      result.push(relative(root, path).split(sep).join('/') + (isDir ? '/' : ''))
      if (isDir) await walk(path)
    }
  }
  await walk(root)
  return result.sort()
}

/** Contenu de tous les fichiers (pas des dossiers) de l'arborescence. */
export async function readAllFiles(root: string): Promise<Map<string, string>> {
  const files = new Map<string, string>()
  for (const entry of await listTree(root)) {
    if (!entry.endsWith('/')) files.set(entry, await readFile(join(root, entry), 'utf8'))
  }
  return files
}
