// Exports du planning (étape 15E) : contenu des PDF et du calendrier à partir d'un vrai planning.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { paginate, parse } from '@neoscenar/fountain'
import { exportPlanningPdf, exportShootingPdf } from '@neoscenar/pdf-planning'
import { counterIds } from '../../shared/decoupage/testFixtures'
import { scriptLayout } from '../script/layoutProfile'
import type { Decoupage, Scene } from '../../shared/projectTypes'
import { reconcile } from '../../shared/scriptLink/reconcile'
import { applyTextChanges } from '../../shared/scriptLink/textChanges'
import { breakdownScenes } from '../../shared/planning/breakdown'
import { buildIcs } from '../../shared/planning/ics'
import { defaultPlanning } from '../../shared/planning/planningData'
import { addTask, type PlanningResult } from '../../shared/planning/planningEdit'
import {
  exportRange,
  exportedDays,
  planningCalendar,
  planningPdfData,
  schoolYear,
  shootingPdfData
} from '../../shared/planning/planningExport'
import { readShooting } from '../../shared/planning/shootingData'
import { addMuteCharacter, addSceneToDay, addShootingDay } from '../../shared/planning/shootingEdit'
import type { Planning } from '../../shared/planning/types'

const ROOT = join(__dirname, '..', '..', '..')
const FONTS = {
  regular: new Uint8Array(
    readFileSync(join(ROOT, 'resources', 'polices', 'inter', 'Inter-Regular.ttf'))
  ),
  bold: new Uint8Array(readFileSync(join(ROOT, 'resources', 'polices', 'inter', 'Inter-Bold.ttf')))
}

function planningOf(result: PlanningResult): Planning {
  if (!result.ok) throw new Error(`refusé : ${result.problem}`)
  return result.planning
}

function link(text: string): { text: string; cards: Scene[] } {
  const start: Decoupage = {
    formatVersion: 1,
    numbersLocked: false,
    scriptLinked: true,
    scenes: []
  }
  const result = reconcile(text, start, {}, counterIds('c'))
  return { text: applyTextChanges(text, result.textChanges), cards: result.decoupage.scenes }
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

const TODAY = '2026-11-20'
const LONG_TITLE =
  'Écrire la première version du scénario avec les dialogues réécrits après la lecture en classe, à rendre à l’enseignant'

/** Planning d'essai : tâches de Léa et Noé (une faite, une validée, une sans échéance), deux jours. */
function sample(): {
  planning: Planning
  scenes: ReturnType<typeof breakdownScenes>
  cards: Scene[]
} {
  const ids = counterIds('p')
  const { text, cards } = link(SCRIPT)
  let planning = defaultPlanning(ids)
  const [writing, , shooting] = planning.phases.map((phase) => phase.id)
  const add = (phase: string, fields: Parameters<typeof addTask>[2]): void => {
    planning = planningOf(addTask(planning, phase, fields, ids))
  }
  add(writing, {
    titre: 'Synopsis',
    echeance: '2026-09-25',
    faite: true,
    validee: true,
    personnes: ['Léa Martin']
  })
  add(writing, {
    titre: LONG_TITLE,
    debut: '2026-10-19',
    echeance: '2026-11-13',
    personnes: ['Léa Martin'],
    note: 'Relire ; corriger, rendre.'
  })
  add(writing, {
    titre: 'Traitement',
    echeance: '2026-10-16',
    faite: true,
    personnes: ['Noé Dubois']
  })
  add(shooting, { titre: 'Repérages', debut: '2027-08-03', personnes: ['Noé Dubois'] })
  add(shooting, { titre: 'Idées', personnes: [] })
  const day1 = addShootingDay(planning, { date: '2027-03-02', titre: 'La maison' }, ids)
  planning = planningOf(day1)
  const firstDay = day1.ok ? day1.createdId! : ''
  const day2 = addShootingDay(planning, { date: null }, ids)
  planning = planningOf(day2)
  planning = planningOf(addSceneToDay(planning, firstDay, cards[0].id))
  planning = planningOf(addSceneToDay(planning, firstDay, cards[1].id))
  planning = planningOf(addSceneToDay(planning, firstDay, 'carte-supprimee'))
  planning = planningOf(addMuteCharacter(planning, cards[1].id, 'PAUL'))
  // Comme l'application : dépouillement avec les muets du planning.
  const doc = parse(text, { titlePage: false })
  const sheets = [
    { nom: 'MARIE', interprete: 'Léa Dupont' },
    { nom: 'PAUL', interprete: '' }
  ]
  const scenes = breakdownScenes(
    doc,
    paginate(doc, scriptLayout),
    cards,
    sheets,
    readShooting(planning).muets
  )
  return { planning, scenes, cards }
}

describe('étendue de la ligne du temps', () => {
  it('prend l’année scolaire en cours ; en juillet-août, celle qui commence', () => {
    expect(schoolYear('2026-11-20')).toEqual({ start: '2026-09-01', end: '2027-06-30' })
    expect(schoolYear('2027-03-01')).toEqual({ start: '2026-09-01', end: '2027-06-30' })
    expect(schoolYear('2027-06-30')).toEqual({ start: '2026-09-01', end: '2027-06-30' })
    expect(schoolYear('2027-07-01')).toEqual({ start: '2027-09-01', end: '2028-06-30' })
    expect(schoolYear('2026-09-01')).toEqual({ start: '2026-09-01', end: '2027-06-30' })
  })

  it('s’agrandit au mois entier si des dates en sortent', () => {
    expect(exportRange(TODAY, ['2026-10-01', '2027-02-14'])).toEqual({
      start: '2026-09-01',
      end: '2027-06-30'
    })
    expect(exportRange(TODAY, ['2026-08-17', '2027-07-04', '2028-02-10'])).toEqual({
      start: '2026-08-01',
      end: '2028-02-29'
    })
  })
})

describe('PDF « Planning »', () => {
  const { planning, scenes, cards } = sample()
  const { days } = exportedDays(planning, scenes, cards)

  it('garde toutes les tâches (faites comprises), triées, avec leur état', () => {
    const data = planningPdfData(planning, days, { today: TODAY, person: null })
    expect(data.phases.map((p) => p.name)).toEqual([
      'Écriture',
      'Préproduction',
      'Tournage',
      'Postproduction',
      'Diffusion'
    ])
    expect(data.phases[0].tasks.map((t) => [t.title, t.state, t.validated])).toEqual([
      ['Synopsis', 'done', true],
      ['Traitement', 'done', false],
      [LONG_TITLE, 'late', false]
    ])
    expect(data.phases[2].tasks).toHaveLength(2)
    expect(data.shootingRowAfter).toBe(2)
    expect(data.shootingDays).toEqual(['2027-03-02'])
    // Repérages commence en août 2027 : l'étendue va jusqu'au 31 août.
    expect(data.range).toEqual({ start: '2026-09-01', end: '2027-08-31' })
  })

  it('« Tâches de » ne garde que les tâches de cette personne (casse ignorée)', () => {
    const data = planningPdfData(planning, days, { today: TODAY, person: 'noé dubois' })
    expect(data.phases.flatMap((p) => p.tasks.map((t) => t.title))).toEqual([
      'Traitement',
      'Repérages'
    ])
    expect(data.person).toBe('noé dubois')
    expect(data.shootingDays).toEqual(['2027-03-02'])
  })
})

describe('PDF « Plan de tournage »', () => {
  const { planning, scenes, cards } = sample()

  it('retire d’abord les scènes dont la carte n’existe plus, garde les orphelines', () => {
    const { days, unplanned } = exportedDays(planning, scenes, cards)
    expect(days[0].entries.map((e) => e.cardId)).toEqual([cards[0].id, cards[1].id])
    expect(unplanned).toBe(1)
    const orphan = cards.map((c, i) => (i === 1 ? { ...c, orphan: true } : c))
    const withOrphan = exportedDays(
      planning,
      scenes.filter((s) => s.cardId !== cards[1].id),
      orphan
    )
    expect(withOrphan.days[0].entries.map((e) => e.status)).toEqual(['ok', 'missing'])
  })

  it('décrit scènes, interprètes, muets et jours sans date', () => {
    const { days, unplanned } = exportedDays(planning, scenes, cards)
    const data = shootingPdfData(days, unplanned, TODAY)
    expect(data.days.map((d) => d.date)).toEqual(['2027-03-02', null])
    const [kitchen, garden] = data.days[0].scenes
    expect(kitchen).toMatchObject({
      label: 'S_0010',
      location: 'CUISINE',
      intExt: 'int',
      dayNight: 'day'
    })
    expect(kitchen.people).toEqual(['Léa Dupont (MARIE)', 'PAUL (sans interprète)'])
    expect(garden.people).toEqual(['PAUL (muet, sans interprète)'])
    expect(data.days[0].called).toEqual(['Léa Dupont (MARIE)'])
    expect(data.days[0].withoutInterpreter).toEqual(['PAUL'])
    expect(data.unplanned).toBe(1)
  })
})

describe('calendrier .ics', () => {
  const { planning, scenes, cards } = sample()
  const { days } = exportedDays(planning, scenes, cards)
  const stamp = new Date('2026-11-20T10:00:00Z')
  const modifiedAt = new Date('2026-11-19T18:30:00Z')

  it('échéances (✓ si faite, « Validée »), puis jours de tournage datés ; UID stables', () => {
    const calendar = planningCalendar(planning, days, {
      title: 'Le Dernier Bus',
      person: null,
      stamp,
      modifiedAt
    })
    expect(calendar.name).toBe('Le Dernier Bus — planning')
    expect(calendar.events.map((e) => e.summary)).toEqual([
      '✓ Synopsis',
      '✓ Traitement',
      LONG_TITLE,
      'Tournage — Jour 1 · La maison'
    ])
    const synopsis = planning.taches.find((t) => t.titre === 'Synopsis')!
    expect(calendar.events[0]).toMatchObject({
      uid: `${synopsis.id}@neoscenar`,
      date: '2026-09-25',
      description: 'Phase : Écriture\nPersonnes : Léa Martin\nFaite · Validée',
      categories: ['Écriture']
    })
    expect(calendar.events[1].description).toContain('\nFaite')
    expect(calendar.events[1].description).not.toContain('Validée')
    const day = calendar.events[3]
    expect(day.uid).toBe(`${days[0].day.id}@neoscenar`)
    expect(day.location).toBe('CUISINE, JARDIN')
    expect(day.description).toContain('Scènes :\nS_0010 CUISINE (INT., JOUR, ')
    expect(day.description).toContain('S_0020 JARDIN (EXT., NUIT, ')
    expect(day.description).toContain('Convoqués : Léa Dupont (MARIE)')
    // Même planning exporté deux fois : mêmes UID.
    const again = planningCalendar(planning, days, {
      title: 'Le Dernier Bus',
      person: null,
      stamp: new Date(),
      modifiedAt
    })
    expect(again.events.map((e) => e.uid)).toEqual(calendar.events.map((e) => e.uid))
  })

  it('« Seulement les tâches de » garde toujours les jours de tournage', () => {
    const calendar = planningCalendar(planning, days, {
      title: '',
      person: 'Léa Martin',
      stamp,
      modifiedAt
    })
    expect(calendar.name).toBe('Planning')
    expect(calendar.events.map((e) => e.summary)).toEqual([
      '✓ Synopsis',
      LONG_TITLE,
      'Tournage — Jour 1 · La maison'
    ])
  })

  it('écrit un fichier valide : lignes ≤ 75 octets, texte retrouvé après dépliage', () => {
    const text = buildIcs(
      planningCalendar(planning, days, { title: 'Le Dernier Bus', person: null, stamp, modifiedAt })
    )
    for (const line of text.split('\r\n'))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    const unfolded = text.replace(/\r\n /g, '')
    expect(unfolded).toContain(`SUMMARY:${LONG_TITLE.replace(/,/g, '\\,')}`)
    expect(unfolded).toContain('Relire \\; corriger\\, rendre.')
    expect(unfolded.match(/BEGIN:VEVENT/g)).toHaveLength(4)
  })
})

describe('PDF identiques quel que soit le moment et sans thème', () => {
  afterEach(() => vi.useRealTimers())

  it('mêmes octets à date fixée (le module ne reçoit aucune couleur de thème)', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-20T10:00:00Z'), toFake: ['Date'] })
    const { planning, scenes, cards } = sample()
    const { days, unplanned } = exportedDays(planning, scenes, cards)
    const planningInput = {
      ...planningPdfData(planning, days, { today: TODAY, person: null }),
      title: 'Essai',
      fonts: FONTS
    }
    const shootingInput = {
      ...shootingPdfData(days, unplanned, TODAY),
      title: 'Essai',
      fonts: FONTS
    }
    const a = await exportPlanningPdf(planningInput)
    const b = await exportPlanningPdf(planningInput)
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true)
    const c = await exportShootingPdf(shootingInput)
    const d = await exportShootingPdf(shootingInput)
    expect(Buffer.from(c).equals(Buffer.from(d))).toBe(true)
  })
})

describe('« Le Dernier Bus »', () => {
  it('produit les deux PDF avec toutes les scènes planifiées', async () => {
    const path = join(ROOT, 'packages', 'fountain', 'tests', 'exemples', 'le-dernier-bus.fountain')
    const { text, cards } = link(readFileSync(path, 'utf-8'))
    const doc = parse(text)
    const scenes = breakdownScenes(doc, paginate(doc, scriptLayout), cards, [])
    const ids = counterIds('b')
    let planning = defaultPlanning(ids)
    const day = addShootingDay(planning, { date: '2027-03-01' }, ids)
    planning = planningOf(day)
    for (const scene of scenes)
      planning = planningOf(addSceneToDay(planning, day.ok ? day.createdId! : '', scene.cardId))
    const { days, unplanned } = exportedDays(planning, scenes, cards)
    expect(unplanned).toBe(0)
    const pdf = await exportShootingPdf({
      ...shootingPdfData(days, unplanned, TODAY),
      title: 'Le Dernier Bus',
      fonts: FONTS
    })
    expect(pdf.length).toBeGreaterThan(1000)
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe('%PDF-')
  })
})
