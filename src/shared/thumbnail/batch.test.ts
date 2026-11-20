import { describe, expect, it } from 'vitest'
import { makeDecoupage } from '../decoupage/testFixtures'
import { naturalSort, planBatchImport, selectedShotsInOrder } from './batch'

describe('import de plusieurs images', () => {
  it('trie les noms de fichiers de façon naturelle', () => {
    expect(
      naturalSort(['/d/plan10.jpg', '/d/Plan2.jpg', '/d/plan1.png', 'C:\\scans\\plan3.jpg'])
    ).toEqual(['/d/plan1.png', '/d/Plan2.jpg', 'C:\\scans\\plan3.jpg', '/d/plan10.jpg'])
  })

  it('prend les plans sélectionnés dans l’ordre du film, quel que soit l’ordre des clics', () => {
    const decoupage = makeDecoupage({ '10': ['10', '20'], '20': ['10', '20'] })
    const shots = selectedShotsInOrder(decoupage, ['S20-P10', 'S10-P20', 'S20', 'S10-P10'])
    expect(shots.map((shot) => shot.id)).toEqual(['S10-P10', 'S10-P20', 'S20-P10'])
  })

  it('attribue les images aux plans dans l’ordre', () => {
    const decoupage = makeDecoupage({ '10': ['10', '20', '30', '40', '50'] })
    const shots = decoupage.scenes[0].shots
    const files = ['plan5.png', 'plan3.png', 'plan1.png', 'plan4.png', 'plan2.png']
    const plan = planBatchImport(files, shots)
    expect(plan.pairs).toEqual([
      { shotId: 'S10-P10', path: 'plan1.png' },
      { shotId: 'S10-P20', path: 'plan2.png' },
      { shotId: 'S10-P30', path: 'plan3.png' },
      { shotId: 'S10-P40', path: 'plan4.png' },
      { shotId: 'S10-P50', path: 'plan5.png' }
    ])
    expect(plan.ignored).toBe(0)
  })

  it('moins d’images que de plans : les derniers restent sans vignette', () => {
    const shots = makeDecoupage({ '10': ['10', '20', '30'] }).scenes[0].shots
    expect(planBatchImport(['a.png'], shots).pairs).toEqual([{ shotId: 'S10-P10', path: 'a.png' }])
  })

  it('plus d’images que de plans : les images en trop sont comptées et ignorées', () => {
    const shots = makeDecoupage({ '10': ['10', '20'] }).scenes[0].shots
    const plan = planBatchImport(['1.png', '2.png', '3.png', '4.png'], shots)
    expect(plan.pairs).toHaveLength(2)
    expect(plan.ignored).toBe(2)
  })

  it('compte les plans dont la vignette sera remplacée', () => {
    const decoupage = makeDecoupage({ '10': ['10', '20', '30'] })
    const shots = decoupage.scenes[0].shots
    shots[0].thumbnail = 'storyboard/vignettes/a.png'
    shots[2].thumbnail = 'storyboard/vignettes/c.png'
    expect(planBatchImport(['1.png', '2.png', '3.png'], shots).replacing).toBe(2)
    // Le 3e plan ne reçoit pas d'image : sa vignette n'est pas remplacée.
    expect(planBatchImport(['1.png', '2.png'], shots).replacing).toBe(1)
  })
})
