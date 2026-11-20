import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defaultCreditsData } from '../../shared/credits/creditsData'
import { CreditsSession, logoFileName } from './creditsSession'

let dir: string
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'neoscenar-credits-'))
})
afterEach(() => rm(dir, { recursive: true, force: true }))

const PNG = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
  )
)

describe('logoFileName', () => {
  it('retire accents et espaces', () => {
    expect(logoFileName('Logo école (1).PNG')).toBe('Logo_ecole_1.png')
    expect(logoFileName('é.png')).toBe('e.png')
  })
})

describe('CreditsSession', () => {
  it('enregistre les données et garde les clés ajoutées à la main', async () => {
    await writeFile(join(dir, 'generique.json'), JSON.stringify({ version: 1, ajout: 'à moi' }))
    const session = new CreditsSession({ dataDir: dir, onStatus: () => undefined })
    const data = { ...defaultCreditsData(), logos: ['generique/logos/a.png'] }
    session.update(data)
    expect(await session.flush()).toBe(true)
    const written = JSON.parse(await readFile(join(dir, 'generique.json'), 'utf8'))
    expect(written.ajout).toBe('à moi')
    expect(written.logos).toEqual(['generique/logos/a.png'])
    expect((await session.read()).logos).toEqual(['generique/logos/a.png'])
  })

  it('copie un logo sous un nom sûr, sans écraser un logo existant', async () => {
    const session = new CreditsSession({ dataDir: dir, onStatus: () => undefined })
    expect(await session.storeLogoBytes(PNG, 'Mon logo é.png')).toBe(
      'generique/logos/Mon_logo_e.png'
    )
    expect(await session.storeLogoBytes(PNG, 'Mon logo é.png')).toBe(
      'generique/logos/Mon_logo_e-2.png'
    )
  })

  it('refuse un fichier qui n’est pas une image', async () => {
    const session = new CreditsSession({ dataDir: dir, onStatus: () => undefined })
    await expect(session.storeLogoBytes(new Uint8Array([1, 2, 3]), 'a.png')).rejects.toThrow()
    await expect(session.storeLogoBytes(PNG, 'a.txt')).rejects.toThrow()
  })
})
