import { describe, expect, it } from 'vitest'
import { blocksTop, headerLayout, layoutStoryboard } from '../src/layout.ts'
import {
  BLOCKS,
  CONTENT,
  HEADER,
  MARK,
  markCenters,
  ZONE,
  ZONE_HEIGHT,
  zoneHeight
} from '../src/geometry.ts'
import type { LayoutInput, PageItem, StoryboardShot } from '../src/index.ts'
import { exampleShots, FORMATS, shot, type FormatName } from './fixtures.ts'
import { interMeasure, intersects, textBox, texts, words, type Box } from './helpers.ts'

const measure = await interMeasure()
const LONG =
  'Marie traverse la cuisine sans un regard pour Paul, attablé devant son café froid. ' +
  'Elle ouvre le frigo, hésite, le referme. Au premier plan, la radio grésille.'

function layout(shots: StoryboardShot[], overrides: Partial<LayoutInput> = {}) {
  return layoutStoryboard(
    {
      title: 'Essai',
      format: FORMATS['16-9'],
      shots,
      options: { newPagePerScene: false },
      ...overrides
    },
    measure
  )
}

function inkText(items: PageItem[]): string {
  return texts(items)
    .filter((item) => item.color === 'ink' && item.size !== HEADER.size)
    .map((item) => item.text)
    .join(' ')
}

describe('pages', () => {
  it('met trois plans vides par page, même s’ils ouvrent chacun une scène avec un en-tête', () => {
    const shots = [10, 20, 30, 40].map((scene) =>
      shot(scene, 10, { sceneHeading: 'EXT. RUE DES TANNEURS - NUIT', name: 'Nom du plan' })
    )
    const result = layout(shots)
    expect(result.pages.map((page) => page.cells.length)).toEqual([3, 1])
  })

  it('numérote les pages « 1 / N » dans l’en-tête', () => {
    const result = layout(exampleShots())
    const total = result.pages.length
    result.pages.forEach((page, index) => {
      expect(texts(page.items).map((item) => item.text)).toContain(
        `N° de page : ${index + 1} / ${total}`
      )
    })
  })

  it('donne une page à 1 ou 2 plans quand une description est longue', () => {
    const shots = [
      shot(10, 10),
      shot(10, 20, { description: Array.from({ length: 4 }, () => LONG).join('\n\n') }),
      shot(10, 30),
      shot(10, 40)
    ]
    const counts = layout(shots).pages.map((page) => page.cells.length)
    expect(counts[0]).toBeLessThan(3)
    expect(counts.reduce((a, b) => a + b, 0)).toBe(4)
  })

  it('ne coupe jamais un bloc qui tient sur une page', () => {
    const result = layout(exampleShots())
    for (const page of result.pages) {
      for (const cell of page.cells) {
        // Chaque plan dont la case est sur la page y a aussi sa dernière ligne de description.
        const itemsBelow = page.items.filter((item) => item.type === 'rule' && item.y > cell.rect.y)
        expect(itemsBelow.length).toBeGreaterThan(0)
      }
    }
    const continued = result.pages.flatMap((page) =>
      texts(page.items).filter((item) => item.text.endsWith('(suite)'))
    )
    expect(continued.map((item) => item.text)).toEqual(['S_0030 · P_0010 (suite)'])
  })

  it('commence chaque scène sur une nouvelle page si l’option est cochée', () => {
    const result = layout(exampleShots(), { options: { newPagePerScene: true } })
    const firstScenes = result.pages
      .filter((page) => page.cells.length > 0)
      .map((page) => page.cells.map((cell) => cell.sceneId))
    for (const scenes of firstScenes) expect(new Set(scenes).size).toBe(1)
    const sceneOrder = firstScenes.map((scenes) => scenes[0])
    expect(new Set(sceneOrder)).toEqual(new Set(['S_0010', 'S_0020', 'S_0030', 'S_0040']))
  })

  it('n’écrit l’en-tête de scène qu’au-dessus du premier plan de la scène', () => {
    const result = layout(exampleShots())
    const headings = result.pages.flatMap((page) =>
      texts(page.items)
        .filter((item) => item.color === 'muted' && !item.text.endsWith('(suite)'))
        .map((item) => item.text)
    )
    expect(headings).toEqual([
      'INT. CUISINE - JOUR',
      'EXT. RUE DES TANNEURS - NUIT',
      'EXT. TOIT DE L’IMMEUBLE - AUBE'
    ])
  })
})

describe('texte jamais réduit ni coupé', () => {
  const result = layout(exampleShots())

  it('garde des tailles de police fixes', () => {
    const sizes = new Set(result.pages.flatMap((page) => texts(page.items).map((t) => t.size)))
    expect([...sizes].sort()).toEqual([11, 12, 7.5, 9.5].sort())
  })

  it('imprime tous les mots de chaque champ, dans l’ordre', () => {
    const printed = words(result.pages.map((page) => inkText(page.items)).join(' '))
    const expected = exampleShots().flatMap((item) => [
      item.sceneLabel,
      item.shotLabel,
      ...words(item.name),
      ...(item.duration === null ? [] : words(`${item.duration} s`.replace('.', ','))),
      ...words(item.cameraMovement),
      ...words(item.music),
      ...words(item.shotSize),
      ...words(item.sound),
      ...words(item.cameraAngle),
      ...words(item.description)
    ])
    expect(printed).toEqual(expected)
  })

  it('ne fait se chevaucher aucun texte, et tout reste dans le contenu de la page', () => {
    for (const page of result.pages) {
      const boxes = texts(page.items).map((item) => textBox(item, measure))
      for (const box of boxes) {
        expect(box.left).toBeGreaterThanOrEqual(CONTENT.left)
        expect(box.right).toBeLessThanOrEqual(CONTENT.right)
        expect(box.bottom).toBeLessThanOrEqual(BLOCKS.bottom)
      }
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++)
          expect(intersects(boxes[i], boxes[j])).toBe(false)
    }
  })

  it('laisse libres les marques d’angle et le QR code', () => {
    const reserved: Box[] = [
      ...markCenters().map((c) => ({
        left: c.x - MARK.size / 2,
        right: c.x + MARK.size / 2,
        top: c.y - MARK.size / 2,
        bottom: c.y + MARK.size / 2
      })),
      {
        left: CONTENT.right - HEADER.qrSize,
        right: CONTENT.right,
        top: HEADER.top,
        bottom: HEADER.top + HEADER.qrSize
      }
    ]
    for (const page of result.pages) {
      for (const item of page.items) {
        const box: Box =
          item.type === 'text'
            ? textBox(item, measure)
            : item.type === 'rule'
              ? { left: item.x1, right: item.x2, top: item.y - 1, bottom: item.y + 1 }
              : {
                  left: item.x,
                  right: item.x + item.width,
                  top: item.y,
                  bottom: item.y + item.height
                }
        for (const zone of reserved) expect(intersects(box, zone)).toBe(false)
      }
    }
  })
})

describe('case dessin', () => {
  const formats = Object.keys(FORMATS) as FormatName[]

  it.each(formats)(
    'respecte les proportions du format %s, la plus grande possible et centrée',
    (name) => {
      const format = FORMATS[name]
      const result = layout(exampleShots(), { format })
      const cells = result.pages.flatMap((page) => page.cells)
      expect(cells).toHaveLength(exampleShots().length)
      for (const { rect } of cells) {
        expect(rect.width / rect.height).toBeCloseTo(format.width / format.height, 6)
        expect(rect.width).toBeLessThanOrEqual(ZONE.width + 1e-9)
        expect(rect.height).toBeLessThanOrEqual(zoneHeight(format) + 1e-9)
        const fillsWidth = Math.abs(rect.width - ZONE.width) < 1e-9
        const fillsHeight = Math.abs(rect.height - zoneHeight(format)) < 1e-9
        expect(fillsWidth || fillsHeight).toBe(true)
        expect(rect.x + rect.width / 2).toBeCloseTo(CONTENT.left + ZONE.width / 2, 6)
      }
    }
  )

  it('reste sous l’en-tête de page', () => {
    const top = blocksTop(headerLayout('Essai', measure))
    for (const page of layout(exampleShots()).pages)
      for (const cell of page.cells) expect(cell.rect.y).toBeGreaterThan(top)
  })
})

describe('format plus haut que large', () => {
  // Pire cas : chaque plan ouvre une scène avec un en-tête et porte un nom.
  const shots = [10, 20, 30, 40, 50].map((scene) =>
    shot(scene, 10, { sceneHeading: 'EXT. RUE DES TANNEURS - NUIT', name: 'Nom du plan' })
  )

  it('double la hauteur de la zone dessin et met 2 plans au plus par page (9:16)', () => {
    const result = layout(shots, { format: FORMATS['9-16'] })
    expect(result.pages.map((page) => page.cells.length)).toEqual([2, 2, 1])
    for (const { rect } of result.pages.flatMap((page) => page.cells))
      expect(rect.height).toBeCloseTo(2 * ZONE_HEIGHT, 6)
  })

  it('ne change rien pour un format carré (1:1)', () => {
    const result = layout(shots, { format: { width: 1080, height: 1080 } })
    expect(result.pages.map((page) => page.cells.length)).toEqual([3, 2])
    for (const { rect } of result.pages.flatMap((page) => page.cells))
      expect(rect.height).toBeCloseTo(ZONE_HEIGHT, 6)
  })
})

describe('en-tête de page', () => {
  it('passe le titre à la ligne au lieu de le couper', () => {
    const title = 'Un titre vraiment très long pour un court métrage de fin d’année à Saint Luc'
    const header = headerLayout(title, measure)
    expect(header.titleLines.length).toBeGreaterThan(1)
    expect(words(header.titleLines.join(' '))).toEqual(words(title))
    expect(header.height).toBeGreaterThan(HEADER.minHeight)
  })
})
