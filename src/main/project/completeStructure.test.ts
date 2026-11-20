import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { FolderTemplate } from '../../shared/folderTemplate'
import { completeStructure, getStructureStatus } from './completeStructure'
import { createProject } from './createProject'
import type { LoadedProject } from './readProject'
import {
  fixedSources,
  listTree,
  loadTestTemplate,
  makeTempDir,
  readAllFiles,
  removeDir,
  request
} from './testHelpers'

let location: string
let template: FolderTemplate
let loaded: LoadedProject
const later = (): Date => new Date('2026-11-20T10:00:00.000Z')

beforeEach(async () => {
  location = await makeTempDir()
  template = await loadTestTemplate()
  loaded = await createProject(
    request(location, { folders: ['04_Son', '10_Montage'] }),
    template,
    fixedSources()
  )
})

afterEach(() => removeDir(location))

describe('compléter la structure', () => {
  it('indique les dossiers déjà présents', async () => {
    const status = await getStructureStatus(loaded.rootDir, template)
    expect(status.filter((folder) => folder.exists).map((folder) => folder.name)).toEqual([
      '04_Son',
      '10_Montage'
    ])
  })

  it('ajoute un dossier oublié sans toucher aux autres', async () => {
    // L'élève a déjà rangé un fichier et modifié un LISEZMOI.
    await writeFile(join(loaded.rootDir, '04_Son', 'Musique', 'theme.wav'), 'son')
    await writeFile(join(loaded.rootDir, '04_Son', 'LISEZMOI.txt'), 'mes notes')
    const before = await readAllFiles(loaded.rootDir)

    const updated = await completeStructure(
      loaded.projectFilePath,
      ['04_Son', '06_Blender'],
      true,
      template,
      later
    )

    const after = await readAllFiles(loaded.rootDir)
    for (const [path, content] of before) {
      if (path !== 'neoscenar/projet.json') expect(after.get(path), path).toBe(content)
    }
    const tree = await listTree(loaded.rootDir)
    expect(tree).toContain('06_Blender/Assets/Decors/')
    expect(tree).toContain('06_Blender/LISEZMOI.txt')
    expect(updated.project.filmFolders).toEqual(['04_Son', '06_Blender', '10_Montage'])
    expect(updated.project.modifiedAt).toBe('2026-11-20T10:00:00.000Z')
    expect(updated.project.createdAt).toBe('2026-11-17T15:40:12.000Z')
  })

  it('conserve les champs inconnus de projet.json', async () => {
    const path = join(loaded.dataDir, 'projet.json')
    const data = JSON.parse(await readFile(path, 'utf8'))
    await writeFile(path, JSON.stringify({ ...data, noteEnseignant: 'à revoir' }))
    await completeStructure(loaded.projectFilePath, ['12_Archives'], false, template, later)
    const saved = JSON.parse(await readFile(path, 'utf8'))
    expect(saved.noteEnseignant).toBe('à revoir')
    expect(saved.filmFolders).toEqual(['04_Son', '10_Montage', '12_Archives'])
  })

  it('ne modifie rien si projet.json est illisible', async () => {
    const path = join(loaded.dataDir, 'projet.json')
    await writeFile(path, '{ abîmé')
    await expect(
      completeStructure(loaded.projectFilePath, ['12_Archives'], true, template, later)
    ).rejects.toThrow('projet.json est illisible')
    expect(await readFile(path, 'utf8')).toBe('{ abîmé')
    expect(await listTree(loaded.rootDir)).not.toContain('12_Archives/')
  })
})
