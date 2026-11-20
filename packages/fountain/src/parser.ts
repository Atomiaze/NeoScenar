import { analyzeCharacter } from './character.ts'
import {
  buildLogicalLines,
  detectLineEnding,
  findMarkedRanges,
  isBlankLine,
  splitPhysicalLines,
  type LogicalLine
} from './lines.ts'
import { analyzeSceneHeading } from './sceneHeading.ts'
import {
  FORCED_SCENE_HEADING,
  isCharacterText,
  isParentheticalText,
  isTransitionText,
  PAGE_BREAK,
  SCENE_HEADING_START
} from './syntax.ts'
import { parseTitlePage } from './titlePage.ts'
import type { ElementType, FountainDocument, FountainElement, MarkedText } from './types.ts'

export const DIALOGUE_GROUP: ReadonlySet<ElementType> = new Set([
  'character',
  'parenthetical',
  'dialogue',
  'lyrics'
])

interface Classified {
  type: ElementType
  /** Index de la dernière ligne logique de l'élément. */
  end: number
  forced: boolean
  /** Ligne faite uniquement de notes : elle ne change pas le contexte (bloc de dialogue, ligne vide avant). */
  transparent: boolean
}

export interface ParseOptions {
  /**
   * Faux : le texte est le corps d'un scénario, sans page de titre (celui de l'éditeur).
   * Une première ligne « Lieu: … » y reste alors une action. Vrai par défaut.
   */
  titlePage?: boolean
}

/**
 * Analyse un texte Fountain. Ne lève jamais d'exception : tout texte est classé du mieux possible,
 * et serialize(parse(texte)) redonne exactement le texte d'origine.
 */
export function parse(input: string, options: ParseOptions = {}): FountainDocument {
  const text = typeof input === 'string' ? input : ''
  const bom = text.charCodeAt(0) === 0xfeff
  const physical = splitPhysicalLines(text, bom ? 1 : 0)
  const lines = buildLogicalLines(text, physical, findMarkedRanges(text, bom ? 1 : 0, physical))
  const { titlePage, next } =
    options.titlePage === false ? { titlePage: null, next: 0 } : parseTitlePage(text, lines)
  const { leading, elements } = new BodyParser(text, lines).run(next)
  return { bom, lineEnding: detectLineEnding(text, physical), titlePage, leading, elements }
}

/**
 * Sépare la page de titre (marque BOM et lignes vides qui la suivent comprises) du corps du scénario.
 * titlePage + body redonne exactement le texte d'origine ; titlePage est vide (ou la seule marque BOM)
 * quand le fichier n'a pas de page de titre.
 */
export function splitTitlePage(input: string): { titlePage: string; body: string } {
  const text = typeof input === 'string' ? input : ''
  const from = text.charCodeAt(0) === 0xfeff ? 1 : 0
  const physical = splitPhysicalLines(text, from)
  const lines = buildLogicalLines(text, physical, findMarkedRanges(text, from, physical))
  const { titlePage } = parseTitlePage(text, lines)
  const end = from + (titlePage?.raw?.length ?? 0)
  return { titlePage: text.slice(0, end), body: text.slice(end) }
}

class BodyParser {
  private readonly text: string
  private readonly lines: LogicalLine[]
  private prevBlank = true
  private inDialogue = false

  constructor(text: string, lines: LogicalLine[]) {
    this.text = text
    this.lines = lines
  }

  run(start: number): { leading: string; elements: FountainElement[] } {
    const { lines, text } = this
    let i = start
    while (i < lines.length && isBlankLine(lines[i])) i++
    const leading = text.slice(this.offsetOf(start), this.offsetOf(i))

    const elements: FountainElement[] = []
    while (i < lines.length) {
      const classified = this.classify(i)
      const dialogueContext =
        DIALOGUE_GROUP.has(classified.type) || (classified.transparent && this.inDialogue)
      let next = classified.end + 1
      while (
        next < lines.length &&
        isBlankLine(lines[next]) &&
        !(dialogueContext && this.hasContent(next))
      ) {
        next++
      }
      elements.push(this.buildElement(i, classified, this.offsetOf(next)))
      this.updateContext(classified, next > classified.end + 1)
      i = next
    }
    return { leading, elements }
  }

  private offsetOf(index: number): number {
    return index < this.lines.length ? this.lines[index].start : this.text.length
  }

  /** Ligne non vide ; une ligne de deux espaces compte si elle est suivie de texte (ligne vide dans un dialogue). */
  private hasContent(index: number): boolean {
    const line = this.lines[index]
    if (!line) return false
    if (!isBlankLine(line)) return true
    const following = this.lines[index + 1]
    return line.content === '  ' && following !== undefined && !isBlankLine(following)
  }

  private updateContext(classified: Classified, followedByBlank: boolean): void {
    if (classified.transparent) {
      if (followedByBlank) {
        this.prevBlank = true
        this.inDialogue = false
      }
      return
    }
    const wasInDialogue = this.inDialogue
    this.prevBlank = followedByBlank
    this.inDialogue =
      !followedByBlank &&
      DIALOGUE_GROUP.has(classified.type) &&
      (classified.type !== 'lyrics' || wasInDialogue)
  }

  private classify(i: number): Classified {
    const line = this.lines[i]
    const start = line.stripped.trimStart()
    const trimmed = start.trimEnd()
    const single = (type: ElementType, forced = false): Classified => ({
      type,
      end: i,
      forced,
      transparent: false
    })

    if (trimmed === '' && line.ranges.length > 0) {
      const type = line.ranges.some((range) => range.kind === 'note') ? 'note' : 'boneyard'
      return { type, end: i, forced: false, transparent: true }
    }

    if (this.inDialogue) {
      if (start.startsWith('~')) return single('lyrics')
      if (isParentheticalText(trimmed)) return single('parenthetical')
      let end = i
      while (end + 1 < this.lines.length && this.hasContent(end + 1)) {
        const nextStart = this.lines[end + 1].stripped.trim()
        if (isParentheticalText(nextStart) || nextStart.startsWith('~')) break
        end++
      }
      return { type: 'dialogue', end, forced: false, transparent: false }
    }

    if (PAGE_BREAK.test(trimmed)) return single('page_break')
    if (start.startsWith('!')) return this.action(i, true)
    if (FORCED_SCENE_HEADING.test(start)) return single('scene_heading', true)
    if (start.startsWith('@')) return single('character', true)
    if (start.startsWith('>')) {
      return trimmed.length > 1 && trimmed.endsWith('<')
        ? single('centered')
        : single('transition', true)
    }
    if (start.startsWith('~')) return single('lyrics')
    if (start.startsWith('#')) return single('section')
    if (start.startsWith('=')) return single('synopsis')

    if (this.prevBlank) {
      if (SCENE_HEADING_START.test(start)) return single('scene_heading')
      const nextIsBlank = i + 1 >= this.lines.length || isBlankLine(this.lines[i + 1])
      if (isTransitionText(trimmed) && nextIsBlank) return single('transition')
      if (isCharacterText(trimmed) && this.hasContent(i + 1)) return single('character')
    }
    return this.action(i, false)
  }

  /**
   * Une action s'étend sur les lignes suivantes jusqu'à une ligne vide ou un élément forcé.
   * Une ligne de deux espaces suivie de texte est une ligne vide voulue, qui reste dans l'action (norme Fountain).
   */
  private action(i: number, forced: boolean): Classified {
    let end = i
    while (end + 1 < this.lines.length) {
      if (!this.hasContent(end + 1)) break
      const next = this.lines[end + 1]
      const start = next.stripped.trimStart()
      if (/^[!@~#=>]/.test(start) || FORCED_SCENE_HEADING.test(start)) break
      end++
    }
    return { type: 'action', end, forced, transparent: false }
  }

  private buildElement(i: number, classified: Classified, rawEnd: number): FountainElement {
    const first = this.lines[i]
    const last = this.lines[classified.end]
    const content = this.text.slice(first.start, last.contentEnd).replace(/\r\n?/g, '\n')

    const notes: MarkedText[] = []
    const boneyards: MarkedText[] = []
    for (let k = i; k <= classified.end; k++) {
      for (const range of this.lines[k].ranges) {
        const marked = {
          start: range.start,
          end: range.end,
          text: this.text.slice(range.innerStart, range.innerEnd).replace(/\r\n?/g, '\n')
        }
        ;(range.kind === 'note' ? notes : boneyards).push(marked)
      }
    }

    const element: FountainElement = {
      type: classified.type,
      text: '',
      forced: classified.forced,
      raw: this.text.slice(first.start, rawEnd),
      position: {
        startLine: first.firstLine,
        endLine: last.lastLine,
        startOffset: first.start,
        endOffset: rawEnd
      },
      notes,
      boneyards
    }
    fillText(element, content)
    return element
  }
}

/** Calcule le texte utile (et les informations propres au type) à partir du contenu brut. */
function fillText(element: FountainElement, content: string): void {
  const trimmed = content.trim()
  switch (element.type) {
    case 'action': {
      const text = element.forced ? removeFirstMarker(content, '!') : content
      // Les lignes vides voulues (deux espaces) deviennent des lignes vides du texte utile.
      element.text = text.replace(/^[ \t]+$/gm, '')
      return
    }
    case 'scene_heading': {
      const analysis = analyzeSceneHeading(content)
      element.text = analysis.text
      element.scene = analysis.info
      return
    }
    case 'character': {
      const analysis = analyzeCharacter(content)
      element.text = analysis.text
      element.character = analysis.info
      return
    }
    case 'transition':
      element.text = element.forced ? trimmed.slice(1).trim() : trimmed
      return
    case 'centered':
      element.text = trimmed.slice(1, -1).trim()
      return
    case 'lyrics':
    case 'synopsis':
      element.text = trimmed.slice(1).trim()
      return
    case 'section': {
      const level = /^#+/.exec(trimmed)?.[0].length ?? 1
      element.section = { level }
      element.text = trimmed.slice(level).trim()
      return
    }
    case 'page_break':
      element.text = ''
      return
    case 'parenthetical':
      element.text = trimmed
      return
    case 'dialogue':
      element.text = content
        .split('\n')
        .map((line) => line.trim())
        .join('\n')
      return
    case 'note':
      element.text = element.notes.map((note) => note.text).join(' ')
      return
    case 'boneyard':
      element.text = element.boneyards.map((boneyard) => boneyard.text).join(' ')
      return
  }
}

function removeFirstMarker(content: string, marker: string): string {
  const indent = content.length - content.trimStart().length
  return content[indent] === marker ? content.slice(0, indent) + content.slice(indent + 1) : content
}
