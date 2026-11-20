// Renommage d'une fiche depuis son nom (étape 10D) : la fiche et son fichier sont renommés, et le
// nom est remplacé dans le scénario après une fenêtre de confirmation (sauf s'il n'y apparaît pas).
// Le remplacement se fait hors de l'historique de l'éditeur : seul « Annuler » du bandeau le défait,
// en remettant aussi le nom de la fiche et de son fichier.

import { parse } from '@neoscenar/fountain'
import { planRename, type RenamePlan } from '../../shared/research/scriptRename'
import { cleanSheetName, MAX_SHEET_NAME_LENGTH, nameKey } from '../../shared/research/sheetNames'
import type { SheetKind } from '../../shared/research/types'
import { fr } from '../i18n/fr'
import {
  editScriptQuietly,
  revertScriptEdit,
  scriptStore,
  scriptText,
  type QuietEdit
} from '../script/scriptStore'
import { updateSheetsBanner, type RenamedSheet } from '../scriptLink/linkStore'
import {
  loadSheets,
  openResearchDialog,
  researchStore,
  selectSheet,
  showResearchError,
  type RenameDialog
} from './researchStore'
import { sheetsSyncDone } from './scriptSheetsLink'

const t = fr.research

/** Dernier renommage, pour « Annuler » dans le bandeau. */
interface LastRename {
  kind: SheetKind
  from: string
  fileName: string
  edit: QuietEdit | null
}

let last: LastRename | null = null

const EMPTY_PLAN: RenamePlan = { always: [], inText: [], headings: 0 }

function currentPlan(kind: SheetKind, from: string, to: string): RenamePlan {
  const body = scriptText()
  if (body === null) return EMPTY_PLAN
  return planRename(body, parse(body, { titlePage: false }), kind, from, to)
}

/**
 * Nouveau nom tapé dans la fiche. Renvoie un message d'erreur à afficher sous le nom, ou null.
 * S'il y a quelque chose à remplacer dans le scénario, la fenêtre de confirmation s'ouvre ; sinon
 * la fiche est renommée tout de suite.
 */
export async function requestRename(fileName: string, rawName: string): Promise<string | null> {
  const { kind, sheets } = researchStore.get()
  const sheet = sheets[kind].find((item) => item.fileName === fileName)
  if (!sheet) return t.sheetNotFound
  const to = cleanSheetName(rawName)
  if (to === sheet.nom) return null
  if (to === '') return t.emptyName
  if (to.length > MAX_SHEET_NAME_LENGTH) return t.nameTooLong
  const taken = sheets[kind].find(
    (other) => other.fileName !== fileName && nameKey(other.nom) === nameKey(to)
  )
  if (taken) return t.renameTaken(taken.nom)

  const plan = currentPlan(kind, sheet.nom, to)
  if (plan.always.length + plan.inText.length === 0) {
    return renameSheet(kind, fileName, sheet.nom, to, false)
  }
  openResearchDialog({
    kind: 'rename',
    fileName,
    from: sheet.nom,
    to,
    always: plan.always.length,
    inText: plan.inText.length,
    headings: plan.headings
  })
  return null
}

/** « Remplacer » dans la fenêtre. Renvoie un message d'erreur, ou null. */
export function confirmRename(dialog: RenameDialog, withText: boolean): Promise<string | null> {
  return renameSheet(researchStore.get().kind, dialog.fileName, dialog.from, dialog.to, withText)
}

async function renameSheet(
  kind: SheetKind,
  fileName: string,
  from: string,
  to: string,
  withText: boolean
): Promise<string | null> {
  // Un rapprochement en cours pourrait créer une fiche pour l'ancien nom pendant le renommage.
  await sheetsSyncDone()
  const result = await window.neoscenar.renameSheet(kind, fileName, to, true)
  if (!result.ok) return result.error
  const sheet = result.value.sheet

  // La fiche porte déjà le nouveau nom : le rapprochement qui suit l'enregistrement du scénario
  // trouvera donc sa fiche et n'en créera pas d'autre.
  const plan = currentPlan(kind, from, sheet.nom)
  const changes = withText ? [...plan.always, ...plan.inText] : plan.always
  const edit = changes.length > 0 ? editScriptQuietly(changes) : null
  last = { kind, from, fileName: sheet.fileName, edit }

  openResearchDialog(null)
  await loadSheets()
  selectSheet(kind, sheet.fileName)
  showRenamed({
    from,
    to: sheet.nom,
    count: edit ? changes.length : 0,
    headings: plan.headings,
    undoImpossible: false
  })
  return null
}

function showRenamed(renamed: RenamedSheet | null): void {
  updateSheetsBanner((sheets) => ({ ...sheets, renamed }))
}

/** « Annuler » dans le bandeau : scénario, nom de la fiche et nom du fichier redeviennent comme avant. */
export async function undoRename(): Promise<void> {
  const rename = last
  if (!rename) return
  if (rename.edit && scriptStore.get().textRevision !== rename.edit.revision) {
    last = null
    updateSheetsBanner((sheets) =>
      sheets.renamed ? { ...sheets, renamed: { ...sheets.renamed, undoImpossible: true } } : sheets
    )
    return
  }
  last = null
  await sheetsSyncDone()
  const result = await window.neoscenar.renameSheet(
    rename.kind,
    rename.fileName,
    rename.from,
    false
  )
  if (!result.ok) {
    showResearchError(result.error)
    showRenamed(null)
    return
  }
  if (rename.edit) revertScriptEdit(rename.edit)
  // La fiche renommée était ouverte : elle le reste sous son ancien nom.
  const { kind, selected } = researchStore.get()
  await loadSheets()
  if (kind === rename.kind && selected === rename.fileName) {
    selectSheet(rename.kind, result.value.sheet.fileName)
  }
  showRenamed(null)
}

/** Projet fermé : plus rien à annuler. */
export function resetRename(): void {
  last = null
}
