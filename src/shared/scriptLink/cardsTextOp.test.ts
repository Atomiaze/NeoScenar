import { describe, expect, it } from 'vitest'
import { duplicateItems } from '../decoupage/duplicate'
import { updateScene } from '../decoupage/fields'
import { renumberProject } from '../decoupage/numbers'
import { numberKey } from '../decoupage/order'
import type { EditResult } from '../decoupage/result'
import { deleteItems, insertScenes, moveScene } from '../decoupage/structure'
import { counterIds } from '../decoupage/testFixtures'
import type { Decoupage } from '../projectTypes'
import { cardsTextOp } from './cardsTextOp'
import { reconcile } from './reconcile'
import { readScriptScenes } from './scriptScenes'
import { cards, script } from './testHelpers'
import { applyTextOp } from './textOps'

const TEXT = script(
  'INT. A - JOUR #10#',
  'INT. B - JOUR #20#',
  'INT. C - JOUR #30#',
  'INT. D - NUIT #40#'
)

function linkedCards(
  numbers: string[],
  headings = ['INT. A - JOUR', 'INT. B - JOUR', 'INT. C - JOUR', 'INT. D - NUIT']
): Decoupage {
  const decoupage = cards(numbers)
  decoupage.scenes.forEach((scene, i) => (scene.heading = headings[i] ?? ''))
  return decoupage
}

const keys = (text: string): Set<string> =>
  new Set(
    readScriptScenes(text).flatMap((scene) => (scene.number ? [numberKey(scene.number)] : []))
  )

/**
 * Applique l'action aux cartes et son effet au texte, puis vérifie que le rapprochement n'a plus
 * rien à faire : texte et cartes sont d'accord. Renvoie le nouveau texte.
 */
function act(before: Decoupage, result: EditResult, text = TEXT): string {
  if (!result.ok) throw new Error(result.problem)
  const op = cardsTextOp(before, result.decoupage, keys(text))
  const next = op ? applyTextOp(text, op).text : text
  const check = reconcile(next, result.decoupage, {}, counterIds('x'))
  expect(check.textChanges).toEqual([])
  expect(check.decoupage.scenes.map((scene) => scene.id)).toEqual(
    result.decoupage.scenes.map((scene) => scene.id)
  )
  return next
}

const numbers = (text: string): (string | null)[] =>
  readScriptScenes(text).map((scene) => scene.rawNumber)

describe('effet sur le texte des actions des cartes', () => {
  it('ajouter une scène après S_0020 : en-tête à écrire après son bloc', () => {
    const before = linkedCards(['10', '20', '30', '40'])
    const text = act(before, insertScenes(before, 2, 1, counterIds('n')))
    expect(numbers(text)).toEqual(['10', '20', '25', '30', '40'])
    expect(text).toContain('Action 2.\n\n.SCÈNE À ÉCRIRE #25#\n\nINT. C')
  })

  it('ajouter trois scènes au début, puis à la fin', () => {
    const before = linkedCards(['10', '20', '30', '40'])
    const atStart = act(before, insertScenes(before, 0, 3, counterIds('n')))
    expect(numbers(atStart)).toEqual(['2', '5', '7', '10', '20', '30', '40'])
    const atEnd = act(before, insertScenes(before, 4, 2, counterIds('n')))
    expect(numbers(atEnd)).toEqual(['10', '20', '30', '40', '50', '60'])
  })

  it('plus de numéro libre : renuméroter puis insérer, en une seule fois', () => {
    const before = linkedCards(['10', '11', '20'])
    const text = script('INT. A - JOUR #10#', 'INT. B - JOUR #11#', 'INT. C - JOUR #20#')
    const result = insertScenes(before, 1, 1, counterIds('n'), { renumber: true })
    expect(numbers(act(before, result, text))).toEqual(['10', '20', '30', '40'])
  })

  it('dupliquer une scène : seulement l’en-tête de la copie, après le bloc de l’original', () => {
    const before = linkedCards(['10', '20', '30', '40'])
    const text = act(before, duplicateItems(before, ['S20'], counterIds('n')))
    expect(numbers(text)).toEqual(['10', '20', '21', '30', '40'])
    expect(text).toContain('Action 2.\n\nINT. B - JOUR #21#\n\nINT. C')
  })

  it('déplacer S_0010 à la fin : le bloc suit, avec son nouveau numéro', () => {
    const before = linkedCards(['10', '20', '30', '40'])
    const text = act(before, moveScene(before, 'S10', 3))
    expect(numbers(text)).toEqual(['20', '30', '40', '50'])
    expect(text.indexOf('INT. A')).toBeGreaterThan(text.indexOf('INT. D'))
  })

  it('supprimer deux scènes : leurs blocs sont retirés', () => {
    const before = linkedCards(['10', '20', '30', '40'])
    const text = act(before, deleteItems(before, { sceneIds: ['S20', 'S30'], shotIds: [] }))
    expect(numbers(text)).toEqual(['10', '40'])
    expect(text).not.toContain('Action 2.')
  })

  it('renuméroter le projet : tous les #…#', () => {
    const before = linkedCards(['10', '10A', '15', '40'])
    const text = script(
      'INT. A - JOUR #10#',
      'INT. B - JOUR #10A#',
      'INT. C - JOUR #15#',
      'INT. D - NUIT #40#'
    )
    expect(numbers(act(before, renumberProject(before), text))).toEqual(['10', '20', '30', '40'])
  })

  it('modifier l’en-tête sur la carte : la ligne d’en-tête est réécrite', () => {
    const before = linkedCards(['10', '20', '30', '40'])
    const text = act(before, updateScene(before, 'S20', { heading: 'ext. jardin - nuit' }))
    expect(text).toContain('EXT. JARDIN - NUIT #20#')
  })

  it('carte orpheline (absente du texte) : rien ne change dans le texte', () => {
    const before = linkedCards(['10', '20', '30', '40', '50'])
    const result = deleteItems(before, { sceneIds: ['S50'], shotIds: [] })
    expect(result.ok && cardsTextOp(before, result.decoupage, keys(TEXT))).toBeNull()
  })

  it('nom, couleur, plans : rien ne change dans le texte', () => {
    const before = linkedCards(['10', '20', '30', '40'])
    const result = updateScene(before, 'S20', { name: 'La dispute', color: '#f2c94c' })
    expect(result.ok && cardsTextOp(before, result.decoupage, keys(TEXT))).toBeNull()
  })
})
