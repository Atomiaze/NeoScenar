import { describe, expect, it } from 'vitest'
import { dropChangesNothing, dropIndex, nextShootingDate, shootingRowAfter } from './shootingLayout'

describe('rangée « Jours de tournage »', () => {
  it('se place sous la phase « Tournage », sans casse ni accents', () => {
    expect(shootingRowAfter([{ nom: 'Écriture' }, { nom: 'Tournage' }, { nom: 'Diffusion' }])).toBe(
      1
    )
    expect(shootingRowAfter([{ nom: 'Préproduction' }, { nom: '  tôurnage ' }])).toBe(1)
  })

  it('va en bas si aucune phase ne s’appelle « Tournage »', () => {
    expect(shootingRowAfter([{ nom: 'Écriture' }, { nom: 'Tournage 2' }])).toBe(-1)
    expect(shootingRowAfter([])).toBe(-1)
  })
})

describe('date d’un nouveau jour', () => {
  it('aujourd’hui s’il n’y a aucun jour daté', () => {
    expect(nextShootingDate([], '2026-11-20')).toBe('2026-11-20')
    expect(nextShootingDate([{ date: null }], '2026-11-20')).toBe('2026-11-20')
  })

  it('le lendemain du dernier jour daté (même avant aujourd’hui, fin de mois comprise)', () => {
    expect(
      nextShootingDate(
        [{ date: '2026-12-31' }, { date: null }, { date: '2026-12-02' }],
        '2027-03-01'
      )
    ).toBe('2027-01-01')
    expect(nextShootingDate([{ date: '2026-10-01' }], '2026-11-20')).toBe('2026-10-02')
  })
})

describe('place d’un dépôt', () => {
  const scenes = ['a', 'b', 'c', 'd']

  it('vers un autre jour : la place visée', () => {
    expect(dropIndex(scenes, 'x', 2, false)).toBe(2)
    expect(dropIndex(scenes, 'x', 99, false)).toBe(4)
    expect(dropIndex(scenes, 'x', -3, false)).toBe(0)
  })

  it('dans le même jour : compte la place que la scène libère', () => {
    // « a » posée entre « c » et « d » : une fois retirée, elle arrive au rang 2.
    expect(dropIndex(scenes, 'a', 3, true)).toBe(2)
    expect(dropIndex(scenes, 'd', 0, true)).toBe(0)
    expect(dropIndex(scenes, 'b', 4, true)).toBe(3)
  })

  it('reconnaît un dépôt sans effet', () => {
    expect(dropChangesNothing(scenes, 'b', 1)).toBe(true)
    expect(dropChangesNothing(scenes, 'b', 2)).toBe(true)
    expect(dropChangesNothing(scenes, 'b', 3)).toBe(false)
    expect(dropChangesNothing(scenes, 'x', 1)).toBe(false)
  })
})
