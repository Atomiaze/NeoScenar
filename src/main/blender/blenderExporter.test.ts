import { EventEmitter } from 'node:events'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createProject } from '../project/createProject'
import type { LoadedProject } from '../project/readProject'
import {
  fixedSources,
  loadTestTemplate,
  makeTempDir,
  removeDir,
  request
} from '../project/testHelpers'
import type { Spawner } from './blenderLaunch'
import { blenderExecutable, type VersionRunner } from './blenderLocator'
import { BlenderExporter } from './blenderExporter'

let location: string
let loaded: LoadedProject
let blenderPath: string | null
let launches: string[][]
let installed: Record<string, string>

const run: VersionRunner = async (executable) => {
  const output = installed[executable]
  if (output === undefined) throw new Error('ENOENT')
  return output
}

const spawner = ((executable: string, args: string[]) => {
  launches.push([executable, ...args])
  const child = Object.assign(new EventEmitter(), { unref: () => undefined })
  setTimeout(() => child.emit('spawn'), 0)
  return child
}) as unknown as Spawner

function exporter(): BlenderExporter {
  return new BlenderExporter({
    current: () => loaded,
    flush: async () => undefined,
    getBlenderPath: async () => blenderPath,
    setBlenderPath: async (path) => {
      blenderPath = path
    },
    appVersion: '0.1.0',
    // Dossier personnel inexistant : seul /Applications est réellement lu.
    env: { platform: 'darwin', homeDir: join(location, 'maison'), run, spawner },
    now: () => new Date('2026-11-18T10:00:00.000Z')
  })
}

beforeEach(async () => {
  location = await makeTempDir()
  loaded = await createProject(
    request(location, { folders: ['06_Blender'] }),
    await loadTestTemplate(),
    fixedSources()
  )
  blenderPath = null
  launches = []
  installed = {}
})

afterEach(() => removeDir(location))

const blend = (): string =>
  join(loaded.rootDir, '06_Blender', 'Storyboard', 'Mon_Film_d_ete_storyboard.blend')

describe('export vers Blender', () => {
  it('propose le .blend par défaut', async () => {
    const info = await exporter().info()
    expect(info.target?.relativePath).toBe('06_Blender/Storyboard/Mon_Film_d_ete_storyboard.blend')
    expect(info.blenderPath).toBeNull()
  })

  it('écrit le paquet et note le dernier export dans projet.json', async () => {
    const status = await exporter().export({ blendPath: blend(), openInBlender: false })
    expect(status).toEqual({ state: 'not-requested' })
    const json = JSON.parse(
      await readFile(join(loaded.dataDir, 'blender', 'export', 'decoupage.json'), 'utf8')
    )
    expect(json.scenes[0].shots[0].fullLabel).toBe('S_0010_P_0010')
    const project = JSON.parse(await readFile(join(loaded.dataDir, 'projet.json'), 'utf8'))
    expect(project.lastBlenderExport).toEqual({
      exportedAt: '2026-11-18T10:00:00.000Z',
      blendPath: '06_Blender/Storyboard/Mon_Film_d_ete_storyboard.blend'
    })
  })

  it('refuse un .blend apparu entre-temps, sans rien écrire', async () => {
    await mkdir(join(loaded.rootDir, '06_Blender', 'Storyboard'), { recursive: true })
    await writeFile(blend(), 'travail')
    await expect(exporter().export({ blendPath: blend(), openInBlender: false })).rejects.toThrow(
      'Ce fichier existe déjà'
    )
    expect(await readFile(blend(), 'utf8')).toBe('travail')
  })

  it('Blender des préférences : lancé avec le chemin absolu du paquet', async () => {
    blenderPath = '/Apps/Blender.app'
    installed[blenderExecutable(blenderPath, 'darwin')] = 'Blender 4.5.14 LTS'
    const status = await exporter().export({ blendPath: blend(), openInBlender: true })
    expect(status).toEqual({ state: 'launched' })
    expect(launches).toHaveLength(1)
    expect(launches[0][0]).toBe('/Apps/Blender.app/Contents/MacOS/Blender')
    expect(launches[0][1]).toBe('--python-expr')
  })

  it('Blender introuvable : l’élève le choisit, même dans une autre version (avertissement)', async () => {
    const status = await exporter().export({ blendPath: blend(), openInBlender: true })
    expect(status).toEqual({ state: 'need-choice', reason: 'none' })

    await expect(exporter().chooseBlender('/Apps/Krita.app')).rejects.toThrow('n’est pas Blender')
    installed[blenderExecutable('/Apps/Old.app', 'darwin')] = 'Blender 4.2.1 LTS'
    await exporter().chooseBlender('/Apps/Old.app')
    expect(blenderPath).toBe('/Apps/Old.app')
    expect(await exporter().launchAgain()).toEqual({
      state: 'launched',
      untestedVersion: '4.2.1'
    })
    installed[blenderExecutable('/Apps/B45.app', 'darwin')] = 'Blender 4.5.0'
    await exporter().chooseBlender('/Apps/B45.app')
    expect(blenderPath).toBe('/Apps/B45.app')
    expect(await exporter().launchAgain()).toEqual({ state: 'launched' })
  })

  it('Blender trouvé seul dans une version non testée : lancé, mais pas mémorisé', async () => {
    installed['/Applications/Blender.app/Contents/MacOS/Blender'] = 'Blender 5.0.1'
    const search = {
      list: async (folder: string) => (folder === '/Applications' ? ['Blender.app'] : []),
      realpath: async (path: string) => path
    }
    const status = await new BlenderExporter({
      current: () => loaded,
      flush: async () => undefined,
      getBlenderPath: async () => blenderPath,
      setBlenderPath: async (path) => {
        blenderPath = path
      },
      appVersion: '0.1.0',
      env: { platform: 'darwin', homeDir: '/Users/eleve', run, spawner, search }
    }).export({ blendPath: blend(), openInBlender: true })
    expect(status).toEqual({ state: 'launched', untestedVersion: '5.0.1' })
    expect(blenderPath).toBeNull()
  })
})
