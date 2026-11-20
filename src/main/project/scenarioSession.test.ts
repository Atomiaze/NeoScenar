import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ScenarioSaveStatus } from '../../shared/api'
import type { ScenarioDisk } from './scenarioFile'
import { ScenarioSession } from './scenarioSession'

const PATH = 'scenario.fountain'

/** Disque en mémoire : `content` est le fichier tel que les autres logiciels le voient. */
function setup(initial: string | null = 'INT. CUISINE - JOUR\n') {
  const disk = { content: initial, writes: 0, failNext: false }
  const operations: ScenarioDisk = {
    read: async () => disk.content,
    write: async (_path, text) => {
      if (disk.failNext) {
        disk.failNext = false
        throw Object.assign(new Error('disque plein'), { code: 'ENOSPC' })
      }
      disk.content = text
      disk.writes++
    }
  }
  const statuses: ScenarioSaveStatus[] = []
  const session = new ScenarioSession({
    path: PATH,
    disk: operations,
    delayMs: 500,
    onStatus: (status) => statuses.push(status)
  })
  return { session, disk, statuses }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('scénario du projet ouvert', () => {
  it('lit le fichier au premier appel', async () => {
    const { session } = setup('Title: Essai\n\nAction.\n')
    expect(await session.get()).toBe('Title: Essai\n\nAction.\n')
  })

  it('un fichier absent donne un scénario vide', async () => {
    const { session } = setup(null)
    expect(await session.get()).toBe('')
  })

  it('enregistre la dernière version après un court délai, regroupée', async () => {
    const { session, disk, statuses } = setup()
    await session.get()
    session.update('Un.\n')
    session.update('Un. Deux.\n')
    expect(statuses.at(-1)).toEqual({ state: 'saving' })
    expect(session.hasUnsavedChanges).toBe(true)
    await vi.advanceTimersByTimeAsync(500)
    expect(disk.content).toBe('Un. Deux.\n')
    expect(disk.writes).toBe(1)
    expect(statuses.at(-1)).toEqual({ state: 'saved' })
    expect(session.hasUnsavedChanges).toBe(false)
  })

  it('renvoie le dernier texte reçu, même pas encore écrit', async () => {
    const { session } = setup()
    await session.get()
    session.update('Nouveau.\n')
    expect(await session.get()).toBe('Nouveau.\n')
  })

  it('flush écrit immédiatement', async () => {
    const { session, disk } = setup()
    await session.get()
    session.update('Vite.\n')
    expect(await session.flush()).toBe(true)
    expect(disk.content).toBe('Vite.\n')
  })

  it('réessaie après un échec d’écriture, sans rien perdre', async () => {
    const { session, disk, statuses } = setup()
    await session.get()
    disk.failNext = true
    session.update('Important.\n')
    await vi.advanceTimersByTimeAsync(500)
    expect(statuses.at(-1)).toMatchObject({ state: 'error' })
    await vi.advanceTimersByTimeAsync(3000)
    expect(disk.content).toBe('Important.\n')
    expect(statuses.at(-1)).toEqual({ state: 'saved' })
  })
})

describe('modification dans un autre logiciel', () => {
  it('n’écrase pas le fichier modifié ailleurs et le signale', async () => {
    const { session, disk, statuses } = setup()
    await session.get()
    disk.content = 'Écrit dans Obsidian.\n'
    session.update('Écrit dans NeoScenar.\n')
    await vi.advanceTimersByTimeAsync(5000)
    expect(disk.content).toBe('Écrit dans Obsidian.\n')
    expect(statuses.at(-1)).toEqual({ state: 'conflict' })
    expect(session.hasUnsavedChanges).toBe(true)
    expect(await session.flush()).toBe(false)
    expect(disk.content).toBe('Écrit dans Obsidian.\n')
  })

  it('sans modification en attente, relit le fichier sans poser de question', async () => {
    const { session, disk, statuses } = setup()
    await session.get()
    disk.content = 'Autre version.\n'
    expect(await session.check()).toBe('Autre version.\n')
    expect(await session.get()).toBe('Autre version.\n')
    expect(statuses.at(-1)).not.toEqual({ state: 'conflict' })
    // La version relue devient la version connue : la suite s'enregistre normalement.
    session.update('Suite.\n')
    await vi.advanceTimersByTimeAsync(500)
    expect(disk.content).toBe('Suite.\n')
  })

  it('les deux côtés modifiés : pas de rechargement, l’élève choisit', async () => {
    const { session, disk, statuses } = setup()
    await session.get()
    session.update('Version NeoScenar.\n')
    disk.content = 'Version Obsidian.\n'
    expect(await session.check()).toBeNull()
    expect(statuses.at(-1)).toEqual({ state: 'conflict' })
    await vi.advanceTimersByTimeAsync(5000)
    expect(disk.content).toBe('Version Obsidian.\n')
  })

  it('ne signale rien si le fichier n’a pas changé, ni après ses propres écritures', async () => {
    const { session, statuses } = setup()
    await session.get()
    session.update('Mien.\n')
    await vi.advanceTimersByTimeAsync(500)
    await session.check()
    expect(statuses.at(-1)).toEqual({ state: 'saved' })
  })

  it('« Recharger » abandonne la version de NeoScenar et renvoie celle du disque', async () => {
    const { session, disk, statuses } = setup()
    await session.get()
    disk.content = 'Version Obsidian.\n'
    session.update('Version NeoScenar.\n')
    await vi.advanceTimersByTimeAsync(500)
    expect(await session.resolve('reload')).toBe('Version Obsidian.\n')
    await vi.advanceTimersByTimeAsync(5000)
    expect(disk.content).toBe('Version Obsidian.\n')
    expect(statuses.at(-1)).toEqual({ state: 'saved' })
    expect(session.hasUnsavedChanges).toBe(false)
    // Les écritures suivantes reprennent normalement.
    session.update('Suite.\n')
    await vi.advanceTimersByTimeAsync(500)
    expect(disk.content).toBe('Suite.\n')
  })

  it('« Garder la version de NeoScenar » remplace le fichier', async () => {
    const { session, disk, statuses } = setup()
    await session.get()
    session.update('Version NeoScenar.\n')
    disk.content = 'Version Obsidian.\n'
    await session.check()
    expect(await session.resolve('keep')).toBe('Version NeoScenar.\n')
    await vi.advanceTimersByTimeAsync(500)
    expect(disk.content).toBe('Version NeoScenar.\n')
    expect(statuses.at(-1)).toEqual({ state: 'saved' })
  })
})
