// Vérification de ce que l'interface envoie pour les fiches (jamais utilisé tel quel).

import { SHEET_SCHEMAS, type SheetKind, type SheetPatch } from '../../shared/research/types'
import { fr } from '../../renderer/i18n/fr'
import { ProjectError } from '../project/errors'

/** Garde-fou : une section de fiche n'a aucune raison de dépasser cette taille. */
const MAX_TEXT_LENGTH = 1_000_000
const MAX_IMAGES = 1000

export function parseSheetKind(raw: unknown): SheetKind {
  if (typeof raw === 'string' && Object.hasOwn(SHEET_SCHEMAS, raw)) return raw as SheetKind
  throw new ProjectError(fr.research.sheetNotFound)
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_TEXT_LENGTH
}

/** Ne garde que les champs connus du type de fiche, en texte. */
function knownTexts(raw: unknown, keys: readonly string[]): Record<string, string> | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const source = raw as Record<string, unknown>
  const entries = keys.filter((key) => isText(source[key])).map((key) => [key, source[key]])
  return entries.length > 0 ? (Object.fromEntries(entries) as Record<string, string>) : undefined
}

export function parseSheetPatch(kind: SheetKind, raw: unknown): SheetPatch {
  const value = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const schema = SHEET_SCHEMAS[kind]
  const images = Array.isArray(value.images)
    ? value.images.filter((ref): ref is string => isText(ref) && ref.trim() !== '')
    : undefined
  return {
    props: knownTexts(value.props, schema.props),
    sections: knownTexts(
      value.sections,
      schema.sections.map(([key]) => key)
    ),
    auto: typeof value.auto === 'boolean' ? value.auto : undefined,
    images: images && images.length <= MAX_IMAGES ? images : undefined
  }
}
