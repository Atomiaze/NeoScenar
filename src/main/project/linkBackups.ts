import { copyFile, mkdir, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import type { LinkBackupKind } from '../../shared/api'
import { PROJECT_FILES } from '../../shared/projectTypes'

// Copies de sécurité faites avant que le rapprochement scénario ↔ cartes (étape 8) ne modifie les
// fichiers : scenario.fountain et decoupage.json, rangés dans neoscenar/sauvegardes/. Avant un
// renommage de fiche (étape 10D), la fiche est copiée aussi.

export const BACKUP_FOLDER = 'sauvegardes'

/** Nombre de copies « avant_rapprochement_… » conservées ; les « avant_liaison_… » le sont toutes. */
export const KEPT_RECONCILE_BACKUPS = 10

const PREFIXES: Record<LinkBackupKind, string> = {
  link: 'avant_liaison_',
  reconcile: 'avant_rapprochement_',
  rename: 'avant_renommage_'
}

/** « 2026-11-18_14-05-32 » : sans espace ni deux-points, et l'ordre alphabétique suit le temps. */
export function backupStamp(date: Date): string {
  const two = (value: number): string => String(value).padStart(2, '0')
  return (
    `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}_` +
    `${two(date.getHours())}-${two(date.getMinutes())}-${two(date.getSeconds())}`
  )
}

async function folderNames(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
  } catch {
    return []
  }
}

/**
 * Copie scenario.fountain et decoupage.json dans un nouveau dossier de sauvegardes/. Renvoie son
 * chemin relatif au dossier neoscenar/ (« sauvegardes/avant_liaison_2026-11-18_14-05-32 »).
 * Un fichier absent n'est pas copié. Les plus anciennes copies « avant_rapprochement_… » au-delà
 * des 10 dernières sont supprimées. `extraFiles` : autres fichiers à copier (chemins relatifs à
 * neoscenar/, rangés de la même façon dans la copie).
 */
export async function backupLinkFiles(
  dataDir: string,
  kind: LinkBackupKind,
  now = new Date(),
  extraFiles: readonly (readonly string[])[] = []
): Promise<string> {
  const root = join(dataDir, BACKUP_FOLDER)
  const existing = new Set(await folderNames(root))
  const base = `${PREFIXES[kind]}${backupStamp(now)}`
  let name = base
  for (let i = 2; existing.has(name); i++) name = `${base}_${i}`

  const target = join(root, name)
  await mkdir(target, { recursive: true })
  const files = [[PROJECT_FILES.scenario], [PROJECT_FILES.decoupage], ...extraFiles]
  for (const parts of files) {
    if (parts.length > 1) await mkdir(join(target, ...parts.slice(0, -1)), { recursive: true })
    await copyFile(join(dataDir, ...parts), join(target, ...parts)).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error
      }
    )
  }
  if (kind === 'reconcile') await pruneReconcileBackups(root)
  return `${BACKUP_FOLDER}/${name}`
}

async function pruneReconcileBackups(root: string): Promise<void> {
  const names = (await folderNames(root))
    .filter((name) => name.startsWith(PREFIXES.reconcile))
    .sort()
  for (const name of names.slice(0, Math.max(0, names.length - KEPT_RECONCILE_BACKUPS))) {
    await rm(join(root, name), { recursive: true, force: true })
  }
}
