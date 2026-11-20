// Modification de la page de titre (fenêtre « Page de titre… ») : seules les clés modifiées sont
// réécrites ; les autres, et les clés inconnues, gardent leur texte source exact.

import { parseInline } from './inline.ts'
import { parse } from './parser.ts'
import type { TitlePageEntry } from './types.ts'

/** Champs de la fenêtre, dans l'ordre, avec leur clé Fountain. */
export const TITLE_PAGE_FIELDS = [
  'Title',
  'Credit',
  'Author',
  'Source',
  'Contact',
  'Draft date',
  'Notes'
] as const

export type TitlePageField = (typeof TITLE_PAGE_FIELDS)[number]

/** Valeurs de la page de titre ; une valeur sur plusieurs lignes contient des « \n ». */
export type TitlePageValues = Record<TitlePageField, string>

const INDENT = '   '

function fieldOf(key: string): TitlePageField | undefined {
  const wanted = key.trim().toLowerCase().replace(/\s+/g, ' ')
  return TITLE_PAGE_FIELDS.find((field) => field.toLowerCase() === wanted)
}

/** Lignes non vides, sans espaces de bord : c'est ainsi que Fountain relit une valeur. */
function normalize(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .join('\n')
}

function entriesOf(titlePage: string) {
  const doc = parse(titlePage)
  return { doc, entries: doc.titlePage?.entries ?? [] }
}

/** Valeurs des champs de la fenêtre lues dans la page de titre (la première clé de chaque champ). */
export function readTitlePage(titlePage: string): TitlePageValues {
  const values = Object.fromEntries(
    TITLE_PAGE_FIELDS.map((field) => [field, ''])
  ) as TitlePageValues
  const seen = new Set<TitlePageField>()
  for (const entry of entriesOf(titlePage).entries) {
    const field = fieldOf(entry.key)
    if (!field || seen.has(field)) continue
    seen.add(field)
    values[field] = entry.value
  }
  return values
}

function formatEntry(key: string, value: string, lineEnding: string): string {
  const lines = value.split('\n')
  if (lines.length === 1) return `${key}: ${lines[0]}${lineEnding}`
  return `${key}:${lineEnding}${lines.map((line) => `${INDENT}${line}${lineEnding}`).join('')}`
}

/**
 * Nouveau texte de la page de titre (`titlePage` : le texte exact de la page de titre, lignes vides
 * finales et marque BOM comprises, vide s'il n'y en a pas) avec les valeurs de la fenêtre.
 * Clés inchangées et clés inconnues : texte source exact, à leur place. Clé modifiée : réécrite à sa
 * place. Clé nouvelle : ajoutée à la fin, dans l'ordre des champs. Champ vide : clé supprimée.
 */
export function updateTitlePage(
  titlePage: string,
  values: Partial<TitlePageValues>,
  lineEnding: '\n' | '\r\n' | '\r' = '\n'
): string {
  const bom = titlePage.startsWith('﻿') ? '﻿' : ''
  const { doc, entries } = entriesOf(titlePage)
  const ending = doc.titlePage ? doc.lineEnding : lineEnding
  const wanted = new Map(
    TITLE_PAGE_FIELDS.map((field) => [field, normalize(values[field] ?? '')] as const)
  )
  const written = new Set<TitlePageField>()
  const parts: string[] = []

  for (const entry of entries) {
    const field = fieldOf(entry.key)
    if (!field || written.has(field) || values[field] === undefined) {
      parts.push(rawOf(entry, ending))
      continue
    }
    written.add(field)
    const value = wanted.get(field) ?? ''
    if (value === '') continue
    parts.push(
      value === normalize(entry.value)
        ? rawOf(entry, ending)
        : formatEntry(entry.key, value, ending)
    )
  }
  for (const field of TITLE_PAGE_FIELDS) {
    const value = wanted.get(field) ?? ''
    if (written.has(field) || value === '' || entries.some((entry) => fieldOf(entry.key) === field))
      continue
    parts.push(formatEntry(field, value, ending))
  }

  if (parts.length === 0) return bom
  const body = parts.join('')
  // Les lignes vides qui séparent la page de titre du scénario sont gardées ; une page créée en a une.
  const trailing = doc.titlePage
    ? titlePage.slice(
        bom.length + entries.reduce((sum, entry) => sum + rawOf(entry, ending).length, 0)
      )
    : ending
  return bom + body + trailing
}

/** Texte source d'une entrée, fin de ligne comprise. */
function rawOf(entry: TitlePageEntry, ending: string): string {
  if (entry.raw === undefined) return formatEntry(entry.key, entry.value, ending)
  return /(\r\n|\r|\n)$/.test(entry.raw) ? entry.raw : entry.raw + ending
}

/** Texte d'une valeur sans marqueurs de mise en forme ni notes : « _**LE DERNIER BUS**_ » → « LE DERNIER BUS ». */
export function plainTitle(value: string): string {
  return value
    .split('\n')
    .map((line) =>
      parseInline(line)
        .filter((span) => span.type === 'text')
        .map((span) => span.text)
        .join('')
        .trim()
    )
    .filter((line) => line !== '')
    .join(' ')
}
