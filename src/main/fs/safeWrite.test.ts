import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { writeFileSafely, type SafeWriteOperations } from './safeWrite'

let folder: string

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'neoscenar-test-'))
})

afterEach(async () => {
  await rm(folder, { recursive: true, force: true })
})

describe('writeFileSafely', () => {
  it('écrit le fichier complet et ne laisse aucun fichier temporaire', async () => {
    const target = join(folder, 'projet.json')
    const content = 'é'.repeat(100_000)
    await writeFileSafely(target, content)
    expect(await readFile(target, 'utf8')).toBe(content)
    expect(await readdir(folder)).toEqual(['projet.json'])
  })

  it('remplace l’ancien contenu', async () => {
    const target = join(folder, 'projet.json')
    await writeFile(target, 'ancien')
    await writeFileSafely(target, 'nouveau')
    expect(await readFile(target, 'utf8')).toBe('nouveau')
  })

  it('laisse l’ancien fichier intact si l’écriture échoue', async () => {
    const target = join(folder, 'projet.json')
    await writeFile(target, 'ancien')
    const failing: SafeWriteOperations = {
      async writeAndFlush(path, content) {
        // Simule une coupure : le fichier temporaire n'est écrit qu'à moitié.
        await writeFile(path, content.slice(0, 3))
        throw new Error('disque plein')
      },
      rename: () => Promise.reject(new Error('ne doit pas être appelé')),
      remove: (path) => rm(path, { force: true })
    }
    await expect(writeFileSafely(target, 'nouveau contenu', failing)).rejects.toThrow(
      'disque plein'
    )
    expect(await readFile(target, 'utf8')).toBe('ancien')
    expect(await readdir(folder)).toEqual(['projet.json'])
  })
})
