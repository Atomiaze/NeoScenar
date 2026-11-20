import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installWelcomeImage, welcomeCopyPath } from './welcomeImage'
import { ProjectError } from './project/errors'
import { makeTempDir, removeDir } from './project/testHelpers'

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])

describe('image d’accueil', () => {
  let folder: string
  beforeEach(async () => {
    folder = await makeTempDir()
  })
  afterEach(() => removeDir(folder))

  it('copie l’image dans les données et remplace la copie précédente', async () => {
    await writeFile(join(folder, 'a.png'), PNG)
    await writeFile(join(folder, 'b.jpg'), JPG)
    const first = await installWelcomeImage(folder, join(folder, 'a.png'))
    await new Promise((resolve) => setTimeout(resolve, 5))
    const second = await installWelcomeImage(folder, join(folder, 'b.jpg'))
    expect(second).not.toBe(first)
    expect(await readdir(join(folder, 'accueil'))).toEqual([second])
    expect(welcomeCopyPath(folder, second)).not.toBeNull()
    expect(welcomeCopyPath(folder, first)).toBeNull()
  })

  it('refuse un mauvais format, un faux nom et une image trop lourde', async () => {
    await writeFile(join(folder, 'a.gif'), PNG)
    await writeFile(join(folder, 'faux.png'), Buffer.from('pas une image 123'))
    await writeFile(
      join(folder, 'lourde.jpg'),
      Buffer.concat([JPG, Buffer.alloc(10 * 1024 * 1024)])
    )
    for (const name of ['a.gif', 'faux.png', 'lourde.jpg']) {
      await expect(installWelcomeImage(folder, join(folder, name))).rejects.toBeInstanceOf(
        ProjectError
      )
    }
    await mkdir(join(folder, 'accueil'), { recursive: true })
    expect(await readdir(join(folder, 'accueil'))).toEqual([])
  })

  it('un nom qui sort du dossier n’est jamais servi', () => {
    expect(welcomeCopyPath(folder, '../preferences.json')).toBeNull()
  })
})
