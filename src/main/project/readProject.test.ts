import { readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createProject } from './createProject'
import { readProject, type LoadedProject } from './readProject'
import {
  fixedSources,
  loadTestTemplate,
  makeTempDir,
  readAllFiles,
  removeDir,
  request
} from './testHelpers'

let location: string
let loaded: LoadedProject

beforeEach(async () => {
  location = await makeTempDir()
  loaded = await createProject(
    request(location, { folders: ['04_Son'] }),
    await loadTestTemplate(),
    fixedSources()
  )
})

afterEach(() => removeDir(location))

/** Vérifie que l'ouverture échoue avec ce message et qu'aucun fichier n'a changé. */
async function expectReadFailure(message: string | RegExp): Promise<void> {
  const before = await readAllFiles(loaded.rootDir)
  await expect(readProject(loaded.projectFilePath)).rejects.toThrow(message)
  expect(await readAllFiles(loaded.rootDir)).toEqual(before)
}

const decoupagePath = (): string => join(loaded.dataDir, 'decoupage.json')
const projectPath = (): string => join(loaded.dataDir, 'projet.json')

describe('lecture d’un projet abîmé', () => {
  it('decoupage.json contenant du texte quelconque', async () => {
    await writeFile(decoupagePath(), 'Bonjour, ceci n’est pas du JSON')
    await expectReadFailure('Le fichier decoupage.json est illisible')
  })

  it('projet.json manquant', async () => {
    await rm(projectPath())
    await expectReadFailure('Le fichier projet.json est introuvable')
  })

  it('scenario.fountain manquant', async () => {
    await rm(join(loaded.dataDir, 'scenario.fountain'))
    await expectReadFailure('Le fichier scenario.fountain est introuvable')
  })

  it('champ de mauvais type', async () => {
    const data = JSON.parse(await readFile(decoupagePath(), 'utf8'))
    data.scenes[0].shots[0].duration = 'trois secondes'
    await writeFile(decoupagePath(), JSON.stringify(data))
    await expectReadFailure('le champ « scenes[0].shots[0].duration » est absent ou incorrect')
  })

  it('champ obligatoire absent', async () => {
    const data = JSON.parse(await readFile(projectPath(), 'utf8'))
    delete data.title
    await writeFile(projectPath(), JSON.stringify(data))
    await expectReadFailure('Le fichier projet.json est illisible : le champ « title »')
  })

  it('version de format plus récente', async () => {
    const data = JSON.parse(await readFile(projectPath(), 'utf8'))
    data.formatVersion = 2
    await writeFile(projectPath(), JSON.stringify(data))
    await expectReadFailure('créé avec une version plus récente de NeoScenar')
  })

  it('fichier .neoscenar d’une version plus récente', async () => {
    await writeFile(
      loaded.projectFilePath,
      JSON.stringify({ type: 'neoscenar-projet', formatVersion: 9, autreChose: true })
    )
    await expectReadFailure('version plus récente')
  })

  it('fichier .neoscenar qui n’est pas un projet', async () => {
    await writeFile(loaded.projectFilePath, JSON.stringify({ type: 'autre' }))
    await expectReadFailure('n’est pas un projet NeoScenar')
  })

  it('dossier de données pointant hors du projet', async () => {
    await writeFile(
      loaded.projectFilePath,
      JSON.stringify({ type: 'neoscenar-projet', formatVersion: 1, dataFolder: '../ailleurs' })
    )
    await expectReadFailure('le champ « dataFolder »')
  })

  it('projet déplacé ou renommé', async () => {
    const movedRoot = `${loaded.rootDir}_deplace`
    await rename(loaded.rootDir, movedRoot)
    await expect(readProject(loaded.projectFilePath)).rejects.toThrow('Le projet est introuvable')
    await stat(movedRoot)
  })
})

describe('lecture d’un projet copié ailleurs', () => {
  it('fonctionne depuis un autre emplacement', async () => {
    const copyRoot = join(location, 'Copie_sur_cle_USB')
    await rename(loaded.rootDir, copyRoot)
    const copied = await readProject(join(copyRoot, 'Mon_Film_d_ete.neoscenar'))
    expect(copied.project).toEqual(loaded.project)
    expect(copied.decoupage).toEqual(loaded.decoupage)
    expect(copied.rootDir).toBe(copyRoot)
  })
})

describe('ajouts compatibles au format du découpage', () => {
  it('un decoupage.json sans « heading » est lu avec un en-tête vide', async () => {
    const data = JSON.parse(await readFile(decoupagePath(), 'utf8'))
    delete data.scenes[0].heading
    await writeFile(decoupagePath(), JSON.stringify(data))
    const reread = await readProject(loaded.projectFilePath)
    expect(reread.decoupage.scenes[0].heading).toBe('')
    expect(reread.decoupage.formatVersion).toBe(1)
  })

  it('un decoupage.json sans « scriptLinked » (étape 8) est lu comme pas encore lié', async () => {
    const data = JSON.parse(await readFile(decoupagePath(), 'utf8'))
    delete data.scriptLinked
    await writeFile(decoupagePath(), JSON.stringify(data))
    const reread = await readProject(loaded.projectFilePath)
    expect(reread.decoupage.scriptLinked).toBe(false)
    expect(reread.decoupage.formatVersion).toBe(1)
  })

  it('un decoupage.json aux numéros de scène non croissants est accepté (étape 8)', async () => {
    const data = JSON.parse(await readFile(decoupagePath(), 'utf8'))
    const second = { ...data.scenes[0], id: 'autre-scene', number: 5, shots: [] }
    data.scenes.push(second)
    await writeFile(decoupagePath(), JSON.stringify(data))
    const reread = await readProject(loaded.projectFilePath)
    expect(reread.decoupage.scenes.map((scene) => scene.number)).toEqual([10, 5])
  })

  it('un decoupage.json sans les champs de vignette (étape 3) est lu avec null', async () => {
    const data = JSON.parse(await readFile(decoupagePath(), 'utf8'))
    delete data.scenes[0].shots[0].thumbnailSource
    delete data.scenes[0].shots[0].thumbnailCrop
    await writeFile(decoupagePath(), JSON.stringify(data))
    const shot = (await readProject(loaded.projectFilePath)).decoupage.scenes[0].shots[0]
    expect(shot.thumbnailSource).toBeNull()
    expect(shot.thumbnailCrop).toBeNull()
  })

  it('un cadre de vignette valide est relu tel quel ; un cadre qui sort de l’image est refusé', async () => {
    const data = JSON.parse(await readFile(decoupagePath(), 'utf8'))
    const crop = {
      rotation: 90,
      mode: 'crop',
      frame: { x: 0, y: 0.21, width: 1, height: 0.56 },
      bands: 'white',
      auto: false
    }
    Object.assign(data.scenes[0].shots[0], {
      thumbnail: 'storyboard/vignettes/a_20261117-143012-042.png',
      thumbnailSource: 'storyboard/originaux/a_20261117-143012-042.jpg',
      thumbnailCrop: crop
    })
    await writeFile(decoupagePath(), JSON.stringify(data))
    const shot = (await readProject(loaded.projectFilePath)).decoupage.scenes[0].shots[0]
    expect(shot.thumbnailCrop).toEqual(crop)

    data.scenes[0].shots[0].thumbnailCrop = {
      ...crop,
      frame: { x: 0.5, y: 0, width: 0.8, height: 1 }
    }
    await writeFile(decoupagePath(), JSON.stringify(data))
    await expect(readProject(loaded.projectFilePath)).rejects.toThrow(/thumbnailCrop\.frame/)
  })

  it('un nouveau projet enregistre l’en-tête de scène', async () => {
    const data = JSON.parse(await readFile(decoupagePath(), 'utf8'))
    expect(data.scenes[0].heading).toBe('')
  })
})

describe('ajouts compatibles au format de projet.json', () => {
  it('un projet.json sans « lastBlenderExport » (avant l’étape 5a) est lu avec null', async () => {
    const data = JSON.parse(await readFile(projectPath(), 'utf8'))
    delete data.lastBlenderExport
    await writeFile(projectPath(), JSON.stringify(data))
    expect((await readProject(loaded.projectFilePath)).project.lastBlenderExport).toBeNull()
  })

  it('le dernier export vers Blender est relu ; une forme incorrecte est refusée', async () => {
    const data = JSON.parse(await readFile(projectPath(), 'utf8'))
    const record = {
      exportedAt: '2026-11-18T10:00:00Z',
      blendPath: '06_Blender/Storyboard/a.blend'
    }
    data.lastBlenderExport = record
    await writeFile(projectPath(), JSON.stringify(data))
    expect((await readProject(loaded.projectFilePath)).project.lastBlenderExport).toEqual(record)

    data.lastBlenderExport = { exportedAt: 12 }
    await writeFile(projectPath(), JSON.stringify(data))
    await expectReadFailure('lastBlenderExport.exportedAt')
  })
})

describe('découpage incohérent', () => {
  it('deux plans avec le même numéro', async () => {
    const data = JSON.parse(await readFile(decoupagePath(), 'utf8'))
    data.scenes[0].shots.push({ ...data.scenes[0].shots[0], id: 'autre-identifiant' })
    await writeFile(decoupagePath(), JSON.stringify(data))
    await expectReadFailure('les numéros des plans de S_0010 sont en double ou dans le désordre')
  })

  it('deux éléments avec le même identifiant', async () => {
    const data = JSON.parse(await readFile(decoupagePath(), 'utf8'))
    data.scenes[0].shots.push({ ...data.scenes[0].shots[0], number: 20 })
    await writeFile(decoupagePath(), JSON.stringify(data))
    await expectReadFailure('est utilisé deux fois')
  })
})
