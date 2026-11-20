import { describe, expect, it } from 'vitest'
import { pdfFileName, safeTitle } from './pdfFileName'

describe('nom du fichier PDF', () => {
  it('suit le modèle « Titre_scenario_date.pdf »', () => {
    expect(pdfFileName('Le dernier bus', new Date(2026, 10, 5))).toBe(
      'Le_dernier_bus_scenario_2026-11-05.pdf'
    )
  })

  it('retire les accents et les caractères interdits', () => {
    expect(safeTitle('Mon Film d’été : « la suite » / 2')).toBe('Mon_Film_d_ete_la_suite_2')
    expect(safeTitle('A/B\\C*?')).toBe('A_B_C')
  })

  it('garde un nom quand le titre est vide', () => {
    expect(safeTitle('  ///  ')).toBe('Scenario')
  })
})
