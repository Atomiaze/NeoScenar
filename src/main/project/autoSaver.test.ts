import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AutoSaver, type AutoSaveStatus } from './autoSaver'
import type { Decoupage } from '../../shared/projectTypes'
import { makeDecoupage } from '../../shared/decoupage/testFixtures'

const version = (n: number): Decoupage => ({ ...makeDecoupage({ '10': ['10'] }), formatVersion: n })

function setup(write: (d: Decoupage) => Promise<void> = async () => undefined) {
  const written: number[] = []
  const statuses: AutoSaveStatus[] = []
  const saver = new AutoSaver<Decoupage>({
    write: async (decoupage) => {
      await write(decoupage)
      written.push(decoupage.formatVersion)
    },
    onStatus: (status) => statuses.push(status),
    delayMs: 500,
    retryMs: 3000
  })
  return { saver, written, statuses }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('enregistrement automatique', () => {
  it('regroupe les modifications rapprochées en une écriture', async () => {
    const { saver, written, statuses } = setup()
    saver.update(version(1))
    await vi.advanceTimersByTimeAsync(100)
    saver.update(version(2))
    saver.update(version(3))
    expect(written).toEqual([])
    expect(statuses.at(-1)).toEqual({ state: 'saving' })
    await vi.advanceTimersByTimeAsync(500)
    expect(written).toEqual([3])
    expect(statuses.at(-1)).toEqual({ state: 'saved' })
    expect(saver.hasUnsavedChanges).toBe(false)
  })

  it('une saisie continue écrit quand même au moins toutes les ~500 ms', async () => {
    const { saver, written } = setup()
    for (let n = 1; n <= 12; n++) {
      saver.update(version(n))
      await vi.advanceTimersByTimeAsync(100)
    }
    expect(written.length).toBeGreaterThanOrEqual(2)
  })

  it('flush écrit immédiatement ce qui est en attente', async () => {
    const { saver, written } = setup()
    saver.update(version(7))
    expect(await saver.flush()).toBe(true)
    expect(written).toEqual([7])
  })

  it('échec : message d’erreur, nouvelles tentatives, aucune perte', async () => {
    let failing = true
    const { saver, written, statuses } = setup(async () => {
      if (failing) throw new Error('disque plein')
    })
    saver.update(version(1))
    await vi.advanceTimersByTimeAsync(500)
    expect(written).toEqual([])
    expect(statuses.at(-1)).toMatchObject({ state: 'error' })
    expect(saver.hasUnsavedChanges).toBe(true)

    // Une modification arrive pendant la panne : c'est elle qui sera écrite.
    saver.update(version(2))
    expect(statuses.at(-1)).toMatchObject({ state: 'error' })
    failing = false
    await vi.advanceTimersByTimeAsync(3000)
    expect(written).toEqual([2])
    expect(statuses.at(-1)).toEqual({ state: 'saved' })
  })

  it('explique simplement les causes courantes d’échec', async () => {
    const fail = (code: string) => async () => {
      throw Object.assign(new Error('détail technique'), { code })
    }
    for (const [code, expected] of [
      ['EACCES', 'ne peut pas être modifié'],
      ['ENOSPC', 'disque est plein'],
      ['ENOENT', 'clé USB a peut-être été retirée']
    ]) {
      const { saver, statuses } = setup(fail(code))
      saver.update(version(1))
      await saver.flush()
      const last = statuses.at(-1)
      expect(last?.state === 'error' && last.message, code).toContain(expected)
      saver.discard()
    }
  })

  it('flush renvoie faux si l’écriture échoue, discard abandonne', async () => {
    const { saver } = setup(async () => {
      throw new Error('clé USB retirée')
    })
    saver.update(version(1))
    expect(await saver.flush()).toBe(false)
    saver.discard()
    expect(saver.hasUnsavedChanges).toBe(false)
  })

  it('les écritures ne se chevauchent jamais', async () => {
    let running = 0
    let overlap = false
    const { saver, written } = setup(async () => {
      running++
      if (running > 1) overlap = true
      await new Promise((resolve) => setTimeout(resolve, 800))
      running--
    })
    saver.update(version(1))
    await vi.advanceTimersByTimeAsync(600)
    saver.update(version(2))
    const flushed = saver.flush()
    await vi.advanceTimersByTimeAsync(2000)
    expect(await flushed).toBe(true)
    expect(overlap).toBe(false)
    expect(written).toEqual([1, 2])
  })
})
