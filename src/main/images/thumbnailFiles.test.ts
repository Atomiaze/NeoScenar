import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { makeTempDir, removeDir } from '../project/testHelpers'
import { storeOriginalFile, storeThumbnail } from './thumbnailFiles'
import { fakeJpeg, fakePng } from './testImages'

let dataDir: string
const NOW = new Date(Date.UTC(2026, 10, 17, 14, 30, 12, 42))

beforeEach(async () => {
  dataDir = await makeTempDir()
})
afterEach(() => removeDir(dataDir))

async function source(name: string, bytes: Uint8Array): Promise<string> {
  const path = join(dataDir, name)
  await writeFile(path, bytes)
  return path
}

describe('rangement des images d’un plan', () => {
  it('copie l’original tel quel dans storyboard/originaux, avec l’extension de son vrai format', async () => {
    const bytes = fakeJpeg(4032, 3024)
    // Un JPEG nommé « .png » par erreur reste un JPEG.
    const stored = await storeOriginalFile(
      dataDir,
      'plan-1',
      await source('Photo été.png', bytes),
      NOW
    )
    expect(stored).toEqual({
      path: 'storyboard/originaux/plan-1_20261117-143012-042.jpg',
      width: 4032,
      height: 3024
    })
    expect(
      new Uint8Array(
        await readFile(join(dataDir, 'storyboard', 'originaux', 'plan-1_20261117-143012-042.jpg'))
      )
    ).toEqual(bytes)
  })

  it('ne remplace jamais un fichier existant', async () => {
    const path = await source('a.png', fakePng(100, 100))
    const first = await storeOriginalFile(dataDir, 'p', path, NOW)
    const second = await storeOriginalFile(dataDir, 'p', path, NOW)
    expect(first.path).not.toBe(second.path)
    expect(await readdir(join(dataDir, 'storyboard', 'originaux'))).toHaveLength(2)
  })

  it('refuse un autre format, une image démesurée ou un fichier absent, sans rien écrire', async () => {
    const gif = await source('a.gif', new TextEncoder().encode('GIF89a'))
    await expect(storeOriginalFile(dataDir, 'p', gif, NOW)).rejects.toThrow(/PNG ou JPEG/)
    const huge = await source('b.png', fakePng(16001, 100))
    await expect(storeOriginalFile(dataDir, 'p', huge, NOW)).rejects.toThrow(/16 000 pixels/)
    await expect(storeOriginalFile(dataDir, 'p', join(dataDir, 'absent.png'), NOW)).rejects.toThrow(
      /introuvable/
    )
    await expect(readdir(join(dataDir, 'storyboard'))).rejects.toThrow()
  })

  it('enregistre une vignette PNG dans storyboard/vignettes', async () => {
    const path = await storeThumbnail(dataDir, 'plan-1', fakePng(1920, 1080), NOW)
    expect(path).toBe('storyboard/vignettes/plan-1_20261117-143012-042.png')
    await expect(storeThumbnail(dataDir, 'plan-1', fakeJpeg(10, 10), NOW)).rejects.toThrow()
  })
})
