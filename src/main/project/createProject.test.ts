import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defaultFoldersFor, type FolderTemplate } from '../../shared/folderTemplate'
import { createProject } from './createProject'
import { readProject } from './readProject'
import {
  fixedSources,
  listTree,
  loadTestTemplate,
  makeTempDir,
  readAllFiles,
  removeDir,
  request
} from './testHelpers'

let location: string
let template: FolderTemplate

beforeEach(async () => {
  location = await makeTempDir()
  template = await loadTestTemplate()
})

afterEach(() => removeDir(location))

const DATA_TREE = [
  'Mon_Film_d_ete.neoscenar',
  'neoscenar/',
  'neoscenar/blender/',
  'neoscenar/decoupage.json',
  'neoscenar/documents/',
  'neoscenar/exports/',
  'neoscenar/lieux/',
  'neoscenar/lieux/images/',
  'neoscenar/personnages/',
  'neoscenar/personnages/images/',
  'neoscenar/projet.json',
  'neoscenar/sauvegardes/',
  'neoscenar/scenario.fountain',
  'neoscenar/storyboard/',
  'neoscenar/storyboard/scans/',
  'neoscenar/storyboard/vignettes/',
  'neoscenar/versions/'
]

describe('création d’un projet', () => {
  it('enregistre le format choisi dans projet.json', async () => {
    const settings = { fps: 24, resolution: { width: 1080, height: 1920 } }
    const loaded = await createProject(request(location, { settings }), template, fixedSources())
    const raw = JSON.parse(await readFile(join(loaded.dataDir, 'projet.json'), 'utf8'))
    expect(raw.settings).toEqual(settings)
  })

  it('crée l’arborescence d’un projet Animation Blender avec LISEZMOI', async () => {
    const folders = defaultFoldersFor(template, 'animation')
    await createProject(request(location, { folders }), template, fixedSources())
    const tree = await listTree(join(location, 'Mon_Film_d_ete'))

    expect(tree).toEqual(expect.arrayContaining(DATA_TREE))
    expect(tree).toEqual(
      expect.arrayContaining([
        '06_Blender/',
        '06_Blender/LISEZMOI.txt',
        '06_Blender/Assets/Personnages/',
        '06_Blender/Assets/Decors/',
        '06_Blender/Assets/Accessoires/',
        '06_Blender/Storyboard/',
        '06_Blender/Textures/',
        '06_Blender/Plans/',
        '04_Son/Prise_de_son/',
        '04_Son/Voix_off/',
        '04_Son/Bruitages/',
        '04_Son/Musique/',
        '07_Rendus/LISEZMOI.txt'
      ])
    )
    const topFolders = tree.filter((entry) => /^\d\d_[^/]+\/$/.test(entry))
    expect(topFolders).toEqual(folders.map((name) => `${name}/`).sort())
    expect(tree).not.toContain('03_Rushes/')
    // LISEZMOI uniquement dans les dossiers principaux.
    expect(tree.filter((entry) => entry.endsWith('LISEZMOI.txt'))).toHaveLength(folders.length)
  })

  it('ne crée aucun LISEZMOI quand l’option est décochée', async () => {
    await createProject(
      request(location, { folders: ['04_Son', '09_VFX'], withReadme: false }),
      template,
      fixedSources()
    )
    const tree = await listTree(join(location, 'Mon_Film_d_ete'))
    expect(tree.some((entry) => entry.includes('LISEZMOI'))).toBe(false)
    expect(tree).toContain('09_VFX/')
    expect(tree).toContain('04_Son/Musique/')
  })

  it('ne crée que le dossier neoscenar/ pour un projet Personnalisé sans dossier coché', async () => {
    await createProject(
      request(location, { projectType: 'personnalise' }),
      template,
      fixedSources()
    )
    expect(await listTree(join(location, 'Mon_Film_d_ete'))).toEqual(DATA_TREE)
  })

  it('écrit les contenus initiaux attendus', async () => {
    await createProject(request(location, { folders: ['04_Son'] }), template, fixedSources())
    const root = join(location, 'Mon_Film_d_ete')
    const read = (path: string): Promise<string> => readFile(join(root, path), 'utf8')

    expect(JSON.parse(await read('Mon_Film_d_ete.neoscenar'))).toEqual({
      type: 'neoscenar-projet',
      formatVersion: 1,
      dataFolder: 'neoscenar'
    })
    expect(await read('neoscenar/scenario.fountain')).toBe(
      'Title: Mon Film d’été\nAuthor:\n\n.SCÈNE À ÉCRIRE #10#\n'
    )
    expect(JSON.parse(await read('neoscenar/projet.json'))).toEqual({
      formatVersion: 1,
      id: '00000000-0000-4000-8000-000000000001',
      title: 'Mon Film d’été',
      folderName: 'Mon_Film_d_ete',
      projectType: 'animation',
      template: 'saint-luc',
      createdAt: '2026-11-17T15:40:12.000Z',
      modifiedAt: '2026-11-17T15:40:12.000Z',
      logline: '',
      synopsis: '',
      settings: { fps: 25, resolution: { width: 1920, height: 1080 } },
      filmFolders: ['04_Son'],
      lastBlenderExport: null,
      exportPdf: { pageDeTitre: true, numerotation: 'fountain', nouvellePageParActe: false },
      exportStoryboard: { kind: 'planches', scope: 'all', sceneNumbers: [], newPagePerScene: false }
    })
    const decoupage = JSON.parse(await read('neoscenar/decoupage.json'))
    expect(decoupage.formatVersion).toBe(1)
    expect(decoupage.numbersLocked).toBe(false)
    expect(decoupage.scriptLinked).toBe(true)
    expect(decoupage.scenes).toHaveLength(1)
    expect(decoupage.scenes[0]).toMatchObject({ number: 10, letter: '', name: '', color: null })
    expect(decoupage.scenes[0].shots).toEqual([
      {
        id: '00000000-0000-4000-8000-000000000003',
        number: 10,
        letter: '',
        name: '',
        color: null,
        thumbnail: null,
        thumbnailSource: null,
        thumbnailCrop: null,
        duration: null,
        shotSize: null,
        cameraMovement: null,
        cameraAngle: null,
        sound: '',
        music: '',
        description: ''
      }
    ])
    expect(await read('04_Son/LISEZMOI.txt')).toBe(
      'Dossier 04_Son : Tous les fichiers son du film.\n' +
        'Sous-dossiers : Prise_de_son, Voix_off, Bruitages, Musique.\n' +
        'Ce fichier a été créé par NeoScenar. Vous pouvez le supprimer.\n'
    )
  })

  it('écrit des fichiers en UTF-8, avec des fins de ligne \\n et sans chemin absolu', async () => {
    const folders = template.folders.map((folder) => folder.name)
    await createProject(request(location, { folders }), template, fixedSources())
    const files = await readAllFiles(join(location, 'Mon_Film_d_ete'))
    expect(files.size).toBeGreaterThan(10)
    for (const [name, content] of files) {
      expect(content, name).not.toContain('\r')
      expect(content, name).not.toContain(location)
      expect(content, name).not.toMatch(/(^|["\s])(\/Users|\/home|[A-Za-z]:\\)/)
    }
  })

  it('relit exactement les données écrites', async () => {
    const created = await createProject(
      request(location, { folders: ['01_Production'] }),
      template,
      fixedSources()
    )
    const reread = await readProject(created.projectFilePath)
    expect(reread).toEqual(created)
    expect(reread.project.title).toBe('Mon Film d’été')
    expect(reread.decoupage.scenes[0].shots).toHaveLength(1)
  })

  it('refuse un dossier déjà existant et ne touche à rien', async () => {
    const existing = join(location, 'Mon_Film_d_ete')
    await mkdir(existing)
    await writeFile(join(existing, 'important.txt'), 'à garder')
    await expect(createProject(request(location), template, fixedSources())).rejects.toThrow(
      'Un dossier « Mon_Film_d_ete » existe déjà'
    )
    expect(await listTree(existing)).toEqual(['important.txt'])
  })

  it('refuse un nom vide ou sans lettre ni chiffre, sans rien créer', async () => {
    await expect(
      createProject(request(location, { title: '   ' }), template, fixedSources())
    ).rejects.toThrow('Donnez un nom au projet')
    await expect(
      createProject(request(location, { title: '?!' }), template, fixedSources())
    ).rejects.toThrow('au moins une lettre')
    expect(await listTree(location)).toEqual([])
  })

  it('refuse un dossier qui ne fait pas partie du modèle, sans rien créer', async () => {
    await expect(
      createProject(request(location, { folders: ['../ailleurs'] }), template, fixedSources())
    ).rejects.toThrow('ne fait pas partie du modèle')
    expect(await listTree(location)).toEqual([])
  })
})
