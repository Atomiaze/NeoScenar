import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { makeTempDir, removeDir } from '../project/testHelpers'
import { planningExportDir, planningFileName } from './planningFiles'

const DATE = new Date(2026, 10, 20, 15, 30)

describe('planningFileName', () => {
  it('nomme le PDF du planning et le calendrier', () => {
    expect(planningFileName('planning', 'Mon Film', null, DATE)).toBe(
      'Mon_Film_planning_2026-11-20.pdf'
    )
    expect(planningFileName('calendrier', 'Mon Film', null, DATE)).toBe('Mon_Film_planning.ics')
    expect(planningFileName('tournage', 'Mon Film', null, DATE)).toBe(
      'Mon_Film_plan_de_tournage_2026-11-20.pdf'
    )
  })

  it('ajoute la personne, sans accent ni espace', () => {
    expect(planningFileName('planning', 'Mon Film', 'Léa', DATE)).toBe(
      'Mon_Film_planning_Lea_2026-11-20.pdf'
    )
    expect(planningFileName('calendrier', 'Mon Film', 'Léa', DATE)).toBe(
      'Mon_Film_planning_Lea.ics'
    )
    expect(planningFileName('planning', 'Film', 'Jean Élie / D’Arc', DATE)).toBe(
      'Film_planning_Jean_Elie_D_Arc_2026-11-20.pdf'
    )
  })

  it('ignore la personne pour le plan de tournage', () => {
    expect(planningFileName('tournage', 'Mon Film', 'Léa', DATE)).toBe(
      'Mon_Film_plan_de_tournage_2026-11-20.pdf'
    )
  })

  it('n’ajoute rien si le nom ne garde aucune lettre', () => {
    expect(planningFileName('planning', 'Film', '???', DATE)).toBe('Film_planning_2026-11-20.pdf')
    expect(planningFileName('calendrier', 'Film', '  ', DATE)).toBe('Film_planning.ics')
  })
})

describe('planningExportDir', () => {
  let root: string
  beforeEach(async () => {
    root = await makeTempDir()
  })
  afterEach(() => removeDir(root))

  it('utilise neoscenar/exports/ sans dossier 01_Production', async () => {
    expect(await planningExportDir(root, join(root, 'neoscenar'))).toBe(
      join(root, 'neoscenar', 'exports')
    )
  })

  it('utilise 01_Production/Planning/ quand 01_Production existe', async () => {
    await mkdir(join(root, '01_Production'))
    expect(await planningExportDir(root, join(root, 'neoscenar'))).toBe(
      join(root, '01_Production', 'Planning')
    )
  })
})
