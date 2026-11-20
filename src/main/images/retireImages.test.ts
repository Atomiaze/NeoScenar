import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { makeDecoupage } from '../../shared/decoupage/testFixtures'
import { listTree, makeTempDir, removeDir } from '../project/testHelpers'
import { findUnusedImages, retireUnusedImages } from './retireImages'
import { copyThumbnailFiles } from './thumbnailFiles'
import { fakeJpeg, fakePng } from './testImages'

let dataDir: string
beforeEach(async () => {
  dataDir = await makeTempDir()
  await mkdir(join(dataDir, 'storyboard', 'vignettes'), { recursive: true })
  await mkdir(join(dataDir, 'storyboard', 'originaux'), { recursive: true })
})
afterEach(() => removeDir(dataDir))

async function put(path: string, bytes: Uint8Array = fakePng(10, 10)): Promise<void> {
  await writeFile(join(dataDir, ...path.split('/')), bytes)
}

function decoupageUsing(thumbnail: string, source: string) {
  const decoupage = makeDecoupage({ '10': ['10', '20'] })
  decoupage.scenes[0].shots[0].thumbnail = thumbnail
  decoupage.scenes[0].shots[0].thumbnailSource = source
  return decoupage
}

describe('rangement des images inutilisées', () => {
  it('trouve les fichiers que plus aucun plan n’utilise', async () => {
    await put('storyboard/vignettes/a_1.png')
    await put('storyboard/vignettes/a_2.png')
    await put('storyboard/originaux/a_1.jpg', fakeJpeg(10, 10))
    await put('storyboard/vignettes/.DS_Store')
    const decoupage = decoupageUsing('storyboard/vignettes/a_2.png', 'storyboard/originaux/a_1.jpg')
    expect(await findUnusedImages(dataDir, decoupage)).toEqual(['storyboard/vignettes/a_1.png'])
  })

  it('les déplace dans sauvegardes/vignettes_retirees, sans jamais rien supprimer', async () => {
    await put('storyboard/vignettes/a_1.png', fakePng(1, 1))
    await put('storyboard/originaux/a_0.jpg', fakeJpeg(1, 1))
    await put('storyboard/vignettes/a_2.png')
    const decoupage = decoupageUsing('storyboard/vignettes/a_2.png', 'storyboard/originaux/x.jpg')
    const moved = await retireUnusedImages(dataDir, decoupage)
    expect(moved).toEqual([
      'sauvegardes/vignettes_retirees/vignettes/a_1.png',
      'sauvegardes/vignettes_retirees/originaux/a_0.jpg'
    ])
    expect(await listTree(dataDir)).toEqual(
      expect.arrayContaining([
        'sauvegardes/vignettes_retirees/vignettes/a_1.png',
        'sauvegardes/vignettes_retirees/originaux/a_0.jpg',
        'storyboard/vignettes/a_2.png'
      ])
    )
    expect(await readdir(join(dataDir, 'storyboard', 'vignettes'))).toEqual(['a_2.png'])
    // Contenu intact.
    expect(
      new Uint8Array(
        await readFile(join(dataDir, 'sauvegardes', 'vignettes_retirees', 'vignettes', 'a_1.png'))
      )
    ).toEqual(fakePng(1, 1))
  })

  it('un fichier déjà retiré du même nom n’est pas écrasé', async () => {
    await mkdir(join(dataDir, 'sauvegardes', 'vignettes_retirees', 'vignettes'), {
      recursive: true
    })
    await put('sauvegardes/vignettes_retirees/vignettes/a_1.png', fakePng(5, 5))
    await put('storyboard/vignettes/a_1.png', fakePng(6, 6))
    const moved = await retireUnusedImages(dataDir, makeDecoupage({ '10': ['10'] }))
    expect(moved).toEqual(['sauvegardes/vignettes_retirees/vignettes/a_1-2.png'])
    expect(
      await readdir(join(dataDir, 'sauvegardes', 'vignettes_retirees', 'vignettes'))
    ).toHaveLength(2)
  })
})

describe('duplication d’un plan illustré', () => {
  it('copie la vignette et l’original dans de nouveaux fichiers au nom de la copie', async () => {
    await put('storyboard/vignettes/a_1.png', fakePng(1920, 1080))
    await put('storyboard/originaux/a_1.jpg', fakeJpeg(4000, 3000))
    const copies = await copyThumbnailFiles(
      dataDir,
      'copie-1',
      {
        thumbnail: 'storyboard/vignettes/a_1.png',
        thumbnailSource: 'storyboard/originaux/a_1.jpg'
      },
      new Date(Date.UTC(2026, 10, 17, 14, 30, 12, 42))
    )
    expect(copies).toEqual({
      thumbnail: 'storyboard/vignettes/copie-1_20261117-143012-042.png',
      thumbnailSource: 'storyboard/originaux/copie-1_20261117-143012-042.jpg'
    })
    const read = (path: string) => readFile(join(dataDir, ...path.split('/')))
    expect(await read(copies.thumbnail as string)).toEqual(
      await read('storyboard/vignettes/a_1.png')
    )
    expect(await read(copies.thumbnailSource as string)).toEqual(
      await read('storyboard/originaux/a_1.jpg')
    )
  })

  it('sans vignette : rien à copier', async () => {
    expect(
      await copyThumbnailFiles(dataDir, 'c', { thumbnail: null, thumbnailSource: null })
    ).toEqual({ thumbnail: null, thumbnailSource: null })
  })
})
