// Projet d'essai du storyboard (tests et `npm run pdf:storyboard:exemple`).
// Node seulement : lit la police Inter et fabrique des vignettes PNG.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'
import type { StoryboardInput, StoryboardKind, StoryboardShot } from '../src/index.ts'

const ROOT = join(import.meta.dirname, '..', '..', '..')

export const FONTS = {
  regular: new Uint8Array(
    readFileSync(join(ROOT, 'resources', 'polices', 'inter', 'Inter-Regular.ttf'))
  ),
  bold: new Uint8Array(readFileSync(join(ROOT, 'resources', 'polices', 'inter', 'Inter-Bold.ttf')))
}

export const FORMATS = {
  '16-9': { width: 1920, height: 1080 },
  '2-39': { width: 1920, height: 804 },
  '9-16': { width: 1080, height: 1920 }
} as const

export type FormatName = keyof typeof FORMATS

const LOREM =
  "Marie traverse la cuisine sans un regard pour Paul, attablé devant son café froid. Elle ouvre le frigo, hésite, le referme. Au premier plan, la radio grésille ; à l'arrière-plan, par la fenêtre, on devine la rue mouillée et les phares d'une voiture qui passe lentement."

export function shot(
  scene: number,
  number: number,
  fields: Partial<StoryboardShot> = {}
): StoryboardShot {
  const sceneLabel = `S_${String(scene).padStart(4, '0')}`
  const shotLabel = `P_${String(number).padStart(4, '0')}`
  return {
    shotId: `${sceneLabel}_${shotLabel}`,
    sceneId: sceneLabel,
    sceneLabel,
    shotLabel,
    name: '',
    sceneHeading: '',
    duration: null,
    cameraMovement: '',
    music: '',
    shotSize: '',
    sound: '',
    cameraAngle: '',
    description: '',
    ...fields
  }
}

/** Plans du projet d'essai : plans courts, un plan à longue description, un plan plus haut qu'une page. */
export function exampleShots(): StoryboardShot[] {
  const kitchen = 'INT. CUISINE - JOUR'
  const street = 'EXT. RUE DES TANNEURS - NUIT'
  const roof = 'EXT. TOIT DE L’IMMEUBLE - AUBE'
  return [
    shot(10, 10, {
      sceneHeading: kitchen,
      name: 'Marie entre',
      duration: 4,
      cameraMovement: 'Panoramique',
      music: 'Thème de Marie (piano)',
      shotSize: 'Plan moyen',
      sound: 'Porte qui grince.\nMARIE : « Tu es encore là ? »',
      cameraAngle: 'Frontal',
      description: 'Marie entre par la porte du fond et s’arrête sur le seuil.'
    }),
    shot(10, 20, { sceneHeading: kitchen }),
    shot(10, 30, {
      sceneHeading: kitchen,
      name: 'Le café froid, vu de très près, avec la cuillère qui tourne encore toute seule',
      duration: 2.5,
      shotSize: 'Très gros plan',
      cameraMovement: 'Plan fixe',
      cameraAngle: 'Plongée',
      description: 'La tasse de Paul.'
    }),
    shot(20, 10, {
      sceneHeading: street,
      name: 'Longue description',
      duration: 12,
      cameraMovement: 'Traveling compensé',
      shotSize: 'Plan d’ensemble',
      sound:
        'Pluie, moteur au loin, klaxon. PAUL (off) : « Marie ! Attends-moi ! » ' +
        'Pas qui claquent sur les pavés. '.repeat(4),
      cameraAngle: 'Contre-plongée',
      description: `${LOREM}\n\n${LOREM}\n\n${LOREM}`
    }),
    shot(20, 20, { sceneHeading: street, duration: 3, shotSize: 'Gros plan' }),
    shot(30, 10, {
      sceneHeading: roof,
      name: 'Plan-séquence (plus haut qu’une page)',
      duration: 95,
      cameraMovement: 'Traveling',
      shotSize: 'Plan demi-ensemble',
      cameraAngle: 'Vue plafond',
      description: Array.from({ length: 12 }, () => LOREM).join('\n\n')
    }),
    shot(30, 20, { sceneHeading: roof, duration: 5, description: 'Le soleil se lève.' }),
    shot(40, 10, { sceneHeading: '', duration: 1 })
  ]
}

/** Plans qui reçoivent une vignette dans le projet d'essai (les autres gardent une case vide). */
export const SHOTS_WITH_THUMBNAIL = [
  'S_0010_P_0010',
  'S_0010_P_0030',
  'S_0020_P_0010',
  'S_0030_P_0020'
]

export function exampleInput(
  format: FormatName,
  kind: StoryboardKind,
  overrides: Partial<StoryboardInput> = {}
): StoryboardInput {
  const size = FORMATS[format]
  const thumbnails = new Map(
    SHOTS_WITH_THUMBNAIL.map((id, index) => [id, testPng(size.width / 8, size.height / 8, index)])
  )
  return {
    kind,
    title: 'La Cuisine — essai du storyboard',
    projectId: '0b3c5a1e-1234-4abc-9def-0123456789ab',
    printId: `20261119-120000-${format}`,
    createdAt: '2026-11-19T12:00:00.000Z',
    format: size,
    shots: exampleShots(),
    options: { newPagePerScene: false },
    fonts: FONTS,
    thumbnails,
    ...overrides
  }
}

// --- Vignette PNG d'essai : dégradé, bord rouge d'un pixel et diagonales (bords de case visibles).

const TINTS: [number, number, number][] = [
  [120, 170, 230],
  [240, 190, 110],
  [150, 210, 150],
  [210, 150, 210]
]

export function testPng(widthIn: number, heightIn: number, tint = 0): Uint8Array {
  const width = Math.round(widthIn)
  const height = Math.round(heightIn)
  const [r0, g0, b0] = TINTS[tint % TINTS.length]
  const raw = Buffer.alloc((width * 3 + 1) * height)
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1)
    raw[row] = 0
    for (let x = 0; x < width; x++) {
      const border = x === 0 || y === 0 || x === width - 1 || y === height - 1
      const diagonal =
        Math.abs(x / width - y / height) < 0.01 || Math.abs(x / width - (1 - y / height)) < 0.01
      const shade = 0.6 + (0.4 * x) / width
      const pixel: [number, number, number] = border
        ? [220, 0, 0]
        : diagonal
          ? [40, 40, 40]
          : [r0 * shade, g0 * shade, b0 * shade]
      raw.set(pixel.map(Math.round), row + 1 + x * 3)
    }
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.set([8, 2, 0, 0, 0], 8)
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', header),
      chunk('IDAT', deflateSync(raw)),
      chunk('IEND', Buffer.alloc(0))
    ])
  )
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
  }
  return (crc ^ 0xffffffff) >>> 0
}
