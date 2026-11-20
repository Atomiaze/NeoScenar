import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parsePngFiles, readCreditsLogo, writeCreditsPngs, writeCreditsText } from './creditsExport'

const png = (extra = 0) => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, extra])

let root: string
const folder = () => join(root, '08_Graphisme', 'Generique')

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'neoscenar-generique-'))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('parsePngFiles', () => {
  it('accepte des PNG aux noms prévus', () => {
    expect(parsePngFiles([{ name: 'generique_fin.png', bytes: png() }])).toHaveLength(1)
  })
  it('refuse un autre nom, un doublon ou des octets qui ne sont pas un PNG', () => {
    expect(() => parsePngFiles([{ name: '../x.png', bytes: png() }])).toThrow()
    expect(() =>
      parsePngFiles([
        { name: 'generique_fin.png', bytes: png() },
        { name: 'generique_fin.png', bytes: png() }
      ])
    ).toThrow()
    expect(() =>
      parsePngFiles([{ name: 'generique_fin.png', bytes: new Uint8Array([1, 2]) }])
    ).toThrow()
    expect(() => parsePngFiles([])).toThrow()
  })
})

describe('writeCreditsPngs', () => {
  it('crée le dossier, remplace les fichiers et retire les PNG d’un export précédent', async () => {
    await mkdir(folder(), { recursive: true })
    await writeFile(join(folder(), 'generique_fin_2.png'), png())
    await writeFile(join(folder(), 'debut_03_titre.png'), png())
    await writeFile(join(folder(), 'generique_fin.png'), png(1))
    await writeFile(join(folder(), 'fond_eleve.png'), png())
    const relative = await writeCreditsPngs(root, [
      { name: 'generique_fin.png', bytes: png(2) },
      { name: 'debut_01_titre.png', bytes: png() }
    ])
    expect(relative).toBe('08_Graphisme/Generique')
    expect((await readdir(folder())).sort()).toEqual([
      'debut_01_titre.png',
      'fond_eleve.png',
      'generique_fin.png'
    ])
    expect(await readFile(join(folder(), 'generique_fin.png')).then((b) => b[8])).toBe(2)
  })
})

describe('writeCreditsText', () => {
  it('écrit generique.txt en UTF-8', async () => {
    const relative = await writeCreditsText(root, 'IMAGE\nZoé\n')
    expect(relative).toBe('08_Graphisme/Generique/generique.txt')
    expect(await readFile(join(folder(), 'generique.txt'), 'utf8')).toBe('IMAGE\nZoé\n')
  })
})

describe('readCreditsLogo', () => {
  it('lit un logo du dossier des logos et rien d’autre', async () => {
    const data = join(root, 'neoscenar')
    await mkdir(join(data, 'generique', 'logos'), { recursive: true })
    await writeFile(join(data, 'generique', 'logos', 'ecole.png'), png())
    await writeFile(join(data, 'projet.json'), '{}')
    expect(await readCreditsLogo(data, 'generique/logos/ecole.png')).toEqual(png())
    await expect(readCreditsLogo(data, 'projet.json')).rejects.toThrow()
    await expect(readCreditsLogo(data, 'generique/logos/../../projet.json')).rejects.toThrow()
    await expect(readCreditsLogo(data, 'generique/logos/absent.png')).rejects.toThrow()
  })
})
