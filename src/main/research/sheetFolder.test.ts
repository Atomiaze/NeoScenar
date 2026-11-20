import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SaveStatus } from '../../shared/api'
import { fakeJpeg, fakePng } from '../images/testImages'
import { makeTempDir, removeDir } from '../project/testHelpers'
import { SheetFolder } from './sheetFolder'

let dataDir: string
let statuses: SaveStatus[]
let folder: SheetFolder

const sheetPath = (fileName: string): string => join(dataDir, 'personnages', fileName)
const readSheetFile = (fileName: string): Promise<string> => readFile(sheetPath(fileName), 'utf8')

beforeEach(async () => {
  dataDir = await makeTempDir()
  statuses = []
  folder = new SheetFolder({
    dataDir,
    kind: 'personnages',
    onStatus: (status) => statuses.push(status),
    delayMs: 1
  })
})

afterEach(() => removeDir(dataDir))

describe('SheetFolder', () => {
  it('liste un dossier absent comme vide', async () => {
    expect(await folder.list()).toEqual([])
  })

  it('crée une fiche avec une couleur libre, et refuse un nom déjà pris', async () => {
    const marie = await folder.create('  MARIE ')
    expect(marie).toMatchObject({ fileName: 'MARIE.md', nom: 'MARIE', auto: false })
    const paul = await folder.create('Paul')
    expect(paul.props.couleur).not.toBe(marie.props.couleur)
    await expect(folder.create('marie')).rejects.toThrow('« MARIE » existe déjà')
    await expect(folder.create('   ')).rejects.toThrow('Écrivez un nom')
    expect((await folder.list()).map((sheet) => sheet.nom).sort()).toEqual(['MARIE', 'Paul'])
  })

  it('applique les modifications à la version du disque, sans perdre les ajouts faits ailleurs', async () => {
    await folder.create('MARIE')
    folder.update('MARIE.md', { props: { interprete: 'Léa' } })
    await folder.flush()
    // Obsidian ajoute une propriété et une section…
    const fromObsidian = (await readSheetFile('MARIE.md'))
      .replace('auto: false', 'auto: false\ntags: [lycée]')
      .concat('\n## Costumes\n\nVeste rouge.\n')
    await writeFile(sheetPath('MARIE.md'), fromObsidian)
    // … puis l'élève continue dans NeoScenar.
    folder.update('MARIE.md', { sections: { description: 'Lycéenne.' } })
    folder.update('MARIE.md', { props: { age: '16' } })
    await folder.flush()
    const text = await readSheetFile('MARIE.md')
    expect(text).toContain('tags: [ lycée ]')
    expect(text).toContain('## Costumes\n\nVeste rouge.')
    expect(text).toContain('interprete: Léa')
    expect(text).toContain('age: 16')
    expect(text).toContain('## Description\n\nLycéenne.\n\n## Objectifs')
    expect(statuses.at(-1)).toEqual({ state: 'saved' })
  })

  it('prend le nom du fichier quand la fiche n’a pas de propriété « nom »', async () => {
    await mkdir(join(dataDir, 'personnages'), { recursive: true })
    await writeFile(sheetPath('Grand-mère.md'), 'Texte libre.\n')
    await writeFile(sheetPath('.cache.md'), 'caché')
    await writeFile(sheetPath('notes.txt'), 'pas une fiche')
    const [sheet] = await folder.list()
    expect(sheet).toMatchObject({ nom: 'Grand-mère', fileName: 'Grand-mère.md' })
    expect(await folder.list()).toHaveLength(1)
  })

  it('refuse un nom de fichier qui sortirait du dossier', () => {
    expect(() => folder.update('../projet.json', {})).toThrow()
    expect(() => folder.update('MARIE.txt', {})).toThrow()
  })

  it('copie les images sous leur nom d’origine, avec -2 en cas de doublon', async () => {
    const first = await folder.storeImageBytes(fakePng(10, 10), 'Marie au lycée.png')
    const second = await folder.storeImageBytes(fakeJpeg(10, 10), 'marie au lycée.png')
    expect(first).toEqual({
      ref: 'images/Marie au lycée.png',
      path: 'personnages/images/Marie au lycée.png'
    })
    expect(second.ref).toBe('images/marie au lycée-2.png')
    await expect(folder.storeImageBytes(new Uint8Array([1, 2, 3]), 'x.png')).rejects.toThrow(
      'PNG ou JPEG'
    )
  })

  it('retrouve les images, y compris celles insérées par Obsidian', async () => {
    await folder.create('MARIE')
    const image = await folder.storeImageBytes(fakePng(10, 10), 'marie.png')
    folder.update('MARIE.md', { images: [image.ref, 'marie.png', 'images/absente.jpg'] })
    const [sheet] = await folder.list()
    expect(sheet.images).toEqual([
      { ref: 'images/marie.png', path: 'personnages/images/marie.png' },
      { ref: 'marie.png', path: 'personnages/images/marie.png' },
      { ref: 'images/absente.jpg', path: null }
    ])
  })

  it('copie la fiche dans les sauvegardes avant de la supprimer', async () => {
    await folder.create('MARIE')
    folder.update('MARIE.md', { sections: { description: 'À garder.' } })
    const backup = await folder.remove('MARIE.md', new Date(2026, 10, 18, 14, 5, 32))
    expect(backup).toBe('sauvegardes/fiches_supprimees/personnages/2026-11-18_14-05-32_MARIE.md')
    expect(await readFile(join(dataDir, ...backup.split('/')), 'utf8')).toContain('À garder.')
    expect(await readdir(join(dataDir, 'personnages'))).toEqual(['images'])
  })
})

describe('SheetFolder (lieux)', () => {
  it('crée, trie, refuse un doublon et supprime avec copie', async () => {
    const places = new SheetFolder({
      dataDir,
      kind: 'lieux',
      onStatus: () => undefined,
      delayMs: 1
    })
    const kitchen = await places.create('MAISON - CUISINE')
    expect(kitchen.fileName).toBe('MAISON - CUISINE.md')
    expect(kitchen.props.couleur ?? '').toBe('')
    await expect(places.create('maison - cuisine')).rejects.toThrow('existe déjà')
    expect(await readFile(join(dataDir, 'lieux', 'MAISON - CUISINE.md'), 'utf8')).toContain(
      'type: lieu'
    )
    await places.remove('MAISON - CUISINE.md')
    const copies = await readdir(join(dataDir, 'sauvegardes', 'fiches_supprimees', 'lieux'))
    expect(copies).toHaveLength(1)
  })
})

describe('SheetFolder.createAuto', () => {
  it('crée des fiches vides « auto », passe les noms déjà pris, sans doublon', async () => {
    await folder.create('MARIE')
    const created = await folder.createAuto(['marie', 'PAUL', 'Paul', '', 42, 'A/B'])
    expect(created.map((sheet) => [sheet.fileName, sheet.auto])).toEqual([
      ['PAUL.md', true],
      ['A_B.md', true]
    ])
    expect(created[0].props.couleur).not.toBe('')
    expect(await readSheetFile('PAUL.md')).toContain('auto: true')
    expect((await folder.list()).map((sheet) => sheet.nom).sort()).toEqual(['A/B', 'MARIE', 'PAUL'])
  })

  it('renomme la fiche et son fichier, en gardant le reste du fichier', async () => {
    await folder.create('MARIE')
    const raw = await readSheetFile('MARIE.md')
    await writeFile(sheetPath('MARIE.md'), raw.replace('auto: false', 'auto: false\ntags: [film]'))
    const renamed = await folder.rename('MARIE.md', ' MARION ')
    expect(renamed).toMatchObject({ fileName: 'MARION.md', nom: 'MARION' })
    const files = await readdir(join(dataDir, 'personnages'))
    expect(files).toContain('MARION.md')
    expect(files).not.toContain('MARIE.md')
    const text = await readSheetFile('MARION.md')
    expect(text).toContain('nom: MARION')
    expect(text).toMatch(/tags: \[ ?film ?\]/)
  })

  it('renomme quand seule la casse change, et refuse un nom déjà pris', async () => {
    await folder.create('Marie')
    await folder.create('PAUL')
    await expect(folder.rename('Marie.md', 'paul')).rejects.toThrow('« PAUL » existe déjà')
    await expect(folder.rename('Marie.md', '  ')).rejects.toThrow('Écrivez un nom')
    const renamed = await folder.rename('Marie.md', 'MARIE')
    expect(renamed).toMatchObject({ fileName: 'MARIE.md', nom: 'MARIE' })
    expect(
      (await readdir(join(dataDir, 'personnages'))).filter((n) => n.endsWith('.md')).sort()
    ).toEqual(['MARIE.md', 'PAUL.md'])
  })
})
