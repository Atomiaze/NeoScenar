import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Decoupage } from '../../shared/projectTypes'
import { makeTempDir, removeDir } from '../project/testHelpers'
import { recoverRetiredImages } from './recoverImages'

let source: string
let target: string

beforeEach(async () => {
  source = await makeTempDir()
  target = await makeTempDir()
})
afterEach(async () => {
  await removeDir(source)
  await removeDir(target)
})

function decoupageWith(thumbnails: (string | null)[]): Decoupage {
  return {
    formatVersion: 1,
    numbersLocked: false,
    scriptLinked: true,
    scenes: [
      {
        id: 'S10',
        number: 10,
        letter: '',
        name: '',
        heading: 'INT. A - JOUR',
        color: null,
        shots: thumbnails.map((thumbnail, index) => ({
          id: `P${index}`,
          number: 10 * (index + 1),
          letter: '',
          name: '',
          color: null,
          thumbnail,
          thumbnailSource: null,
          thumbnailCrop: null,
          duration: null,
          shotSize: null,
          cameraMovement: null,
          cameraAngle: null,
          sound: '',
          music: '',
          description: ''
        }))
      }
    ]
  } as unknown as Decoupage
}

async function put(dir: string, path: string, content: string): Promise<void> {
  const full = join(dir, ...path.split('/'))
  await mkdir(join(full, '..'), { recursive: true })
  await writeFile(full, content)
}

describe('vignettes retirées remises en place', () => {
  it('restauration : déplacée depuis sauvegardes/vignettes_retirees/', async () => {
    await put(source, 'sauvegardes/vignettes_retirees/vignettes/S10-P10.png', 'retirée')
    const recovered = await recoverRetiredImages(
      source,
      source,
      decoupageWith(['storyboard/vignettes/S10-P10.png']),
      'move'
    )
    expect(recovered).toEqual(['storyboard/vignettes/S10-P10.png'])
    expect(await readFile(join(source, 'storyboard', 'vignettes', 'S10-P10.png'), 'utf8')).toBe(
      'retirée'
    )
    expect(
      existsSync(join(source, 'sauvegardes', 'vignettes_retirees', 'vignettes', 'S10-P10.png'))
    ).toBe(false)
  })

  it('duplicata : copiée, l’original garde sa sauvegarde', async () => {
    await put(source, 'sauvegardes/vignettes_retirees/vignettes/S10-P10.png', 'retirée')
    await recoverRetiredImages(
      source,
      target,
      decoupageWith(['storyboard/vignettes/S10-P10.png']),
      'copy'
    )
    expect(existsSync(join(target, 'storyboard', 'vignettes', 'S10-P10.png'))).toBe(true)
    expect(
      existsSync(join(source, 'sauvegardes', 'vignettes_retirees', 'vignettes', 'S10-P10.png'))
    ).toBe(true)
  })

  it('image présente : jamais remplacée ; introuvable partout : ignorée sans erreur', async () => {
    await put(source, 'storyboard/vignettes/S10-P10.png', 'actuelle')
    await put(source, 'sauvegardes/vignettes_retirees/vignettes/S10-P10.png', 'retirée')
    const recovered = await recoverRetiredImages(
      source,
      source,
      decoupageWith(['storyboard/vignettes/S10-P10.png', 'storyboard/vignettes/S10-P20.png', null]),
      'move'
    )
    expect(recovered).toEqual([])
    expect(await readFile(join(source, 'storyboard', 'vignettes', 'S10-P10.png'), 'utf8')).toBe(
      'actuelle'
    )
  })
})
