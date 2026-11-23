// Déplacer une scène depuis le navigateur par glisser-déposer (18C-12).
// Le bloc bouge avec son numéro, en une seule étape de l'historique de l'éditeur (Cmd + Z la défait) ;
// le rapprochement qui suit le renumérote s'il est hors de l'ordre et fait suivre sa carte, comme
// après un couper-coller. Seul cas à part : plus de numéro libre et renumérotation acceptée ; tout
// passe alors par les Cartes (même effet que le glisser-déposer d'une carte).

import { numberKey } from '../../../shared/decoupage/order'
import type { Decoupage, ItemNumber } from '../../../shared/projectTypes'
import {
  cardIndexForMove,
  moveSceneBlock,
  placeBeforeOffset,
  readScriptScenes,
  renumberedPlace,
  type BlockPlace
} from '../../../shared/scriptLink'
import { placeSceneForMove } from '../../cards/actions'
import { cardsStore } from '../../cards/cardsStore'
import { commitCardsChange, linkedText } from '../../scriptLink/cardsLink'
import { flushPageLayout } from '../editor/pageLayout'
import { editScriptFromSheets, getActiveView } from '../scriptStore'
import { goToLine } from './navigatorStore'

/**
 * Déplace la scène dont l'en-tête commence à `from` juste avant l'élément qui commence à `beforeFrom`
 * (null : à la fin). Le curseur va ensuite sur l'en-tête déplacé, dans l'éditeur.
 */
export function moveNavigatorScene(from: number, beforeFrom: number | null): void {
  const view = getActiveView()
  if (!view) return
  flushPageLayout(view)
  const text = view.state.doc.toString()
  const number = readScriptScenes(text).find((scene) => scene.line.from === from)?.number
  const place = placeBeforeOffset(text, beforeFrom)
  if (!number || !place) return

  const decoupage = cardsStore.get().history?.present
  const card = decoupage?.scenes.find((scene) => numberKey(scene) === numberKey(number))
  if (linkedText() === null || !decoupage || !card) {
    // Pas de cartes liées : seul le texte bouge.
    moveText(number, place)
    showMoved(() => number)
    return
  }
  const index = cardIndexForMove(text, decoupage, number, place)
  if (index === null) return
  // `moveScene` d'abord : numéros verrouillés refusés, renumérotation proposée, comme dans les Cartes.
  placeSceneForMove(card.id, index, (before, after) => {
    if (othersRenumbered(before, after, card.id)) {
      const placed = after.scenes.find((scene) => scene.id === card.id)!
      commitCardsChange(after, { label: 'move' }, undefined, {
        kind: 'moveBlocks',
        moves: [{ number: placed, place: renumberedPlace(before, after, place) }]
      })
    } else {
      moveText(number, place)
    }
    showMoved(() => cardsStore.get().history?.present.scenes.find((s) => s.id === card.id) ?? null)
  })
}

/** Le bloc, avec son numéro, à sa nouvelle place : une étape de l'historique de l'éditeur. */
function moveText(number: ItemNumber, place: BlockPlace): void {
  const text = getActiveView()?.state.doc.toString()
  if (text === undefined) return
  const changes = moveSceneBlock(text, number, place)
  if (changes.length > 0) editScriptFromSheets(changes, 'input.drop')
}

/** L'élève a accepté de renuméroter : d'autres scènes que celle déplacée changent de numéro. */
function othersRenumbered(before: Decoupage, after: Decoupage, movedId: string): boolean {
  const old = new Map(before.scenes.map((scene) => [scene.id, numberKey(scene)]))
  return after.scenes.some(
    (scene) => scene.id !== movedId && old.get(scene.id) !== numberKey(scene)
  )
}

/** Curseur sur l'en-tête de la scène à sa nouvelle place (numéro lu une fois le rapprochement fait). */
function showMoved(current: () => ItemNumber | null): void {
  const editor = getActiveView()
  const number = current()
  if (!editor || !number) return
  const doc = editor.state.doc
  const key = numberKey(number)
  const heading = readScriptScenes(doc.toString()).find(
    (scene) => scene.number && numberKey(scene.number) === key
  )
  if (heading) goToLine(doc.lineAt(heading.line.from).number)
}
