import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { plainTitle, readTitlePage, splitTitlePage } from '@neoscenar/fountain'
import { PROJECT_FILES } from '../../shared/projectTypes'
import { writeJsonSafely } from '../fs/safeWrite'
import type { LoadedProject } from './readProject'

/** Titre du scénario (clé Title de sa page de titre), sans marqueurs de mise en forme ; vide sinon. */
export function scenarioTitle(scenario: string): string {
  return plainTitle(readTitlePage(splitTitlePage(scenario).titlePage).Title)
}

/** Nouveau titre dans projet.json (le nom du dossier du film ne change jamais). */
export async function writeProjectTitle(
  loaded: LoadedProject,
  title: string
): Promise<LoadedProject> {
  const project = { ...loaded.project, title, modifiedAt: new Date().toISOString() }
  await writeJsonSafely(join(loaded.dataDir, PROJECT_FILES.project), project)
  return { ...loaded, project }
}

/**
 * À l'ouverture : si scenario.fountain a un titre différent de projet.json (modifié dans Obsidian, par
 * exemple), le Fountain fait foi et projet.json est mis à jour. Sans titre dans le Fountain, rien ne change.
 */
export async function syncTitleFromScenario(loaded: LoadedProject): Promise<LoadedProject> {
  let scenario: string
  try {
    scenario = await readFile(join(loaded.dataDir, PROJECT_FILES.scenario), 'utf8')
  } catch {
    return loaded
  }
  const title = scenarioTitle(scenario)
  if (title === '' || title === loaded.project.title) return loaded
  return writeProjectTitle(loaded, title)
}
