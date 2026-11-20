// Règles d'affichage des répliques, calculées sur le texte analysé sans jamais le modifier :
// mention (SUITE) et dialogues simultanés (^). Partagées par la pagination, l'éditeur et le PDF.

import type { ElementType, FountainDocument, FountainElement } from './types.ts'

/** Mention ajoutée quand un personnage reprend la parole après une action. */
export const CONTINUED_MARK = '(SUITE)'

/** Extensions qui disent déjà la reprise : rien n'est ajouté. */
const CONTINUED_EXTENSIONS = new Set(['SUITE', "CONT'D", 'CONT’D', 'CONTD', 'CONT.', 'CONT'])

/** Éléments qui terminent l'enchaînement : après eux, une réplique n'est plus une reprise. */
const CHAIN_BREAKERS: ReadonlySet<ElementType> = new Set<ElementType>([
  'scene_heading',
  'transition',
  'section',
  'page_break'
])

/** Éléments sans texte imprimé qui ne coupent ni un bloc de dialogue ni une paire simultanée. */
const TRANSPARENT: ReadonlySet<ElementType> = new Set<ElementType>(['note', 'boneyard'])

function speakerKey(element: FountainElement): string {
  return (element.character?.name ?? '').normalize('NFC').toUpperCase()
}

/**
 * Personnages (index d'élément) qui reçoivent (SUITE) : le même personnage reparle dans la même scène
 * et seules des actions (ou des notes, du texte mis de côté) séparent les deux répliques.
 * Un en-tête, une transition, une section, un saut de page ou la réplique d'un autre coupent la reprise.
 * Rien n'est ajouté si (SUITE) ou (CONT'D) est déjà écrit.
 */
export function continuedCharacters(doc: FountainDocument): Set<number> {
  const result = new Set<number>()
  let lastSpeaker: string | null = null
  doc.elements.forEach((element, index) => {
    if (CHAIN_BREAKERS.has(element.type)) {
      lastSpeaker = null
      return
    }
    if (element.type !== 'character') return
    const key = speakerKey(element)
    const written = (element.character?.extensions ?? []).some((extension) =>
      CONTINUED_EXTENSIONS.has(extension.toUpperCase())
    )
    if (key !== '' && key === lastSpeaker && !written) result.add(index)
    lastSpeaker = key === '' ? null : key
  })
  return result
}

/** Dialogues simultanés : les deux blocs (personnage, didascalies, répliques), par index d'élément. */
export interface DualDialogue {
  left: number[]
  right: number[]
}

/**
 * Bloc de dialogue ouvert par le personnage `start` : lui et les didascalies, répliques et paroles
 * qui le suivent (les notes isolées ne coupent pas le bloc mais n'en font pas partie).
 */
export function dialogueBlock(doc: FountainDocument, start: number): number[] {
  const members = [start]
  for (let i = start + 1; i < doc.elements.length; i++) {
    const element = doc.elements[i]
    if (TRANSPARENT.has(element.type)) continue
    if (element.type === 'parenthetical' || element.type === 'dialogue') members.push(i)
    else if (element.type === 'lyrics' && !followedByBlankLine(doc.elements[i - 1])) members.push(i)
    else break
  }
  return members
}

/**
 * Paires de dialogues simultanés : un personnage marqué « ^ » parle en même temps que le bloc de
 * dialogue qui le précède immédiatement (seules des notes peuvent les séparer). Un bloc déjà placé à
 * droite d'une paire n'en ouvre pas une autre.
 */
export function dualDialogues(doc: FountainDocument): DualDialogue[] {
  const pairs: DualDialogue[] = []
  const inRight = new Set<number>()
  const blockOf = new Map<number, number>()
  doc.elements.forEach((element, index) => {
    if (element.type !== 'character') return
    const block = dialogueBlock(doc, index)
    for (const member of block) blockOf.set(member, index)
    if (!element.character?.dual) return
    let previous = index - 1
    while (previous >= 0 && TRANSPARENT.has(doc.elements[previous].type)) previous--
    const leftStart = blockOf.get(previous)
    if (leftStart === undefined || inRight.has(leftStart)) return
    const left = dialogueBlock(doc, leftStart)
    if (left[left.length - 1] !== previous) return
    pairs.push({ left, right: block })
    inRight.add(index)
  })
  return pairs
}

/** L'élément est suivi d'une ligne vide dans le texte source (ce qui termine un bloc de dialogue). */
export function followedByBlankLine(element: FountainElement | undefined): boolean {
  if (!element?.raw) return true
  const trailing = element.raw.slice(element.raw.trimEnd().length)
  return (trailing.match(/\r\n|\r|\n/g)?.length ?? 0) >= 2
}
