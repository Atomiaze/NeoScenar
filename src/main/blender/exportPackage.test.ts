import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { makeDecoupage } from '../../shared/decoupage/testFixtures'
import type { Decoupage, ProjectData } from '../../shared/projectTypes'
import { listTree, makeTempDir, removeDir } from '../project/testHelpers'
import { exportFolder, writeExportPackage } from './exportPackage'

let root: string
let dataDir: string

const project: ProjectData = {
  formatVersion: 1,
  id: 'projet-1',
  title: 'Mon Film d’été',
  folderName: 'Mon_Film_d_ete',
  projectType: 'animation',
  template: 'saint-luc',
  createdAt: '2026-11-17T15:40:12.000Z',
  modifiedAt: '2026-11-17T15:40:12.000Z',
  logline: '',
  synopsis: '',
  settings: { fps: 25, resolution: { width: 1920, height: 1080 } },
  filmFolders: ['06_Blender'],
  lastBlenderExport: null,
  exportPdf: { pageDeTitre: true, numerotation: 'fountain', nouvellePageParActe: false },
  exportStoryboard: { kind: 'planches', scope: 'all', sceneNumbers: [], newPagePerScene: false }
}

beforeEach(async () => {
  root = await makeTempDir()
  dataDir = join(root, 'neoscenar')
  await mkdir(join(dataDir, 'storyboard', 'vignettes'), { recursive: true })
})

afterEach(() => removeDir(root))

function write(decoupage: Decoupage): Promise<string> {
  return writeExportPackage({
    dataDir,
    project,
    decoupage,
    blendPath: join(root, '06_Blender', 'Storyboard', 'Mon_Film_d_ete_storyboard.blend'),
    neoscenarVersion: '0.1.0',
    now: new Date('2026-11-18T10:00:00Z')
  })
}

describe('paquet d’échange', () => {
  it('écrit decoupage.json et copie les vignettes sous le nom complet du plan', async () => {
    const decoupage = makeDecoupage({ '10': ['10', '10A', '20'] }, true)
    const [first, second] = decoupage.scenes[0].shots
    first.thumbnail = 'storyboard/vignettes/a_1.png'
    second.thumbnail = 'storyboard/vignettes/disparue.png'
    await writeFile(join(dataDir, 'storyboard', 'vignettes', 'a_1.png'), 'image A')

    const jsonPath = await write(decoupage)
    expect(jsonPath).toBe(join(exportFolder(dataDir), 'decoupage.json'))
    expect(await listTree(exportFolder(dataDir))).toEqual([
      'decoupage.json',
      'vignettes/',
      'vignettes/S_0010_P_0010.png'
    ])
    expect(
      await readFile(join(exportFolder(dataDir), 'vignettes', 'S_0010_P_0010.png'), 'utf8')
    ).toBe('image A')

    const json = JSON.parse(await readFile(jsonPath, 'utf8'))
    expect(json.targetBlend).toBe('../../../06_Blender/Storyboard/Mon_Film_d_ete_storyboard.blend')
    expect(
      json.scenes[0].shots.map((shot: { thumbnail: string | null }) => shot.thumbnail)
    ).toEqual(['vignettes/S_0010_P_0010.png', null, null])
  })

  it('remplace entièrement l’export précédent (aucun ancien fichier ne subsiste)', async () => {
    const decoupage = makeDecoupage({ '10': ['10', '20'] })
    for (const shot of decoupage.scenes[0].shots) {
      shot.thumbnail = `storyboard/vignettes/${shot.id}.png`
      await writeFile(join(dataDir, shot.thumbnail), shot.id)
    }
    await write(decoupage)
    await writeFile(join(exportFolder(dataDir), 'note-perso.txt'), 'à effacer')

    decoupage.scenes[0].shots.pop()
    await write(decoupage)
    expect(await listTree(exportFolder(dataDir))).toEqual([
      'decoupage.json',
      'vignettes/',
      'vignettes/S_0010_P_0010.png'
    ])
    // Aucun dossier temporaire ou ancien export ne traîne à côté.
    expect(await listTree(join(dataDir, 'blender'))).toEqual([
      'export/',
      'export/decoupage.json',
      'export/vignettes/',
      'export/vignettes/S_0010_P_0010.png'
    ])
  })

  it('un échec laisse l’export précédent intact', async () => {
    const decoupage = makeDecoupage({ '10': ['10'] })
    await write(decoupage)
    const before = await readFile(join(exportFolder(dataDir), 'decoupage.json'), 'utf8')

    // Une vignette présente au moment du tri, mais illisible à la copie (c'est un dossier).
    decoupage.scenes[0].shots[0].thumbnail = 'storyboard/vignettes/dossier.png'
    await mkdir(join(dataDir, 'storyboard', 'vignettes', 'dossier.png'))
    await expect(write(decoupage)).rejects.toThrow()

    expect(await readFile(join(exportFolder(dataDir), 'decoupage.json'), 'utf8')).toBe(before)
    expect(await listTree(join(dataDir, 'blender'))).toEqual([
      'export/',
      'export/decoupage.json',
      'export/vignettes/'
    ])
  })
})
