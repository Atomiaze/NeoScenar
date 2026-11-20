// Liens entre le scénario et les fiches (étape 10C). Aux mêmes moments que le rapprochement des
// cartes (ouverture du projet, retour dans NeoScenar, éventuellement après une modification dans
// Obsidian) et après chaque enregistrement du scénario — jamais à la frappe —, les personnages et les
// lieux du scénario sans fiche reçoivent une fiche vide. Le résumé va dans le bandeau de l'étape 8.

import { parse } from '@neoscenar/fountain'
import { renameInScript } from '../../shared/research/scriptRename'
import { planSheets, scriptNames, type Resemblance } from '../../shared/research/scriptSheets'
import { nameKey } from '../../shared/research/sheetNames'
import type { Sheet, SheetKind } from '../../shared/research/types'
import { updateSheetsBanner, type SheetLink } from '../scriptLink/linkStore'
import {
  editingLineNumber,
  editScriptFromSheets,
  scriptText,
  undoScriptEdit
} from '../script/scriptStore'
import { loadSheets, researchStore, showResearchError } from './researchStore'

const KINDS: readonly SheetKind[] = ['personnages', 'lieux']

/**
 * Ressemblances déjà signalées pendant la séance (clés par type) : elles ne reviennent pas à chaque
 * enregistrement, seulement à la prochaine ouverture du projet.
 */
const signaled: Record<SheetKind, Set<string>> = { personnages: new Set(), lieux: new Set() }

/** Révision du texte juste après le dernier remplacement (pour « Annuler »), ou null. */
let replacedRevision: number | null = null

let running: Promise<void> | null = null
let again = false

/**
 * Rapproche les fiches du scénario. Un seul à la fois : une demande pendant qu'il tourne le relance
 * une fois à la fin, sur le texte du moment.
 */
export function syncSheetsWithScript(): Promise<void> {
  if (running) {
    again = true
    return running
  }
  running = (async () => {
    do {
      again = false
      await syncOnce()
    } while (again)
  })().finally(() => {
    running = null
  })
  return running
}

async function syncOnce(): Promise<void> {
  const body = scriptText()
  if (body === null) return
  const doc = parse(body, { titlePage: false })
  const present = scriptNames(doc)
  const settled = scriptNames(doc, editingLineNumber())

  await loadSheets()
  const state = researchStore.get()
  if (state.error) return
  researchStore.set({ scriptNames: present })

  const created: SheetLink[] = []
  const resemblances: Resemblance[] = []
  for (const kind of KINDS) {
    const existing = state.sheets[kind].map((sheet) => sheet.nom)
    const plan = planSheets(kind, settled[kind], existing, signaled[kind])
    for (const item of plan.resemblances) signaled[kind].add(nameKey(item.name))
    resemblances.push(...plan.resemblances)
    if (plan.create.length === 0) continue
    const result = await window.neoscenar.createAutoSheets(kind, plan.create)
    if (!result.ok) {
      showResearchError(result.error)
      continue
    }
    created.push(...result.value.map(sheetLink))
  }
  if (created.length > 0) await loadSheets()
  if (created.length === 0 && resemblances.length === 0) return
  updateSheetsBanner((sheets) => ({
    ...sheets,
    created: [...sheets.created, ...created],
    resemblances: [...sheets.resemblances, ...resemblances]
  }))
}

function sheetLink(sheet: Sheet): SheetLink {
  return { kind: sheet.kind, fileName: sheet.fileName, nom: sheet.nom }
}

function withoutResemblance(list: Resemblance[], done: Resemblance): Resemblance[] {
  return list.filter((item) => item.kind !== done.kind || item.name !== done.name)
}

/** « Créer la fiche MARI » : l'élève confirme que c'est bien un autre nom. */
export async function createSheetAnyway(resemblance: Resemblance): Promise<void> {
  const result = await window.neoscenar.createAutoSheets(resemblance.kind, [resemblance.name])
  if (!result.ok) {
    showResearchError(result.error)
    return
  }
  await loadSheets()
  updateSheetsBanner((sheets) => ({
    ...sheets,
    created: [...sheets.created, ...result.value.map(sheetLink)],
    resemblances: withoutResemblance(sheets.resemblances, resemblance)
  }))
}

/** « Remplacer MARI par MARIE dans le scénario » : annulable (bandeau, ou Cmd + Z dans l'éditeur). */
export function replaceWithSheet(resemblance: Resemblance): void {
  const body = scriptText()
  if (body === null) return
  const changes = renameInScript(
    body,
    parse(body, { titlePage: false }),
    resemblance.kind,
    resemblance.name,
    resemblance.sheet
  )
  if (changes.length > 0) replacedRevision = editScriptFromSheets(changes)
  updateSheetsBanner((sheets) => ({
    ...sheets,
    resemblances: withoutResemblance(sheets.resemblances, resemblance),
    replaced:
      changes.length > 0
        ? {
            kind: resemblance.kind,
            name: resemblance.name,
            sheet: resemblance.sheet,
            count: changes.length
          }
        : sheets.replaced
  }))
}

/** « Annuler » après un remplacement : seulement si le texte n'a pas changé depuis. */
export function undoReplace(): void {
  if (replacedRevision !== null) undoScriptEdit(replacedRevision)
  replacedRevision = null
  updateSheetsBanner((sheets) => ({ ...sheets, replaced: null }))
}

/** Attend la fin du rapprochement des fiches en cours, s'il y en a un (renommage, étape 10D). */
export function sheetsSyncDone(): Promise<void> {
  return running ?? Promise.resolve()
}

/** Projet fermé : la séance recommence à zéro. */
export function resetSheetsLink(): void {
  signaled.personnages.clear()
  signaled.lieux.clear()
  replacedRevision = null
  again = false
}
