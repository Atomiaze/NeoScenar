import type { ItemNumber, Scene, Shot } from '../projectTypes'
import { NUMBER_STEP } from './order'

/** Source d'identifiants internes (UUID), remplaçable dans les tests. */
export interface IdSource {
  newId(): string
}

export function createShot(id: string, number: ItemNumber): Shot {
  return {
    id,
    number: number.number,
    letter: number.letter,
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
}

/** Une nouvelle scène contient d'office un premier plan P_0010. */
export function createScene(number: ItemNumber, ids: IdSource): Scene {
  const id = ids.newId()
  return {
    id,
    number: number.number,
    letter: number.letter,
    name: '',
    heading: '',
    color: null,
    shots: [createShot(ids.newId(), { number: NUMBER_STEP, letter: '' })],
    orphan: false
  }
}
