import { describe, expect, it } from 'vitest'
import { createShot } from '../decoupage/factories'
import { makeDecoupage } from '../decoupage/testFixtures'
import type { Decoupage, Shot } from '../projectTypes'
import example from './fixtures/exemple-format.json'
import {
  buildExchange,
  durationToFrames,
  exchangeColor,
  exportSummary,
  type ExchangeInput
} from './exchange'

const project = {
  id: 'projet-1',
  title: 'Mon Film d’été',
  folderName: 'Mon_Film_d_ete',
  settings: { fps: 25, resolution: { width: 1920, height: 1080 } }
}

function input(decoupage: Decoupage, overrides: Partial<ExchangeInput> = {}): ExchangeInput {
  return {
    project,
    decoupage,
    targetBlend: '../../../06_Blender/Storyboard/Mon_Film_d_ete_storyboard.blend',
    exportedAt: new Date('2026-11-18T10:00:00.123Z'),
    neoscenarVersion: '0.5.0',
    hasThumbnailFile: () => true,
    ...overrides
  }
}

describe('durée en images', () => {
  it('3,5 s à 25 i/s donnent 88 images (arrondi au plus proche)', () => {
    expect(durationToFrames(3.5, 25)).toBe(88)
    expect(durationToFrames(1.02, 25)).toBe(26)
    expect(durationToFrames(2, 24)).toBe(48)
  })

  it('au minimum 1 image, et null sans durée', () => {
    expect(durationToFrames(0, 25)).toBe(1)
    expect(durationToFrames(0.01, 25)).toBe(1)
    expect(durationToFrames(null, 25)).toBeNull()
  })
})

describe('couleurs', () => {
  it('« #RRGGBB » en majuscules, ou null', () => {
    expect(exchangeColor('#aecbfa')).toBe('#AECBFA')
    expect(exchangeColor(null)).toBeNull()
    expect(exchangeColor('rouge')).toBeNull()
  })
})

describe('contenu de decoupage.json', () => {
  it('est conforme à l’exemple de référence du format d’échange', () => {
    const decoupage = makeDecoupage({ '10': ['10'] }, true)
    const scene = decoupage.scenes[0]
    Object.assign(scene, {
      id: 'uuid',
      name: 'Le réveil',
      heading: 'INT. CHAMBRE - JOUR',
      color: '#aecbfa'
    })
    Object.assign(scene.shots[0], {
      id: 'uuid',
      name: 'Le réveil sonne',
      duration: 3.5,
      shotSize: 'Gros plan',
      cameraMovement: 'Plan fixe',
      cameraAngle: 'Plongée',
      sound: 'Sonnerie du réveil',
      description: 'Le réveil sur la table de nuit…',
      thumbnail: 'storyboard/vignettes/uuid_20261118.png'
    } satisfies Partial<Shot>)
    const { file } = buildExchange(
      input(decoupage, {
        project: { ...project, id: 'uuid', title: "Mon Film d'été" }
      })
    )
    expect(JSON.parse(JSON.stringify(file))).toEqual(example)
  })

  it('garde l’ordre du film et nomme les plans avec et sans lettre', () => {
    const decoupage = makeDecoupage({ '10': ['10', '10A', '20'], '11': ['10'], '20': [] })
    // La fixture range les clés numériques avant « 10A » : la scène S_0010A est fabriquée ici.
    Object.assign(decoupage.scenes[1], { number: 10, letter: 'A' })
    const { file } = buildExchange(input(decoupage))
    expect(file.scenes.map((scene) => scene.label)).toEqual(['S_0010', 'S_0010A', 'S_0020'])
    expect(file.scenes[0].shots.map((shot) => [shot.label, shot.fullLabel])).toEqual([
      ['P_0010', 'S_0010_P_0010'],
      ['P_0010A', 'S_0010_P_0010A'],
      ['P_0020', 'S_0010_P_0020']
    ])
    expect(file.scenes[1].shots[0].fullLabel).toBe('S_0010A_P_0010')
    expect(file.scenes[1].letter).toBe('A')
    expect(file.scenes[2].shots).toEqual([])
    expect(file.numbersLocked).toBe(false)
  })

  it('les champs vides sont des chaînes vides, jamais absents', () => {
    const { file } = buildExchange(input(makeDecoupage({ '10': ['10'] })))
    const shot = file.scenes[0].shots[0]
    expect(shot).toMatchObject({
      name: '',
      scale: '',
      movement: '',
      angle: '',
      sounds: '',
      music: '',
      description: '',
      color: null,
      thumbnail: null,
      durationSeconds: null,
      durationFrames: null
    })
    expect(file.scenes[0]).toMatchObject({ name: '', heading: '', color: null })
  })

  it('les vignettes sont renommées d’après le plan, avec des chemins relatifs', () => {
    const decoupage = makeDecoupage({ '20': ['10A', '20'] })
    const shots = decoupage.scenes[0].shots
    shots[0].thumbnail = 'storyboard/vignettes/a.png'
    shots[1].thumbnail = 'storyboard/vignettes/disparue.png'
    const { file, thumbnails } = buildExchange(
      input(decoupage, { hasThumbnailFile: (path) => path !== 'storyboard/vignettes/disparue.png' })
    )
    expect(thumbnails).toEqual([
      { source: 'storyboard/vignettes/a.png', target: 'vignettes/S_0020_P_0010A.png' }
    ])
    expect(file.scenes[0].shots.map((shot) => shot.thumbnail)).toEqual([
      'vignettes/S_0020_P_0010A.png',
      null
    ])
  })

  it('reprend tel quel le .blend visé (relatif) et le format du projet', () => {
    const { file } = buildExchange(
      input(makeDecoupage({ '10': ['10'] }), { targetBlend: '../../../a.blend' })
    )
    expect(file.targetBlend).toBe('../../../a.blend')
    expect(file.settings).toEqual({ width: 1920, height: 1080, fps: 25 })
    expect(file.exportedAt).toBe('2026-11-18T10:00:00Z')
  })
})

describe('résumé de l’export', () => {
  it('compte scènes, plans, vignettes et plans sans durée', () => {
    const decoupage = makeDecoupage({ '10': ['10', '20'], '20': ['10'] })
    decoupage.scenes[0].shots[0].duration = 2
    decoupage.scenes[1].shots[0].thumbnail = 'storyboard/vignettes/x.png'
    decoupage.scenes[1].shots.push(createShot('extra', { number: 20, letter: '' }))
    decoupage.scenes[1].orphan = true
    expect(exportSummary(decoupage)).toEqual({
      scenes: 2,
      shots: 4,
      thumbnails: 1,
      shotsWithoutDuration: 3,
      orphans: ['S_0020']
    })
  })
})
