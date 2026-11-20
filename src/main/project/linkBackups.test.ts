import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { backupLinkFiles, KEPT_RECONCILE_BACKUPS } from './linkBackups'
import { makeTempDir, removeDir } from './testHelpers'

let dataDir: string

beforeEach(async () => {
  dataDir = await makeTempDir()
  await writeFile(join(dataDir, 'scenario.fountain'), 'INT. A\n')
  await writeFile(join(dataDir, 'decoupage.json'), '{"scenes":[]}')
})

afterEach(() => removeDir(dataDir))

const at = (minute: number): Date => new Date(2026, 10, 18, 14, minute, 32)
const backups = async (): Promise<string[]> => (await readdir(join(dataDir, 'sauvegardes'))).sort()

describe('copies de sécurité du lien scénario ↔ cartes', () => {
  it('copie les deux fichiers dans un dossier daté, sans accent ni espace', async () => {
    const folder = await backupLinkFiles(dataDir, 'link', at(5))
    expect(folder).toBe('sauvegardes/avant_liaison_2026-11-18_14-05-32')
    const copy = join(dataDir, folder)
    expect(await readFile(join(copy, 'scenario.fountain'), 'utf8')).toBe('INT. A\n')
    expect(await readFile(join(copy, 'decoupage.json'), 'utf8')).toBe('{"scenes":[]}')
  })

  it('deux copies dans la même seconde : deux dossiers', async () => {
    await backupLinkFiles(dataDir, 'reconcile', at(5))
    const second = await backupLinkFiles(dataDir, 'reconcile', at(5))
    expect(second).toBe('sauvegardes/avant_rapprochement_2026-11-18_14-05-32_2')
  })

  it('garde les 10 dernières « avant_rapprochement », et toutes les « avant_liaison »', async () => {
    await backupLinkFiles(dataDir, 'link', at(0))
    await mkdir(join(dataDir, 'sauvegardes', 'vignettes_retirees'))
    for (let minute = 1; minute <= 13; minute++)
      await backupLinkFiles(dataDir, 'reconcile', at(minute))
    const names = await backups()
    const reconcile = names.filter((name) => name.startsWith('avant_rapprochement_'))
    expect(reconcile).toHaveLength(KEPT_RECONCILE_BACKUPS)
    expect(reconcile[0]).toBe('avant_rapprochement_2026-11-18_14-04-32')
    expect(names).toContain('avant_liaison_2026-11-18_14-00-32')
    expect(names).toContain('vignettes_retirees')
  })

  it('fichier absent : le reste est quand même copié', async () => {
    await removeDir(join(dataDir, 'scenario.fountain'))
    const folder = await backupLinkFiles(dataDir, 'link', at(5))
    expect(await readdir(join(dataDir, folder))).toEqual(['decoupage.json'])
  })

  it('avant un renommage, copie aussi la fiche', async () => {
    await mkdir(join(dataDir, 'personnages'))
    await writeFile(join(dataDir, 'personnages', 'MARIE.md'), 'nom: MARIE')
    const folder = await backupLinkFiles(dataDir, 'rename', at(7), [['personnages', 'MARIE.md']])
    expect(folder).toBe('sauvegardes/avant_renommage_2026-11-18_14-07-32')
    const copy = join(dataDir, folder)
    expect(await readFile(join(copy, 'personnages', 'MARIE.md'), 'utf8')).toBe('nom: MARIE')
    expect(await readFile(join(copy, 'scenario.fountain'), 'utf8')).toBe('INT. A\n')
  })
})
