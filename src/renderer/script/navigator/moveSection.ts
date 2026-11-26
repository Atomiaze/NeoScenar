// Déplacer une section avec ses scènes depuis le navigateur par glisser-déposer (18C-16). Même chemin
// que pour une scène (18C-12) : `moveScenes` d'abord (numéros verrouillés refusés, renumérotation
// proposée, comme dans les Cartes), puis le bloc bouge avec ses numéros en une étape de l'historique de
// l'éditeur (`input.drop`) ; le rapprochement renumérote les scènes du bloc dans la même étape et fait
// suivre leurs cartes. Si l'élève accepte de renuméroter, tout passe par les Cartes.

import { numberKey } from '../../../shared/decoupage/order'
import type { Decoupage } from '../../../shared/projectTypes'
import {
  cardsForSectionMove,
  moveSectionInverse,
  navigatorTop,
  sectionDrop,
  sectionRefAt,
  sectionStart,
  type SectionMove,
  type SectionRef
} from '../../../shared/scriptLink'
import { placeScenesForMove } from '../../cards/actions'
import { cardsStore } from '../../cards/cardsStore'
import { commitCardsChange, linkedText } from '../../scriptLink/cardsLink'
import { flushPageLayout } from '../editor/pageLayout'
import { editScriptFromSheets, getActiveView } from '../scriptStore'
import { goToLine } from './navigatorStore'

const currentText = (): string | null => getActiveView()?.state.doc.toString() ?? null

/**
 * Déplace la section dont la ligne commence à `from` (avec tout son bloc) juste avant la section qui
 * commence à `beforeFrom`, ou tout en haut si c'est la première ligne du navigateur (null : tout en
 * bas). Refusé ou à sa propre place : rien, aucune étape.
 */
export function moveNavigatorSection(from: number, beforeFrom: number | null): void {
  const view = getActiveView()
  if (!view) return
  flushPageLayout(view)
  const text = view.state.doc.toString()
  const drop = sectionDrop(text, from, beforeFrom)
  const section = sectionRefAt(text, from)
  const before =
    beforeFrom === null
      ? null
      : (sectionRefAt(text, beforeFrom) ?? (beforeFrom === navigatorTop(text) ? 'top' : null))
  if (!drop || !drop.ok || drop.same || !section || (beforeFrom !== null && !before)) return
  const move: SectionMove = { section, before, level: drop.level }
  const moved = moveSectionInverse(text, move)
  if (!moved) return

  const decoupage = cardsStore.get().history?.present
  const plan =
    linkedText() !== null && decoupage
      ? cardsForSectionMove(text, decoupage, moved.changes, from)
      : null
  if (!plan) {
    // Pas de carte à déplacer (pas de lien, ou l'ordre des scènes ne change pas) : seul le texte bouge.
    moveText(move)
    return
  }
  placeScenesForMove(plan.ids, plan.index, (before, after) => {
    if (othersRenumbered(before, after, plan.ids)) {
      const mapping = before.scenes.flatMap((scene) => {
        const next = after.scenes.find((item) => item.id === scene.id)
        return next && numberKey(next) !== numberKey(scene)
          ? [{ from: plainNumber(scene), to: plainNumber(next) }]
          : []
      })
      commitCardsChange(
        after,
        { label: 'move' },
        undefined,
        {
          kind: 'sequence',
          ops: [
            { kind: 'renumber', mapping },
            { kind: 'moveSection', ...move }
          ]
        },
        true
      )
      showSection(moved.inverse.section)
    } else {
      moveText(move)
    }
  })
}

const plainNumber = (item: { number: number; letter: string }) => ({
  number: item.number,
  letter: item.letter
})

/** Le bloc, avec ses numéros, à sa nouvelle place : une étape de l'historique de l'éditeur. */
function moveText(move: SectionMove): void {
  const text = currentText()
  const moved = text === null ? null : moveSectionInverse(text, move)
  if (!moved) return
  editScriptFromSheets(moved.changes, 'input.drop')
  showSection(moved.inverse.section)
}

/** L'élève a accepté de renuméroter : d'autres scènes que celles du bloc changent de numéro. */
function othersRenumbered(
  before: Decoupage,
  after: Decoupage,
  movedIds: readonly string[]
): boolean {
  const moved = new Set(movedIds)
  const old = new Map(before.scenes.map((scene) => [scene.id, numberKey(scene)]))
  return after.scenes.some(
    (scene) => !moved.has(scene.id) && old.get(scene.id) !== numberKey(scene)
  )
}

/** Curseur sur la ligne de la section à sa nouvelle place. */
function showSection(ref: SectionRef): void {
  const editor = getActiveView()
  if (!editor) return
  const start = sectionStart(editor.state.doc.toString(), ref)
  if (start !== null) goToLine(editor.state.doc.lineAt(start).number)
}
