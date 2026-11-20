import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { makeTempDir, removeDir } from '../project/testHelpers'
import { isInsideFolder, toPortableRelative } from '../portablePath'
import { checkBlendTarget, defaultBlendTarget, freeBlendPath } from './blendTarget'

let root: string

beforeEach(async () => {
  root = await makeTempDir()
})

afterEach(() => removeDir(root))

const storyboard = (): string => join(root, '06_Blender', 'Storyboard')

describe('proposition par défaut', () => {
  it('06_Blender/Storyboard/<Nom>_storyboard.blend, même si Storyboard/ manque', async () => {
    await mkdir(join(root, '06_Blender'))
    const target = await defaultBlendTarget(root, 'Mon_Film')
    expect(target).toEqual({
      path: join(storyboard(), 'Mon_Film_storyboard.blend'),
      relativePath: '06_Blender/Storyboard/Mon_Film_storyboard.blend',
      replacedExisting: false
    })
  })

  it('aucune proposition sans dossier 06_Blender', async () => {
    expect(await defaultBlendTarget(root, 'Mon_Film')).toBeNull()
  })
})

describe('refus d’un .blend existant', () => {
  it('propose …_v2, puis …_v3 si _v2 existe aussi ; l’existant n’est pas touché', async () => {
    await mkdir(storyboard(), { recursive: true })
    await writeFile(join(storyboard(), 'Mon_Film_storyboard.blend'), 'travail de l’élève')
    let target = await defaultBlendTarget(root, 'Mon_Film')
    expect(target?.relativePath).toBe('06_Blender/Storyboard/Mon_Film_storyboard_v2.blend')
    expect(target?.replacedExisting).toBe(true)

    await writeFile(join(storyboard(), 'Mon_Film_storyboard_v2.blend'), '')
    target = await defaultBlendTarget(root, 'Mon_Film')
    expect(target?.relativePath).toBe('06_Blender/Storyboard/Mon_Film_storyboard_v3.blend')
  })

  it('un nom en « _v2 » déjà pris continue la série', async () => {
    const taken = new Set(['/f/a_v2.blend'])
    const exists = async (path: string): Promise<boolean> => taken.has(path.split('\\').join('/'))
    expect(await freeBlendPath('/f/a_v2.blend', exists)).toMatch(/a_v3\.blend$/)
  })
})

describe('fichier choisi par l’élève', () => {
  it('dans le dossier du film : accepté, « .blend » ajouté si oublié', async () => {
    const target = await checkBlendTarget(root, join(root, 'essai'))
    expect(target.relativePath).toBe('essai.blend')
  })

  it('hors du dossier du film : refusé avec un message clair', async () => {
    await expect(
      checkBlendTarget(join(root, 'film'), join(root, 'ailleurs.blend'))
    ).rejects.toThrow('Choisissez un emplacement dans le dossier du film')
  })

  it('isInsideFolder et chemin relatif portable', () => {
    expect(isInsideFolder(root, join(root, 'a', 'b.blend'))).toBe(true)
    expect(isInsideFolder(root, root)).toBe(false)
    expect(isInsideFolder(join(root, 'a'), join(root, 'ab', 'c.blend'))).toBe(false)
    expect(toPortableRelative(join(root, 'x', 'y'), join(root, 'z', 'f.blend'))).toBe(
      '../../z/f.blend'
    )
  })
})
