// Dépouillement du scénario pour le plan de tournage (étape 15D) : une entrée par scène qui a une
// carte. Calcul pur ; le texte vient de `packages/fountain`, la pagination est celle de l'éditeur.

import {
  estimateDurations,
  getScenes,
  type FountainDocument,
  type Pagination
} from '@neoscenar/fountain'
import { numberKey } from '../decoupage/order'
import type { Scene } from '../projectTypes'
import { nameKey } from '../research/sheetNames'
import { PLACEHOLDER_HEADING } from '../scriptLink/scriptScenes'
import { parseSceneNumber, sceneLabel } from '../scriptLink/sceneNumber'
import { dayNightOf, intExtOf } from '../stats/computeStats'
import type { BreakdownScene, CharacterSheetInfo, SceneCharacter } from './shootingTypes'

const MARKED_TEXT = /\[\[[\s\S]*?\]\]|\/\*[\s\S]*?\*\//g

/** Huitièmes de page : arrondis au plus proche, au moins 1/8 (une scène n'est jamais « 0 »). */
export function eighthsOfPage(seconds: number): number {
  // 60 s = 1 page = 8 huitièmes ; la petite marge évite qu'une erreur de virgule change un .5 exact.
  return Math.max(1, Math.round((seconds / 60) * 8 + 1e-9))
}

/** Texte sans majuscules ni accents, pour chercher un nom dans l'action. */
function plainText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr')
}

/** Le nom apparaît comme mot entier (« Paul » ne se trouve pas dans « Paulette »). */
function mentionsName(plainAction: string, name: string): boolean {
  const plainName = plainText(name).trim()
  if (plainName === '') return false
  const escaped = plainName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'u').test(plainAction)
}

/** Interprète par nom de fiche (clé `nameKey`) ; null si le champ est vide. */
function interpreterIndex(sheets: readonly CharacterSheetInfo[]): Map<string, string | null> {
  const index = new Map<string, string | null>()
  for (const sheet of sheets) index.set(nameKey(sheet.nom), sheet.interprete.trim() || null)
  return index
}

/**
 * Une entrée par scène du scénario reliée à une carte non orpheline, dans l'ordre du scénario.
 * Sans carte (en-tête en cours de frappe, texte figé), la scène n'a pas d'identifiant : ignorée jusqu'au
 * prochain rapprochement. `muets` : personnages ajoutés à la main, par identifiant de carte.
 */
export function breakdownScenes(
  doc: FountainDocument,
  pagination: Pagination,
  cards: readonly Scene[],
  sheets: readonly CharacterSheetInfo[],
  muets: Readonly<Record<string, readonly string[]>> = {}
): BreakdownScene[] {
  const cardByNumber = new Map<string, Scene>()
  for (const card of cards) if (!card.orphan) cardByNumber.set(numberKey(card), card)
  const interpreters = interpreterIndex(sheets)
  const seconds = new Map(
    estimateDurations(doc, pagination).scenes.map((s) => [s.index, s.seconds])
  )
  // Personnages connus : fiches + noms qui parlent quelque part dans le scénario.
  const known = new Map<string, string>()
  for (const sheet of sheets) known.set(nameKey(sheet.nom), sheet.nom)
  for (const element of doc.elements) {
    const name = element.type === 'character' ? (element.character?.name ?? '').trim() : ''
    if (name !== '' && !known.has(nameKey(name))) known.set(nameKey(name), name)
  }
  const used = new Set<string>()
  const result: BreakdownScene[] = []

  for (const scene of getScenes(doc)) {
    const number = scene.info.number === null ? null : parseSceneNumber(scene.info.number)
    const card = number ? cardByNumber.get(numberKey(number)) : undefined
    if (!number || !card || used.has(card.id)) continue
    used.add(card.id)

    const toWrite = nameKey(scene.info.location) === nameKey(PLACEHOLDER_HEADING)
    const characters: SceneCharacter[] = []
    const seen = new Set<string>()
    const actionLines: string[] = []
    for (const element of scene.elements) {
      if (element.type === 'section') break
      if (element.type === 'action') actionLines.push(element.text)
      const name = element.type === 'character' ? (element.character?.name ?? '').trim() : ''
      if (name === '' || seen.has(nameKey(name))) continue
      seen.add(nameKey(name))
      characters.push({
        nom: name,
        interprete: interpreters.get(nameKey(name)) ?? null,
        muet: false,
        sansFiche: false
      })
    }
    for (const name of muets[card.id] ?? []) {
      if (seen.has(nameKey(name))) continue
      seen.add(nameKey(name))
      const known = interpreters.has(nameKey(name))
      characters.push({
        nom: name,
        interprete: interpreters.get(nameKey(name)) ?? null,
        muet: true,
        sansFiche: !known
      })
    }

    const plainAction = plainText(actionLines.join('\n'))
    const suggestions = toWrite
      ? []
      : [...known]
          .filter(([key, name]) => !seen.has(key) && mentionsName(plainAction, name))
          .map(([, name]) => name)
          .sort((a, b) => a.localeCompare(b, 'fr'))

    result.push({
      cardId: card.id,
      label: sceneLabel(number),
      heading: toWrite
        ? ''
        : scene.heading.text.replace(MARKED_TEXT, '').replace(/\s+/g, ' ').trim(),
      intExt: toWrite ? 'unknown' : intExtOf(scene.info.prefix),
      dayNight: toWrite ? 'unknown' : dayNightOf(scene.info.time),
      location: toWrite ? '' : scene.info.location.trim(),
      eighths: toWrite ? null : eighthsOfPage(seconds.get(scene.index) ?? 0),
      characters,
      suggestions
    })
  }
  return result
}
