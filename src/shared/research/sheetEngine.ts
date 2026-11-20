// Moteur des fiches : lecture d'un fichier Markdown et réécriture des seuls champs modifiés. Tout ce
// que NeoScenar ne connaît pas (propriétés, commentaires, sections, texte libre) reste intact.

import { isMap, isScalar, parseDocument, type Document } from 'yaml'
import { applyEmbeds, listEmbeds } from './imageEmbeds'
import {
  findSection,
  joinFile,
  joinSections,
  sameHeading,
  sectionLines,
  sectionText,
  splitFile,
  splitSections,
  type Section,
  type Sections
} from './markdown'
import {
  IMAGES_HEADING,
  SHEET_SCHEMAS,
  type SheetContent,
  type SheetKind,
  type SheetPatch
} from './types'

/** Pas de coupure des longues lignes (un résumé reste sur une ligne, comme dans Obsidian). */
const YAML_OPTIONS = { lineWidth: 0 }

/** Le document YAML des propriétés ; null s'il est illisible. */
function readProperties(yaml: string | null): Document | null {
  const doc = parseDocument(yaml ?? '')
  if (doc.errors.length > 0) return null
  // Des propriétés qui ne sont pas une liste « clé: valeur » ne peuvent pas être complétées.
  if (doc.contents !== null && !isMap(doc.contents)) return null
  return doc
}

function textValue(doc: Document | null, key: string): string {
  const value: unknown = doc?.get(key)
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return ''
  return String(value)
}

function boolValue(doc: Document | null, key: string): boolean {
  const value: unknown = doc?.get(key)
  return value === true || value === 'true'
}

export function parseSheet(raw: string, kind: SheetKind): SheetContent {
  const schema = SHEET_SCHEMAS[kind]
  const file = splitFile(raw)
  const doc = readProperties(file.yaml)
  const sections = splitSections(file.body)
  const textOf = (heading: string): string => {
    const section = findSection(sections, heading)
    return section ? sectionText(section.lines) : ''
  }
  const imagesSection = findSection(sections, IMAGES_HEADING)
  return {
    nom: textValue(doc, 'nom').trim(),
    props: Object.fromEntries(schema.props.map((key) => [key, textValue(doc, key)])),
    auto: boolValue(doc, 'auto'),
    sections: Object.fromEntries(schema.sections.map(([key, heading]) => [key, textOf(heading)])),
    images: imagesSection ? listEmbeds(imagesSection.lines) : [],
    unreadable: doc === null
  }
}

/** Valeur YAML d'une propriété : nombre pour l'âge (« 16 »), sinon texte. */
function yamlValue(kind: SheetKind, key: string, value: string): string | number {
  const numeric = SHEET_SCHEMAS[kind].numericProps.includes(key) && /^\d{1,9}$/.test(value.trim())
  return numeric ? Number(value.trim()) : value
}

/** Change une propriété en gardant son commentaire et sa place quand elle existe déjà. */
function setProperty(doc: Document, key: string, value: string | number | boolean): void {
  const node: unknown = doc.get(key, true)
  if (isScalar(node)) {
    if (node.value === value) return
    const wasEmpty = node.value === '' || node.value === null
    node.value = value
    // Les guillemets d'une valeur vide (« "" ») ou d'un autre type ne conviennent plus : la
    // bibliothèque choisit la présentation. Ceux choisis par l'élève pour un texte sont gardés.
    if (typeof value !== 'string' || wasEmpty) node.type = undefined
    return
  }
  // Une propriété absente et vide n'est pas ajoutée.
  if (node === undefined && value === '') return
  doc.set(key, value)
}

/** Ordre des sections connues, pour placer une section qui manque encore. */
function canonicalOrder(kind: SheetKind): string[] {
  return [...SHEET_SCHEMAS[kind].sections.map(([, heading]) => heading), IMAGES_HEADING]
}

/** Section existante, ou nouvelle section ajoutée avant la suivante dans l'ordre habituel. */
function ensureSection(sections: Sections, kind: SheetKind, heading: string): Section {
  const existing = findSection(sections, heading)
  if (existing) return existing
  const order = canonicalOrder(kind)
  const later = order.slice(order.indexOf(heading) + 1)
  const index = sections.sections.findIndex((section) =>
    later.some((name) => sameHeading(name, section.heading))
  )
  const created: Section = { heading, headingLine: `## ${heading}`, lines: [''] }
  if (index >= 0) {
    sections.sections.splice(index, 0, created)
  } else {
    // Ajoutée à la fin : la section précédente doit finir par une ligne vide.
    const previous = sections.sections.at(-1)?.lines ?? sections.preamble
    if (previous.length > 0 && previous.at(-1)?.trim() !== '') previous.push('')
    sections.sections.push(created)
  }
  return created
}

/** Les modifications ne touchent que les champs demandés. Erreur si les propriétés sont illisibles. */
export function applySheetPatch(raw: string, kind: SheetKind, patch: SheetPatch): string {
  const file = splitFile(raw)
  const hasProperties = patch.props !== undefined || patch.auto !== undefined
  if (hasProperties) {
    const doc = readProperties(file.yaml)
    if (!doc) throw new Error('Propriétés illisibles')
    const before = doc.toString(YAML_OPTIONS)
    for (const [key, value] of Object.entries(patch.props ?? {})) {
      if (key === 'nom' || key === 'type' || key === 'auto') continue
      setProperty(doc, key, yamlValue(kind, key, value))
    }
    if (patch.auto !== undefined) setProperty(doc, 'auto', patch.auto)
    const after = doc.toString(YAML_OPTIONS)
    // Rien n'a changé : le texte d'origine est gardé à l'identique.
    if (after !== before) file.yaml = after.replace(/\n$/, '')
  }

  const sections = splitSections(file.body)
  for (const [key, heading] of SHEET_SCHEMAS[kind].sections) {
    const text = patch.sections?.[key]
    if (text === undefined) continue
    const existing = findSection(sections, heading)
    if (existing && sectionText(existing.lines) === sectionText(text.split(/\r?\n/))) continue
    if (!existing && text.trim() === '') continue
    const section = ensureSection(sections, kind, heading)
    section.lines = sectionLines(text)
  }
  if (patch.images !== undefined) {
    const existing = findSection(sections, IMAGES_HEADING)
    const current = existing ? listEmbeds(existing.lines) : []
    const unchanged =
      current.length === patch.images.length && current.every((ref, i) => ref === patch.images?.[i])
    if (!unchanged && (existing || patch.images.length > 0)) {
      const section = ensureSection(sections, kind, IMAGES_HEADING)
      section.lines = applyEmbeds(section.lines, patch.images)
    }
  }
  file.body = joinSections(sections)
  return joinFile(file)
}

/** Change la propriété « nom » (renommage, étape 10D) ; tout le reste du fichier est gardé. */
export function renameSheetText(raw: string, nom: string): string {
  const file = splitFile(raw)
  const doc = readProperties(file.yaml)
  if (!doc) throw new Error('Propriétés illisibles')
  setProperty(doc, 'nom', nom)
  file.yaml = doc.toString(YAML_OPTIONS).replace(/\n$/, '')
  return joinFile(file)
}

/** Texte d'une nouvelle fiche, avec toutes ses sections (vides). `auto` : créée par le rapprochement. */
export function newSheetText(
  kind: SheetKind,
  nom: string,
  props: Record<string, string>,
  auto = false
): string {
  const schema = SHEET_SCHEMAS[kind]
  const doc = parseDocument('')
  doc.set('type', schema.type)
  doc.set('nom', nom)
  for (const key of schema.props) {
    const value = props[key] ?? ''
    doc.set(key, value === '' ? '' : yamlValue(kind, key, value))
  }
  doc.set('auto', auto)
  const headings = [...schema.sections.map(([, heading]) => heading), IMAGES_HEADING]
  const body = headings.flatMap((heading) => [`## ${heading}`, ''])
  return ['---', doc.toString(YAML_OPTIONS).trimEnd(), '---', '', ...body].join('\n')
}
