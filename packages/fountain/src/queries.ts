import type { FountainDocument, FountainElement, Position, SceneHeadingInfo } from './types.ts'

export interface Scene {
  /** Numéro d'ordre de la scène dans le document (1, 2, 3…). */
  order: number
  heading: FountainElement
  info: SceneHeadingInfo
  /** Index de l'en-tête dans document.elements. */
  index: number
  /** Éléments qui suivent l'en-tête, jusqu'au prochain en-tête (exclu). */
  elements: FountainElement[]
  /** De l'en-tête jusqu'à la fin du dernier élément de la scène ; absent si l'en-tête a été créé par programme. */
  position?: Position
}

export interface CharacterSummary {
  name: string
  /** Nombre de répliques (lignes de personnage). */
  lines: number
}

export interface LocationSummary {
  name: string
  scenes: number
}

/** Une scène va d'un en-tête jusqu'au suivant ; ce qui précède le premier en-tête n'appartient à aucune scène. */
export function getScenes(doc: FountainDocument): Scene[] {
  const scenes: Scene[] = []
  doc.elements.forEach((element, index) => {
    if (element.type === 'scene_heading') {
      scenes.push({
        order: scenes.length + 1,
        heading: element,
        info: element.scene ?? { prefix: '', location: '', time: '', number: null },
        index,
        elements: []
      })
    } else if (scenes.length > 0) {
      scenes[scenes.length - 1].elements.push(element)
    }
  })
  for (const scene of scenes) scene.position = scenePosition(scene)
  return scenes
}

function scenePosition(scene: Scene): Position | undefined {
  const start = scene.heading.position
  if (!start) return undefined
  let end = start
  for (const element of scene.elements) if (element.position) end = element.position
  return {
    startLine: start.startLine,
    endLine: end.endLine,
    startOffset: start.startOffset,
    endOffset: end.endOffset
  }
}

/**
 * Personnages distincts, dans l'ordre d'apparition, avec leur nombre de répliques.
 * « MARIE », « MARIE (SUITE) » et « @Marie » sont regroupés.
 */
export function getCharacters(doc: FountainDocument): CharacterSummary[] {
  return countDistinct(
    doc.elements
      .filter((element) => element.type === 'character')
      .map((element) => element.character?.name ?? '')
  ).map(({ name, count }) => ({ name, lines: count }))
}

/** Lieux distincts (règle NeoScenar du lieu), dans l'ordre d'apparition, avec leur nombre de scènes. */
export function getLocations(doc: FountainDocument): LocationSummary[] {
  return countDistinct(getScenes(doc).map((scene) => scene.info.location)).map(
    ({ name, count }) => ({ name, scenes: count })
  )
}

/** Regroupe sans tenir compte des majuscules ; préfère une forme écrite entièrement en majuscules. */
function countDistinct(names: string[]): { name: string; count: number }[] {
  const groups = new Map<string, { name: string; count: number }>()
  for (const raw of names) {
    const name = raw.trim()
    if (name === '') continue
    const key = name.toUpperCase()
    const group = groups.get(key)
    if (!group) groups.set(key, { name, count: 1 })
    else {
      group.count++
      if (group.name !== key && name === key) group.name = name
    }
  }
  return [...groups.values()]
}
