import { DIALOGUE_GROUP, parse } from './parser.ts'
import type { FountainDocument, FountainElement, TitlePage, TitlePageEntry } from './types.ts'

const BOM = '﻿'

/**
 * Réécrit un document en texte Fountain.
 * Un élément non modifié redonne son texte source exact ; un élément créé ou modifié par programme
 * est produit proprement, avec un marqueur de forçage seulement s'il est nécessaire.
 */
export function serialize(doc: FountainDocument): string {
  const eol = doc.lineEnding ?? '\n'
  let out = doc.bom ? BOM : ''
  const bodyStart = out.length
  if (doc.titlePage) out += renderTitlePage(doc.titlePage, eol, doc.elements.length > 0)
  out += doc.leading ?? ''

  let previous: FountainElement | undefined
  let previousGenerated = false
  doc.elements.forEach((element, index) => {
    const generated = typeof element.raw !== 'string'
    if (generated || previousGenerated) {
      out = separate(out, bodyStart, element, previous, doc.elements[index + 1], eol)
    }
    out += generated ? renderElement(element, doc.elements[index + 1], eol) : element.raw
    previous = element
    previousGenerated = generated
  })
  return out
}

/** Ajoute la fin de ligne et la ligne vide nécessaires avant un élément produit par programme. */
function separate(
  out: string,
  bodyStart: number,
  element: FountainElement,
  previous: FountainElement | undefined,
  next: FountainElement | undefined,
  eol: string
): string {
  if (out.length === bodyStart) return out
  if (!endsWithLineBreak(out)) out += eol
  if (needsBlankLineBefore(element, previous, next) && !endsWithBlankLine(out, bodyStart))
    out += eol
  return out
}

function needsBlankLineBefore(
  element: FountainElement,
  previous?: FountainElement,
  next?: FountainElement
): boolean {
  if (element.type === 'parenthetical' || element.type === 'dialogue') return false
  const afterDialogue = previous !== undefined && DIALOGUE_GROUP.has(previous.type)
  if (element.type === 'lyrics') return !afterDialogue
  // Une note n'est collée au dialogue que si le dialogue continue après elle.
  if (element.type === 'note' || element.type === 'boneyard') {
    const dialogueContinues =
      next !== undefined && DIALOGUE_GROUP.has(next.type) && next.type !== 'character'
    return !(afterDialogue && dialogueContinues)
  }
  return true
}

function endsWithLineBreak(text: string): boolean {
  return text.endsWith('\n') || text.endsWith('\r')
}

function endsWithBlankLine(text: string, bodyStart: number): boolean {
  let end = text.length
  if (text.endsWith('\r\n')) end -= 2
  else if (endsWithLineBreak(text)) end -= 1
  if (end <= bodyStart) return true
  const before = text[end - 1]
  return before === '\n' || before === '\r'
}

function renderTitlePage(titlePage: TitlePage, eol: string, hasBody: boolean): string {
  if (typeof titlePage.raw === 'string') return titlePage.raw
  let out = ''
  for (const entry of titlePage.entries) {
    if (typeof entry.raw === 'string') {
      out += entry.raw
      if (!endsWithLineBreak(entry.raw)) out += eol
    } else {
      out += renderTitleEntry(entry, eol)
    }
  }
  return out !== '' && hasBody ? out + eol : out
}

function renderTitleEntry(entry: TitlePageEntry, eol: string): string {
  const values = entry.value.split('\n')
  if (values.length === 1)
    return entry.value === '' ? `${entry.key}:${eol}` : `${entry.key}: ${entry.value}${eol}`
  return `${entry.key}:${eol}` + values.map((value) => `    ${value}${eol}`).join('')
}

function renderElement(
  element: FountainElement,
  next: FountainElement | undefined,
  eol: string
): string {
  return renderLines(element, next).join(eol) + eol
}

function renderLines(element: FountainElement, next?: FountainElement): string[] {
  const { text } = element
  switch (element.type) {
    case 'action':
      return withForcing(element, text, '!', '\n').split('\n')
    case 'scene_heading': {
      const number = element.scene?.number
      return [withForcing(element, number ? `${text} #${number}#` : text, '.', '\n')]
    }
    case 'character': {
      const line = element.character?.dual ? `${text} ^` : text
      const followedByDialogue = next !== undefined && DIALOGUE_GROUP.has(next.type)
      return [withForcing(element, line, '@', followedByDialogue ? 'x\n' : '\n')]
    }
    case 'transition':
      return [withForcing(element, text, '>', '\n')]
    case 'parenthetical':
      return [text.startsWith('(') ? text : `(${text})`]
    case 'dialogue':
      // Une ligne vide dans un dialogue s'écrit avec deux espaces.
      return text.split('\n').map((line) => (line === '' ? '  ' : line))
    case 'lyrics':
      return text.split('\n').map((line) => `~${line}`)
    case 'centered':
      return [`> ${text} <`]
    case 'page_break':
      return ['===']
    case 'section':
      return [`${'#'.repeat(Math.max(1, element.section?.level ?? 1))} ${text}`]
    case 'synopsis':
      return [`= ${text}`]
    case 'note':
      return `[[${text}]]`.split('\n').map((line) => (line === '' ? '  ' : line))
    case 'boneyard':
      return `/*${text}*/`.split('\n')
  }
}

/** Ajoute le marqueur de forçage uniquement si, sans lui, la ligne serait reconnue autrement. */
function withForcing(
  element: FountainElement,
  line: string,
  marker: string,
  followedBy: string
): string {
  return parsesAs(element, line, followedBy) ? line : marker + line
}

function parsesAs(element: FountainElement, candidate: string, followedBy: string): boolean {
  // Une action forcée puis une ligne vide placent le candidat dans un contexte neutre.
  const parsed = parse(`!x\n\n${candidate}\n${followedBy}`).elements[1]
  return parsed !== undefined && parsed.type === element.type && parsed.text === element.text
}
