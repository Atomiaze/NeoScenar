import { execFile } from 'node:child_process'
import { access, readdir, realpath } from 'node:fs/promises'
import { posix, win32, type PlatformPath } from 'node:path'

// Trouver Blender sur l'ordinateur, sur les trois systèmes. Tout ce qui dépend du système est
// isolé ici. Blender 4.5 LTS est cherché d'abord ; sinon la version la plus récente trouvée est
// utilisée, avec un avertissement (version non testée).

export const SUPPORTED_BLENDER = { major: 4, minor: 5 } as const

/** Temps laissé à « Blender --version » (le premier lancement peut être lent). */
const VERSION_TIMEOUT_MS = 30_000

export interface BlenderVersion {
  major: number
  minor: number
  patch: number
  /** « 4.5.14 » */
  text: string
}

export type BlenderCheck =
  { ok: true; version: BlenderVersion } | { ok: false; reason: 'not-blender' }

/** Blender emballé d'une façon que NeoScenar ne sait pas lancer, trouvé seul sur l'ordinateur. */
export type PackagedBlender = 'store' | 'flatpak'

export type BlenderDetection =
  | { status: 'found'; path: string; version: BlenderVersion }
  | { status: 'none'; packaged: PackagedBlender | null }
  | { status: 'several'; paths: string[] }

/** Lance « <exécutable> --version » et renvoie ce qu'il affiche. */
export type VersionRunner = (executable: string) => Promise<string>

/** Accès au système pour la recherche, remplaçable dans les tests. */
export interface SearchSystem {
  platform: NodeJS.Platform
  homeDir: string
  /** Variables d'environnement (PATH, ProgramFiles, LOCALAPPDATA…). */
  env: Record<string, string | undefined>
  /** Noms contenus dans un dossier ; erreur si le dossier n'existe pas. */
  list(folder: string): Promise<string[]>
  exists(path: string): Promise<boolean>
  /** Chemin réel (liens symboliques suivis), pour ne pas compter deux fois le même Blender. */
  realpath(path: string): Promise<string>
}

export function systemSearch(platform: NodeJS.Platform, homeDir: string): SearchSystem {
  return {
    platform,
    homeDir,
    env: process.env,
    list: (folder) => readdir(folder),
    exists: (path) =>
      access(path).then(
        () => true,
        () => false
      ),
    realpath: (path) => realpath(path)
  }
}

/** Première ligne de « Blender --version » : « Blender 4.5.14 LTS ». */
export function parseBlenderVersion(output: string): BlenderVersion | null {
  const match = /^Blender (\d+)\.(\d+)(?:\.(\d+))?/m.exec(output)
  if (!match) return null
  const [, major, minor, patch] = match
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch ?? 0),
    text: patch === undefined ? `${major}.${minor}` : `${major}.${minor}.${patch}`
  }
}

export function isSupportedVersion(version: BlenderVersion): boolean {
  return version.major === SUPPORTED_BLENDER.major && version.minor === SUPPORTED_BLENDER.minor
}

/** Négatif si `a` est plus ancienne que `b`. */
export function compareVersions(a: BlenderVersion, b: BlenderVersion): number {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch
}

/**
 * Programme à lancer pour une application choisie par l'élève. Sur Mac, c'est un paquet
 * « Blender.app » qui contient le vrai programme ; ailleurs, le fichier choisi lui-même.
 */
export function blenderExecutable(appPath: string, platform: NodeJS.Platform): string {
  return platform === 'darwin' ? posix.join(appPath, 'Contents', 'MacOS', 'Blender') : appPath
}

function pathModule(platform: NodeJS.Platform): PlatformPath {
  return platform === 'win32' ? win32 : posix
}

/** Noms d'un dossier qui commencent par « blender » (sans casse), triés ; vide si absent. */
async function blenderEntries(sys: SearchSystem, folder: string): Promise<string[]> {
  const names = await sys.list(folder).catch(() => [] as string[])
  return [...names].filter((name) => /^blender/i.test(name)).sort()
}

/** Garde les fichiers qui existent, dans l'ordre. */
async function existing(sys: SearchSystem, paths: string[]): Promise<string[]> {
  const found: string[] = []
  for (const path of paths) if (await sys.exists(path)) found.push(path)
  return found
}

async function macCandidates(sys: SearchSystem): Promise<string[]> {
  const found: string[] = []
  for (const folder of ['/Applications', posix.join(sys.homeDir, 'Applications')]) {
    for (const name of await blenderEntries(sys, folder)) {
      if (/\.app$/i.test(name)) found.push(posix.join(folder, name))
    }
  }
  return found
}

/**
 * Windows : installeur de blender.org (« Program Files\Blender Foundation\Blender 4.5 »), installation
 * dans le compte (LOCALAPPDATA), puis Steam. La version Microsoft Store n'est pas lançable par chemin.
 */
async function windowsCandidates(sys: SearchSystem): Promise<string[]> {
  const p = win32
  const { ProgramFiles, LOCALAPPDATA } = sys.env
  const programFilesX86 = sys.env['ProgramFiles(x86)']
  const roots = [
    ProgramFiles,
    programFilesX86,
    LOCALAPPDATA,
    LOCALAPPDATA && p.join(LOCALAPPDATA, 'Programs')
  ]
  const found: string[] = []
  for (const root of roots) {
    if (!root) continue
    const foundation = p.join(root, 'Blender Foundation')
    for (const name of await blenderEntries(sys, foundation)) {
      found.push(...(await existing(sys, [p.join(foundation, name, 'blender.exe')])))
    }
  }
  const steam = [programFilesX86, ProgramFiles]
    .filter((root): root is string => Boolean(root))
    .map((root) => p.join(root, 'Steam', 'steamapps', 'common', 'Blender', 'blender.exe'))
  found.push(...(await existing(sys, steam)))
  return found
}

/** Linux : « blender » dans le PATH, Snap, puis dossiers « blender-4.x… » de blender.org. */
async function linuxCandidates(sys: SearchSystem): Promise<string[]> {
  const p = posix
  const inPath = (sys.env.PATH ?? '')
    .split(':')
    .filter((folder) => folder !== '')
    .map((folder) => p.join(folder, 'blender'))
  const found = await existing(sys, [...inPath, '/snap/bin/blender'])
  for (const folder of [sys.homeDir, p.join(sys.homeDir, 'Applications'), '/opt']) {
    for (const name of await blenderEntries(sys, folder)) {
      found.push(...(await existing(sys, [p.join(folder, name, 'blender')])))
    }
  }
  return found
}

/** Applications ou programmes qui pourraient être Blender, dans l'ordre de recherche. */
export async function listCandidates(sys: SearchSystem): Promise<string[]> {
  if (sys.platform === 'darwin') return macCandidates(sys)
  if (sys.platform === 'win32') return windowsCandidates(sys)
  return linuxCandidates(sys)
}

/** Blender du Microsoft Store (Windows) ou Flatpak (Linux), que NeoScenar ne sait pas lancer. */
export async function findPackagedBlender(sys: SearchSystem): Promise<PackagedBlender | null> {
  const p = pathModule(sys.platform)
  if (sys.platform === 'win32') {
    const local = sys.env.LOCALAPPDATA
    if (!local) return null
    const packages = await sys.list(p.join(local, 'Packages')).catch(() => [] as string[])
    return packages.some((name) => /^BlenderFoundation\.Blender/i.test(name)) ? 'store' : null
  }
  if (sys.platform === 'linux') {
    const flatpak = [
      '/var/lib/flatpak/app/org.blender.Blender',
      p.join(sys.homeDir, '.local', 'share', 'flatpak', 'app', 'org.blender.Blender')
    ]
    return (await existing(sys, flatpak)).length > 0 ? 'flatpak' : null
  }
  return null
}

export const runVersion: VersionRunner = (executable) =>
  new Promise((resolve, reject) => {
    execFile(executable, ['--version'], { timeout: VERSION_TIMEOUT_MS }, (error, stdout) => {
      if (error) reject(error)
      else resolve(stdout)
    })
  })

/** Vérifie qu'une application est bien Blender, et donne sa version. */
export async function checkBlender(
  appPath: string,
  platform: NodeJS.Platform,
  run: VersionRunner = runVersion
): Promise<BlenderCheck> {
  let output: string
  try {
    output = await run(blenderExecutable(appPath, platform))
  } catch {
    return { ok: false, reason: 'not-blender' }
  }
  const version = parseBlenderVersion(output)
  return version ? { ok: true, version } : { ok: false, reason: 'not-blender' }
}

/**
 * Recherche automatique. Un seul Blender 4.5 : trouvé ; plusieurs : l'élève choisit. Sans 4.5,
 * la version la plus récente trouvée (non testée). Rien : peut-être une version Store ou Flatpak.
 */
export async function detectBlender(
  sys: SearchSystem,
  run: VersionRunner = runVersion
): Promise<BlenderDetection> {
  const seen = new Set<string>()
  const blenders: { path: string; version: BlenderVersion }[] = []
  for (const candidate of await listCandidates(sys)) {
    // « /usr/bin/blender » peut n'être qu'un lien vers « /snap/bin/blender » : compté une fois.
    const real = await sys.realpath(candidate).catch(() => candidate)
    if (seen.has(real)) continue
    seen.add(real)
    const check = await checkBlender(candidate, sys.platform, run)
    if (check.ok) blenders.push({ path: candidate, version: check.version })
  }
  const supported = blenders.filter((blender) => isSupportedVersion(blender.version))
  if (supported.length === 1) return { status: 'found', ...supported[0] }
  if (supported.length > 1) return { status: 'several', paths: supported.map((b) => b.path) }
  if (blenders.length > 0) {
    // sort est stable : à version égale, le premier trouvé dans l'ordre de recherche.
    const newest = [...blenders].sort((a, b) => compareVersions(b.version, a.version))[0]
    return { status: 'found', ...newest }
  }
  return { status: 'none', packaged: await findPackagedBlender(sys) }
}
