import { cp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PROJECT_FILES } from '../../shared/projectTypes'
import { createProject } from './createProject'
import { giveNewId, isCopiedProject, otherLocations, sameProjectFile } from './projectCopy'
import { readProject } from './readProject'
import { fixedSources, loadTestTemplate, makeTempDir, removeDir, request } from './testHelpers'

let location: string

beforeEach(async () => {
  location = await makeTempDir()
})
afterEach(() => removeDir(location))

const idAt = async (path: string) => {
  try {
    return (await readProject(path)).project.id
  } catch {
    return null
  }
}

/** Projet original et sa copie (dossier dupliqué). */
async function originalAndCopy() {
  const template = await loadTestTemplate()
  const original = await createProject(
    request(location, { title: 'Film' }),
    template,
    fixedSources()
  )
  const copyRoot = join(location, 'Film_copie')
  await cp(original.rootDir, copyRoot, { recursive: true })
  const copyFile = join(copyRoot, original.projectFilePath.slice(original.rootDir.length + 1))
  return { original, copy: await readProject(copyFile) }
}

describe('sameProjectFile', () => {
  it('compare les chemins résolus', () => {
    expect(sameProjectFile('/a/b/../b/F.neoscenar', '/a/b/F.neoscenar')).toBe(true)
    expect(sameProjectFile('/a/F.neoscenar', '/a/G.neoscenar')).toBe(false)
  })
})

describe('otherLocations', () => {
  it('ignore le même emplacement, les autres identifiants et les entrées sans identifiant', () => {
    const known = [
      { id: 'x', filePath: '/a/F.neoscenar' },
      { id: 'x', filePath: '/b/F.neoscenar' },
      { id: 'y', filePath: '/c/F.neoscenar' },
      { filePath: '/d/F.neoscenar' }
    ]
    expect(otherLocations('x', '/a/F.neoscenar', known)).toEqual(['/b/F.neoscenar'])
  })
})

describe('isCopiedProject', () => {
  it('reconnaît une copie dont l’original existe toujours', async () => {
    const { original, copy } = await originalAndCopy()
    const known = [{ id: original.project.id, filePath: original.projectFilePath }]
    expect(copy.project.id).toBe(original.project.id)
    expect(await isCopiedProject(copy, { known, idAt })).toBe(true)
    // L'original rouvert à sa place n'est pas une copie.
    expect(await isCopiedProject(original, { known, idAt })).toBe(false)
  })

  it('un projet déplacé (ancien emplacement disparu) garde son identifiant', async () => {
    const { original, copy } = await originalAndCopy()
    await rm(original.rootDir, { recursive: true })
    const known = [{ id: original.project.id, filePath: original.projectFilePath }]
    expect(await isCopiedProject(copy, { known, idAt })).toBe(false)
  })

  it('l’original qui a changé d’identifiant n’est plus en conflit', async () => {
    const { original, copy } = await originalAndCopy()
    await giveNewId(original)
    const known = [{ id: copy.project.id, filePath: original.projectFilePath }]
    expect(await isCopiedProject(copy, { known, idAt })).toBe(false)
  })
})

describe('giveNewId', () => {
  it('change seulement l’identifiant de projet.json et garde les clés inconnues', async () => {
    const { copy } = await originalAndCopy()
    const path = join(copy.dataDir, PROJECT_FILES.project)
    const before = JSON.parse(await readFile(path, 'utf8'))
    const { writeFile } = await import('node:fs/promises')
    await writeFile(path, JSON.stringify({ ...before, ajoutObsidian: 'gardé' }))
    const renewed = await giveNewId(copy)
    const after = JSON.parse(await readFile(path, 'utf8'))
    expect(renewed.project.id).not.toBe(before.id)
    expect(after).toEqual({ ...before, ajoutObsidian: 'gardé', id: renewed.project.id })
    expect((await readProject(copy.projectFilePath)).project.id).toBe(renewed.project.id)
  })
})
