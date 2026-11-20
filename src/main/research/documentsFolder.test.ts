import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fakePng } from '../images/testImages'
import { makeTempDir, removeDir } from '../project/testHelpers'
import { DocumentsFolder } from './documentsFolder'

let dataDir: string
let folder: DocumentsFolder

const docs = (...parts: string[]): string => join(dataDir, 'documents', ...parts)

beforeEach(async () => {
  dataDir = await makeTempDir()
  folder = new DocumentsFolder({
    dataDir,
    onStatus: () => undefined,
    delayMs: 1
  })
})

afterEach(() => removeDir(dataDir))

describe('DocumentsFolder', () => {
  it('liste un dossier absent comme vide', async () => {
    expect(await folder.list()).toMatchObject({ path: '', folders: [], notes: [], images: [] })
  })

  it('crée de vrais dossiers imbriqués, avec accents et espaces', async () => {
    const path = await folder.createFolder('', 'Repérages été')
    expect(path).toBe('Repérages été')
    const sub = await folder.createFolder(path, 'Plage')
    expect(sub).toBe('Repérages été/Plage')
    expect((await stat(docs('Repérages été', 'Plage'))).isDirectory()).toBe(true)
    const tree = await folder.list()
    expect(tree.folders[0].name).toBe('Repérages été')
    expect(tree.folders[0].folders[0].path).toBe('Repérages été/Plage')
  })

  it('refuse, avec un message, les noms que Windows n’accepterait pas (étape 16A)', async () => {
    await expect(folder.createFolder('', 'a/b')).rejects.toThrow('« / » est interdit')
    await expect(folder.createFolder('', 'Scène 1: plage')).rejects.toThrow('« : » est interdit')
    await expect(folder.createNote('', 'Quoi ?')).rejects.toThrow('« ? » est interdit')
    await expect(folder.createFolder('', 'CON')).rejects.toThrow('nom réservé par Windows')
    await expect(folder.createNote('', 'com1')).rejects.toThrow('nom réservé par Windows')
    await expect(folder.createFolder('', 'Plage.')).rejects.toThrow('finir par un point')
    await expect(folder.createFolder('', '.cache')).rejects.toThrow('commencer par un point')
    const note = await folder.createNote('', 'Notes')
    await expect(folder.renameEntry(note, 'aux')).rejects.toThrow('nom réservé par Windows')
    expect(await readdir(docs())).toEqual(['Notes.md'])
  })

  it('refuse un chemin de plus de 260 caractères', async () => {
    // Le dossier temporaire n'a pas la même longueur partout : on s'approche de la limite.
    let parent = ''
    while (docs(parent).length < 150) parent = await folder.createFolder(parent, 'd'.repeat(40))
    const room = 259 - docs(parent).length - '/.md'.length
    expect(await folder.createNote(parent, 'n'.repeat(room))).toContain('n'.repeat(room))
    await expect(folder.createNote(parent, 'm'.repeat(room + 1))).rejects.toThrow('260 caractères')
  })

  it('refuse un nom vide ou déjà pris, sans tenir compte de la casse ni de NFC/NFD', async () => {
    await folder.createFolder('', 'Repérages été')
    await expect(folder.createFolder('', 'repérages été')).rejects.toThrow('existe déjà')
    await expect(folder.createFolder('', 'Repérages été')).rejects.toThrow('existe déjà')
    await expect(folder.createFolder('', '   ')).rejects.toThrow('Écrivez un nom')
  })

  it('reconnaît un dossier créé en NFD par le Finder', async () => {
    await mkdir(docs('Repérages'), { recursive: true })
    const tree = await folder.list()
    expect(tree.folders[0].name).toBe('Repérages')
    // Le chemin garde le vrai nom du disque : il reste utilisable partout.
    await folder.createNote(tree.folders[0].path, 'Idées')
    await expect(folder.createFolder('', 'Repérages')).rejects.toThrow('existe déjà')
  })

  it('crée, écrit, relit et renomme une note', async () => {
    const dir = await folder.createFolder('', 'Repérages été')
    const note = await folder.createNote(dir, 'Plage du nord')
    expect(note).toBe('Repérages été/Plage du nord.md')
    await folder.writeNote(note, 'Du sable.\n')
    expect(await folder.readNote(note)).toBe('Du sable.\n')
    expect(await readFile(docs('Repérages été', 'Plage du nord.md'), 'utf8')).toBe('Du sable.\n')
    const renamed = await folder.renameEntry(note, 'Plage')
    expect(renamed).toBe('Repérages été/Plage.md')
    expect((await folder.list()).folders[0].notes).toEqual([
      { path: 'Repérages été/Plage.md', name: 'Plage' }
    ])
  })

  it('écrit une note en attente avant un renommage', async () => {
    const note = await folder.createNote('', 'Idée')
    await folder.writeNote(note, 'texte')
    await folder.renameEntry(note, 'Idée 2')
    expect(await readFile(docs('Idée 2.md'), 'utf8')).toBe('texte')
  })

  it('renomme un dossier avec son contenu, et accepte un simple changement de casse', async () => {
    const dir = await folder.createFolder('', 'plage')
    await folder.createNote(dir, 'Note')
    expect(await folder.renameEntry(dir, 'Plage')).toBe('Plage')
    expect((await readdir(docs())).includes('Plage')).toBe(true)
    expect(await readFile(docs('Plage', 'Note.md'), 'utf8')).toBe('')
  })

  it('refuse un renommage vers un nom déjà pris', async () => {
    await folder.createFolder('', 'A')
    const b = await folder.createFolder('', 'B')
    await expect(folder.renameEntry(b, 'a')).rejects.toThrow('existe déjà')
  })

  it('copie dans sauvegardes avant de supprimer un dossier', async () => {
    const dir = await folder.createFolder('', 'Repérages')
    const note = await folder.createNote(dir, 'Plage')
    await folder.writeNote(note, 'précieux')
    const backup = await folder.removeEntry(dir, new Date(2026, 10, 18, 10, 0, 0))
    expect(backup).toBe('sauvegardes/documents_supprimes/2026-11-18_10-00-00_Repérages')
    expect(await readFile(join(dataDir, backup, 'Plage.md'), 'utf8')).toBe('précieux')
    expect((await folder.list()).folders).toEqual([])
  })

  it('copie une note supprimée', async () => {
    const note = await folder.createNote('', 'Idée')
    const backup = await folder.removeEntry(note)
    expect(await readdir(join(dataDir, 'sauvegardes', 'documents_supprimes'))).toHaveLength(1)
    expect(backup).toContain('_Idée.md')
    expect((await folder.list()).notes).toEqual([])
  })

  it('refuse les chemins qui sortent de documents/', async () => {
    await expect(folder.createFolder('..', 'x')).rejects.toThrow('introuvable')
    await expect(folder.readNote('../projet.json')).rejects.toThrow('introuvable')
    await expect(folder.removeEntry('a/../../x')).rejects.toThrow('introuvable')
    await expect(folder.renameEntry('', 'x')).rejects.toThrow('introuvable')
  })

  it('range les images dans le dossier, sans doublon, et les retire vers sauvegardes', async () => {
    const dir = await folder.createFolder('', 'Repérages')
    const first = await folder.storeImageBytes(dir, fakePng(10, 10), 'plage.png')
    const second = await folder.storeImageBytes(dir, fakePng(10, 10), 'plage.png')
    expect(first).toEqual({ fileName: 'plage.png', path: 'documents/Repérages/plage.png' })
    expect(second.fileName).toBe('plage-2.png')
    const tree = await folder.list()
    expect(tree.folders[0].images.map((image) => image.fileName)).toEqual([
      'plage-2.png',
      'plage.png'
    ])
    const backup = await folder.removeImage(dir, 'plage.png', new Date(2026, 10, 18, 10, 0, 0))
    expect((await stat(join(dataDir, backup))).isFile()).toBe(true)
    expect((await folder.list()).folders[0].images.map((image) => image.fileName)).toEqual([
      'plage-2.png'
    ])
  })

  it("refuse un fichier qui n'est pas une image, et ignore les autres fichiers du dossier", async () => {
    const dir = await folder.createFolder('', 'Repérages')
    await expect(folder.storeImageBytes(dir, new Uint8Array([1, 2, 3]), 'x.png')).rejects.toThrow()
    await writeFile(docs('Repérages', 'plan.pdf'), 'pdf')
    await writeFile(docs('Repérages', '.cache.jpg'), 'caché')
    const tree = await folder.list()
    expect(tree.folders[0].images).toEqual([])
    expect(tree.folders[0].notes).toEqual([])
  })

  it('ne recrée pas une note supprimée ailleurs pendant la saisie', async () => {
    // Délai long : l'écriture n'a lieu qu'au flush, après la suppression.
    const slow = new DocumentsFolder({ dataDir, onStatus: () => undefined, delayMs: 60_000 })
    const note = await slow.createNote('', 'Idée')
    await slow.writeNote(note, 'texte')
    await rm(docs('Idée.md'))
    await slow.flush()
    expect((await slow.list()).notes).toEqual([])
  })
})
