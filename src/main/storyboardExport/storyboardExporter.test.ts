import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Scene, Shot } from '../../shared/projectTypes'
import type { StoryboardExportOptions } from '../../shared/storyboardExport'
import { createProject } from '../project/createProject'
import type { LoadedProject } from '../project/readProject'
import {
  fixedSources,
  loadTestTemplate,
  makeTempDir,
  removeDir,
  request
} from '../project/testHelpers'
import {
  newPrintId,
  parseStoryboardRequest,
  selectScenes,
  StoryboardExporter
} from './storyboardExporter'

const FONTS = join(import.meta.dirname, '..', '..', '..', 'resources', 'polices', 'inter')

// PNG 1×1 valide.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

const options = (over: Partial<StoryboardExportOptions> = {}): StoryboardExportOptions => ({
  kind: 'planches',
  scope: 'all',
  sceneNumbers: [],
  newPagePerScene: false,
  ...over
})

function shot(number: number, over: Partial<Shot> = {}): Shot {
  return {
    id: `shot-${number}`,
    number,
    letter: '',
    name: '',
    color: null,
    thumbnail: null,
    thumbnailSource: null,
    thumbnailCrop: null,
    duration: 4,
    shotSize: null,
    cameraMovement: null,
    cameraAngle: null,
    sound: '',
    music: '',
    description: 'Une description.',
    ...over
  }
}

function scene(number: number, shots: Shot[], over: Partial<Scene> = {}): Scene {
  return {
    id: `scene-${number}`,
    number,
    letter: '',
    name: '',
    heading: `INT. LIEU ${number} - JOUR`,
    color: null,
    shots,
    orphan: false,
    ...over
  }
}

let location: string
let loaded: LoadedProject
let flushed = 0

function exporter(scenario: string | null = null): StoryboardExporter {
  return new StoryboardExporter({
    current: () => loaded,
    readScenario: async () => scenario,
    flush: async () => {
      flushed++
    },
    fontsDir: FONTS,
    now: () => new Date(2026, 10, 19, 15, 30, 12)
  })
}

beforeEach(async () => {
  flushed = 0
  location = await makeTempDir()
  loaded = await createProject(request(location), await loadTestTemplate(), fixedSources())
  loaded.decoupage.scenes = [
    scene(10, [shot(10), shot(20)]),
    scene(20, [shot(10)], { letter: 'A' }),
    scene(30, [shot(10)], { orphan: true }),
    scene(40, [])
  ]
})

afterEach(() => removeDir(location))

describe('sélection des scènes', () => {
  it('exclut les scènes orphelines et sans plan', () => {
    const numbers = selectScenes(loaded.decoupage.scenes, options()).map((s) => s.number)
    expect(numbers).toEqual([10, 20])
  })

  it('retrouve les scènes par numéro affiché, avec lettre ; une scène disparue est ignorée', () => {
    const chosen = selectScenes(
      loaded.decoupage.scenes,
      options({ scope: 'scenes', sceneNumbers: ['S_0020A', 'S_0099'] })
    )
    expect(chosen.map((s) => s.id)).toEqual(['scene-20'])
  })

  it('ne trouve pas une scène orpheline même choisie', () => {
    const chosen = selectScenes(
      loaded.decoupage.scenes,
      options({ scope: 'scenes', sceneNumbers: ['S_0030'] })
    )
    expect(chosen).toEqual([])
  })
})

describe('scènes brouillon (18C-13)', () => {
  const SCENARIO = [
    'Title: Film',
    '',
    'INT. LIEU 10 - JOUR #10#',
    '',
    'Action.',
    '',
    'INT. LIEU 20 - JOUR #20A#',
    '[[BROUILLON]]',
    '',
    'Idée.',
    ''
  ].join('\n')

  it('ne sont ni proposées ni imprimées', async () => {
    const info = await exporter(SCENARIO).info()
    expect(info.scenes.map((s) => s.number)).toEqual(['S_0010'])
    const chosen = selectScenes(loaded.decoupage.scenes, options(), new Set(['20A']))
    expect(chosen.map((s) => s.number)).toEqual([10])
  })

  it('sans texte lisible, rien n’est écarté', async () => {
    const info = await exporter(null).info()
    expect(info.scenes.map((s) => s.number)).toEqual(['S_0010', 'S_0020A'])
  })
})

describe('demande reçue de l’interface', () => {
  it('accepte des options valides', () => {
    expect(parseStoryboardRequest(options({ kind: 'storyboard' })).kind).toBe('storyboard')
  })

  it.each([null, {}, { ...options(), kind: 'autre' }, { ...options(), sceneNumbers: [3] }])(
    'refuse %j',
    (raw) => {
      expect(() => parseStoryboardRequest(raw)).toThrow()
    }
  )

  it('fabrique des identifiants d’impression sans accent ni espace', () => {
    expect(newPrintId(new Date(2026, 10, 19, 15, 30, 12))).toMatch(/^20261119-153012-[0-9a-f]{4}$/)
  })
})

describe('export du storyboard', () => {
  it('relit les options en retirant les scènes disparues, après avoir enregistré les Cartes', async () => {
    loaded.project.exportStoryboard = options({
      scope: 'scenes',
      sceneNumbers: ['S_0010', 'S_0099']
    })
    const info = await exporter().info()
    expect(flushed).toBe(1)
    expect(info.options.sceneNumbers).toEqual(['S_0010'])
    expect(info.scenes.map((s) => [s.number, s.shotCount])).toEqual([
      ['S_0010', 2],
      ['S_0020A', 1]
    ])
  })

  it('compte les vignettes et signale les illisibles', async () => {
    await mkdir(join(loaded.dataDir, 'storyboard', 'vignettes'), { recursive: true })
    await writeFile(join(loaded.dataDir, 'storyboard', 'vignettes', 'a.png'), PNG)
    await writeFile(join(loaded.dataDir, 'storyboard', 'vignettes', 'abime.png'), 'pas un png')
    loaded.decoupage.scenes[0].shots[0].thumbnail = 'storyboard/vignettes/a.png'
    loaded.decoupage.scenes[0].shots[1].thumbnail = 'storyboard/vignettes/abime.png'
    loaded.decoupage.scenes[1].shots[0].thumbnail = 'storyboard/vignettes/absente.png'

    const storyboard = await exporter().preview(options({ kind: 'storyboard' }))
    expect(storyboard.shotCount).toBe(3)
    expect(storyboard.thumbnailCount).toBe(1)
    expect(storyboard.unreadable.sort()).toEqual(['S_0010 · P_0020', 'S_0020A · P_0010'])
    const planches = await exporter().preview(options())
    expect(planches.thumbnailCount).toBe(0)
    expect(planches.unreadable).toEqual([])
  })

  it('permet l’export à 0 vignette', async () => {
    const result = await exporter().preview(options({ kind: 'storyboard' }))
    expect(result.thumbnailCount).toBe(0)
    expect(result.shotCount).toBe(3)
    expect(Buffer.from(result.bytes!.slice(0, 5)).toString()).toBe('%PDF-')
  })

  it('ne produit rien quand aucune scène n’est retenue', async () => {
    const result = await exporter().preview(options({ scope: 'scenes', sceneNumbers: [] }))
    expect(result.bytes).toBeNull()
    await expect(exporter().save(options({ scope: 'scenes' }), null)).rejects.toThrow()
  })

  it('enregistre le PDF, le fichier d’impression et mémorise les options', async () => {
    const chosen = options({ scope: 'scenes', sceneNumbers: ['S_0010'], newPagePerScene: true })
    const saved = await exporter().save(chosen, null)
    expect(saved.relativePath).toBe('neoscenar/exports/Mon_Film_d_ete_planches_2026-11-19.pdf')
    expect((await readFile(saved.path)).subarray(0, 5).toString()).toBe('%PDF-')

    const folder = join(loaded.dataDir, 'storyboard', 'impressions')
    const files = await readdir(folder)
    expect(files).toHaveLength(1)
    const record = JSON.parse(await readFile(join(folder, files[0]), 'utf8'))
    expect(files[0]).toBe(`${record.printId}.json`)
    expect(record.pages[0].shots.map((s: { shotId: string }) => s.shotId)).toEqual([
      'shot-10',
      'shot-20'
    ])

    const onDisk = JSON.parse(await readFile(join(loaded.dataDir, 'projet.json'), 'utf8'))
    expect(onDisk.exportStoryboard).toEqual(chosen)

    // Un second export écrit un second fichier d'impression, jamais le même.
    await exporter().save(chosen, null)
    expect(await readdir(folder)).toHaveLength(2)
  })

  it('nomme le fichier selon le type', async () => {
    const saved = await exporter().save(options({ kind: 'storyboard' }), null)
    expect(saved.relativePath).toBe('neoscenar/exports/Mon_Film_d_ete_storyboard_2026-11-19.pdf')
  })
})
