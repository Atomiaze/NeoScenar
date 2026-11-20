import { formatSceneNumber, formatShotNumber } from '../numbering'
import type { Decoupage, ItemNumber, Scene } from '../projectTypes'
import { createShot, type IdSource } from './factories'

// Outils des tests : découpages décrits en abrégé et identifiants prévisibles.

/** Identifiants « id-1 », « id-2 »… ; la liste `issued` permet de vérifier qu'aucun n'est réutilisé. */
export function counterIds(prefix = 'id'): IdSource & { issued: string[] } {
  const issued: string[] = []
  return {
    issued,
    newId: () => {
      const id = `${prefix}-${issued.length + 1}`
      issued.push(id)
      return id
    }
  }
}

/** « 10 » → 10 ; « 10A » → 10 et « A ». */
export function parseNumber(text: string): ItemNumber {
  const match = /^(\d+)([A-Z]*)$/.exec(text)
  if (!match) throw new Error(`Numéro de test invalide : ${text}`)
  return { number: Number(match[1]), letter: match[2] }
}

/**
 * Découpage abrégé : { '10': ['10', '20'], '20': ['10'] } donne S_0010 (P_0010, P_0020) et
 * S_0020 (P_0010). Identifiants : « S10 », « S10-P20 »…
 */
export function makeDecoupage(layout: Record<string, string[]>, numbersLocked = false): Decoupage {
  // Attention : JavaScript range les clés numériques par ordre croissant, ce qui convient ici.
  const scenes: Scene[] = Object.entries(layout).map(([sceneNumber, shots]) => ({
    id: `S${sceneNumber}`,
    ...parseNumber(sceneNumber),
    name: '',
    heading: '',
    color: null,
    shots: shots.map((shot) => createShot(`S${sceneNumber}-P${shot}`, parseNumber(shot))),
    orphan: false
  }))
  return { formatVersion: 1, numbersLocked, scriptLinked: false, scenes }
}

export function shotNumbers(decoupage: Decoupage, sceneIndex = 0): string[] {
  return decoupage.scenes[sceneIndex].shots.map((shot) =>
    formatShotNumber(shot.number, shot.letter)
  )
}

export function sceneNumbers(decoupage: Decoupage): string[] {
  return decoupage.scenes.map((scene) => formatSceneNumber(scene.number, scene.letter))
}

export function allIds(decoupage: Decoupage): string[] {
  return decoupage.scenes.flatMap((scene) => [scene.id, ...scene.shots.map((shot) => shot.id)])
}
