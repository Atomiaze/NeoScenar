import type { ItemNumber } from './projectTypes'

function formatNumber(prefix: 'S' | 'P', number: number, letter: string): string {
  return `${prefix}_${String(number).padStart(4, '0')}${letter}`
}

/** 10 → « S_0010 » ; 10 et « A » → « S_0010A ». */
export function formatSceneNumber(number: number, letter = ''): string {
  return formatNumber('S', number, letter)
}

/** 15 → « P_0015 » ; 10 et « A » → « P_0010A ». */
export function formatShotNumber(number: number, letter = ''): string {
  return formatNumber('P', number, letter)
}

/** Identifiant complet d'un plan, unique dans le projet : « S_0020_P_0030 ». */
export function formatFullShotId(scene: ItemNumber, shot: ItemNumber): string {
  return `${formatSceneNumber(scene.number, scene.letter)}_${formatShotNumber(shot.number, shot.letter)}`
}
