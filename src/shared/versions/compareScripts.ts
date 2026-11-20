// Comparaison de deux scénarios (étape 13C). Les scènes sont associées par l'identifiant permanent de
// leur carte (decoupage.json de chaque côté), qui survit à une renumérotation ; à défaut par leur
// numéro (#30# ↔ S_0030), puis par un en-tête identique. Le texte d'une scène modifiée est ensuite
// comparé mot par mot (jsdiff).

import { diffWordsWithSpace } from 'diff'
import { getScenes, parse, splitTitlePage } from '@neoscenar/fountain'
import { numberKey } from '../decoupage/order'
import type { Decoupage } from '../projectTypes'
import { parseSceneNumber, sceneLabel } from '../scriptLink'
import { removeAllRevisionMarks } from '../revision/revisionMarks'

/** Morceau de texte d'une comparaison mot par mot. */
export interface DiffPart {
  text: string
  kind: 'same' | 'added' | 'removed'
}

export type ComparedStatus = 'added' | 'removed' | 'kept'

/** Une scène (ou la page de titre, ou le texte avant la première scène) qui a changé. */
export interface ComparedItem {
  kind: 'scene' | 'titlePage' | 'opening'
  /** « S_0030 » (numéro d'« après », sinon d'« avant ») ; vide sans numéro et pour les autres. */
  label: string
  /** Ancien numéro (« S_0040 ») quand il a changé ; vide sinon. */
  previousLabel: string
  /** En-tête affiché (celui d'« après », sinon celui d'« avant »), sans le numéro. */
  heading: string
  status: ComparedStatus
  /** Ordre changé par rapport aux autres scènes communes. */
  moved: boolean
  /** Texte différent (toujours vrai pour une scène ajoutée ou supprimée). */
  modified: boolean
  /** Texte, mot par mot : tout « added » ou tout « removed » pour une scène ajoutée ou supprimée. */
  parts: DiffPart[]
}

export interface ScriptComparison {
  /** Éléments qui ont changé, dans l'ordre du scénario « après » (les supprimés à leur ancienne place). */
  items: ComparedItem[]
  counts: { added: number; removed: number; moved: number; modified: number; unchanged: number }
}

/** Un côté de la comparaison : le texte de scenario.fountain et, s'il existe, son découpage. */
export interface ComparedScript {
  text: string
  /** Identifiant de carte par numéro de scène (« 30A » → id), cartes orphelines exclues. */
  sceneIds?: Readonly<Record<string, string>>
}

/** Identifiants des cartes reliées au scénario, par numéro (clé « 30A »). */
export function sceneIdsOf(decoupage: Decoupage): Record<string, string> {
  const ids: Record<string, string> = {}
  for (const scene of decoupage.scenes) if (!scene.orphan) ids[numberKey(scene)] = scene.id
  return ids
}

/**
 * Texte réellement comparé : sans marque BOM, fins de ligne « \n », et sans les marques de révision
 * [[R:…]]…[[/R]] (étape 13E), qui n'apparaissent donc jamais comme des différences.
 */
export function comparisonText(text: string): string {
  return removeAllRevisionMarks(text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'))
}

interface Block {
  /** Identifiant de la carte, s'il est connu. */
  id: string | null
  /** Clé du numéro (« 30A »), s'il y en a un. */
  number: string | null
  label: string
  heading: string
  /** Texte de la scène, numéro de l'en-tête retiré (une renumérotation n'est pas une modification). */
  text: string
}

/** Compare deux scenario.fountain (avec leurs découpages, si on les a). */
export function compareScripts(
  beforeSide: ComparedScript,
  afterSide: ComparedScript
): ScriptComparison {
  const before = splitBlocks(beforeSide)
  const after = splitBlocks(afterSide)
  const items: ComparedItem[] = []
  const counts = { added: 0, removed: 0, moved: 0, modified: 0, unchanged: 0 }

  if (before.titlePage !== after.titlePage)
    items.push(changedItem('titlePage', before.titlePage, after.titlePage))
  if (before.opening !== after.opening)
    items.push(changedItem('opening', before.opening, after.opening))

  const pairs = matchScenes(before.scenes, after.scenes)
  const matchedBefore = new Set(pairs.values())
  const commonOld = after.scenes.flatMap((_, index) => {
    const old = pairs.get(index)
    return old === undefined ? [] : [old]
  })
  const inOrder = longestIncreasing(commonOld)

  // Les scènes supprimées sont placées juste après la scène commune qui les précédait.
  let nextBefore = 0
  const flushRemoved = (until: number): void => {
    for (; nextBefore < until; nextBefore++) {
      if (matchedBefore.has(nextBefore)) continue
      counts.removed++
      items.push(wholeItem(before.scenes[nextBefore], 'removed'))
    }
  }

  let commonIndex = 0
  after.scenes.forEach((block, index) => {
    const oldIndex = pairs.get(index)
    if (oldIndex === undefined) {
      counts.added++
      items.push(wholeItem(block, 'added'))
      return
    }
    const moved = !inOrder.has(commonIndex++)
    if (!moved) flushRemoved(oldIndex + 1)
    const old = before.scenes[oldIndex]
    const modified = old.text !== block.text
    if (moved) counts.moved++
    if (modified) counts.modified++
    if (!moved && !modified) {
      counts.unchanged++
      return
    }
    items.push({
      kind: 'scene',
      label: block.label,
      previousLabel: old.label !== block.label ? old.label : '',
      heading: block.heading,
      status: 'kept',
      moved,
      modified,
      parts: modified ? wordDiff(old.text, block.text) : []
    })
  })
  flushRemoved(before.scenes.length)
  return { items, counts }
}

/**
 * Associe les scènes (index « après » → index « avant ») : d'abord par identifiant de carte ;
 * ensuite, pour une scène dont l'identifiant manque d'un côté, par numéro, puis par en-tête
 * identique. Deux cartes d'identifiants différents ne sont jamais associées.
 */
function matchScenes(before: readonly Block[], after: readonly Block[]): Map<number, number> {
  const pairs = new Map<number, number>()
  const used = new Set<number>()
  const pass = (keyOf: (block: Block) => string | null, fallback: boolean): void => {
    const free = new Map<string, number[]>()
    before.forEach((block, index) => {
      const key = keyOf(block)
      if (key === null || used.has(index)) return
      free.set(key, [...(free.get(key) ?? []), index])
    })
    after.forEach((block, index) => {
      const key = keyOf(block)
      if (key === null || pairs.has(index)) return
      const candidates = free.get(key) ?? []
      const found = candidates.findIndex(
        (old) => !used.has(old) && (!fallback || before[old].id === null || block.id === null)
      )
      if (found === -1) return
      const old = candidates[found]
      pairs.set(index, old)
      used.add(old)
    })
  }
  pass((block) => block.id, false)
  pass((block) => block.number, true)
  pass((block) => block.heading.toUpperCase(), true)
  return pairs
}

function changedItem(
  kind: 'titlePage' | 'opening',
  beforeText: string,
  afterText: string
): ComparedItem {
  const status: ComparedStatus = beforeText === '' ? 'added' : afterText === '' ? 'removed' : 'kept'
  return {
    kind,
    label: '',
    previousLabel: '',
    heading: '',
    status,
    moved: false,
    modified: true,
    parts: wordDiff(beforeText, afterText)
  }
}

function wholeItem(block: Block, status: 'added' | 'removed'): ComparedItem {
  return {
    kind: 'scene',
    label: block.label,
    previousLabel: '',
    heading: block.heading,
    status,
    moved: false,
    modified: true,
    parts: [{ text: block.text, kind: status }]
  }
}

export function wordDiff(beforeText: string, afterText: string): DiffPart[] {
  return diffWordsWithSpace(beforeText, afterText).map((change) => ({
    text: change.value,
    kind: change.added ? 'added' : change.removed ? 'removed' : 'same'
  }))
}

/**
 * Découpe un scénario : page de titre, texte avant la première scène, puis une scène par en-tête
 * (de l'en-tête jusqu'au suivant, lignes vides de fin retirées).
 */
function splitBlocks(side: ComparedScript): {
  titlePage: string
  opening: string
  scenes: Block[]
} {
  const { titlePage, body } = splitTitlePage(comparisonText(side.text))
  const lines = body.split('\n')
  const scenes = getScenes(parse(body, { titlePage: false }))
  const starts = scenes.map((scene) => (scene.heading.position?.startLine ?? 1) - 1)
  const slice = (from: number, to: number): string =>
    lines.slice(from, to).join('\n').replace(/\s+$/, '')
  const blocks = scenes.map((scene, index): Block => {
    const number = scene.info.number === null ? null : parseSceneNumber(scene.info.number)
    const key = number ? numberKey(number) : null
    const text = slice(starts[index], starts[index + 1] ?? lines.length)
    const [first, ...rest] = text.split('\n')
    return {
      id: key === null ? null : (side.sceneIds?.[key] ?? null),
      number: key,
      label: number ? sceneLabel(number) : '',
      heading: scene.heading.text.trim(),
      text: [first.replace(/\s*#[^#\s]+#\s*$/, ''), ...rest].join('\n')
    }
  })
  return {
    titlePage: titlePage.replace(/\s+$/, ''),
    opening: slice(0, starts[0] ?? lines.length).replace(/^\s+/, ''),
    scenes: blocks
  }
}

/**
 * Positions (dans `values`) d'une plus longue suite croissante : les scènes communes qui gardent
 * leur ordre. Les autres sont « déplacées ».
 */
function longestIncreasing(values: readonly number[]): Set<number> {
  const tails: number[] = []
  const previous: number[] = new Array<number>(values.length).fill(-1)
  values.forEach((value, index) => {
    let low = 0
    let high = tails.length
    while (low < high) {
      const middle = (low + high) >> 1
      if (values[tails[middle]] < value) low = middle + 1
      else high = middle
    }
    if (low > 0) previous[index] = tails[low - 1]
    tails[low] = index
  })
  const kept = new Set<number>()
  for (let index = tails.at(-1) ?? -1; index !== -1; index = previous[index]) kept.add(index)
  return kept
}
