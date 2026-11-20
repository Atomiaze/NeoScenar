import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { paginate, parse } from '@neoscenar/fountain'
import { counterIds } from '../../shared/decoupage/testFixtures'
import { scriptLayout } from '../script/layoutProfile'
import type { Decoupage, Scene } from '../../shared/projectTypes'
import { reconcile } from '../../shared/scriptLink/reconcile'
import { applyTextChanges } from '../../shared/scriptLink/textChanges'
import { breakdownScenes, eighthsOfPage } from '../../shared/planning/breakdown'
import {
  defaultPlanning,
  parsePlanning,
  serializePlanning
} from '../../shared/planning/planningData'
import { readShooting } from '../../shared/planning/shootingData'
import {
  addMuteCharacter,
  addSceneToDay,
  addShootingDay,
  moveSceneToDay,
  removeMuteCharacter,
  removeSceneFromDay,
  removeShootingDay,
  rememberSceneMarks,
  removeVanishedScenes,
  updateShootingDay
} from '../../shared/planning/shootingEdit'
import { sceneLabel } from '../../shared/scriptLink/sceneNumber'
import type { PlanningResult } from '../../shared/planning/planningEdit'
import {
  dayViews,
  filterScenes,
  formatEighths,
  groupByLocation,
  shootingWarnings,
  unplannedScenes
} from '../../shared/planning/shootingView'
import type { Planning } from '../../shared/planning/types'

const ids = counterIds('t')

function planningOf(result: PlanningResult): Planning {
  if (!result.ok) throw new Error(`refusé : ${result.problem}`)
  return result.planning
}

function link(text: string, known: Scene[] = []): { text: string; cards: Scene[] } {
  const start: Decoupage = {
    formatVersion: 1,
    numbersLocked: false,
    scriptLinked: true,
    scenes: known
  }
  const result = reconcile(text, start, {}, counterIds('c'))
  return { text: applyTextChanges(text, result.textChanges), cards: result.decoupage.scenes }
}

function breakdown(
  text: string,
  cards: Scene[],
  sheets = [] as { nom: string; interprete: string }[]
) {
  const doc = parse(text, { titlePage: false })
  return breakdownScenes(doc, paginate(doc, scriptLayout), cards, sheets)
}

const SCRIPT = `INT. CUISINE - JOUR

Marie prépare le café.

MARIE
Bonjour Paul.

PAUL
Salut.

EXT. JARDIN - NUIT

Marie sort.

INT. CUISINE - NUIT

Paul reste seul.
`

describe('eighthsOfPage', () => {
  it('arrondit au huitième le plus proche, jamais en dessous de 1/8', () => {
    expect(eighthsOfPage(0)).toBe(1)
    expect(eighthsOfPage(1)).toBe(1)
    expect(eighthsOfPage(7.5)).toBe(1) // 1 huitième exactement
    expect(eighthsOfPage(60)).toBe(8)
    expect(eighthsOfPage(60 * 1.5 + 4)).toBe(13) // 12,53 huitièmes
    expect(eighthsOfPage(60 * 1.5 + 3.7)).toBe(12) // 12,49
  })
  it('s’écrit comme sur un tournage', () => {
    expect(formatEighths(3)).toBe('3/8')
    expect(formatEighths(8)).toBe('1')
    expect(formatEighths(11)).toBe('1 3/8')
  })
})

describe('dépouillement', () => {
  const { text, cards } = link(SCRIPT)
  const scenes = breakdown(text, cards, [
    { nom: 'MARIE', interprete: 'Léa Dupont' },
    { nom: 'PAUL', interprete: '  ' }
  ])

  it('lit numéro, INT/EXT, lieu, jour/nuit et personnages', () => {
    expect(scenes.map((s) => s.label)).toEqual(['S_0010', 'S_0020', 'S_0030'])
    expect(scenes.map((s) => [s.intExt, s.dayNight, s.location])).toEqual([
      ['int', 'day', 'CUISINE'],
      ['ext', 'night', 'JARDIN'],
      ['int', 'night', 'CUISINE']
    ])
    expect(scenes[0].characters.map((c) => [c.nom, c.interprete])).toEqual([
      ['MARIE', 'Léa Dupont'],
      ['PAUL', null]
    ])
    expect(scenes[1].characters).toEqual([])
    expect(scenes.every((s) => (s.eighths ?? 0) >= 1)).toBe(true)
    expect(scenes[0].cardId).toBe(cards[0].id)
  })

  it('ignore une scène sans carte et une carte orpheline', () => {
    const orphan = cards.map((c, i) => (i === 1 ? { ...c, orphan: true } : c))
    expect(breakdown(text, orphan).map((s) => s.label)).toEqual(['S_0010', 'S_0030'])
    expect(breakdown(text, cards.slice(0, 1)).map((s) => s.label)).toEqual(['S_0010'])
  })

  it('une carte « SCÈNE À ÉCRIRE » est « à écrire », sans lieu', () => {
    const result = link(`.SCÈNE À ÉCRIRE\n\nAction.\n\nINT. SALON - JOUR\n\nAction.\n`)
    const list = breakdown(result.text, result.cards)
    expect(list[0].eighths).toBeNull()
    expect(list[0].location).toBe('')
    expect(list[1].eighths).not.toBeNull()
  })

  it('ajoute les muets, une fiche disparue est signalée', () => {
    const doc = parse(text, { titlePage: false })
    const list = breakdownScenes(
      doc,
      paginate(doc, scriptLayout),
      cards,
      [{ nom: 'LÉA', interprete: 'Sam' }],
      { [cards[1].id]: ['LÉA', 'INCONNU', 'MARIE'] }
    )
    expect(list[1].characters).toEqual([
      { nom: 'LÉA', interprete: 'Sam', muet: true, sansFiche: false },
      { nom: 'INCONNU', interprete: null, muet: true, sansFiche: true },
      { nom: 'MARIE', interprete: null, muet: true, sansFiche: true }
    ])
  })

  it('une scène déplacée dans le texte garde son identifiant de carte', () => {
    const blocks = text.trim().split('\n\n')
    // Les trois scènes : en-tête + action (+ répliques) ; on remonte « EXT. JARDIN » en tête.
    const garden = blocks.findIndex((b) => b.startsWith('EXT. JARDIN'))
    const reordered = [
      blocks[garden],
      blocks[garden + 1],
      ...blocks.slice(0, garden),
      ...blocks.slice(garden + 2)
    ]
    const moved = link(reordered.join('\n\n') + '\n', cards)
    const after = breakdown(moved.text, moved.cards)
    expect(after.map((s) => s.location)).toEqual(['JARDIN', 'CUISINE', 'CUISINE'])
    const before = Object.fromEntries(scenes.map((s) => [s.heading, s.cardId]))
    expect(Object.fromEntries(after.map((s) => [s.heading, s.cardId]))).toEqual(before)
    expect(after[0].label).not.toBe(scenes[1].label)
  })
})

describe('jours de tournage', () => {
  const { text, cards } = link(SCRIPT)
  const scenes = breakdown(text, cards, [
    { nom: 'MARIE', interprete: 'Léa Dupont' },
    { nom: 'PAUL', interprete: 'Léa Dupont' }
  ])
  const [a, b, c] = cards.map((card) => card.id)

  function twoDays(): { planning: Planning; day1: string; day2: string } {
    let planning = defaultPlanning(ids)
    const first = addShootingDay(planning, { date: '2026-12-02', titre: 'Cuisine' }, ids)
    planning = planningOf(first)
    const day1 = first.ok ? first.createdId! : ''
    const second = addShootingDay(planning, { date: '2026-12-01' }, ids)
    planning = planningOf(second)
    return { planning, day1, day2: second.ok ? second.createdId! : '' }
  }

  it('crée, modifie, supprime, refuse une date impossible', () => {
    const { planning, day1 } = twoDays()
    expect(readShooting(planning).jours).toHaveLength(2)
    const changed = planningOf(updateShootingDay(planning, day1, { titre: ' Jour 1 ', note: 'x' }))
    expect(readShooting(changed).jours[0]).toMatchObject({ titre: 'Jour 1', note: 'x' })
    expect(updateShootingDay(planning, day1, { date: '2026-02-30' })).toEqual({
      ok: false,
      problem: 'invalid'
    })
    expect(readShooting(planningOf(removeShootingDay(planning, day1))).jours).toHaveLength(1)
    expect(removeShootingDay(planning, 'nope').ok).toBe(false)
  })

  it('planifie, déplace, retire ; une scène ne peut pas être deux fois dans un jour', () => {
    const { planning: p0, day1, day2 } = twoDays()
    let p = planningOf(addSceneToDay(p0, day1, a))
    p = planningOf(addSceneToDay(p, day1, b))
    p = planningOf(addSceneToDay(p, day1, c, 0))
    expect(readShooting(p).jours[0].scenes).toEqual([c, a, b])
    expect(addSceneToDay(p, day1, a).ok).toBe(false)
    p = planningOf(moveSceneToDay(p, a, day1, day1, 5))
    expect(readShooting(p).jours[0].scenes).toEqual([c, b, a])
    p = planningOf(moveSceneToDay(p, b, day1, day2, 0))
    expect(readShooting(p).jours.map((d) => d.scenes)).toEqual([[c, a], [b]])
    p = planningOf(removeSceneFromDay(p, day1, c))
    expect(readShooting(p).jours[0].scenes).toEqual([a])
  })

  it('calcule le total, les lieux et les interprètes convoqués ; trie par date', () => {
    const { planning: p0, day1, day2 } = twoDays()
    let p = planningOf(addSceneToDay(p0, day1, a))
    p = planningOf(addSceneToDay(p, day1, c))
    p = planningOf(addSceneToDay(p, day2, b))
    const views = dayViews(readShooting(p), scenes, cards)
    expect(views.map((v) => v.day.date)).toEqual(['2026-12-01', '2026-12-02'])
    const day = views[1]
    expect(day.eighths).toBe((scenes[0].eighths ?? 0) + (scenes[2].eighths ?? 0))
    expect(day.locations).toEqual(['CUISINE'])
    expect(day.called).toEqual([{ interprete: 'Léa Dupont', personnages: ['MARIE', 'PAUL'] }])
  })

  it('une scène disparue reste dans son jour mais ne compte pas', () => {
    const { planning: p0, day1 } = twoDays()
    let p = planningOf(addSceneToDay(p0, day1, a))
    p = planningOf(addSceneToDay(p, day1, b))
    const orphan = cards.map((card) => (card.id === b ? { ...card, orphan: true } : card))
    const only = scenes.filter((s) => s.cardId !== b)
    const view = dayViews(readShooting(p), only, orphan).find((v) => v.day.id === day1)!
    expect(view.entries.map((e) => e.status)).toEqual(['ok', 'missing'])
    expect(view.entries[1].label).toBe('S_0020')
    expect(view.eighths).toBe(scenes[0].eighths)
    expect(shootingWarnings(readShooting(p), only, orphan)).toContainEqual({
      kind: 'missing',
      dayId: day1,
      cardId: b,
      label: 'S_0020'
    })
  })

  it('« à écrire » ne compte pas dans le total', () => {
    const { planning: p0, day1 } = twoDays()
    const result = link(`.SCÈNE À ÉCRIRE\n\nAction.\n\nINT. SALON - JOUR\n\nAction.\n`)
    const list = breakdown(result.text, result.cards)
    let p = planningOf(addSceneToDay(p0, day1, list[0].cardId))
    p = planningOf(addSceneToDay(p, day1, list[1].cardId))
    const view = dayViews(readShooting(p), list, result.cards).find((v) => v.day.id === day1)!
    expect(view.entries.map((e) => e.status)).toEqual(['to-write', 'ok'])
    expect(view.eighths).toBe(list[1].eighths)
  })

  it('n’enlève d’office que les scènes dont la carte n’existe plus', () => {
    const { planning: p0, day1 } = twoDays()
    let p = planningOf(addSceneToDay(p0, day1, a))
    p = planningOf(addSceneToDay(p, day1, 'carte-supprimee'))
    p = planningOf(addMuteCharacter(p, 'carte-supprimee', 'MARIE'))
    const out = removeVanishedScenes(p, new Set(cards.map((card) => card.id)))
    expect(out.removed).toEqual([{ dayId: day1, cardId: 'carte-supprimee', mark: null }])
    expect(readShooting(out.planning).jours[0].scenes).toEqual([a])
    expect(readShooting(out.planning).muets).toEqual({})
    expect(removeVanishedScenes(out.planning, new Set([a])).planning).toBe(out.planning)
  })

  it('mémorise numéro et en-tête des scènes planifiées, et les garde quand la carte disparaît', () => {
    const { planning: p0, day1 } = twoDays()
    let p = planningOf(addSceneToDay(p0, day1, a))
    p = planningOf(addSceneToDay(p, day1, b))
    const sources = cards.map((card) => ({
      id: card.id,
      label: sceneLabel(card),
      heading: card.heading
    }))
    p = rememberSceneMarks(p, sources)
    expect(readShooting(p).reperes).toEqual({
      [a]: { numero: 'S_0010', entete: cards[0].heading },
      [b]: { numero: 'S_0020', entete: cards[1].heading }
    })
    // Rien ne change : même objet (aucune écriture inutile).
    expect(rememberSceneMarks(p, sources)).toBe(p)
    // Renumérotation : le repère suit la carte.
    const renumbered = sources.map((s) => (s.id === a ? { ...s, label: 'S_0005' } : s))
    expect(readShooting(rememberSceneMarks(p, renumbered)).reperes[a].numero).toBe('S_0005')
    // Carte supprimée : le dernier repère reste, et nomme la scène retirée.
    const withoutB = sources.filter((s) => s.id !== b)
    expect(readShooting(rememberSceneMarks(p, withoutB)).reperes[b].numero).toBe('S_0020')
    const out = removeVanishedScenes(p, new Set([a]))
    expect(out.removed).toEqual([
      { dayId: day1, cardId: b, mark: { numero: 'S_0020', entete: cards[1].heading } }
    ])
    expect(Object.keys(readShooting(out.planning).reperes)).toEqual([a])
    // Scène retirée de son jour : son repère disparaît.
    const unplanned = planningOf(removeSceneFromDay(p, day1, b))
    expect(Object.keys(readShooting(rememberSceneMarks(unplanned, sources)).reperes)).toEqual([a])
  })

  it('un jour nomme une scène sans carte par son repère', () => {
    const { planning: p0, day1 } = twoDays()
    let p = planningOf(addSceneToDay(p0, day1, 'carte-supprimee'))
    p = {
      ...p,
      tournage: {
        ...p.tournage,
        reperes: { 'carte-supprimee': { numero: 'S_0030', entete: 'INT. A - JOUR' } }
      }
    }
    const view = dayViews(readShooting(p), [], cards).find((v) => v.day.id === day1)!
    expect(view.entries[0]).toMatchObject({
      status: 'missing',
      label: 'S_0030',
      heading: 'INT. A - JOUR'
    })
  })

  it('lit les repères avec tolérance', () => {
    const p = parsePlanning(
      {
        version: 1,
        phases: [],
        taches: [],
        tournage: { reperes: { x: { numero: 'S_0010' }, y: { numero: 3 }, z: 'abc' } }
      },
      ids
    )
    expect(readShooting(p).reperes).toEqual({ x: { numero: 'S_0010', entete: '' } })
  })

  it('avertit : deux fois, sans interprète, sans fiche, non planifiée', () => {
    const { planning: p0, day1, day2 } = twoDays()
    let p = planningOf(addSceneToDay(p0, day1, a))
    p = planningOf(addSceneToDay(p, day2, a))
    p = planningOf(addMuteCharacter(p, b, 'FANTÔME'))
    const withMute = breakdownScenes(
      parse(text, { titlePage: false }),
      paginate(parse(text, { titlePage: false }), scriptLayout),
      cards,
      [{ nom: 'MARIE', interprete: 'Léa' }],
      readShooting(p).muets
    )
    const warnings = shootingWarnings(readShooting(p), withMute, cards)
    expect(warnings).toContainEqual({
      kind: 'twice',
      cardId: a,
      label: 'S_0010',
      dayIds: [day1, day2]
    })
    expect(warnings).toContainEqual({ kind: 'no-interpreter', nom: 'PAUL', labels: ['S_0010'] })
    expect(warnings).toContainEqual({ kind: 'no-sheet', nom: 'FANTÔME', labels: ['S_0020'] })
    expect(warnings).toContainEqual({ kind: 'unplanned', count: 2 })
  })

  it('muets : ajout, doublon refusé, retrait', () => {
    let p = planningOf(addMuteCharacter(defaultPlanning(ids), a, 'MARIE'))
    expect(addMuteCharacter(p, a, 'marie').ok).toBe(false)
    p = planningOf(removeMuteCharacter(p, a, 'Marie'))
    expect(readShooting(p).muets).toEqual({})
    expect(removeMuteCharacter(p, a, 'MARIE').ok).toBe(false)
  })

  it('filtre et regroupe par lieu exact', () => {
    expect(filterScenes(scenes, { location: 'cuisine' }).map((s) => s.label)).toEqual([
      'S_0010',
      'S_0030'
    ])
    expect(filterScenes(scenes, { dayNight: 'night', intExt: 'int' }).map((s) => s.label)).toEqual([
      'S_0030'
    ])
    expect(filterScenes(scenes, { character: 'paul' }).map((s) => s.label)).toEqual(['S_0010'])
    expect(groupByLocation(scenes).map((g) => [g.location, g.scenes.length])).toEqual([
      ['CUISINE', 2],
      ['JARDIN', 1]
    ])
    const other = scenes.map((s, i) => (i === 2 ? { ...s, location: 'CUISINE - COIN' } : s))
    expect(groupByLocation(other).map((g) => g.location)).toEqual([
      'CUISINE',
      'CUISINE - COIN',
      'JARDIN'
    ])
    expect(unplannedScenes(scenes, { jours: [], muets: {} })).toHaveLength(3)
  })
})

describe('fichier planning.json', () => {
  it('relit et réécrit les jours sans perte, garde les clés ajoutées', () => {
    const raw = {
      version: 1,
      tournage: {
        extra: 1,
        jours: [
          {
            id: 'j1',
            date: '2026-12-01',
            titre: 'A',
            scenes: ['c1', 'c1', 'c2'],
            note: '',
            couleur: 'x'
          },
          { id: 'j1', date: 'oups' },
          { id: 'j2', date: '2026-13-45', scenes: 'non' }
        ],
        muets: { c1: ['MARIE', 'MARIE', ''], c2: 'non' }
      }
    }
    const planning = parsePlanning(raw, ids)
    const shooting = readShooting(planning)
    expect(shooting.jours).toEqual([
      { id: 'j1', date: '2026-12-01', titre: 'A', scenes: ['c1', 'c2'], note: '' },
      { id: 'j2', date: null, titre: '', scenes: [], note: '' }
    ])
    expect(shooting.muets).toEqual({ c1: ['MARIE'] })
    const changed = planningOf(updateShootingDay(planning, 'j1', { titre: 'B' }))
    const written = JSON.parse(serializePlanning(raw, changed))
    expect(written.tournage.extra).toBe(1)
    expect(written.tournage.jours[0]).toMatchObject({ id: 'j1', titre: 'B', couleur: 'x' })
    expect(JSON.parse(serializePlanning(written, parsePlanning(written, ids)))).toEqual(written)
  })
})

describe('« Le Dernier Bus »', () => {
  const path = join(
    __dirname,
    '..',
    '..',
    '..',
    'packages',
    'fountain',
    'tests',
    'exemples',
    'le-dernier-bus.fountain'
  )
  const { text, cards } = link(readFileSync(path, 'utf-8'))
  const doc = parse(text)
  const pagination = paginate(doc, scriptLayout)
  const scenes = breakdownScenes(doc, pagination, cards, [])

  it('toutes les scènes apparaissent, avec une longueur plausible', () => {
    const headings = doc.elements.filter((e) => e.type === 'scene_heading').length
    expect(scenes).toHaveLength(headings)
    expect(scenes.every((s) => s.eighths !== null && s.eighths >= 1)).toBe(true)
    const total = scenes.reduce((sum, s) => sum + (s.eighths ?? 0), 0)
    // Le total en huitièmes colle aux pages du scénario (arrondis scène par scène : ± 1/2 par scène).
    expect(Math.abs(total - pagination.pages.length * 8)).toBeLessThan(headings * 4 + 8)
  })
})
