import { readFile, utimes, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Planning } from '../../shared/planning/types'
import { makeTempDir, removeDir } from '../project/testHelpers'
import { PlanningSession } from './planningSession'

let dir: string
beforeEach(async () => {
  dir = await makeTempDir()
})
afterEach(() => removeDir(dir))

function session(): PlanningSession {
  return new PlanningSession({ dataDir: dir, onStatus: () => {}, delayMs: 5 })
}

const readDisk = async (): Promise<Planning> =>
  JSON.parse(await readFile(join(dir, 'planning.json'), 'utf8')) as Planning

describe('session du planning', () => {
  it('crée le fichier à la première lecture, avec les mêmes phases ensuite', async () => {
    const s = session()
    const first = await s.read()
    expect(first.planning.phases).toHaveLength(5)
    expect(first.changed).toBe(false)
    expect((await readDisk()).phases.map((p) => p.id)).toEqual(
      first.planning.phases.map((p) => p.id)
    )
    const second = await s.read()
    expect(second.planning.phases.map((p) => p.id)).toEqual(first.planning.phases.map((p) => p.id))
    expect(second.changed).toBe(false)
  })

  it('enregistre sans se croire modifié ailleurs', async () => {
    const s = session()
    const { planning } = await s.read()
    s.update({
      ...planning,
      taches: [
        {
          id: 'T1',
          phase: planning.phases[0].id,
          titre: 'Scénario',
          debut: null,
          echeance: '2026-12-01',
          faite: true,
          personnes: ['Léa'],
          validee: true,
          note: ''
        }
      ]
    })
    expect(await s.flush()).toBe(true)
    const again = await s.read()
    expect(again.changed).toBe(false)
    expect(again.planning.taches[0].titre).toBe('Scénario')
  })

  it('signale un fichier modifié à la main', async () => {
    const s = session()
    const { planning } = await s.read()
    const edited = {
      ...planning,
      taches: [{ ...planning, id: 'T9', phase: planning.phases[0].id, titre: 'Ajoutée à la main' }]
    }
    await writeFile(
      join(dir, 'planning.json'),
      JSON.stringify({ ...planning, taches: edited.taches })
    )
    const future = new Date(Date.now() + 5000)
    await utimes(join(dir, 'planning.json'), future, future)
    const reread = await s.read()
    expect(reread.changed).toBe(true)
    expect(reread.planning.taches[0].titre).toBe('Ajoutée à la main')
    expect((await s.read()).changed).toBe(false)
  })
})
