import { describe, expect, it } from 'vitest'
import type { CreditsData, CreditsTemplate } from '../credits/types'
import { defaultCreditsData } from '../credits/creditsData'
import { crewMembers, taskPeople } from './crew'
import {
  defaultPlanning,
  isIsoDate,
  mergePlanning,
  parsePlanning,
  planningFileVersion,
  serializePlanning
} from './planningData'
import {
  addPhase,
  addTask,
  movePhase,
  phaseTaskCount,
  removePhase,
  removeTask,
  renamePhase,
  updateTask,
  type PlanningResult
} from './planningEdit'
import { phaseProgress, sortTasks, taskState } from './planningState'
import type { Planning } from './types'

function counter(): { newId(): string } {
  let n = 0
  return { newId: () => `id-${++n}` }
}

function must(result: PlanningResult): Planning {
  if (!result.ok) throw new Error(result.problem)
  return result.planning
}

describe('planning par défaut', () => {
  it('a les cinq phases, dans l’ordre, avec une couleur et un identifiant chacune', () => {
    const planning = defaultPlanning(counter())
    expect(planning.phases.map((p) => p.nom)).toEqual([
      'Écriture',
      'Préproduction',
      'Tournage',
      'Postproduction',
      'Diffusion'
    ])
    expect(planning.phases.map((p) => p.ordre)).toEqual([1, 2, 3, 4, 5])
    expect(new Set(planning.phases.map((p) => p.id)).size).toBe(5)
    for (const phase of planning.phases) expect(phase.couleur).toMatch(/^#[0-9a-f]{6}$/)
    expect(planning.taches).toEqual([])
  })

  it('un fichier absent ou sans phases donne les cinq phases', () => {
    expect(parsePlanning({}, counter()).phases).toHaveLength(5)
    expect(parsePlanning(null, counter()).phases).toHaveLength(5)
  })

  it('respecte une liste de phases vidée par l’élève', () => {
    expect(parsePlanning({ phases: [] }, counter()).phases).toEqual([])
  })
})

describe('lecture et écriture sans perte', () => {
  const ids = counter()
  let planning = defaultPlanning(ids)
  const tourn = planning.phases[2].id
  planning = must(
    addTask(
      planning,
      tourn,
      {
        titre: 'Tournage',
        debut: '2027-01-11',
        echeance: '2027-01-15',
        personnes: ['Léa Dupont'],
        validee: true,
        note: 'Prévoir la pluie'
      },
      ids
    )
  )

  it('relit exactement ce qui a été écrit', () => {
    const text = serializePlanning({}, planning)
    expect(text.endsWith('\n')).toBe(true)
    expect(parsePlanning(JSON.parse(text), counter())).toEqual(planning)
  })

  it('garde les clés ajoutées à la main (racine, phases, tâches, tournage)', () => {
    const original = {
      version: 1,
      ajout: 'à moi',
      phases: planning.phases.map((p) => ({ ...p, icone: 'x' })),
      taches: planning.taches.map((t) => ({ ...t, etiquette: 'y' })),
      tournage: { jours: [], reglage: 3 }
    }
    const merged = mergePlanning(original, planning) as typeof original
    expect(merged.ajout).toBe('à moi')
    expect((merged.phases[0] as Record<string, unknown>).icone).toBe('x')
    expect((merged.taches[0] as Record<string, unknown>).etiquette).toBe('y')
    expect(merged.tournage).toEqual({ jours: [], reglage: 3 })
  })

  it('reprend la valeur par défaut d’un champ abîmé à la main', () => {
    const p = parsePlanning(
      {
        phases: [
          { id: 'a', nom: 'Écriture', couleur: 'rouge', ordre: 'premier' },
          { nom: 'sans id' },
          { id: 'a', nom: 'doublon' }
        ],
        taches: [
          {
            id: 't1',
            phase: 'a',
            titre: 3,
            echeance: '2027-02-30',
            debut: '2027-02-01',
            faite: 'oui',
            personnes: ['Tom', 4]
          },
          { phase: 'a' },
          { id: 't2', phase: 'disparue', titre: 'Orpheline' }
        ]
      },
      counter()
    )
    expect(p.phases).toHaveLength(1)
    expect(p.phases[0]).toMatchObject({ id: 'a', couleur: '#9e9e9e', ordre: 1 })
    expect(p.taches[0]).toMatchObject({
      titre: '',
      echeance: null,
      debut: '2027-02-01',
      faite: false,
      personnes: ['Tom']
    })
    // Une tâche dont la phase n’existe plus passe dans la première phase.
    expect(p.taches.map((t) => [t.id, t.phase])).toEqual([
      ['t1', 'a'],
      ['t2', 'a']
    ])
  })

  it('lit la version du format', () => {
    expect(planningFileVersion({ version: 3 })).toBe(3)
    expect(planningFileVersion({})).toBe(0)
  })
})

describe('dates', () => {
  it('refuse une date qui n’existe pas', () => {
    expect(isIsoDate('2027-02-28')).toBe(true)
    expect(isIsoDate('2028-02-29')).toBe(true)
    expect(isIsoDate('2027-02-29')).toBe(false)
    expect(isIsoDate('27-02-01')).toBe(false)
    expect(isIsoDate(null)).toBe(false)
  })
})

describe('modification des phases', () => {
  const ids = counter()
  const base = defaultPlanning(ids)

  it('ajoute une phase à la fin ; refuse un nom vide ou déjà pris (accents et casse ignorés)', () => {
    const planning = must(addPhase(base, '  Festivals ', '#123456', ids))
    expect(planning.phases.at(-1)).toMatchObject({ nom: 'Festivals', ordre: 6, couleur: '#123456' })
    expect(addPhase(base, '', undefined, ids)).toEqual({ ok: false, problem: 'invalid' })
    expect(addPhase(base, 'ecriture', undefined, ids)).toMatchObject({ ok: true })
    expect(addPhase(base, 'écriture', undefined, ids)).toEqual({
      ok: false,
      problem: 'duplicate-name'
    })
  })

  it('renomme, sans refuser le nom qu’elle porte déjà', () => {
    const id = base.phases[0].id
    expect(must(renamePhase(base, id, 'Scénario')).phases[0].nom).toBe('Scénario')
    expect(must(renamePhase(base, id, 'Écriture')).phases[0].nom).toBe('Écriture')
    expect(renamePhase(base, id, 'Tournage')).toEqual({ ok: false, problem: 'duplicate-name' })
    expect(renamePhase(base, 'inconnue', 'X')).toEqual({ ok: false, problem: 'not-found' })
  })

  it('déplace une phase et renumérote sans trou', () => {
    const last = base.phases[4].id
    const planning = must(movePhase(base, last, 1))
    expect(planning.phases.map((p) => [p.nom, p.ordre]).slice(0, 2)).toEqual([
      ['Diffusion', 1],
      ['Écriture', 2]
    ])
    expect(must(movePhase(base, base.phases[0].id, 99)).phases.at(-1)?.nom).toBe('Écriture')
  })

  it('supprime la phase avec ses tâches ; le nombre de tâches sert à la confirmation', () => {
    const phase = base.phases[1].id
    let planning = must(addTask(base, phase, { titre: 'A' }, ids))
    planning = must(addTask(planning, base.phases[0].id, { titre: 'B' }, ids))
    expect(phaseTaskCount(planning, phase)).toBe(1)
    const after = must(removePhase(planning, phase))
    expect(after.phases.map((p) => p.ordre)).toEqual([1, 2, 3, 4])
    expect(after.taches.map((t) => t.titre)).toEqual(['B'])
    expect(removePhase(planning, 'inconnue')).toEqual({ ok: false, problem: 'not-found' })
  })

  it('ne modifie jamais l’original', () => {
    const copy = structuredClone(base)
    must(removePhase(base, base.phases[0].id))
    must(renamePhase(base, base.phases[0].id, 'Autre'))
    expect(base).toEqual(copy)
  })
})

describe('modification des tâches', () => {
  const ids = counter()
  const base = defaultPlanning(ids)
  const [ecriture, preprod] = base.phases

  it('crée une tâche avec un identifiant interne et des valeurs neutres', () => {
    const result = addTask(base, ecriture.id, { titre: 'Remettre le scénario' }, ids)
    if (!result.ok) throw new Error()
    expect(result.planning.taches[0]).toEqual({
      id: result.createdId,
      phase: ecriture.id,
      titre: 'Remettre le scénario',
      debut: null,
      echeance: null,
      faite: false,
      personnes: [],
      validee: false,
      note: ''
    })
  })

  it('refuse une date impossible ou une phase inconnue', () => {
    expect(addTask(base, ecriture.id, { echeance: '2027-13-01' }, ids)).toEqual({
      ok: false,
      problem: 'invalid'
    })
    expect(addTask(base, 'inconnue', {}, ids)).toEqual({ ok: false, problem: 'not-found' })
  })

  it('modifie, déplace entre phases, supprime', () => {
    const created = addTask(base, ecriture.id, { titre: 'A' }, ids)
    if (!created.ok) throw new Error()
    const id = created.createdId!
    let planning = must(updateTask(created.planning, id, { faite: true, phase: preprod.id }))
    expect(planning.taches[0]).toMatchObject({ faite: true, phase: preprod.id, titre: 'A' })
    expect(updateTask(planning, id, { phase: 'inconnue' })).toEqual({
      ok: false,
      problem: 'not-found'
    })
    expect(updateTask(planning, id, { echeance: 'demain' })).toEqual({
      ok: false,
      problem: 'invalid'
    })
    planning = must(removeTask(planning, id))
    expect(planning.taches).toEqual([])
  })
})

describe('états calculés', () => {
  const ids = counter()
  let planning = defaultPlanning(ids)
  const phase = planning.phases[0].id
  for (const fields of [
    { titre: 'passée non faite', echeance: '2027-01-10' },
    { titre: 'passée faite', echeance: '2027-01-10', faite: true },
    { titre: 'aujourd’hui', echeance: '2027-01-15' },
    { titre: 'future', echeance: '2027-02-01' },
    { titre: 'sans échéance' }
  ])
    planning = must(addTask(planning, phase, fields, ids))
  const TODAY = '2027-01-15'

  it('à faire, en retard, faite (le jour de l’échéance n’est pas encore en retard)', () => {
    expect(planning.taches.map((t) => taskState(t, TODAY))).toEqual([
      'en-retard',
      'faite',
      'a-faire',
      'a-faire',
      'a-faire'
    ])
  })

  it('une tâche en retard change d’état avec la date du jour', () => {
    expect(taskState(planning.taches[3], '2027-02-02')).toBe('en-retard')
    expect(taskState(planning.taches[3], '2027-01-31')).toBe('a-faire')
  })

  it('avancement par phase', () => {
    expect(phaseProgress(planning, phase, TODAY)).toEqual({
      total: 5,
      done: 1,
      late: 1,
      ratio: 0.2
    })
    expect(phaseProgress(planning, planning.phases[1].id, TODAY)).toEqual({
      total: 0,
      done: 0,
      late: 0,
      ratio: 0
    })
  })

  it('tri par échéance, sans échéance à la fin', () => {
    expect(sortTasks(planning.taches).map((t) => t.titre)).toEqual([
      'passée faite',
      'passée non faite',
      'aujourd’hui',
      'future',
      'sans échéance'
    ])
  })
})

describe('équipe (générique)', () => {
  const template = {
    blocs: [
      {
        id: 'distribution',
        titre: 'Distribution',
        rubriques: [{ id: 'distribution.acteurs', intitule: 'Distribution' }]
      },
      {
        id: 'image',
        titre: 'Image',
        rubriques: [
          { id: 'image.chef-op', intitule: 'Chef opérateur' },
          { id: 'image.cadre', intitule: 'Cadre' }
        ]
      },
      {
        id: 'postproduction',
        titre: 'Postproduction',
        rubriques: [{ id: 'postproduction.montage', intitule: 'Montage' }]
      }
    ]
  } as unknown as CreditsTemplate

  const credits: CreditsData = {
    ...defaultCreditsData(),
    rubriques: [
      { id: 'distribution.acteurs', intitule: null, noms: ['Hugo Martin'] },
      { id: 'postproduction.montage', intitule: null, noms: ['Léa Dupont', ' '] },
      { id: 'image.chef-op', intitule: null, noms: ['Léa Dupont', 'Tom Lambert'] },
      { id: 'image.cadre', intitule: 'Cadreur', noms: ['léa dupont'] },
      { id: 'perso-1', bloc: 'image', intitule: 'Drone', noms: ['Sam Petit'] },
      { id: 'perso-2', bloc: 'distribution', intitule: 'Cascades', noms: ['Noé Durand'] }
    ]
  }

  it('noms uniques et leurs rubriques, sans la distribution, dans l’ordre du modèle', () => {
    expect(crewMembers(credits, template)).toEqual([
      { nom: 'Léa Dupont', rubriques: ['Chef opérateur', 'Cadreur', 'Montage'] },
      { nom: 'Tom Lambert', rubriques: ['Chef opérateur'] },
      { nom: 'Sam Petit', rubriques: ['Drone'] }
    ])
  })

  it('un générique vide donne une équipe vide', () => {
    expect(crewMembers(defaultCreditsData(), template)).toEqual([])
  })

  it('un nom retiré du générique reste sur la tâche, signalé', () => {
    const crew = crewMembers(credits, template)
    expect(taskPeople(['LÉA DUPONT', 'Hugo Martin', 'Ancien'], crew)).toEqual([
      { nom: 'LÉA DUPONT', auGenerique: true },
      { nom: 'Hugo Martin', auGenerique: false },
      { nom: 'Ancien', auGenerique: false }
    ])
    const after = {
      ...credits,
      rubriques: credits.rubriques.filter((r) => !r.id.startsWith('image'))
    }
    expect(taskPeople(['Tom Lambert'], crewMembers(after, template))).toEqual([
      { nom: 'Tom Lambert', auGenerique: false }
    ])
  })
})

describe('début et échéance (règle du Gantt)', () => {
  function withTask(fields: { debut: string | null; echeance: string | null }): {
    planning: Planning
    id: string
  } {
    const base = defaultPlanning(counter())
    const created = addTask(base, base.phases[0].id, fields, counter())
    if (!created.ok || !created.createdId) throw new Error('création')
    return { planning: created.planning, id: created.createdId }
  }

  it('un début après l’échéance recopie le début sur l’échéance', () => {
    const { planning, id } = withTask({ debut: '2026-10-01', echeance: '2026-10-10' })
    const result = updateTask(planning, id, { debut: '2026-10-15' })
    expect(result.ok && result.adjusted).toBe('echeance')
    const task = must(result).taches[0]
    expect([task.debut, task.echeance]).toEqual(['2026-10-15', '2026-10-15'])
  })

  it('une échéance avant le début recopie l’échéance sur le début', () => {
    const { planning, id } = withTask({ debut: '2026-10-05', echeance: '2026-10-10' })
    const result = updateTask(planning, id, { echeance: '2026-10-01' })
    expect(result.ok && result.adjusted).toBe('debut')
    const task = must(result).taches[0]
    expect([task.debut, task.echeance]).toEqual(['2026-10-01', '2026-10-01'])
  })

  it('rien n’est changé quand les dates sont cohérentes ou incomplètes', () => {
    const { planning, id } = withTask({ debut: null, echeance: '2026-10-10' })
    const a = updateTask(planning, id, { debut: '2026-10-10' })
    expect(a.ok && a.adjusted).toBeUndefined()
    const b = updateTask(planning, id, { echeance: null, debut: '2027-01-01' })
    expect(b.ok && b.adjusted).toBeUndefined()
  })
})

describe('tâche validée', () => {
  function one(fields: Record<string, unknown> = {}): { planning: Planning; id: string } {
    const base = defaultPlanning(counter())
    const created = addTask(
      base,
      base.phases[0].id,
      { echeance: '2026-01-01', ...fields },
      counter()
    )
    if (!created.ok || !created.createdId) throw new Error('création')
    return { planning: created.planning, id: created.createdId }
  }

  it('valider coche aussi « faite »', () => {
    const { planning, id } = one()
    const task = must(updateTask(planning, id, { validee: true })).taches[0]
    expect([task.validee, task.faite]).toEqual([true, true])
  })

  it('décocher « faite » retire la validation, en une seule modification', () => {
    const { planning, id } = one({ validee: true })
    expect(planning.taches[0].faite).toBe(true)
    const task = must(updateTask(planning, id, { faite: false })).taches[0]
    expect([task.validee, task.faite]).toEqual([false, false])
  })

  it('une tâche validée n’est jamais en retard et compte comme faite', () => {
    const { planning } = one({ validee: true })
    expect(taskState(planning.taches[0], '2030-01-01')).toBe('faite')
    expect(phaseProgress(planning, planning.phases[0].id, '2030-01-01').done).toBe(1)
  })

  it('un fichier qui dit validée sans faite est normalisé à la lecture', () => {
    const { planning } = one()
    const raw = JSON.parse(serializePlanning({}, planning))
    raw.taches[0].validee = true
    raw.taches[0].faite = false
    const parsed = parsePlanning(raw, counter())
    expect([parsed.taches[0].validee, parsed.taches[0].faite]).toEqual([true, true])
  })

  it('un ancien champ « remise » est ignoré', () => {
    const { planning } = one()
    const raw = JSON.parse(serializePlanning({}, planning))
    raw.taches[0].remise = true
    expect(parsePlanning(raw, counter()).taches[0].validee).toBe(false)
  })
})
