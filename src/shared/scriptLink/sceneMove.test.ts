import { describe, expect, it } from 'vitest'
import { moveScene } from '../decoupage'
import type { Decoupage, ItemNumber } from '../projectTypes'
import type { BlockPlace } from './cardTextEdits'
import { reconcile } from './reconcile'
import { moveSceneBlock } from './cardTextEdits'
import { cardIndexForMove, placeBeforeOffset, renumberedPlace } from './sceneMove'
import { readScriptScenes, type TextRange } from './scriptScenes'
import { cards, labels } from './testHelpers'
import { applyTextChanges, type TextChange } from './textChanges'

const n = (number: number, letter = ''): ItemNumber => ({ number, letter })
const ids = { newId: () => crypto.randomUUID() }

const SCRIPT = [
  '# ACTE 1',
  '',
  'INT. A - JOUR #10#',
  '',
  '= La cuisine au matin.',
  '',
  'Action A.',
  '',
  'INT. B - JOUR #20#',
  '',
  'Il [[R:rose|Revoir]]pleut[[/R]] fort.',
  '',
  '# ACTE 2',
  '',
  'INT. C - JOUR #30#',
  '',
  'Action C.',
  '',
  'INT. D - NUIT #40#',
  '',
  'Action D.',
  ''
].join('\n')

const numbers = (text: string): (string | null)[] =>
  readScriptScenes(text).map((scene) => scene.rawNumber)
const offsetOf = (text: string, line: string): number => text.indexOf(line)

/** Partie insérée par un déplacement (deux modifications : retrait, insertion), dans le texte d'après. */
function insertedRange(changes: TextChange[]): TextRange {
  const [remove, insert] = [...changes].sort((a, b) => (a.insert.length > b.insert.length ? 1 : -1))
  const shift = remove.from < insert.from ? remove.insert.length - (remove.to - remove.from) : 0
  return { from: insert.from + shift, to: insert.from + shift + insert.insert.length }
}

/**
 * Le déplacement entier, comme le navigateur le fait : bloc déplacé avec son numéro, puis le
 * rapprochement (texte inséré). Vérifie qu'il donne les numéros de `moveScene` (les Cartes), garde
 * les cartes (mêmes identifiants) et ne crée aucune orpheline.
 */
function move(
  number: ItemNumber,
  place: BlockPlace,
  decoupage: Decoupage = cards(['10*', '20*', '30*', '40*']),
  text = SCRIPT
): { text: string; decoupage: Decoupage } {
  const index = cardIndexForMove(text, decoupage, number, place)
  if (index === null) throw new Error('aucun déplacement')
  const fromCards = moveScene(decoupage, `S${number.number}`, index)
  if (!fromCards.ok) throw new Error(fromCards.problem)
  const changes = moveSceneBlock(text, number, place)
  const moved = applyTextChanges(text, changes)
  const link = reconcile(moved, decoupage, { insertedRanges: [insertedRange(changes)] }, ids)
  const after = applyTextChanges(moved, link.textChanges)
  expect(link.orphanIds, 'aucune carte orpheline').toEqual([])
  const byId = (d: Decoupage): string[] =>
    d.scenes.map((scene) => `${scene.id}=${labels({ ...d, scenes: [scene] })[0]}`).sort()
  expect(byId(link.decoupage), 'mêmes numéros que depuis les Cartes').toEqual(
    byId(fromCards.decoupage)
  )
  expect(labels(link.decoupage)).toEqual(labels(fromCards.decoupage))
  expect(reconcile(after, link.decoupage, {}, ids).textChanges, 'stable').toEqual([])
  return { text: after, decoupage: link.decoupage }
}

describe('déplacer une scène depuis le navigateur', () => {
  it('place avant une scène, avant une section, à la fin', () => {
    expect(placeBeforeOffset(SCRIPT, offsetOf(SCRIPT, 'INT. C'))).toEqual({ before: n(30) })
    expect(placeBeforeOffset(SCRIPT, offsetOf(SCRIPT, '# ACTE 2'))).toEqual({
      beforeSection: { title: 'ACTE 2', occurrence: 0 }
    })
    expect(placeBeforeOffset(SCRIPT, null)).toBe('end')
    expect(placeBeforeOffset(SCRIPT, 3)).toBeNull()
  })

  it('même numéro que depuis les Cartes : la scène prend un numéro libre à sa nouvelle place', () => {
    const done = move(n(40), { before: n(20) })
    expect(numbers(done.text)).toEqual(['10', '15', '20', '30'])
    const fromCards = moveScene(cards(['10*', '20*', '30*', '40*']), 'S40', 1)
    expect(fromCards.ok && labels(fromCards.decoupage)).toEqual(labels(done.decoupage))
  })

  it('changer d’acte : en tête de l’acte 2, le numéro reste le même', () => {
    const done = move(n(20), { before: n(30) })
    expect(numbers(done.text)).toEqual(['10', '20', '30', '40'])
    expect(done.text.indexOf('# ACTE 2')).toBeLessThan(done.text.indexOf('INT. B'))
    // Les marques de révision suivent la scène.
    expect(done.text.indexOf('# ACTE 2')).toBeLessThan(done.text.indexOf('[[R:rose'))
  })

  it('remonter à la fin de l’acte 1 (avant la section) ; le synopsis suit', () => {
    const done = move(n(40), { beforeSection: { title: 'ACTE 2', occurrence: 0 } })
    expect(numbers(done.text)).toEqual(['10', '20', '25', '30'])
    const scenes = done.text.split('# ACTE 2')
    expect(scenes[0]).toContain('INT. D')
    const back = move(n(10), 'end', done.decoupage, done.text)
    expect(numbers(back.text)).toEqual(['20', '25', '30', '40'])
    expect(back.text.trimEnd().endsWith('Action A.')).toBe(true)
    expect(back.text).toContain('INT. A - JOUR #40#\n\n= La cuisine au matin.')
  })

  it('pas de numéro libre : moveScene le dit ; la place visée suit la renumérotation', () => {
    const text = SCRIPT.replace('#20#', '#10A#')
    const decoupage = cards(['10*', '10A*', '30*', '40*'])
    const index = cardIndexForMove(text, decoupage, n(40), { before: n(10, 'A') })!
    const refused = moveScene(decoupage, 'S40', index)
    expect(!refused.ok && refused.problem).toBe('needs-renumber')
    const accepted = moveScene(decoupage, 'S40', index, { renumber: true })
    expect(accepted.ok).toBe(true)
    if (!accepted.ok) return
    expect(labels(accepted.decoupage)).toEqual(['S_0010', 'S_0020', 'S_0030', 'S_0040'])
    expect(renumberedPlace(decoupage, accepted.decoupage, { before: n(10, 'A') })).toEqual({
      before: n(30)
    })
  })

  it('toutes les places possibles : mêmes numéros que depuis les Cartes', () => {
    const offsets = [
      ...readScriptScenes(SCRIPT).map((scene) => scene.line.from),
      offsetOf(SCRIPT, '# ACTE 1'),
      offsetOf(SCRIPT, '# ACTE 2'),
      null
    ]
    for (const scene of readScriptScenes(SCRIPT)) {
      for (const offset of offsets) {
        const place = placeBeforeOffset(SCRIPT, offset)!
        const base = cards(['10*', '20*', '30*', '40*'])
        if (cardIndexForMove(SCRIPT, base, scene.number!, place) === null) continue
        move(scene.number!, place, base)
        // Avec une carte orpheline intercalée : le numéro libre est celui du rapprochement (il peut
        // différer de celui des Cartes), mais l'ordre reste croissant et rien ne devient orphelin.
        const withOrphan = cards(['10*', '15*', '20*', '30*', '40*'])
        withOrphan.scenes[1] = { ...withOrphan.scenes[1], orphan: true }
        const changes = moveSceneBlock(SCRIPT, scene.number!, place)
        const moved = applyTextChanges(SCRIPT, changes)
        const link = reconcile(moved, withOrphan, { insertedRanges: [insertedRange(changes)] }, ids)
        expect(link.orphanIds).toEqual(['S15'])
        expect(labels(link.decoupage)).toEqual([...labels(link.decoupage)].sort())
        expect(new Set(link.decoupage.scenes.map((card) => card.id)).size).toBe(5)
      }
    }
  })

  it('bloc qui ne bouge pas : rien à faire', () => {
    expect(
      cardIndexForMove(SCRIPT, cards(['10', '20', '30', '40']), n(20), { before: n(30) })
    ).not.toBeNull()
    expect(
      cardIndexForMove(SCRIPT, cards(['10', '20', '30', '40']), n(30), { before: n(40) })
    ).toBeNull()
  })

  it('cartes orphelines intercalées : la carte se range après la scène qui la précède', () => {
    const decoupage = cards(['10*', '20*', '25*', '30*', '40*'])
    decoupage.scenes[2] = { ...decoupage.scenes[2], orphan: true }
    expect(cardIndexForMove(SCRIPT, decoupage, n(40), { before: n(20) })).toBe(1)
    expect(cardIndexForMove(SCRIPT, decoupage, n(10), { before: n(40) })).toBe(3)
    expect(cardIndexForMove(SCRIPT, decoupage, n(20), { before: n(10) })).toBe(0)
  })
})
