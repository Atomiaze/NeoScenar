import { homedir } from 'node:os'
import { fr } from '../../renderer/i18n/fr'
import type { BlenderLaunchStatus, BlenderNeedChoice } from '../../shared/api'
import { ProjectError } from '../project/errors'
import { buildLaunchArgs, launchDetached, type Spawner } from './blenderLaunch'
import {
  blenderExecutable,
  checkBlender,
  detectBlender,
  isSupportedVersion,
  systemSearch,
  type BlenderVersion,
  type SearchSystem,
  type VersionRunner
} from './blenderLocator'

/** Système et outils utilisés pour trouver et lancer Blender, remplaçables dans les tests. */
export interface BlenderEnvironment {
  platform: NodeJS.Platform
  homeDir: string
  run?: VersionRunner
  spawner?: Spawner
  /** Accès au système pour la recherche automatique (par défaut, le vrai disque). */
  search?: Partial<SearchSystem>
}

export function systemEnvironment(): BlenderEnvironment {
  return { platform: process.platform, homeDir: homedir() }
}

export type BlenderChoice =
  | { found: true; path: string; version: BlenderVersion }
  | { found: false; reason: BlenderNeedChoice }

function searchSystem(env: BlenderEnvironment): SearchSystem {
  return { ...systemSearch(env.platform, env.homeDir), ...env.search }
}

/**
 * Blender à utiliser : celui des préférences s'il est toujours là (choisi par l'élève, même dans
 * une autre version que 4.5), sinon le résultat de la recherche automatique.
 */
export async function findBlender(
  saved: string | null,
  env: BlenderEnvironment
): Promise<BlenderChoice> {
  if (saved !== null) {
    const check = await checkBlender(saved, env.platform, env.run)
    if (check.ok) return { found: true, path: saved, version: check.version }
  }
  const detection = await detectBlender(searchSystem(env), env.run)
  if (detection.status === 'found') {
    return { found: true, path: detection.path, version: detection.version }
  }
  if (detection.status === 'several') return { found: false, reason: 'several' }
  if (detection.packaged === 'store') return { found: false, reason: 'store-only' }
  if (detection.packaged === 'flatpak') return { found: false, reason: 'flatpak-only' }
  return { found: false, reason: 'none' }
}

/**
 * Vérifie une application choisie par l'élève ; lève une ProjectError si ce n'est pas Blender.
 * Une autre version que 4.5 est acceptée : l'avertissement est donné au lancement.
 */
export async function verifyChosenBlender(appPath: string, env: BlenderEnvironment): Promise<void> {
  const check = await checkBlender(appPath, env.platform, env.run)
  if (!check.ok) throw new ProjectError(fr.blender.notBlender)
}

/** Lance Blender sur le paquet ; un échec donne un message, jamais une exception. */
export async function launchBlender(
  choice: { path: string; version: BlenderVersion },
  jsonPath: string,
  env: BlenderEnvironment
): Promise<BlenderLaunchStatus> {
  try {
    await launchDetached(
      blenderExecutable(choice.path, env.platform),
      buildLaunchArgs(jsonPath, fr.blender.pluginMissing),
      env.spawner
    )
    return isSupportedVersion(choice.version)
      ? { state: 'launched' }
      : { state: 'launched', untestedVersion: choice.version.text }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return { state: 'failed', message: fr.blender.launchFailed(detail) }
  }
}
