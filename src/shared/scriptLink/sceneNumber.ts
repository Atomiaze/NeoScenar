import { formatSceneNumber } from '../numbering'
import type { ItemNumber } from '../projectTypes'

// Numéro de scène écrit dans le Fountain : `#30#` ↔ S_0030, `#30A#` ↔ S_0030A, `#5#` ↔ S_0005.

/** 1 à 4 chiffres sans zéro inutile en tête, puis au plus une lettre majuscule. */
const VALID_NUMBER = /^([1-9]\d{0,3})([A-Z]?)$/

/** « 30A » → 30 et « A » ; null si le numéro n'est pas valide (« 3.1 », « A2 », « 0030 », « 30a »). */
export function parseSceneNumber(raw: string): ItemNumber | null {
  const match = VALID_NUMBER.exec(raw)
  return match ? { number: Number(match[1]), letter: match[2] } : null
}

/** 30 et « A » → « 30A », tel qu'écrit entre les # du Fountain. */
export function sceneNumberText(number: ItemNumber): string {
  return `${number.number}${number.letter}`
}

/** Marqueur à écrire en fin d'en-tête : « #30A# ». */
export function sceneNumberMarker(number: ItemNumber): string {
  return `#${sceneNumberText(number)}#`
}

/** Nom affiché : « S_0030A ». */
export function sceneLabel(number: ItemNumber): string {
  return formatSceneNumber(number.number, number.letter)
}
