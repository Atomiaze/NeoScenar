import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { counterIds } from '../../shared/decoupage/testFixtures'
import { defaultPlanning } from '../../shared/planning/planningData'
import { addTask, type PlanningResult } from '../../shared/planning/planningEdit'
import { planningCalendar, planningPdfData } from '../../shared/planning/planningExport'
import type { PlanningExportRequest } from '../../shared/planningExport'
import { createProject } from '../project/createProject'
import type { LoadedProject } from '../project/readProject'
import {
  fixedSources,
  loadTestTemplate,
  makeTempDir,
  removeDir,
  request
} from '../project/testHelpers'
import { parsePlanningExportRequest, PlanningExporter } from './planningExporter'

const FONTS = join(import.meta.dirname, '..', '..', '..', 'resources', 'polices', 'inter')
const NOW = new Date(2026, 10, 20, 15, 30)

let location: string
let loaded: LoadedProject
let flushed = 0

function exporter(): PlanningExporter {
  return new PlanningExporter({
    current: () => loaded,
    flush: async () => {
      flushed++
    },
    fontsDir: FONTS,
    now: () => NOW
  })
}

function planningWithTask(): ReturnType<typeof defaultPlanning> {
  const base = defaultPlanning(counterIds('p'))
  const result: PlanningResult = addTask(
    base,
    base.phases[0].id,
    { titre: 'Écrire le scénario', echeance: '2026-12-01', personnes: ['Léa'] },
    counterIds('t')
  )
  if (!result.ok) throw new Error(result.problem)
  return result.planning
}

function calendarRequest(person: string | null): PlanningExportRequest {
  const planning = planningWithTask()
  const content = planningCalendar(planning, [], {
    title: 'Mon film',
    person,
    stamp: NOW,
    modifiedAt: NOW
  })
  return { kind: 'calendrier', person, data: { name: content.name, events: content.events } }
}

function planningRequest(person: string | null): PlanningExportRequest {
  return {
    kind: 'planning',
    person,
    data: planningPdfData(planningWithTask(), [], { today: '2026-11-20', person })
  }
}

beforeEach(async () => {
  flushed = 0
  location = await makeTempDir()
  loaded = await createProject(request(location), await loadTestTemplate(), fixedSources())
})

afterEach(() => removeDir(location))

describe('demande reçue de l’interface', () => {
  it('accepte une demande valide', () => {
    expect(parsePlanningExportRequest(calendarRequest(null)).kind).toBe('calendrier')
  })

  it.each([
    null,
    {},
    { kind: 'planning', person: null },
    { kind: 'autre', person: null, data: {} },
    { kind: 'planning', person: 3, data: { phases: [], range: {} } },
    { kind: 'tournage', person: null, data: {} },
    { kind: 'calendrier', person: null, data: { events: [] } }
  ])('refuse %j', (raw) => {
    expect(() => parsePlanningExportRequest(raw)).toThrow()
  })
})

describe('emplacement et nom des fichiers', () => {
  it('écrit dans neoscenar/exports/ sans dossier 01_Production', async () => {
    const saved = await exporter().save(calendarRequest(null), null)
    expect(saved.relativePath).toBe('neoscenar/exports/Mon_Film_d_ete_planning.ics')
  })

  it('écrit dans 01_Production/Planning/ quand 01_Production existe', async () => {
    const other = await makeTempDir()
    try {
      loaded = await createProject(
        request(other, { folders: ['01_Production'] }),
        await loadTestTemplate(),
        fixedSources()
      )
      const saved = await exporter().save(calendarRequest(null), null)
      expect(saved.relativePath).toBe('01_Production/Planning/Mon_Film_d_ete_planning.ics')
    } finally {
      await removeDir(other)
    }
  })

  it('ajoute le prénom au nom du PDF et du calendrier, sans accent ni espace', async () => {
    const pdf = await exporter().save(planningRequest('Léa'), null)
    expect(pdf.relativePath).toBe('neoscenar/exports/Mon_Film_d_ete_planning_Lea_2026-11-20.pdf')
    const ics = await exporter().save(calendarRequest('Léa'), null)
    expect(ics.relativePath).toBe('neoscenar/exports/Mon_Film_d_ete_planning_Lea.ics')
  })

  it('n’ajoute pas de nom sans filtre', async () => {
    const pdf = await exporter().save(planningRequest(null), null)
    expect(pdf.relativePath).toBe('neoscenar/exports/Mon_Film_d_ete_planning_2026-11-20.pdf')
  })
})

describe('enregistrement', () => {
  it('écrit un vrai PDF et mémorise les options dans projet.json', async () => {
    const saved = await exporter().save(planningRequest('Léa'), null)
    const bytes = await readFile(saved.path)
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-')
    const project = JSON.parse(await readFile(join(loaded.dataDir, 'projet.json'), 'utf8'))
    expect(project.exportPlanning).toEqual({ kind: 'planning', person: 'Léa' })
    expect(exporter().info().options).toEqual({ kind: 'planning', person: 'Léa' })
  })

  it('remplace un fichier du même nom sans laisser de fichier temporaire', async () => {
    const first = await exporter().save(calendarRequest(null), null)
    await writeFile(first.path, 'ancien')
    await exporter().save(calendarRequest(null), null)
    expect((await readFile(first.path, 'utf8')).startsWith('BEGIN:VCALENDAR')).toBe(true)
    expect(await readdir(join(first.path, '..'))).toEqual(['Mon_Film_d_ete_planning.ics'])
  })

  it('écrit un calendrier en CRLF, avec la date de planning.json et celle de l’export', async () => {
    const saved = await exporter().save(calendarRequest(null), null)
    const text = await readFile(saved.path, 'utf8')
    expect(text).toContain('\r\nSUMMARY:Écrire le scénario\r\n')
    expect(text).toContain('DTSTAMP:20261120T')
    expect(flushed).toBeGreaterThan(0)
  })

  it('refuse un calendrier vide et un mauvais suffixe', async () => {
    const none: PlanningExportRequest = {
      kind: 'calendrier',
      person: null,
      data: { name: 'x', events: [] }
    }
    await expect(exporter().save(none, null)).rejects.toThrow()
    await expect(exporter().save(planningRequest(null), join(location, 'a.ics'))).rejects.toThrow()
  })
})

describe('aperçu', () => {
  it('compte les pages d’un PDF et les événements du calendrier', async () => {
    const pdf = await exporter().preview(planningRequest(null))
    expect(pdf.bytes).not.toBeNull()
    expect(pdf.pageCount).toBeGreaterThan(0)
    const ics = await exporter().preview(calendarRequest(null))
    expect(ics.bytes).toBeNull()
    expect(ics.eventCount).toBe(1)
    expect(ics.fileName).toBe('Mon_Film_d_ete_planning.ics')
  })

  it('donne le même PDF à chaque fois (aucune donnée du thème n’entre dans l’export)', async () => {
    // Heure figée : pdf-lib inscrit la date de création, qui changerait entre deux secondes.
    vi.useFakeTimers({ now: new Date('2026-11-20T10:00:00Z'), toFake: ['Date'] })
    const first = await exporter().preview(planningRequest('Léa'))
    const second = await exporter().preview(planningRequest('Léa'))
    vi.useRealTimers()
    expect(Buffer.from(first.bytes!).equals(Buffer.from(second.bytes!))).toBe(true)
  })

  it('n’écrit rien', async () => {
    await exporter().preview(planningRequest(null))
    const folder = join(loaded.dataDir, 'exports')
    expect(await readdir(folder).catch(() => [])).toEqual([])
  })
})
