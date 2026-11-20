import { describe, expect, it } from 'vitest'
import {
  blenderExecutable,
  checkBlender,
  detectBlender,
  listCandidates,
  parseBlenderVersion,
  type SearchSystem,
  type VersionRunner
} from './blenderLocator'

/** Faux « --version » : chaque exécutable affiche le texte indiqué, ou échoue. */
function fakeRunner(outputs: Record<string, string>): VersionRunner {
  return async (executable) => {
    const output = outputs[executable]
    if (output === undefined) throw new Error('ENOENT')
    return output
  }
}

/** Faux disque : dossiers (avec leur contenu), fichiers, liens symboliques. */
function fakeSystem(
  platform: NodeJS.Platform,
  homeDir: string,
  disk: {
    folders?: Record<string, string[]>
    files?: string[]
    links?: Record<string, string>
    env?: Record<string, string>
  }
): SearchSystem {
  const folders = disk.folders ?? {}
  const files = new Set(disk.files ?? [])
  return {
    platform,
    homeDir,
    env: disk.env ?? {},
    list: async (folder) => {
      if (!folders[folder]) throw new Error('ENOENT')
      return folders[folder]
    },
    exists: async (path) => files.has(path) || path in folders,
    realpath: async (path) => disk.links?.[path] ?? path
  }
}

const exe = (app: string): string => blenderExecutable(app, 'darwin')

describe('lecture de « Blender --version »', () => {
  it('donne la version, 4.5 ou une autre', async () => {
    const output = 'Blender 4.5.14 LTS\n\tbuild date: 2026-10-01\n\tbuild hash: abc\n'
    expect(parseBlenderVersion(output)).toEqual({ major: 4, minor: 5, patch: 14, text: '4.5.14' })
    expect(parseBlenderVersion('Blender 3.6')).toEqual({
      major: 3,
      minor: 6,
      patch: 0,
      text: '3.6'
    })
    const run = fakeRunner({ [exe('/A/Blender.app')]: 'Blender 5.0.1' })
    expect(await checkBlender('/A/Blender.app', 'darwin', run)).toEqual({
      ok: true,
      version: expect.objectContaining({ text: '5.0.1' })
    })
  })

  it('un programme qui n’est pas Blender, ou qui ne démarre pas, est refusé', async () => {
    expect(parseBlenderVersion('Krita 5.2')).toBeNull()
    const run = fakeRunner({ [exe('/A/Krita.app')]: 'Krita 5.2' })
    expect(await checkBlender('/A/Krita.app', 'darwin', run)).toEqual({
      ok: false,
      reason: 'not-blender'
    })
    expect(await checkBlender('/A/Absent.app', 'darwin', run)).toEqual({
      ok: false,
      reason: 'not-blender'
    })
  })
})

describe('recherche sur Mac', () => {
  const HOME = '/Users/eleve'
  const mac = fakeSystem('darwin', HOME, {
    folders: {
      '/Applications': ['Blender.app', 'Safari.app', 'blender 4.2.app', 'Blender.txt'],
      '/Users/eleve/Applications': ['Blender 4.5.app']
    }
  })

  it('applications « Blender… » de /Applications et ~/Applications', async () => {
    expect(await listCandidates(mac)).toEqual([
      '/Applications/Blender.app',
      '/Applications/blender 4.2.app',
      '/Users/eleve/Applications/Blender 4.5.app'
    ])
  })

  it('un seul Blender 4.5 : trouvé, même s’il y en a de plus récents', async () => {
    const run = fakeRunner({
      [exe('/Applications/Blender.app')]: 'Blender 5.0.1',
      [exe('/Applications/blender 4.2.app')]: 'Blender 4.2.0 LTS',
      [exe('/Users/eleve/Applications/Blender 4.5.app')]: 'Blender 4.5.14 LTS'
    })
    expect(await detectBlender(mac, run)).toMatchObject({
      status: 'found',
      path: '/Users/eleve/Applications/Blender 4.5.app',
      version: { text: '4.5.14' }
    })
  })

  it('plusieurs Blender 4.5 : l’élève choisit ; aucun Blender : rien', async () => {
    const several = fakeRunner({
      [exe('/Applications/Blender.app')]: 'Blender 4.5.14 LTS',
      [exe('/Users/eleve/Applications/Blender 4.5.app')]: 'Blender 4.5.2 LTS'
    })
    expect((await detectBlender(mac, several)).status).toBe('several')
    expect(await detectBlender(mac, fakeRunner({}))).toEqual({ status: 'none', packaged: null })
  })

  it('sans 4.5 : la version la plus récente', async () => {
    const run = fakeRunner({
      [exe('/Applications/Blender.app')]: 'Blender 4.2.9 LTS',
      [exe('/Applications/blender 4.2.app')]: 'Blender 5.0.1'
    })
    expect(await detectBlender(mac, run)).toMatchObject({
      status: 'found',
      path: '/Applications/blender 4.2.app',
      version: { text: '5.0.1' }
    })
  })
})

describe('recherche sous Windows', () => {
  const env = {
    ProgramFiles: 'C:\\Program Files',
    'ProgramFiles(x86)': 'C:\\Program Files (x86)',
    LOCALAPPDATA: 'C:\\Users\\eleve\\AppData\\Local'
  }

  it('Program Files, LOCALAPPDATA, puis Steam', async () => {
    const windows = fakeSystem('win32', 'C:\\Users\\eleve', {
      env,
      folders: {
        'C:\\Program Files\\Blender Foundation': ['Blender 4.2', 'Blender 4.5', 'Lisez-moi'],
        'C:\\Users\\eleve\\AppData\\Local\\Programs\\Blender Foundation': ['Blender 5.0']
      },
      files: [
        'C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe',
        'C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe',
        'C:\\Users\\eleve\\AppData\\Local\\Programs\\Blender Foundation\\Blender 5.0\\blender.exe',
        'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Blender\\blender.exe'
      ]
    })
    expect(await listCandidates(windows)).toEqual([
      'C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe',
      'C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe',
      'C:\\Users\\eleve\\AppData\\Local\\Programs\\Blender Foundation\\Blender 5.0\\blender.exe',
      'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Blender\\blender.exe'
    ])
    const run = fakeRunner({
      'C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe': 'Blender 4.5.3 LTS',
      'C:\\Users\\eleve\\AppData\\Local\\Programs\\Blender Foundation\\Blender 5.0\\blender.exe':
        'Blender 5.0.0'
    })
    expect(await detectBlender(windows, run)).toMatchObject({
      status: 'found',
      path: 'C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe'
    })
    expect(blenderExecutable('C:\\Blender\\blender.exe', 'win32')).toBe('C:\\Blender\\blender.exe')
  })

  it('seulement la version du Microsoft Store : signalée', async () => {
    const store = fakeSystem('win32', 'C:\\Users\\eleve', {
      env,
      folders: {
        'C:\\Users\\eleve\\AppData\\Local\\Packages': [
          'Microsoft.WindowsCalculator_8wekyb3d8bbwe',
          'BlenderFoundation.Blender_ppwjx1n5r4v9t'
        ]
      }
    })
    expect(await detectBlender(store, fakeRunner({}))).toEqual({
      status: 'none',
      packaged: 'store'
    })
  })
})

describe('recherche sous Linux', () => {
  const HOME = '/home/eleve'

  it('PATH, Snap, puis dossiers « blender-… » de ~, ~/Applications et /opt', async () => {
    const linux = fakeSystem('linux', HOME, {
      env: { PATH: '/usr/local/bin:/usr/bin:' },
      folders: {
        '/home/eleve': ['blender-4.5.3-linux-x64', 'Documents'],
        '/opt': ['blender-5.0.0-linux-x64']
      },
      files: [
        '/usr/bin/blender',
        '/snap/bin/blender',
        '/home/eleve/blender-4.5.3-linux-x64/blender',
        '/opt/blender-5.0.0-linux-x64/blender'
      ],
      // /usr/bin/blender n'est qu'un lien vers le Blender de Snap.
      links: { '/usr/bin/blender': '/snap/bin/blender' }
    })
    expect(await listCandidates(linux)).toEqual([
      '/usr/bin/blender',
      '/snap/bin/blender',
      '/home/eleve/blender-4.5.3-linux-x64/blender',
      '/opt/blender-5.0.0-linux-x64/blender'
    ])
    // Le même Blender 4.5 par deux chemins : compté une fois, donc trouvé (pas « plusieurs »).
    const run = fakeRunner({
      '/usr/bin/blender': 'Blender 4.5.3 LTS',
      '/snap/bin/blender': 'Blender 4.5.3 LTS',
      '/opt/blender-5.0.0-linux-x64/blender': 'Blender 5.0.0'
    })
    expect(await detectBlender(linux, run)).toMatchObject({
      status: 'found',
      path: '/usr/bin/blender'
    })
  })

  it('seulement Flatpak : signalé', async () => {
    const flatpak = fakeSystem('linux', HOME, {
      folders: { '/home/eleve/.local/share/flatpak/app/org.blender.Blender': [] }
    })
    expect(await detectBlender(flatpak, fakeRunner({}))).toEqual({
      status: 'none',
      packaged: 'flatpak'
    })
  })
})
