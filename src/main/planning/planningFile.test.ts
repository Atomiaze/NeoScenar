import { randomUUID } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addTask } from '../../shared/planning/planningEdit'
import { ProjectError } from '../project/errors'
import { makeTempDir, removeDir } from '../project/testHelpers'
import { readPlanningFile, writePlanningFile } from './planningFile'

let dir: string
beforeEach(async () => {
  dir = await makeTempDir()
})
afterEach(() => removeDir(dir))

describe('planning.json sur le disque', () => {
  it('un fichier absent donne les cinq phases, sans rien écrire', async () => {
    const { planning } = await readPlanningFile(dir)
    expect(planning.phases).toHaveLength(5)
    expect(await readdir(dir)).toEqual([])
  })

  it('écrit puis relit sans perte, et garde ce qu’un autre logiciel a ajouté', async () => {
    const { planning } = await readPlanningFile(dir)
    const result = addTask(
      planning,
      planning.phases[0].id,
      { titre: 'Scénario', echeance: '2027-01-15', validee: true },
      { newId: () => randomUUID() }
    )
    if (!result.ok) throw new Error()
    await writePlanningFile(dir, result.planning)
    // Un autre logiciel ajoute une clé entre-temps.
    const written = JSON.parse(await readFile(join(dir, 'planning.json'), 'utf8'))
    await writeFile(join(dir, 'planning.json'), JSON.stringify({ ...written, ajout: 1 }))
    await writePlanningFile(dir, result.planning)
    const after = JSON.parse(await readFile(join(dir, 'planning.json'), 'utf8'))
    expect(after.ajout).toBe(1)
    expect((await readPlanningFile(dir)).planning).toEqual(result.planning)
    expect(await readdir(dir)).toEqual(['planning.json'])
  })

  it('refuse un fichier abîmé ou plus récent, sans le modifier', async () => {
    await writeFile(join(dir, 'planning.json'), '{ pas du json')
    await expect(readPlanningFile(dir)).rejects.toBeInstanceOf(ProjectError)
    await writeFile(join(dir, 'planning.json'), JSON.stringify({ version: 99 }))
    await expect(readPlanningFile(dir)).rejects.toThrow(/plus récente/)
    expect(await readFile(join(dir, 'planning.json'), 'utf8')).toBe('{"version":99}')
  })
})
