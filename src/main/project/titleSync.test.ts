import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PROJECT_FILES } from '../../shared/projectTypes'
import { createProject } from './createProject'
import { readProject } from './readProject'
import { fixedSources, loadTestTemplate, makeTempDir, removeDir, request } from './testHelpers'
import { scenarioTitle, syncTitleFromScenario } from './titleSync'

let location: string

beforeEach(async () => {
  location = await makeTempDir()
})
afterEach(() => removeDir(location))

async function newProject() {
  const template = await loadTestTemplate()
  return createProject(request(location, { title: 'Ancien titre' }), template, fixedSources())
}

async function projectTitle(dataDir: string): Promise<string> {
  return JSON.parse(await readFile(join(dataDir, PROJECT_FILES.project), 'utf8')).title
}

describe('titre du projet et page de titre', () => {
  it('lit le titre du scénario sans les marqueurs de mise en forme', () => {
    expect(scenarioTitle('Title: _**LE DERNIER BUS**_\nAuthor: X\n\nINT. A - JOUR\n')).toBe(
      'LE DERNIER BUS'
    )
    expect(scenarioTitle('INT. A - JOUR\n')).toBe('')
  })

  it('à l’ouverture, le titre du Fountain fait foi et projet.json est mis à jour', async () => {
    const created = await newProject()
    await writeFile(
      join(created.dataDir, PROJECT_FILES.scenario),
      'Title: **Nouveau titre**\n\nAction.\n'
    )
    const synced = await syncTitleFromScenario(await readProject(created.projectFilePath))
    expect(synced.project.title).toBe('Nouveau titre')
    expect(await projectTitle(created.dataDir)).toBe('Nouveau titre')
    // Le dossier du film garde son nom.
    expect(synced.rootDir).toBe(created.rootDir)
  })

  it('sans titre dans le Fountain, projet.json ne change pas', async () => {
    const created = await newProject()
    await writeFile(join(created.dataDir, PROJECT_FILES.scenario), 'INT. A - JOUR\n')
    const synced = await syncTitleFromScenario(await readProject(created.projectFilePath))
    expect(synced.project.title).toBe('Ancien titre')
    expect(await projectTitle(created.dataDir)).toBe('Ancien titre')
  })
})
