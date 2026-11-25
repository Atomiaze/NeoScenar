// Arbre du navigateur de scènes, entièrement tiré du texte Fountain analysé.
// Numéros, durées et couleurs viennent des mêmes fonctions que la marge, la pagination et les bandeaux.

import {
  estimateDurations,
  getScenes,
  parseInline,
  type FountainDocument,
  type FountainElement,
  type Pagination
} from '@neoscenar/fountain'
import { displayedSceneNumber, sectionColorsOf } from '../editor/analysis'
import { readSynopsis } from './synopsis'
import { draftHeadings, isDraftNote } from '../../../shared/scriptLink/draftScene'
import { chosenSectionColors } from '../../../shared/scriptLink/sectionColor'
import { findRevisionMarks, revisionMarkerStarts } from '../../../shared/revision/revisionMarks'

interface NavigatorItemBase {
  /** Index de l'élément (en-tête ou section) dans document.elements. */
  index: number
  /** Début de la ligne de l'en-tête ou de la section dans le texte, et numéro de cette ligne. */
  from: number
  line: number
  seconds: number
  /** Contient une vraie note (les marques de révision n'en sont pas). */
  hasNote: boolean
  /** Nombre de marques de révision (étape 13E), sous-scènes comprises pour un acte. */
  revisionCount: number
  /** Lignes « = » qui suivent directement l'en-tête ou la section. */
  synopsis: string[]
}

export interface NavigatorScene extends NavigatorItemBase {
  kind: 'scene'
  /** Numéro affiché (« S_0030 », le même que dans la marge de l'éditeur) ; vide sans numéro valide. */
  number: string
  /** Clé du numéro (« 30 »), pour retrouver la carte de la scène ; null sans numéro valide. */
  numberKey: string | null
  /** En-tête sans marqueurs de forçage, numéro #…#, notes ni mise en forme. */
  heading: string
  /** Texte du premier élément de la scène qui n'est ni un synopsis ni une note ; vide sinon. */
  firstLine: string
  /** Scène brouillon (18C-13) : ni affichée dans l'éditeur, ni imprimée, ni comptée. */
  draft: boolean
}

export interface NavigatorSection extends NavigatorItemBase {
  kind: 'section'
  level: number
  title: string
  color: string
  /** Couleur choisie par l'élève (note [[COULEUR]]) ; null = automatique. */
  chosenColor: string | null
  children: NavigatorItem[]
}

export type NavigatorItem = NavigatorScene | NavigatorSection

export interface NavigatorTree {
  sceneCount: number
  totalSeconds: number
  items: NavigatorItem[]
}

const MARKED_TEXT = /\[\[[\s\S]*?\]\]|\/\*[\s\S]*?\*\//g
const NOT_FIRST_LINE: ReadonlySet<string> = new Set(['synopsis', 'note', 'boneyard', 'page_break'])

/** Texte lisible : sans notes, texte mis de côté ni marqueurs de mise en forme ; première ligne non vide. */
export function plainFirstLine(text: string): string {
  for (const line of text.replace(MARKED_TEXT, '').split('\n')) {
    const plain = parseInline(line)
      .filter((span) => span.type === 'text')
      .map((span) => span.text)
      .join('')
      .replace(/\s+/g, ' ')
      .trim()
    if (plain !== '') return plain
  }
  return ''
}

/** Éléments propres à la scène : ceux qui suivent l'en-tête, jusqu'à la section suivante. */
function ownElements(elements: FountainElement[]): FountainElement[] {
  const end = elements.findIndex((element) => element.type === 'section')
  return end < 0 ? elements : elements.slice(0, end)
}

/**
 * `pagination` est celle de `printed`, le document sans les scènes brouillon (18C-13) : elles sont
 * montrées, mais sans durée et hors des comptes. Les éléments de `printed` sont ceux de `doc`.
 */
export function buildNavigator(
  doc: FountainDocument,
  pagination: Pagination,
  printed: FountainDocument = doc
): NavigatorTree {
  const durations = estimateDurations(printed, pagination)
  const sceneSeconds = new Map(
    durations.scenes.map((scene) => [printed.elements[scene.index], scene.seconds])
  )
  // Un acte compte tout ce qui se trouve entre sa ligne et la section suivante de même niveau ou de
  // niveau supérieur (actions d'ouverture comprises) : la durée de section de la pagination.
  const sectionSeconds = new Map(
    durations.sections.map((section) => [printed.elements[section.index], section.seconds])
  )
  const drafts = draftHeadings(doc)
  const colors = sectionColorsOf(doc)
  const chosenColors = chosenSectionColors(doc)
  const scenes = getScenes(doc)
  const sceneByIndex = new Map(scenes.map((scene, order) => [scene.index, { scene, order }]))

  const marks = findRevisionMarks(doc)
  const markers = revisionMarkerStarts(marks)
  const marksByElement = new Map<FountainElement, number>()
  for (const mark of marks) {
    const element = doc.elements[mark.element]
    marksByElement.set(element, (marksByElement.get(element) ?? 0) + 1)
  }
  const hasNote = (element: FountainElement): boolean =>
    !isDraftNote(element) && element.notes.some((note) => !markers.has(note.start))
  const markCount = (elements: FountainElement[]): number =>
    elements.reduce((total, element) => total + (marksByElement.get(element) ?? 0), 0)

  const items: NavigatorItem[] = []
  const open: NavigatorSection[] = []
  const container = (): NavigatorItem[] => open[open.length - 1]?.children ?? items

  doc.elements.forEach((element, index) => {
    const position = element.position
    if (!position) return
    const base = {
      index,
      from: position.startOffset,
      line: position.startLine,
      synopsis: readSynopsis(doc, index).lines
    }
    if (element.type === 'section') {
      const level = element.section?.level ?? 1
      while (open.length > 0 && open[open.length - 1].level >= level) open.pop()
      const section: NavigatorSection = {
        ...base,
        kind: 'section',
        level,
        title: plainFirstLine(element.text),
        color: colors.get(index) ?? '',
        chosenColor: chosenColors.get(index) ?? null,
        seconds: sectionSeconds.get(element) ?? 0,
        hasNote: hasNote(element),
        revisionCount: 0,
        children: []
      }
      container().push(section)
      open.push(section)
    } else if (element.type === 'scene_heading') {
      const found = sceneByIndex.get(index)
      if (!found) return
      const own = ownElements(found.scene.elements)
      const first = own.find((item) => !NOT_FIRST_LINE.has(item.type))
      const shown = displayedSceneNumber(found.scene.info.number)
      const draft = drafts.has(index)
      container().push({
        ...base,
        kind: 'scene',
        number: shown?.label ?? '',
        numberKey: shown?.key ?? null,
        heading: plainFirstLine(element.text),
        firstLine: first ? plainFirstLine(first.text) : '',
        seconds: sceneSeconds.get(element) ?? 0,
        hasNote: [element, ...own].some(hasNote),
        // Le panneau des révisions ne montre pas les marques d'un brouillon : le compte non plus.
        revisionCount: draft ? 0 : markCount([element, ...own]),
        draft
      })
    }
  })

  items.forEach(propagateNotes)
  return { sceneCount: scenes.length - drafts.size, totalSeconds: durations.totalSeconds, items }
}

/** Une note ou une marque de révision dans une scène ou une sous-section remonte vers l'acte. */
function propagateNotes(item: NavigatorItem): void {
  if (item.kind !== 'section') return
  item.children.forEach(propagateNotes)
  item.hasNote = item.hasNote || item.children.some((child) => child.hasNote)
  item.revisionCount = item.children.reduce((total, child) => total + child.revisionCount, 0)
}

/** Éléments du navigateur dans l'ordre du texte (actes et scènes mêlés). */
export function flattenNavigator(items: readonly NavigatorItem[]): NavigatorItem[] {
  return items.flatMap((item) =>
    item.kind === 'section' ? [item, ...flattenNavigator(item.children)] : [item]
  )
}

/** Scène ou acte où se trouve le curseur : le dernier en-tête ou section au-dessus de lui (ou null). */
export function currentItem(
  items: readonly NavigatorItem[],
  cursorLine: number
): NavigatorItem | null {
  let current: NavigatorItem | null = null
  for (const item of flattenNavigator(items)) {
    if (item.line > cursorLine) break
    current = item
  }
  return current
}
