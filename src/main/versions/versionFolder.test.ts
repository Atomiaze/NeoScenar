import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PROJECT_FILES } from '../../shared/projectTypes'
import { createProject } from '../project/createProject'
import type { LoadedProject } from '../project/readProject'
import { readProject } from '../project/readProject'
import {
  fixedSources,
  loadTestTemplate,
  makeTempDir,
  removeDir,
  request
} from '../project/testHelpers'
import {
  deleteVersion,
  duplicateFromVersion,
  listVersions,
  readVersionFiles,
  saveVersion,
  writeVersionFiles
} from './versionFolder'

let location: string
let project: LoadedProject

beforeEach(async () => {
  location = await makeTempDir()
  project = await createProject(
    request(location, { title: 'Film' }),
    await loadTestTemplate(),
    fixedSources()
  )
})
afterEach(() => removeDir(location))

const scenarioPath = (): string => join(project.dataDir, PROJECT_FILES.scenario)
const version = { name: 'Version 1', note: 'Premier jet', pages: 3, seconds: 170 }

describe('enregistrer et lister', () => {
  it('copie les trois fichiers et écrit version.json', async () => {
    await writeFile(scenarioPath(), 'INT. CUISINE - JOUR #10#\n\nMarie entre.\n')
    const entry = await saveVersion(project.dataDir, version, new Date(2026, 10, 19, 14, 32, 5))
    expect(entry.folder).toBe('20261119-143205_Version_1')
    const dir = join(project.dataDir, 'versions', entry.folder)
    expect((await readdir(dir)).sort()).toEqual([
      'decoupage.json',
      'projet.json',
      'scenario.fountain',
      'version.json'
    ])
    expect(await readFile(join(dir, 'scenario.fountain'), 'utf8')).toContain('Marie entre.')
    const listed = await listVersions(project.dataDir)
    expect(listed).toHaveLength(1)
    expect(listed[0]).toMatchObject({ broken: false, name: 'Version 1', pages: 3, seconds: 170 })
  })

  it('une version abîmée est signalée sans gêner les autres', async () => {
    await saveVersion(project.dataDir, version, new Date(2026, 10, 19, 10, 0, 0))
    const bad = join(project.dataDir, 'versions', '20261118-090000_Vieille')
    await mkdir(bad)
    await writeFile(join(bad, 'version.json'), '{ pas du json')
    const listed = await listVersions(project.dataDir)
    expect(listed.map((item) => [item.folder, item.broken])).toEqual([
      ['20261119-100000_Version_1', false],
      ['20261118-090000_Vieille', true]
    ])
    await expect(readVersionFiles(project.dataDir, '20261118-090000_Vieille')).rejects.toThrow(
      /abîmée/
    )
  })

  it('aucun dossier temporaire ne reste', async () => {
    await saveVersion(project.dataDir, version)
    const names = await readdir(join(project.dataDir, 'versions'))
    expect(names.filter((name) => name.startsWith('.'))).toEqual([])
  })

  it('refuse un dossier qui sort de versions/', async () => {
    await expect(readVersionFiles(project.dataDir, '../sauvegardes')).rejects.toThrow(/introuvable/)
  })
})

describe('restaurer', () => {
  it('remet le texte et les cartes, garde l’identifiant actuel', async () => {
    await writeFile(scenarioPath(), 'Texte de la version\n')
    const entry = await saveVersion(project.dataDir, version)
    await writeFile(scenarioPath(), 'Texte modifié ensuite\n')
    const files = await readVersionFiles(project.dataDir, entry.folder)
    const otherId = { ...files, projectRaw: { ...files.projectRaw, id: 'ancien-id' } }
    await writeVersionFiles(project.dataDir, otherId, { id: project.project.id })
    expect(await readFile(scenarioPath(), 'utf8')).toBe('Texte de la version\n')
    expect((await readProject(project.projectFilePath)).project.id).toBe(project.project.id)
  })
})

describe('supprimer', () => {
  it('déplace la version dans sauvegardes/versions_supprimees/', async () => {
    const entry = await saveVersion(project.dataDir, version)
    const moved = await deleteVersion(project.dataDir, entry.folder)
    expect(moved).toBe(`sauvegardes/versions_supprimees/${entry.folder}`)
    expect(await listVersions(project.dataDir)).toEqual([])
    expect(await readdir(join(project.dataDir, moved))).toContain('version.json')
  })
})

describe('dupliquer en nouveau projet', () => {
  it('copie le film sans sauvegardes/, avec les fichiers de la version', async () => {
    await writeFile(scenarioPath(), 'Texte de la version\n')
    const entry = await saveVersion(project.dataDir, version)
    await writeFile(scenarioPath(), 'Texte actuel\n')
    await mkdir(join(project.dataDir, 'sauvegardes', 'avant_liaison_x'), { recursive: true })
    const files = await readVersionFiles(project.dataDir, entry.folder)
    const target = join(location, 'Film_Version_1')
    const copyFile = await duplicateFromVersion(project, files, target)
    const copy = await readProject(copyFile)
    expect(await readFile(join(copy.dataDir, PROJECT_FILES.scenario), 'utf8')).toBe(
      'Texte de la version\n'
    )
    expect(await readdir(join(copy.dataDir))).not.toContain('sauvegardes')
    // L'original est intact.
    expect(await readFile(scenarioPath(), 'utf8')).toBe('Texte actuel\n')
  })

  it('refuse un dossier existant ou placé dans le projet', async () => {
    const entry = await saveVersion(project.dataDir, version)
    const files = await readVersionFiles(project.dataDir, entry.folder)
    await expect(duplicateFromVersion(project, files, join(project.rootDir, 'x'))).rejects.toThrow(
      /dossier du projet actuel/
    )
    await mkdir(join(location, 'Pris'))
    await expect(duplicateFromVersion(project, files, join(location, 'Pris'))).rejects.toThrow(
      /déjà ce nom/
    )
  })
})
