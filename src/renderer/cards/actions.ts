import {
  addSceneIndex,
  addShotPosition,
  deleteItems,
  duplicateItems,
  newShotsWithImages,
  withShotFiles,
  type ShotFiles,
  insertScenes,
  insertShots,
  locateShot,
  moveScene,
  moveShots,
  renumberProject,
  renumberScene,
  setColor,
  setNumbersLocked,
  updateScene,
  updateShot,
  type ScenePatch,
  type ShotPatch,
  type EditProblem,
  type EditResult,
  type IdSource,
  type ItemRef,
  type PlaceOptions,
  type ShotPosition
} from '../../shared/decoupage'
import { numberKey } from '../../shared/decoupage/order'
import { formatSceneNumber } from '../../shared/numbering'
import type { Decoupage } from '../../shared/projectTypes'
import { blocksLength, placeForNumber } from '../../shared/scriptLink'
import { fr } from '../i18n/fr'
import { scriptLayout } from '../script/layoutProfile'
import { commitCardsChange, linkedText, stepCards, textNumberKeys } from '../scriptLink/cardsLink'
import {
  cardsStore,
  copiedFrom,
  openDialog,
  drawingUndo,
  rememberCopies,
  type EditOptions
} from './cardsStore'
import { focusEditor, sceneAtCursor } from '../script/scriptStore'
import { planDeletion } from './deletion'
import { single, type Selection } from './selection'
import { isTypingTarget } from './typingTarget'

// Actions de l'élève sur le découpage (boutons, menu contextuel, clavier) : elles appellent les
// opérations pures, posent les questions nécessaires, puis enregistrent le résultat.

const ids: IdSource = { newId: () => crypto.randomUUID() }

function currentDecoupage(): Decoupage | null {
  return cardsStore.get().history?.present ?? null
}

function anchor(): ItemRef | null {
  return cardsStore.get().selection.anchor
}

/** Ce qu'on essayait de placer : des plans, des scènes, ou des copies (pour le bon message). */
type PlacedKind = 'shots' | 'scenes' | 'duplicate'

const NO_ROOM: Record<PlacedKind, string> = {
  shots: fr.numbering.noRoom,
  scenes: fr.numbering.noRoomScenes,
  duplicate: fr.numbering.noRoomDuplicate
}

function showProblem(problem: EditProblem, placed: PlacedKind = 'shots'): void {
  if (problem === 'no-room') {
    openDialog({ kind: 'message', title: fr.numbering.noRoomTitle, message: NO_ROOM[placed] })
  } else if (problem === 'locked') {
    openDialog({
      kind: 'message',
      title: fr.numbering.lockedTitle,
      message: fr.numbering.lockedMessage
    })
  } else {
    openDialog({
      kind: 'message',
      title: fr.numbering.invalidTitle,
      message: fr.numbering.invalidMessage
    })
  }
}

/**
 * Une action qui échoue de façon inattendue n'échoue jamais en silence : l'élève voit un message
 * (le détail technique reste dans la console des outils de développement).
 */
function reportFailure(error: unknown): void {
  console.error(error)
  const detail = error instanceof Error ? error.message : String(error)
  openDialog({
    kind: 'message',
    title: fr.numbering.invalidTitle,
    message: fr.numbering.failed(detail)
  })
}

/**
 * Enregistre le résultat ; les éléments créés sont sélectionnés (et donc rendus visibles). Le texte
 * du scénario suit (étape 8) : en-têtes ajoutés, blocs déplacés ou supprimés, numéros, en-têtes.
 */
function apply(
  result: EditResult,
  options: EditOptions,
  createdKind?: ItemRef['kind'],
  placed?: PlacedKind
): void {
  if (!result.ok) {
    showProblem(result.problem, placed)
    return
  }
  const last = result.createdIds[result.createdIds.length - 1]
  const selection: Selection | undefined =
    createdKind && last
      ? { ids: result.createdIds, anchor: { kind: createdKind, id: last } }
      : undefined
  try {
    commitCardsChange(result.decoupage, options, selection)
  } catch (error) {
    reportFailure(error)
  }
}

/**
 * Ajout ou déplacement qui peut manquer de numéro libre : on propose alors de renuméroter la
 * scène (ou les scènes), puis on recommence avec cet accord.
 */
export function placeWithRenumberPrompt(
  attempt: (options: PlaceOptions) => EditResult,
  options: EditOptions,
  scope: 'scene' | 'scenes',
  createdKind?: ItemRef['kind'],
  /** Travail à faire avant d'enregistrer (copie de fichiers…), avec les mêmes options. */
  finalize?: (result: EditResult, place: PlaceOptions) => Promise<EditResult>,
  placed: PlacedKind = scope === 'scenes' ? 'scenes' : 'shots'
): void {
  const run = (place: PlaceOptions): void => {
    const result = attempt(place)
    if (finalize && result.ok) {
      // Étape qui attend le disque (copie des vignettes) : une erreur y est aussi signalée.
      void finalize(result, place)
        .then((final) => apply(final, options, createdKind, placed))
        .catch(reportFailure)
    } else apply(result, options, createdKind, placed)
  }
  askRenumberIfNeeded(attempt({}), scope, run)
}

/** Pas de numéro libre : on demande s'il faut renuméroter, puis on recommence avec cet accord. */
function askRenumberIfNeeded(
  first: EditResult,
  scope: 'scene' | 'scenes',
  run: (place: PlaceOptions) => void
): void {
  if (first.ok || first.problem !== 'needs-renumber') {
    run({})
    return
  }
  openDialog({
    kind: 'confirm',
    title: scope === 'scene' ? fr.numbering.noFreeNumberScene : fr.numbering.noFreeNumberScenes,
    message: fr.numbering.noFreeNumberDetail,
    confirmLabel: fr.numbering.yesRenumber,
    cancelLabel: fr.numbering.no,
    onConfirm: () => run({ renumber: true })
  })
}

function addShotsAt(position: ShotPosition, count: number): void {
  placeWithRenumberPrompt(
    (options) => {
      const decoupage = currentDecoupage()
      return decoupage
        ? insertShots(decoupage, position, count, ids, options)
        : { ok: false, problem: 'invalid' }
    },
    { label: count > 1 ? 'addShots' : 'addShot' },
    'scene',
    'shot'
  )
}

function addScenesAt(index: number, count: number): void {
  placeWithRenumberPrompt(
    (options) => {
      const decoupage = currentDecoupage()
      return decoupage
        ? insertScenes(decoupage, index, count, ids, options)
        : { ok: false, problem: 'invalid' }
    },
    { label: count > 1 ? 'addScenes' : 'addScene' },
    'scenes',
    'scene'
  )
}

/** « Ajouter un plan » de la barre d'outils. */
export function addShot(): void {
  const decoupage = currentDecoupage()
  const position = decoupage && addShotPosition(decoupage, anchor())
  if (position) addShotsAt(position, 1)
}

/** « Ajouter une scène » de la barre d'outils (et du grand bouton du tableau vide). */
export function addScene(): void {
  const decoupage = currentDecoupage()
  if (decoupage) addScenesAt(addSceneIndex(decoupage, anchor()), 1)
}

/** Scène concernée par une carte : elle-même, ou la scène du plan. */
function sceneOf(decoupage: Decoupage, ref: ItemRef | null): string | null {
  if (!ref) return null
  if (ref.kind === 'scene') return decoupage.scenes.some((s) => s.id === ref.id) ? ref.id : null
  const found = locateShot(decoupage, ref.id)
  return found ? decoupage.scenes[found.sceneIndex].id : null
}

/**
 * Menu contextuel « Insérer un plan avant / après ». Sur une carte scène : au début ou à la fin
 * de ses plans.
 */
export function insertShotNextTo(target: ItemRef, where: 'before' | 'after'): void {
  const decoupage = currentDecoupage()
  if (!decoupage) return
  if (target.kind === 'scene') {
    const scene = decoupage.scenes.find((item) => item.id === target.id)
    if (scene) {
      addShotsAt({ sceneId: scene.id, index: where === 'before' ? 0 : scene.shots.length }, 1)
    }
    return
  }
  const found = locateShot(decoupage, target.id)
  if (!found) return
  const sceneId = decoupage.scenes[found.sceneIndex].id
  addShotsAt({ sceneId, index: found.shotIndex + (where === 'after' ? 1 : 0) }, 1)
}

/** Menu contextuel « Insérer une scène après ». */
export function insertSceneAfter(target: ItemRef): void {
  const decoupage = currentDecoupage()
  if (decoupage) addScenesAt(addSceneIndex(decoupage, target), 1)
}

export type AddManyKind = 'shots' | 'scenes'
export type AddManyWhere = 'selection' | 'end'

/**
 * « Ajouter plusieurs… ». Plans à la fin : à la fin de la scène sélectionnée (ou de celle du plan
 * sélectionné), sinon de la dernière scène. Scènes à la fin : à la fin du film.
 */
export function addMany(kind: AddManyKind, where: AddManyWhere, count: number): void {
  const decoupage = currentDecoupage()
  if (!decoupage) return
  const ref = where === 'selection' ? anchor() : null
  if (kind === 'scenes') {
    addScenesAt(
      where === 'selection' ? addSceneIndex(decoupage, ref) : decoupage.scenes.length,
      count
    )
    return
  }
  const sceneId = where === 'end' ? sceneOf(decoupage, anchor()) : null
  const scene = decoupage.scenes.find((item) => item.id === sceneId)
  const position = scene
    ? { sceneId: scene.id, index: scene.shots.length }
    : addShotPosition(decoupage, ref)
  if (position) addShotsAt(position, count)
}

/** Glisser-déposer de plans : ils se déplacent ensemble, dans leur ordre, vers `target`. */
export function moveShotsTo(shotIds: readonly string[], target: ShotPosition): void {
  placeWithRenumberPrompt(
    (options) => {
      const decoupage = currentDecoupage()
      return decoupage
        ? moveShots(decoupage, shotIds, target, options)
        : { ok: false, problem: 'invalid' }
    },
    { label: 'move' },
    'scene'
  )
}

/** Glisser-déposer d'une scène avec tous ses plans. */
export function moveSceneTo(sceneId: string, index: number): void {
  placeWithRenumberPrompt(
    (options) => {
      const decoupage = currentDecoupage()
      return decoupage
        ? moveScene(decoupage, sceneId, index, options)
        : { ok: false, problem: 'invalid' }
    },
    { label: 'move' },
    'scenes'
  )
}

/**
 * Navigateur de scènes (18C-12) : même choix du numéro que le glisser-déposer d'une carte (avec la
 * même question s'il n'y a plus de numéro libre). Rien n'est enregistré ici : `done` reçoit le
 * découpage d'après, et le texte déplacé fera suivre les cartes par le rapprochement.
 */
export function placeSceneForMove(
  sceneId: string,
  index: number,
  done: (before: Decoupage, after: Decoupage) => void
): void {
  const attempt = (options: PlaceOptions): EditResult => {
    const decoupage = currentDecoupage()
    return decoupage
      ? moveScene(decoupage, sceneId, index, options)
      : { ok: false, problem: 'invalid' }
  }
  askRenumberIfNeeded(attempt({}), 'scenes', (options) => {
    const before = currentDecoupage()
    const result = attempt(options)
    if (!result.ok) showProblem(result.problem, 'scenes')
    else if (before) done(before, result.decoupage)
  })
}

/**
 * Dupliquer (clic droit, menu Édition, Cmd + D) : les copies sont insérées juste après les
 * originaux, puis sélectionnées. Une seule étape d'annulation.
 */
export function duplicateSelection(): void {
  const { history, selection, dialog, drawing } = cardsStore.get()
  // Une fenêtre ou l'éditeur de dessin est ouvert par-dessus : il a la main.
  if (!history || dialog || drawing) return
  if (selection.ids.length === 0) {
    openDialog({
      kind: 'message',
      title: fr.numbering.nothingSelectedTitle,
      message: fr.numbering.nothingSelected
    })
    return
  }
  duplicateCards(selection.ids)
}

/**
 * Module Scénario, Édition > Dupliquer la scène (Cmd + D) : duplique la scène du curseur, avec le
 * même effet que depuis les Cartes (copie de la carte et de ses plans, en-tête de la copie inséré
 * après le bloc de l'original). La copie devient la carte sélectionnée.
 */
export function duplicateSceneAtCursor(): void {
  const { history, dialog } = cardsStore.get()
  if (!history || dialog) return
  const number = sceneAtCursor()
  if (number === null) return
  const scene =
    number === 'none'
      ? undefined
      : history.present.scenes.find(
          (item) => item.number === number.number && item.letter === number.letter
        )
  if (!scene) {
    openDialog({
      kind: 'message',
      title: fr.numbering.cursorNotInSceneTitle,
      message: fr.numbering.cursorNotInScene
    })
    return
  }
  duplicateCards([scene.id], focusEditor)
}

/**
 * Dupliquer des cartes : les copies sont insérées après les originaux (et leurs copies
 * précédentes), puis sélectionnées. Une seule étape d'annulation. `done` : à faire ensuite.
 */
function duplicateCards(itemIds: readonly string[], done?: () => void): void {
  const history = cardsStore.get().history
  if (!history) return
  const selected = new Set(itemIds)
  const hasScenes = history.present.scenes.some((scene) => selected.has(scene.id))
  // Identifiants des copies, notés pour pouvoir refaire la même duplication si besoin.
  let issued: string[] = []
  let base: Decoupage | null = null
  const recording: IdSource = {
    newId: () => {
      const id = crypto.randomUUID()
      issued.push(id)
      return id
    }
  }
  placeWithRenumberPrompt(
    (options) => {
      base = currentDecoupage()
      issued = []
      return base
        ? duplicateItems(base, itemIds, recording, { ...options, copiedFrom: copiedFrom() })
        : { ok: false, problem: 'invalid' }
    },
    { label: 'duplicate' },
    hasScenes ? 'scenes' : 'scene',
    // Les copies de scènes viennent en dernier : la dernière copie (l'ancre) est alors une scène.
    hasScenes ? 'scene' : 'shot',
    async (result, options) => {
      if (!result.ok || !base) return result
      const files = await copyDuplicatedImages(base, result.decoupage)
      // Le découpage a changé pendant la copie (saisie dans une fiche…) : on refait la même
      // duplication sur la version actuelle, avec les mêmes identifiants.
      const latest = currentDecoupage()
      let final: EditResult = result
      if (latest && latest !== base) {
        const replay = [...issued]
        final = duplicateItems(
          latest,
          itemIds,
          { newId: () => replay.shift() ?? crypto.randomUUID() },
          { ...options, copiedFrom: copiedFrom() }
        )
      }
      if (final.ok && final.copiedFrom) rememberCopies(final.copiedFrom)
      done?.()
      return final.ok ? { ...final, decoupage: withShotFiles(final.decoupage, files) } : final
    },
    'duplicate'
  )
}

/** Copie la vignette et l'image d'origine de chaque plan dupliqué sous le nom de la copie. */
async function copyDuplicatedImages(
  before: Decoupage,
  after: Decoupage
): Promise<Record<string, ShotFiles>> {
  const files: Record<string, ShotFiles> = {}
  for (const shot of newShotsWithImages(before, after)) {
    const copied = await window.neoscenar.copyThumbnailFiles(shot.id, {
      thumbnail: shot.thumbnail,
      thumbnailSource: shot.thumbnailSource
    })
    // En cas d'échec, la copie garde les fichiers de l'original (jamais modifiés) : rien n'est perdu.
    if (copied.ok) files[shot.id] = copied.value
  }
  return files
}

/**
 * Ce que la suppression retirera du scénario : « Son texte (12 lignes) sera aussi supprimé… », ou
 * « Cette scène n'a pas encore de texte. » ; null si aucune des scènes n'est dans le texte.
 */
function deletedTextNote(decoupage: Decoupage, sceneIds: readonly string[]): string | null {
  const text = linkedText()
  if (text === null) return null
  const keys = textNumberKeys(text)
  const inText = decoupage.scenes.filter(
    (scene) => sceneIds.includes(scene.id) && keys.has(numberKey(scene))
  )
  if (inText.length === 0) return null
  const length = blocksLength(text, inText, scriptLayout)
  return length.written === 0
    ? fr.scriptLink.noText(inText.length)
    : fr.scriptLink.textDeleted(
        inText.length,
        fr.scriptLink.textLength(length.printedLines, length.linesPerPage)
      )
}

/**
 * Supprime la sélection, avec confirmation si nécessaire (plusieurs éléments, scène non vide, ou
 * scène dont le texte sera aussi supprimé du scénario).
 */
export function deleteSelection(): void {
  const decoupage = currentDecoupage()
  if (!decoupage) return
  const plan = planDeletion(decoupage, cardsStore.get().selection.ids)
  if (!plan) return
  const run = (): void => {
    const latest = currentDecoupage()
    // La sélection est ensuite débarrassée des éléments disparus.
    if (latest) apply(deleteItems(latest, plan.items), { label: 'delete' })
  }
  const textNote = deletedTextNote(decoupage, plan.items.sceneIds)
  if (!plan.confirmation && textNote === null) {
    run()
    return
  }
  const first = decoupage.scenes.find((scene) => plan.items.sceneIds.includes(scene.id))
  openDialog({
    kind: 'confirm',
    title:
      plan.confirmation ??
      fr.scriptLink.deleteScene(first ? formatSceneNumber(first.number, first.letter) : ''),
    message: textNote ?? undefined,
    confirmLabel: fr.deletion.confirm,
    danger: true,
    onConfirm: run
  })
}

/**
 * Modification d'un champ de la fiche d'un plan. Une saisie continue dans le même champ ne fait
 * qu'une étape d'annulation (jusqu'à ce qu'on quitte le champ).
 */
export function editShot(shotId: string, patch: ShotPatch, field: keyof ShotPatch): void {
  const decoupage = currentDecoupage()
  if (decoupage) {
    apply(updateShot(decoupage, shotId, patch), { label: 'edit', mergeKey: `${shotId}:${field}` })
  }
}

export function editScene(sceneId: string, patch: ScenePatch, field: keyof ScenePatch): void {
  const decoupage = currentDecoupage()
  if (decoupage) {
    apply(updateScene(decoupage, sceneId, patch), {
      label: 'edit',
      mergeKey: `${sceneId}:${field}`
    })
  }
}

/**
 * Description d'une scène (synopsis Fountain sous son en-tête), écrite depuis sa fiche. Elle n'est
 * pas dans le découpage : seul le texte change, mais c'est une étape d'annulation des cartes. Une
 * saisie continue ne fait qu'une étape.
 */
export function editSceneDescription(sceneId: string, description: string): void {
  const decoupage = currentDecoupage()
  const scene = decoupage?.scenes.find((item) => item.id === sceneId)
  if (!decoupage || !scene) return
  commitCardsChange(decoupage, { label: 'edit', mergeKey: `${sceneId}:description` }, undefined, {
    kind: 'setDescription',
    number: { number: scene.number, letter: scene.letter },
    description
  })
}

/**
 * Marque (ou démarque) la scène comme brouillon dans le scénario (18C-13). Seul le texte change,
 * mais c'est une étape d'annulation des cartes, comme la description.
 */
export function setSceneDraft(sceneId: string, draft: boolean): void {
  const decoupage = currentDecoupage()
  const scene = decoupage?.scenes.find((item) => item.id === sceneId)
  if (!decoupage || !scene) return
  commitCardsChange(decoupage, { label: 'edit' }, undefined, {
    kind: 'setDraft',
    number: { number: scene.number, letter: scene.letter },
    draft
  })
}

/**
 * Carte orpheline : remet son en-tête (ou « SCÈNE À ÉCRIRE ») dans le scénario, avec son numéro, à
 * la place qui correspond à ce numéro. La carte se reconnecte. Une étape d'annulation des cartes.
 */
export function recreateHeading(sceneId: string): void {
  const decoupage = currentDecoupage()
  const scene = decoupage?.scenes.find((item) => item.id === sceneId)
  const text = linkedText()
  if (!decoupage || !scene?.orphan || text === null) return
  const number = { number: scene.number, letter: scene.letter }
  try {
    commitCardsChange(
      decoupage,
      { label: 'recreateHeading' },
      single({ kind: 'scene', id: sceneId }),
      {
        kind: 'insertHeadings',
        place: placeForNumber(text, number),
        headings: [{ heading: scene.heading, number }]
      }
    )
  } catch (error) {
    reportFailure(error)
  }
}

/** Couleur (ou couleur par défaut si null) pour toute la sélection. */
export function colorSelection(color: string | null): void {
  const decoupage = currentDecoupage()
  if (decoupage)
    apply(setColor(decoupage, cardsStore.get().selection.ids, color), { label: 'color' })
}

/** Scène visée par « Renuméroter la scène sélectionnée », ou null. */
export function selectedSceneId(): string | null {
  const decoupage = currentDecoupage()
  return decoupage ? sceneOf(decoupage, anchor()) : null
}

export function renumber(scope: 'scene' | 'project'): void {
  const decoupage = currentDecoupage()
  if (!decoupage) return
  if (scope === 'project') {
    apply(renumberProject(decoupage), { label: 'renumber' })
    return
  }
  const sceneId = selectedSceneId()
  if (sceneId) apply(renumberScene(decoupage, sceneId), { label: 'renumber' })
}

/** Cadenas : confirmation simple pour verrouiller, avec avertissement pour déverrouiller. */
export function toggleLock(): void {
  const decoupage = currentDecoupage()
  if (!decoupage) return
  const lock = !decoupage.numbersLocked
  openDialog({
    kind: 'confirm',
    title: lock ? fr.numbering.lockTitle : fr.numbering.unlockTitle,
    message: lock ? fr.numbering.lockMessage : fr.numbering.unlockMessage,
    confirmLabel: lock ? fr.numbering.lockConfirm : fr.numbering.unlockConfirm,
    danger: !lock,
    onConfirm: () => {
      const latest = currentDecoupage()
      if (latest) apply(setNumbersLocked(latest, lock), { label: lock ? 'lock' : 'unlock' })
    }
  })
}

/** Verrouillage sans question (déjà posée par la fenêtre d'export vers Blender). */
export function lockNumbersNow(): void {
  const decoupage = currentDecoupage()
  if (decoupage && !decoupage.numbersLocked) {
    apply(setNumbersLocked(decoupage, true), { label: 'lock' })
  }
}

/**
 * Annuler / Rétablir (menu Édition, Cmd + Z). Dans un champ de texte, on annule d'abord la frappe
 * dans ce champ, comme partout ailleurs.
 */
export function handleUndoCommand(command: 'undo' | 'redo'): void {
  // Éditeur de dessin ouvert (il n'a pas de champ de texte) : on annule dans le dessin.
  if (cardsStore.get().drawing && !cardsStore.get().dialog) {
    drawingUndo[command]()
    return
  }
  // Une case à cocher de la fiche (« Brouillon ») n'a pas d'annulation à elle : Cmd + Z annule
  // dans les cartes.
  const focused = document.activeElement
  const checkbox =
    focused?.tagName === 'INPUT' &&
    (focused as HTMLInputElement).type === 'checkbox' &&
    !focused.closest('.overlay')
  if (isTypingTarget(focused) && !checkbox) {
    document.execCommand(command)
    return
  }
  if (cardsStore.get().dialog || cardsStore.get().drawing) return
  stepCards(command)
}
