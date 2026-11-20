// Module Fountain de NeoScenar : lit, analyse et réécrit un scénario au format Fountain.
// Règle : aucune dépendance (ni Electron, ni React, ni Node), pour fonctionner partout.

export type * from './types.ts'
export type { Scene, CharacterSummary, LocationSummary } from './queries.ts'
export type { InlineSpan, InlineRange, InlineLayout } from './inline.ts'
export type { ElementChanges } from './edit.ts'

export type { ParseOptions } from './parser.ts'
export { parse, splitTitlePage } from './parser.ts'
export { serialize } from './serialize.ts'
export { getScenes, getCharacters, getLocations } from './queries.ts'
export { parseInline, inlineLayout } from './inline.ts'
export { parseSceneHeading, splitLocationAndTime } from './sceneHeading.ts'
export { parseCharacterLine } from './character.ts'
export { createElement, updateElement } from './edit.ts'
export type { TitlePageField, TitlePageValues } from './titlePageEdit.ts'
export { TITLE_PAGE_FIELDS, readTitlePage, updateTitlePage, plainTitle } from './titlePageEdit.ts'

// Mise en page et pagination (partagées par l'éditeur et l'export PDF).
export type {
  LayoutProfile,
  ElementStyle,
  ResolvedLayout,
  ResolvedStyle,
  PrintedElementType,
  TextAlign
} from './profile.ts'
export type { LaidOutLine, ElementLayout, PaginationOptions } from './layout.ts'
export type { Page, PageFragment, PageStart, Pagination } from './paginate.ts'
export type { SectionRange, SectionEnd } from './structure.ts'
export type { DurationEstimate } from './durations.ts'
export { resolveLayout, mmToCh, PRINTED_TYPES } from './profile.ts'
export { wrapLine } from './wrap.ts'
export { layoutElements, layoutLines, DUAL_COLUMN_WIDTH } from './layout.ts'
export type { DualDialogue } from './dialogueRules.ts'
export { continuedCharacters, dualDialogues, CONTINUED_MARK } from './dialogueRules.ts'
export { paginate, paginateLayouts, pageStarts } from './paginate.ts'
export { getSectionRanges, getSectionEnds, getSceneNumbers } from './structure.ts'
export { estimateDurations } from './durations.ts'
