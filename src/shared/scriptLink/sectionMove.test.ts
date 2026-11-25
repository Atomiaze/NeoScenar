import { describe, expect, it } from 'vitest'
import { moveScene, moveScenes } from '../decoupage'
import type { Decoupage } from '../projectTypes'
import { reconcile } from './reconcile'
import { readScriptScenes } from './scriptScenes'
import {
  cardsForSectionMove,
  moveSectionBlock,
  sectionBlock,
  sectionDrop,
  sectionRefAt
} from './sectionMove'
import { cards, labels } from './testHelpers'
import { applyTextOp } from './textOps'
import { applyTextChanges, type TextChange } from './textChanges'

const ids = { newId: () => crypto.randomUUID() }

const SCRIPT = [
  '# ACTE 1',
  '[[COULEUR #2463EB]]',
  '',
  '= Le début.',
  '',
  'INT. A - JOUR #10#',
  '',
  'Action A.',
  '',
  '## Matin',
  '',
  'INT. B - JOUR #20#',
  '',
  'Il [[R:rose|Revoir]]pleut[[/R]] fort.',
  '',
  '## Soir',
  '',
  'INT. C - NUIT #30#',
  '[[BROUILLON]]',
  '',
  'Action C.',
  '',
  '# ACTE 2',
  '',
  'INT. D - JOUR #40#',
  '',
  'Action D.',
  '',
  'INT. E - JOUR #50#',
  '',
  'Action E.',
  '',
  '# ACTE 3',
  '',
  'INT. F - JOUR #60#',
  '',
  'Action F.',
  ''
].join('\n')

const at = (text: string, line: string): number => {
  const offset = text.indexOf(line)
  if (offset < 0) throw new Error(`introuvable : ${line}`)
  return offset
}
const numbers = (text: string): (string | null)[] =>
  readScriptScenes(text).map((scene) => scene.rawNumber)
const sectionLines = (text: string): string[] =>
  text.split('\n').filter((line) => line.startsWith('#'))

/** Zones insérées, dans le nouveau texte (comme l'éditeur les voit pour `input.drop`). */
function insertedRanges(changes: readonly TextChange[]): { from: number; to: number }[] {
  const sorted = [...changes].sort((a, b) => a.from - b.from)
  let shift = 0
  return sorted.map((change) => {
    const range = { from: change.from + shift, to: change.from + shift + change.insert.length }
    shift += change.insert.length - (change.to - change.from)
    return range
  })
}

const BASE = (): Decoupage => cards(['10*', '20*', '30*', '40*', '50*', '60*'])

/**
 * Le déplacement entier, comme le navigateur le fait : bloc déplacé avec ses numéros, puis le
 * rapprochement d'un dépôt. Vérifie qu'il donne les numéros de `moveScenes` (les Cartes), garde
 * les cartes et ne crée aucune orpheline.
 */
function move(
  text: string,
  section: string,
  before: string | null,
  decoupage: Decoupage = BASE()
): { text: string; decoupage: Decoupage } | null {
  const start = at(text, section)
  const beforeStart = before === null ? null : at(text, before)
  const drop = sectionDrop(text, start, beforeStart)
  if (!drop || !drop.ok || drop.same) return null
  const changes = moveSectionBlock(text, start, beforeStart, drop.level)
  expect(changes.length).toBeGreaterThan(0)
  const moved = applyTextChanges(text, changes)
  const link = reconcile(
    moved,
    decoupage,
    { insertedRanges: insertedRanges(changes), movedBlock: true },
    ids
  )
  const after = applyTextChanges(moved, link.textChanges)
  expect(link.orphanIds, 'aucune carte orpheline').toEqual([])
  const plan = cardsForSectionMove(text, decoupage, changes, start)
  const expected = plan ? moveScenes(decoupage, plan.ids, plan.index) : null
  if (expected && !expected.ok) throw new Error(expected.problem)
  const fromCards = expected?.decoupage ?? decoupage
  const byId = (d: Decoupage): string[] =>
    d.scenes.map((scene) => `${scene.id}=${labels({ ...d, scenes: [scene] })[0]}`).sort()
  expect(byId(link.decoupage), 'mêmes numéros que depuis les Cartes').toEqual(byId(fromCards))
  expect(labels(link.decoupage)).toEqual(labels(fromCards))
  expect(reconcile(after, link.decoupage, {}, ids).textChanges, 'stable').toEqual([])
  return { text: after, decoupage: link.decoupage }
}

describe('déplacer une section avec ses scènes', () => {
  it('bloc : ligne, note, synopsis, scènes et sous-sections, jusqu’à la section de même niveau', () => {
    const block = sectionBlock(SCRIPT, at(SCRIPT, '# ACTE 1'))!
    expect(SCRIPT.slice(block.from, block.to)).toContain('## Soir')
    expect(block.to).toBe(at(SCRIPT, '# ACTE 2'))
    expect(block.deepest).toBe(2)
    const matin = sectionBlock(SCRIPT, at(SCRIPT, '## Matin'))!
    expect(matin.to).toBe(at(SCRIPT, '## Soir'))
    expect(sectionBlock(SCRIPT, at(SCRIPT, '# ACTE 3'))!.to).toBe(SCRIPT.length)
  })

  it('places permises : au-dessus d’une section (même niveau) ou tout en bas (niveau 1)', () => {
    const acte1 = at(SCRIPT, '# ACTE 1')
    expect(sectionDrop(SCRIPT, acte1, at(SCRIPT, 'INT. D'))).toEqual({
      ok: false,
      refusal: 'notBeforeSection'
    })
    expect(sectionDrop(SCRIPT, acte1, at(SCRIPT, '## Soir'))).toEqual({
      ok: false,
      refusal: 'inside'
    })
    expect(sectionDrop(SCRIPT, acte1, at(SCRIPT, '# ACTE 3'))).toEqual({
      ok: true,
      level: 1,
      same: false
    })
    // Sur elle-même ou juste avant la section qui la suit, au même niveau : rien à faire.
    expect(sectionDrop(SCRIPT, acte1, acte1)).toMatchObject({ ok: true, same: true })
    expect(sectionDrop(SCRIPT, acte1, at(SCRIPT, '# ACTE 2'))).toMatchObject({ same: true })
    expect(sectionDrop(SCRIPT, at(SCRIPT, '# ACTE 3'), null)).toMatchObject({ same: true })
    // Avant « ## Soir » : la section devient sœur de Soir, niveau 2.
    expect(sectionDrop(SCRIPT, at(SCRIPT, '# ACTE 3'), at(SCRIPT, '## Soir'))).toMatchObject({
      ok: true,
      level: 2
    })
    // L'acte 1 a des sous-sections : au niveau 3, elles iraient au niveau 4.
    const deep = SCRIPT.replace('## Soir', '### Soir')
    expect(sectionDrop(deep, at(deep, '# ACTE 2'), at(deep, '### Soir'))).toMatchObject({
      ok: true,
      level: 3
    })
    expect(sectionDrop(deep, at(deep, '# ACTE 1'), null)).toMatchObject({ ok: true })
    expect(sectionDrop(SCRIPT, at(SCRIPT, '# ACTE 3'), at(SCRIPT, '## Matin'))).toMatchObject({
      level: 2
    })
    const acte2Deep = SCRIPT.replace('INT. E', '## Fin\n\nINT. E')
    expect(sectionDrop(acte2Deep, at(acte2Deep, '# ACTE 2'), at(deep, '## Matin'))).toEqual({
      ok: true,
      level: 2,
      same: false
    })
    const three = deep.replace('INT. E', '## Fin\n\n### Très fin\n\nINT. E')
    expect(sectionDrop(three, at(three, '# ACTE 2'), at(three, '### Soir'))).toEqual({
      ok: false,
      refusal: 'tooDeep'
    })
  })

  it('tout le bloc bouge ; note, synopsis, brouillon et marques suivent ; numéros comme les Cartes', () => {
    const done = move(SCRIPT, '# ACTE 1', null)!
    expect(sectionLines(done.text)).toEqual([
      '# ACTE 2',
      '# ACTE 3',
      '# ACTE 1',
      '## Matin',
      '## Soir'
    ])
    expect(numbers(done.text)).toEqual(['40', '50', '60', '70', '80', '90'])
    const acte1 = done.text.slice(at(done.text, '# ACTE 1'))
    expect(acte1.startsWith('# ACTE 1\n[[COULEUR #2463EB]]\n\n= Le début.')).toBe(true)
    expect(acte1).toContain('[[R:rose|Revoir]]pleut[[/R]]')
    expect(acte1).toContain('INT. C - NUIT #90#\n[[BROUILLON]]')
    expect(done.text.endsWith('Action C.\n')).toBe(true)
    expect(done.text.startsWith('# ACTE 2\n\nINT. D')).toBe(true)
  })

  it('un bloc plus grand que le reste : les scènes restées en place gardent leur numéro', () => {
    const done = move(SCRIPT, '# ACTE 3', '# ACTE 1')!
    expect(numbers(done.text)).toEqual(['5', '10', '20', '30', '40', '50'])
    const big = move(SCRIPT, '# ACTE 1', '# ACTE 3')!
    expect(numbers(big.text)).toEqual(['40', '50', '52', '55', '57', '60'])
  })

  it('sous-section déplacée dans un autre acte : son niveau suit celui de sa voisine', () => {
    const withSub = SCRIPT.replace('INT. E', '## Fin\n\nINT. E')
    const done = move(withSub, '## Matin', '## Fin')!
    expect(sectionLines(done.text)).toEqual([
      '# ACTE 1',
      '## Soir',
      '# ACTE 2',
      '## Matin',
      '## Fin',
      '# ACTE 3'
    ])
    expect(numbers(done.text)).toEqual(['10', '30', '40', '45', '50', '60'])
    // Tout en bas : un nouvel acte.
    const end = move(SCRIPT, '## Soir', null)!
    expect(sectionLines(end.text)).toEqual([
      '# ACTE 1',
      '## Matin',
      '# ACTE 2',
      '# ACTE 3',
      '# Soir'
    ])
  })

  it('même place, autre niveau : seules les lignes de section changent', () => {
    const start = at(SCRIPT, '## Soir')
    const drop = sectionDrop(SCRIPT, start, at(SCRIPT, '# ACTE 2'))
    expect(drop).toEqual({ ok: true, level: 1, same: false })
    const changes = moveSectionBlock(SCRIPT, start, at(SCRIPT, '# ACTE 2'), 1)
    const after = applyTextChanges(SCRIPT, changes)
    expect(after).toBe(SCRIPT.replace('## Soir', '# Soir'))
    expect(cardsForSectionMove(SCRIPT, BASE(), changes, start)).toBeNull()
  })

  it('section sans scène qui enjambe une autre section sans scène : seul le texte bouge', () => {
    const text = SCRIPT.replace('# ACTE 3', '# VIDE\n\n# ACTE 3').replace(
      'INT. F',
      '# AUTRE\n\nINT. F'
    )
    const start = at(text, '# VIDE')
    const changes = moveSectionBlock(text, start, at(text, '# AUTRE'), 1)
    expect(sectionLines(applyTextChanges(text, changes))).toContain('# VIDE')
    expect(cardsForSectionMove(text, BASE(), changes, start)).toBeNull()
  })

  it('toutes les places : mêmes numéros que depuis les Cartes, ordre des cartes = ordre du texte', () => {
    const text = SCRIPT.replace('INT. E', '## Fin\n\nINT. E')
    const sections = ['# ACTE 1', '## Matin', '## Soir', '# ACTE 2', '## Fin', '# ACTE 3']
    for (const section of sections) {
      for (const before of [...sections, null]) {
        const done = move(text, section, before)
        if (!done) continue
        const order = readScriptScenes(done.text).map((scene) => scene.rawNumber)
        expect(labels(done.decoupage).map((label) => String(Number(label.slice(2))))).toEqual(order)
      }
    }
  })

  it('pas de numéro libre : moveScenes demande de renuméroter', () => {
    const text = SCRIPT.replace('#20#', '#10A#').replace('#30#', '#10B#')
    const decoupage = cards(['10*', '10A*', '10B*', '40*', '50*', '60*'])
    const start = at(text, '# ACTE 3')
    const changes = moveSectionBlock(text, start, at(text, '## Soir'), 2)
    const plan = cardsForSectionMove(text, decoupage, changes, start)!
    expect(plan).toEqual({ ids: ['S60'], index: 2 })
    const refused = moveScenes(decoupage, plan.ids, plan.index)
    expect(!refused.ok && refused.problem).toBe('needs-renumber')
    expect(moveScenes({ ...decoupage, numbersLocked: true }, plan.ids, plan.index)).toEqual({
      ok: false,
      problem: 'locked'
    })
  })

  it('orpheline rangée entre les cartes du bloc : elle suit le bloc', () => {
    const decoupage = cards(['10*', '20*', '25*', '30*', '40*', '50*', '60*'])
    decoupage.scenes[2] = { ...decoupage.scenes[2], orphan: true }
    const start = at(SCRIPT, '# ACTE 1')
    const changes = moveSectionBlock(SCRIPT, start, null, 1)
    expect(cardsForSectionMove(SCRIPT, decoupage, changes, start)).toEqual({
      ids: ['S10', 'S20', 'S25', 'S30'],
      index: 3
    })
  })
})

describe('moveScenes', () => {
  it('une scène : même résultat que moveScene', () => {
    const base = BASE()
    for (const scene of base.scenes) {
      for (let index = 0; index < base.scenes.length; index++) {
        expect(moveScenes(base, [scene.id], index)).toEqual(moveScene(base, scene.id, index))
      }
    }
  })

  it('scènes qui ne se suivent pas : refusé', () => {
    expect(moveScenes(BASE(), ['S10', 'S30'], 2)).toEqual({ ok: false, problem: 'not-found' })
  })
})

describe('opération « déplacer une section » (renumérotation acceptée, historique des Cartes)', () => {
  it('s’applique, puis son inverse remet le texte à l’identique', () => {
    for (const [section, before, level] of [
      ['# ACTE 1', null, 1],
      ['# ACTE 3', '# ACTE 1', 1],
      ['## Soir', '# ACTE 2', 1],
      ['## Matin', '# ACTE 3', 1],
      ['# ACTE 2', '## Soir', 2]
    ] as const) {
      const ref = sectionRefAt(SCRIPT, at(SCRIPT, section))!
      const beforeRef = before === null ? null : sectionRefAt(SCRIPT, at(SCRIPT, before))
      const done = applyTextOp(SCRIPT, {
        kind: 'moveSection',
        section: ref,
        before: beforeRef,
        level
      })
      expect(done.text).not.toBe(SCRIPT)
      expect(applyTextOp(done.text, done.inverse).text, `${section} → ${before}`).toBe(SCRIPT)
    }
  })

  it('section introuvable : rien', () => {
    const done = applyTextOp(SCRIPT, {
      kind: 'moveSection',
      section: { title: 'ACTE 9', occurrence: 0 },
      before: null,
      level: 1
    })
    expect(done.text).toBe(SCRIPT)
  })
})

describe('rapprochement hors navigateur : inchangé', () => {
  // Même texte qu'après le déplacement de l'acte 1 tout en bas, mais arrivé autrement (collage,
  // texte modifié ailleurs) : on garde la plus longue suite, comme avant 18C-16.
  const moved = [
    '# ACTE 2',
    '',
    'INT. D - JOUR #40#',
    '',
    '# ACTE 3',
    '',
    'INT. F - JOUR #60#',
    '',
    '# ACTE 1',
    '',
    'INT. A - JOUR #10#',
    '',
    'INT. B - JOUR #20#',
    '',
    'INT. C - JOUR #30#',
    ''
  ].join('\n')
  const decoupage = cards(['10*', '20*', '30*', '40*', '60*'])
  const renumbered = (context: Parameters<typeof reconcile>[2]): (string | null)[] => {
    const link = reconcile(moved, decoupage, context, ids)
    return numbers(applyTextChanges(moved, link.textChanges))
  }
  const block = { from: moved.indexOf('# ACTE 1'), to: moved.length }

  it('texte modifié ailleurs : la plus longue suite garde ses numéros', () => {
    expect(renumbered({})).toEqual(['3', '6', '10', '20', '30'])
  })

  it('collage : idem, le texte collé ne perd son numéro qu’à égalité', () => {
    expect(renumbered({ insertedRanges: [block] })).toEqual(['3', '6', '10', '20', '30'])
  })

  it('dépôt du navigateur : les scènes restées en place gardent leur numéro', () => {
    expect(renumbered({ insertedRanges: [block], movedBlock: true })).toEqual([
      '40',
      '60',
      '70',
      '80',
      '90'
    ])
  })
})
