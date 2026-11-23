// Étape 18C-9 : un commentaire de marque peut tenir sur plusieurs lignes. Un vrai retour à la ligne
// dans la note coupait la ligne imprimée et décalait la page suivante : chaque retour devient donc
// « ¶ » ([[R:jaune|ligne 1 ¶ ligne 2]]). Vérification : la pagination, le PDF, les statistiques et
// le rapprochement restent identiques, y compris juste avant un trait de page.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  paginate,
  parse,
  resolveLayout,
  type LayoutProfile,
  type Pagination
} from '@neoscenar/fountain'
import { exportScenarioPdf, planPages } from '@neoscenar/pdf-scenario'
import { applyTextChanges, type TextChange } from '../scriptLink/textChanges'
import { readScriptScenes } from '../scriptLink/scriptScenes'
import { scriptNames } from '../research/scriptSheets'
import { computeStats } from '../stats/computeStats'
import { REVISION_COLORS, REVISION_TYPES, cleanComment, findRevisionMarks } from './revisionMarks'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const read = (...parts: string[]): string => readFileSync(join(ROOT, ...parts), 'utf8')
const EXAMPLE = read('packages', 'fountain', 'tests', 'exemples', 'le-dernier-bus.fountain')
const layout = resolveLayout(
  JSON.parse(read('resources', 'mise-en-page', 'final-draft-a4.json')) as LayoutProfile
)
const font = (name: string): Uint8Array =>
  new Uint8Array(
    readFileSync(join(ROOT, 'resources', 'polices', 'courier-prime', `CourierPrime-${name}.ttf`))
  )
const fonts = {
  regular: font('Regular'),
  bold: font('Bold'),
  italic: font('Italic'),
  boldItalic: font('BoldItalic')
}

/** Commentaire tapé sur trois lignes, tel que la fenêtre l'enregistre. */
const COMMENT = cleanComment('Revoir ce passage\nil est trop long\n\net le ton ne va pas')

/** Fin du contenu de l'élément, sans les espaces ni les lignes vides qui suivent. */
function contentEnd(text: string, from: number, to: number): number {
  while (to > from && /\s/.test(text[to - 1])) to--
  return to
}

/** Marque le premier ou le dernier mot des éléments choisis, avec le commentaire sur trois lignes. */
function markWords(text: string, indexes: readonly number[], where: 'first' | 'last'): string {
  const doc = parse(text)
  const changes: TextChange[] = []
  indexes.forEach((index, n) => {
    const position = doc.elements[index].position
    if (!position) return
    const end = contentEnd(text, position.startOffset, position.endOffset)
    const body = text.slice(position.startOffset, end)
    const match = where === 'first' ? /^\S+/.exec(body) : /\S+$/.exec(body)
    if (!match) return
    const from = position.startOffset + match.index
    const to = from + match[0].length
    const color = REVISION_COLORS[n % 4]
    changes.push({ from, to: from, insert: `[[R:${color}|${COMMENT}]]` })
    changes.push({ from: to, to, insert: '[[/R]]' })
  })
  return applyTextChanges(text, changes)
}

const allowed = (text: string): number[] =>
  parse(text)
    .elements.map((element, index) => (REVISION_TYPES.has(element.type) ? index : -1))
    .filter((index) => index >= 0)

const paginationOf = (text: string): Pagination =>
  paginate(parse(text), layout, { continued: true })

/** Dernier élément imprimé de chaque page qui précède un trait de page (hors dialogue). */
function lastOfPages(text: string): number[] {
  const doc = parse(text)
  return paginationOf(text)
    .pages.slice(0, -1)
    .map((page) => page.fragments[page.fragments.length - 1]?.elementIndex ?? -1)
    .filter((index) => index >= 0 && REVISION_TYPES.has(doc.elements[index].type))
}

/** Ce qui fait la mise en page : éléments, lignes imprimées et place de chaque fragment. */
function pageShape(pagination: Pagination) {
  return {
    layouts: pagination.layouts.map((element) => ({
      type: element.type,
      lines: element.lines.map((line) => line.text)
    })),
    pages: pagination.pages.map((page) => ({
      number: page.number,
      usedLines: page.usedLines,
      fragments: page.fragments.map(({ elementIndex, firstLine, lineCount, row }) => ({
        elementIndex,
        firstLine,
        lineCount,
        row
      }))
    }))
  }
}

function pdfInput(text: string) {
  const document = parse(text)
  return {
    document,
    pagination: paginate(document, layout, { continued: true }),
    layout,
    fonts,
    options: { pageDeTitre: true, numerotation: 'fountain' as const, scenario: true }
  }
}

const withoutDates = (bytes: Uint8Array): string =>
  Buffer.from(bytes)
    .toString('latin1')
    .replace(/\/(CreationDate|ModDate) \(D:[^)]*\)/g, '')

const EVERYWHERE = markWords(EXAMPLE, allowed(EXAMPLE), 'first')
const BEFORE_BREAKS = markWords(EXAMPLE, lastOfPages(EXAMPLE), 'last')

describe('commentaire de marque sur plusieurs lignes', () => {
  it('le commentaire est écrit sur une seule ligne du fichier', () => {
    expect(COMMENT).toBe('Revoir ce passage ¶ il est trop long ¶ et le ton ne va pas')
    const lines = (text: string) => text.split('\n').length
    expect(lines(EVERYWHERE)).toBe(lines(EXAMPLE))
    expect(lines(BEFORE_BREAKS)).toBe(lines(EXAMPLE))
  })

  it('les marques sont reconnues, commentaire compris', () => {
    const marks = findRevisionMarks(parse(EVERYWHERE))
    expect(marks.length).toBe(allowed(EXAMPLE).length)
    expect(marks.every((mark) => mark.comment === COMMENT)).toBe(true)
    expect(findRevisionMarks(parse(BEFORE_BREAKS)).length).toBe(lastOfPages(EXAMPLE).length)
  })

  it('les éléments gardent leur type', () => {
    const types = (text: string) => parse(text).elements.map((element) => element.type)
    expect(types(EVERYWHERE)).toEqual(types(EXAMPLE))
    expect(types(BEFORE_BREAKS)).toEqual(types(EXAMPLE))
  })

  it('pagination identique', () => {
    expect(pageShape(paginationOf(EVERYWHERE))).toEqual(pageShape(paginationOf(EXAMPLE)))
    expect(planPages(pdfInput(EVERYWHERE))).toEqual(planPages(pdfInput(EXAMPLE)))
  })

  it('juste avant un trait de page, la page suivante ne bouge pas', () => {
    expect(lastOfPages(EXAMPLE).length).toBeGreaterThan(3)
    expect(pageShape(paginationOf(BEFORE_BREAKS))).toEqual(pageShape(paginationOf(EXAMPLE)))
    expect(planPages(pdfInput(BEFORE_BREAKS))).toEqual(planPages(pdfInput(EXAMPLE)))
  })

  it('PDF identique', async () => {
    const [everywhere, beforeBreaks, plain] = await Promise.all([
      exportScenarioPdf(pdfInput(EVERYWHERE)),
      exportScenarioPdf(pdfInput(BEFORE_BREAKS)),
      exportScenarioPdf(pdfInput(EXAMPLE))
    ])
    expect(withoutDates(everywhere)).toBe(withoutDates(plain))
    expect(withoutDates(beforeBreaks)).toBe(withoutDates(plain))
  })

  it('statistiques identiques', () => {
    const stats = (text: string) => {
      const doc = parse(text, { titlePage: false })
      return computeStats(doc, paginate(doc, layout))
    }
    expect(stats(EVERYWHERE)).toEqual(stats(EXAMPLE))
    expect(stats(BEFORE_BREAKS)).toEqual(stats(EXAMPLE))
  })

  it('scènes (rapprochement) et noms des fiches identiques', () => {
    const scenes = (text: string) =>
      readScriptScenes(text).map(({ number, heading }) => ({ number, heading }))
    expect(scenes(EVERYWHERE)).toEqual(scenes(EXAMPLE))
    expect(scriptNames(parse(EVERYWHERE))).toEqual(scriptNames(parse(EXAMPLE)))
  })
})
