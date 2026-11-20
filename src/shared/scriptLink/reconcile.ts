import type { FountainDocument } from '@neoscenar/fountain'
import { createScene, type IdSource } from '../decoupage/factories'
import { compareItemNumbers, numberKey } from '../decoupage/order'
import type { Decoupage, ItemNumber, Scene } from '../projectTypes'
import { isEmptyCard } from './emptyCard'
import { NumberPool } from './numberPool'
import { parseSceneNumber, sceneLabel, sceneNumberMarker, sceneNumberText } from './sceneNumber'
import { readScriptScenes, type ScriptScene, type TextRange } from './scriptScenes'
import { headingLine, insertLines, type TextChange } from './textChanges'

// Rapprochement du scénario et des cartes : une seule fonction, utilisée partout (ouverture, frappe,
// action dans les cartes, rechargement du fichier). Le texte fait foi pour l'existence, l'ordre,
// l'en-tête et le numéro des scènes ; le découpage garde tout le reste (nom, couleur, plans, identifiant).

export interface ReconcileContext {
  /** Texte qui vient d'être inséré (collé) : en cas de numéro en double, c'est cette scène qui le perd. */
  insertedRanges?: readonly TextRange[]
  /**
   * Ligne du curseur dans l'éditeur. Un en-tête sans numéro sur cette ligne est en cours de frappe :
   * il n'est numéroté (et sa carte créée) qu'une fois la ligne quittée. Les cartes dont le numéro est
   * écrit sur cette ligne sont gardées telles quelles, même si la ligne n'est plus un en-tête valide
   * pendant la frappe.
   */
  editingLine?: TextRange | null
  /**
   * Cartes connues juste avant (par exemple avant une annulation dans les cartes). Une scène dont le
   * numéro écrit dans le texte n'a pas de carte reprend celle-ci, avec son identifiant et ses plans.
   */
  knownCards?: readonly Scene[]
  /**
   * Ne rien écrire dans le texte (après Annuler ou Rétablir dans l'éditeur, pour qu'un numéro annulé
   * ne réapparaisse pas aussitôt) : les scènes sans numéro valide et unique attendent, sans carte,
   * et les autres gardent leur numéro, même hors de l'ordre. Sans effet à la première liaison.
   */
  freezeText?: boolean
  /** Analyse de ce même texte déjà faite (par l'éditeur), pour ne pas la refaire. */
  parsed?: FountainDocument
}

export interface ReconcileSummary {
  /** Première liaison du projet : paires carte ↔ en-tête du scénario. */
  firstLink: { number: string; heading: string }[] | null
  /** Première liaison : en-têtes de carte différents de ceux du scénario (le scénario est gardé). */
  headingDifferences: { number: string; card: string; script: string }[]
  /** Première liaison : cartes sans scène, dont l'en-tête a été ajouté à la fin du scénario. */
  appended: string[]
  /** Scènes qui n'avaient pas de numéro. */
  numbered: string[]
  /** Numéros invalides remplacés (« #3.1# » → S_0045). */
  corrected: { written: string; number: string }[]
  /** Numéros en double remplacés. */
  duplicates: { written: string; number: string }[]
  /** Scènes déplacées qui ont pris un numéro à leur nouvelle place. */
  moved: { from: string; to: string }[]
  /** Cartes créées pour de nouvelles scènes. */
  created: string[]
  /** Cartes vides supprimées parce que leur scène a disparu. */
  deleted: string[]
  /** Cartes qui viennent de devenir orphelines (celles qui l'étaient déjà ne sont pas répétées). */
  orphaned: string[]
  /** Cartes orphelines dont la scène est revenue dans le scénario. */
  reconnected: string[]
}

export interface ReconcileResult {
  /** Nouveau découpage ; le même objet si rien ne change. */
  decoupage: Decoupage
  /** Modifications à appliquer au texte, par rapport au texte reçu. Vide si rien ne change. */
  textChanges: TextChange[]
  /** Identifiants de toutes les cartes orphelines (absentes du scénario). */
  orphanIds: string[]
  /**
   * Texte figé (`freezeText`) : des scènes, hors de la ligne en cours de frappe, attendent un numéro
   * (sans numéro, numéro invalide ou en double). Un rapprochement normal le leur donnera.
   */
  waiting: boolean
  summary: ReconcileSummary
}

/** Une scène du texte pendant le rapprochement. */
interface Slot {
  scene: ScriptScene
  /** Numéro qui la relie à sa carte (celui du texte, ou celui de la carte à la première liaison). */
  linked: ItemNumber | null
  /** Pourquoi le numéro du texte n'est pas gardé. */
  issue: 'absent' | 'invalid' | 'duplicate' | null
  inserted: boolean
  /** Garde son numéro à sa place ; sinon elle en reçoit un nouveau (sans numéro ou déplacée). */
  keeps: boolean
  card: Scene | null
  final: ItemNumber | null
}

function within(position: number, range: TextRange): boolean {
  return position >= range.from && position <= range.to
}

/** Numéros valides écrits n'importe où sur une ligne (`#30#`), même si elle n'est plus un en-tête. */
function numbersOnLine(text: string, line: TextRange): Set<string> {
  const keys = new Set<string>()
  for (const match of text.slice(line.from, line.to).matchAll(/#([^#\s]+)#/g)) {
    const number = parseSceneNumber(match[1])
    if (number) keys.add(numberKey(number))
  }
  return keys
}

export function reconcile(
  text: string,
  decoupage: Decoupage,
  context: ReconcileContext,
  ids: IdSource
): ReconcileResult {
  const editing = context.editingLine ?? null
  const scenes = readScriptScenes(text, context.parsed).filter(
    (scene) => !(editing && scene.number === null && within(scene.line.from, editing))
  )
  let slots: Slot[] = scenes.map((scene) => ({
    scene,
    linked: null,
    issue: scene.rawNumber === null ? 'absent' : scene.number === null ? 'invalid' : null,
    // Un en-tête qui commence juste après le texte collé n'en fait pas partie.
    inserted: (context.insertedRanges ?? []).some(
      (range) => scene.line.from >= range.from && scene.line.from < range.to
    ),
    keeps: false,
    card: null,
    final: null
  }))
  const firstLink = !decoupage.scriptLinked
  const unlinked = firstLink
    ? linkInOrder(slots, decoupage.scenes)
    : linkByNumber(slots, decoupage.scenes, context.knownCards ?? [])
  const frozen = !firstLink && context.freezeText === true
  const slotCount = slots.length
  if (frozen) slots = slots.filter((slot) => slot.linked !== null)
  const waiting = slots.length < slotCount

  // Cartes sans scène : gardées (orphelines, ou protégées pendant la frappe) ou supprimées si vides.
  const protectedKeys = editing ? numbersOnLine(text, editing) : new Set<string>()
  const kept = firstLink
    ? []
    : unlinked.filter((card) => protectedKeys.has(numberKey(card)) || !isEmptyCard(card))
  const deleted = firstLink ? [] : unlinked.filter((card) => !kept.includes(card))

  // Les cartes en trop de la première liaison seront ajoutées à la fin du texte. Le numéro d'une
  // carte vide supprimée, lui, redevient libre.
  const reserved: ItemNumber[] = [...kept, ...(firstLink ? unlinked : [])]
  const ordered = !frozen && !decoupage.numbersLocked
  chooseKeptNumbers(slots, firstLink || ordered)
  assignNumbers(slots, new NumberPool([...linkedNumbers(slots), ...reserved]))
  settleNumbers(slots, ordered, reserved)

  const summary = emptySummary()
  const textChanges = slots.flatMap((slot) => numberChange(slot, firstLink ? null : summary))
  const linkedCards = slots.map((slot) => cardFor(slot, ids, summary, firstLink))
  if (firstLink) {
    summary.firstLink = slots.map((slot) => ({
      number: sceneLabel(slot.final!),
      heading: slot.scene.heading
    }))
    if (unlinked.length > 0) {
      const lines = unlinked.map((card) => headingLine(card.heading, card))
      textChanges.push(insertLines(text, text.length, lines.join('\n\n')))
      // La carte prend l'en-tête tel que le texte le relira (majuscules, en-tête provisoire → vide).
      unlinked.forEach((card, i) => {
        const heading = readScriptScenes(lines[i])[0]?.heading ?? card.heading
        linkedCards.push(heading === card.heading ? card : { ...card, heading })
      })
      summary.appended = unlinked.map(sceneLabel)
    }
  }
  // Une carte protégée (en-tête en cours de frappe) garde son état tel quel.
  const orphans = kept.filter((card) => !protectedKeys.has(numberKey(card)))
  summary.deleted = deleted.map(sceneLabel)
  summary.orphaned = orphans.filter((card) => !card.orphan).map(sceneLabel)
  const aside = kept.map((card) =>
    card.orphan || protectedKeys.has(numberKey(card)) ? card : { ...card, orphan: true }
  )

  const scenesOut = placeAside(linkedCards, aside)
  const unchanged =
    decoupage.scriptLinked &&
    scenesOut.length === decoupage.scenes.length &&
    scenesOut.every((scene, i) => scene === decoupage.scenes[i])
  return {
    decoupage: unchanged ? decoupage : { ...decoupage, scriptLinked: true, scenes: scenesOut },
    textChanges,
    orphanIds: orphans.map((card) => card.id),
    waiting,
    summary
  }
}

/** Première liaison : la 1re scène avec la 1re carte, et ainsi de suite. Renvoie les cartes en trop. */
function linkInOrder(slots: Slot[], cards: readonly Scene[]): Scene[] {
  slots.forEach((slot, i) => {
    const card = cards[i]
    if (!card) return
    slot.card = card
    slot.linked = { number: card.number, letter: card.letter }
  })
  return cards.slice(slots.length)
}

/** Liaison par numéro. Renvoie les cartes qui n'ont pas de scène. */
function linkByNumber(
  slots: Slot[],
  cards: readonly Scene[],
  knownCards: readonly Scene[]
): Scene[] {
  const byKey = new Map(cards.map((card) => [numberKey(card), card]))
  const presentIds = new Set(cards.map((card) => card.id))
  const known = new Map(
    knownCards.filter((card) => !presentIds.has(card.id)).map((card) => [numberKey(card), card])
  )

  // Numéro en double : la scène qui vient d'être collée le perd ; sinon la première dans le texte.
  const holders = new Map<string, Slot>()
  for (const slot of slots) {
    if (!slot.scene.number) continue
    const key = numberKey(slot.scene.number)
    const holder = holders.get(key)
    if (!holder || (holder.inserted && !slot.inserted)) holders.set(key, slot)
  }

  for (const slot of slots) {
    if (!slot.scene.number) continue
    const key = numberKey(slot.scene.number)
    if (holders.get(key) !== slot) {
      slot.issue = 'duplicate'
      continue
    }
    slot.linked = slot.scene.number
    slot.card = byKey.get(key) ?? known.get(key) ?? null
    byKey.delete(key)
  }
  return [...byKey.values()]
}

/**
 * Quelles scènes gardent leur numéro. Numéros verrouillés : toutes celles qui en ont un, même hors de
 * l'ordre, comme sur un tournage. Sinon : la plus longue suite de scènes déjà dans l'ordre des numéros ;
 * les autres sont considérées comme déplacées. À égalité, on garde de préférence les scènes qui n'ont
 * pas été collées, puis les plus petits numéros (ce qui rend le résultat stable d'une fois à l'autre).
 */
function chooseKeptNumbers(slots: Slot[], ordered: boolean): void {
  const numbered = slots.filter((slot) => slot.linked !== null)
  if (!ordered) {
    numbered.forEach((slot) => (slot.keeps = true))
    return
  }
  interface Chain {
    length: number
    notInserted: number
    previous: number
  }
  const better = (a: Chain, b: Chain): boolean =>
    a.length !== b.length ? a.length > b.length : a.notInserted > b.notInserted
  const chains: Chain[] = []
  numbered.forEach((slot, i) => {
    let best: Chain = { length: 0, notInserted: 0, previous: -1 }
    for (let j = 0; j < i; j++) {
      if (compareItemNumbers(numbered[j].linked!, slot.linked!) >= 0) continue
      const candidate = { ...chains[j], previous: j }
      // À égalité, l'ordre de parcours garde le premier trouvé ; on préfère le plus petit numéro.
      if (
        better(candidate, best) ||
        (!better(best, candidate) &&
          best.previous >= 0 &&
          compareItemNumbers(numbered[j].linked!, numbered[best.previous].linked!) < 0)
      ) {
        best = candidate
      }
    }
    chains.push({
      length: best.length + 1,
      notInserted: best.notInserted + (slot.inserted ? 0 : 1),
      previous: best.previous
    })
  })
  let end = -1
  chains.forEach((chain, i) => {
    if (
      end < 0 ||
      better(chain, chains[end]) ||
      (!better(chains[end], chain) &&
        compareItemNumbers(numbered[i].linked!, numbered[end].linked!) < 0)
    ) {
      end = i
    }
  })
  for (let i = end; i >= 0; i = chains[i].previous) numbered[i].keeps = true
}

/**
 * Numéros définitifs. Les scènes à numéroter (sans numéro, ou déplacées) sont traitées par séries
 * consécutives, entre la scène précédente et la prochaine qui garde son numéro : numéro intermédiaire,
 * sinon lettre. S'il n'y a pas de place, une scène déplacée garde son numéro (hors de l'ordre) et une
 * scène sans numéro reçoit le dernier recours.
 */
function assignNumbers(slots: Slot[], pool: NumberPool): void {
  let previous: ItemNumber | undefined
  let i = 0
  while (i < slots.length) {
    if (slots[i].keeps) {
      slots[i].final = slots[i].linked
      previous = slots[i].final!
      i++
      continue
    }
    let end = i
    while (end < slots.length && !slots[end].keeps) end++
    const run = slots.slice(i, end)
    const next = slots[end]?.linked ?? undefined
    const numbers = pool.between(previous, next, run.length)
    run.forEach((slot, k) => {
      if (numbers) slot.final = numbers[k]
      else if (slot.linked) slot.final = slot.linked
      else slot.final = pool.between(previous, next, 1)?.[0] ?? pool.lastResort()
      previous = slot.final
    })
    i = end
  }
}

/** Réécrit le numéro de l'en-tête si besoin, et le note dans le résumé (sauf à la première liaison). */
function linkedNumbers(slots: readonly Slot[]): ItemNumber[] {
  return slots.flatMap((slot) => (slot.linked ? [slot.linked] : []))
}

/** Garde-fou : en pratique, un ou deux tours suffisent. */
const MAX_SETTLE_ROUNDS = 10

/**
 * Rejoue ce que ferait le rapprochement suivant sur le résultat, jusqu'à ce que plus rien ne change.
 * Exemple : une scène déplacée reçoit un nouveau numéro et libère l'ancien, dont une scène traitée
 * avant elle aurait eu besoin. Sans ce tour supplémentaire, le rapprochement suivant renumérotait
 * cette scène : un second rapprochement doit toujours ne rien changer.
 */
function settleNumbers(slots: Slot[], ordered: boolean, reserved: readonly ItemNumber[]): void {
  for (let round = 0; round < MAX_SETTLE_ROUNDS; round++) {
    const next: Slot[] = slots.map((slot) => ({
      ...slot,
      linked: slot.final,
      inserted: false,
      keeps: false,
      final: null
    }))
    chooseKeptNumbers(next, ordered)
    assignNumbers(next, new NumberPool([...linkedNumbers(next), ...reserved]))
    if (next.every((slot, i) => numberKey(slot.final!) === numberKey(slots[i].final!))) return
    next.forEach((slot, i) => (slots[i].final = slot.final))
  }
}

function numberChange(slot: Slot, summary: ReconcileSummary | null): TextChange[] {
  const { scene } = slot
  const final = slot.final!
  const label = sceneLabel(final)
  if (scene.rawNumber === sceneNumberText(final)) return []
  if (!summary) {
    // Première liaison : la fenêtre de résumé liste les paires, pas chaque numéro écrit.
  } else if (slot.issue === 'absent') summary.numbered.push(label)
  else if (slot.issue === 'invalid')
    summary.corrected.push({ written: scene.rawNumber!, number: label })
  else if (slot.issue === 'duplicate')
    summary.duplicates.push({ written: scene.rawNumber!, number: label })
  else if (slot.linked) summary.moved.push({ from: sceneLabel(slot.linked), to: label })
  const marker = ` ${sceneNumberMarker(final)}`
  return [
    scene.marker
      ? { from: scene.marker.from, to: scene.marker.to, insert: marker }
      : { from: scene.contentEnd, to: scene.contentEnd, insert: marker }
  ]
}

/** Carte de la scène, mise à jour (numéro, en-tête), ou créée avec un premier plan P_0010. */
function cardFor(slot: Slot, ids: IdSource, summary: ReconcileSummary, firstLink: boolean): Scene {
  const final = slot.final!
  const heading = slot.scene.heading
  const card = slot.card
  if (!card) {
    summary.created.push(sceneLabel(final))
    return { ...createScene(final, ids), heading }
  }
  if (card.orphan) summary.reconnected.push(sceneLabel(final))
  if (firstLink && card.heading !== '' && card.heading !== heading) {
    // À la première liaison, c'est l'en-tête du scénario qui est gardé : on le signale.
    summary.headingDifferences.push({
      number: sceneLabel(final),
      card: card.heading,
      script: heading
    })
  }
  if (
    card.number === final.number &&
    card.letter === final.letter &&
    card.heading === heading &&
    !card.orphan
  ) {
    return card
  }
  return { ...card, number: final.number, letter: final.letter, heading, orphan: false }
}

/**
 * Cartes sans scène (orphelines) : chacune reste à sa place d'après son numéro, juste avant la
 * première carte liée qui a un numéro plus grand.
 */
function placeAside(linked: readonly Scene[], aside: readonly Scene[]): Scene[] {
  const sorted = [...aside].sort(compareItemNumbers)
  const result: Scene[] = []
  let k = 0
  for (const card of linked) {
    while (k < sorted.length && compareItemNumbers(sorted[k], card) < 0) result.push(sorted[k++])
    result.push(card)
  }
  return [...result, ...sorted.slice(k)]
}

function emptySummary(): ReconcileSummary {
  return {
    firstLink: null,
    headingDifferences: [],
    appended: [],
    numbered: [],
    corrected: [],
    duplicates: [],
    moved: [],
    created: [],
    deleted: [],
    orphaned: [],
    reconnected: []
  }
}
