import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeTempDir, removeDir } from '../project/testHelpers'
import { fakePng } from './testImages'

vi.mock('electron', () => ({ nativeImage: {} }))
const { clearPreviewsCache, previewPath, previewSize, previewsCacheSize, readImageSizes } =
  await import('./previews')

let dataDir: string
beforeEach(async () => {
  dataDir = await makeTempDir()
})
afterEach(() => removeDir(dataDir))

describe('aperçus des vignettes', () => {
  it('400 pixels sur le côté le plus long, jamais agrandis', () => {
    expect(previewSize({ width: 1920, height: 1080 })).toEqual({ width: 400, height: 225 })
    expect(previewSize({ width: 1080, height: 1920 })).toEqual({ width: 225, height: 400 })
    expect(previewSize({ width: 200, height: 100 })).toEqual({ width: 200, height: 100 })
  })

  it('rangés hors du projet, un dossier par projet', () => {
    const path = previewPath('/cache', 'projet-1', 'storyboard/vignettes/a_20261117-143012-042.png')
    expect(path).toBe(join('/cache', 'projet-1', 'a_20261117-143012-042.jpg'))
  })

  it('lit les dimensions des vignettes ; fichier manquant ou chemin étranger : inconnues', async () => {
    await mkdir(join(dataDir, 'storyboard', 'vignettes'), { recursive: true })
    await writeFile(join(dataDir, 'storyboard', 'vignettes', 'a_1.png'), fakePng(1920, 804))
    const sizes = await readImageSizes(dataDir, [
      'storyboard/vignettes/a_1.png',
      'storyboard/vignettes/absente.png',
      '../projet.json'
    ])
    expect(sizes).toEqual({
      'storyboard/vignettes/a_1.png': { width: 1920, height: 804 },
      'storyboard/vignettes/absente.png': null,
      '../projet.json': null
    })
  })

  it('vide le cache des aperçus et mesure sa taille', async () => {
    const cache = join(dataDir, 'apercus')
    await mkdir(join(cache, 'projet-1'), { recursive: true })
    await writeFile(join(cache, 'projet-1', 'a.jpg'), new Uint8Array(1000))
    await writeFile(join(cache, 'projet-1', 'b.jpg'), new Uint8Array(500))
    expect(await previewsCacheSize(cache)).toBe(1500)
    await clearPreviewsCache(cache)
    expect(await previewsCacheSize(cache)).toBe(0)
    // Cache absent : rien à faire, pas d'erreur.
    await expect(clearPreviewsCache(cache)).resolves.toBeUndefined()
  })
})
