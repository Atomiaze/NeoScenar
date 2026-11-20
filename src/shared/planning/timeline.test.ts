import { describe, expect, it } from 'vitest'
import {
  MAX_PIXELS_PER_DAY,
  dayLabels,
  monthSegments,
  yearSegments,
  MIN_PIXELS_PER_DAY,
  PIXELS_PER_DAY,
  clampPixelsPerDay,
  dayUnderPointer,
  scrollLeftForAnchor,
  wheelZoomFactor,
  applyDrag,
  assignLanes,
  datesFromRowDrag,
  dayNumber,
  dayToX,
  initialScrollLeft,
  isoFromDay,
  snapDelta,
  taskMark,
  timelineRange,
  timelineTicks,
  xToDay
} from './timeline'

describe('jours', () => {
  it('convertit dans les deux sens, y compris au changement d’heure et en année bissextile', () => {
    for (const iso of ['2026-03-29', '2026-10-25', '2028-02-29', '2026-12-31']) {
      expect(isoFromDay(dayNumber(iso))).toBe(iso)
    }
    expect(dayNumber('2026-03-30') - dayNumber('2026-03-29')).toBe(1)
    expect(dayNumber('2028-03-01') - dayNumber('2028-02-28')).toBe(2)
  })

  it('aimante au jour', () => {
    const range = { start: 100, end: 200 }
    expect(xToDay(0, range, 10)).toBe(100)
    expect(xToDay(19.9, range, 10)).toBe(101)
    expect(dayToX(103, range, 10)).toBe(30)
    expect(snapDelta(14, 10)).toBe(1)
    expect(snapDelta(-4, 10)).toBe(0)
    expect(Object.is(snapDelta(-4, 10), 0)).toBe(true)
  })
})

describe('étendue et graduation', () => {
  it('année scolaire : du 1er septembre au 30 juin', () => {
    const range = timelineRange('year', ['2026-11-10', '2027-03-01'], '2026-11-20', 1000)
    expect(isoFromDay(range.start)).toBe('2026-09-01')
    expect(isoFromDay(range.end)).toBe('2027-06-30')
  })

  it('année scolaire : une date de juillet ou une autre année est incluse', () => {
    const july = timelineRange('year', ['2027-07-15'], '2026-11-20', 1000)
    expect(isoFromDay(july.end)).toBe('2027-07-15')
    const two = timelineRange('year', ['2028-01-10'], '2026-11-20', 1000)
    expect([isoFromDay(two.start), isoFromDay(two.end)]).toEqual(['2026-09-01', '2028-06-30'])
  })

  it('une date de septembre à décembre ou de janvier à juillet tombe dans la bonne année', () => {
    const range = timelineRange('year', [], '2027-02-01', 1000)
    expect(isoFromDay(range.start)).toBe('2026-09-01')
  })

  it('« Aujourd’hui » se place au quart de la largeur visible', () => {
    const width = 1000
    const range = timelineRange('month', [], '2026-11-20', width, PIXELS_PER_DAY.month)
    const left = initialScrollLeft(range, PIXELS_PER_DAY.month, '2026-11-20', width)
    const x =
      dayToX(dayNumber('2026-11-20'), range, PIXELS_PER_DAY.month) + PIXELS_PER_DAY.month / 2
    expect(Math.abs(x - left - width / 4)).toBeLessThanOrEqual(1)
    expect(left).toBeGreaterThan(0)
  })

  it('l’étendue couvre toutes les dates', () => {
    const range = timelineRange('month', ['2026-01-05', '2027-09-09'], '2026-11-20', 800)
    expect(range.start).toBeLessThanOrEqual(dayNumber('2026-01-05'))
    expect(range.end).toBeGreaterThanOrEqual(dayNumber('2027-09-09'))
  })

  it('graduation : un trait par mois et par lundi', () => {
    const range = { start: dayNumber('2026-11-23'), end: dayNumber('2027-01-10') }
    const { major, minor } = timelineTicks(range, PIXELS_PER_DAY.month)
    expect(major.map((t) => t.label)).toEqual(['déc.', 'janv. 2027'])
    expect(minor.map((t) => isoFromDay(t.day))[0]).toBe('2026-11-23')
    expect(minor).toHaveLength(7)
  })

  it('graduation au zoom semaine : lundis étiquetés, jours en graduation fine', () => {
    const range = { start: dayNumber('2026-11-23'), end: dayNumber('2026-11-29') }
    const { major, minor } = timelineTicks(range, PIXELS_PER_DAY.week)
    expect(major.map((t) => t.label)).toEqual(['23 nov.'])
    expect(minor).toHaveLength(6)
  })
})

describe('marques des tâches', () => {
  it('barre, losange, début seul, sans date', () => {
    expect(taskMark({ debut: '2026-11-01', echeance: '2026-11-05' })).toEqual({
      kind: 'bar',
      start: dayNumber('2026-11-01'),
      end: dayNumber('2026-11-05')
    })
    expect(taskMark({ debut: null, echeance: '2026-11-05' })?.kind).toBe('diamond')
    expect(taskMark({ debut: '2026-11-05', echeance: null })).toMatchObject({
      kind: 'bar',
      start: dayNumber('2026-11-05'),
      end: dayNumber('2026-11-05')
    })
    expect(taskMark({ debut: null, echeance: null })).toBeNull()
  })

  it('répartit les marques qui se recouvrent sur des rangées', () => {
    const { lanes, count } = assignLanes([
      { id: 'a', start: 0, end: 5 },
      { id: 'b', start: 3, end: 8 },
      { id: 'c', start: 6, end: 9 },
      { id: 'd', start: 10, end: 12 }
    ])
    expect(count).toBe(2)
    expect(lanes.get('a')).toBe(0)
    expect(lanes.get('b')).toBe(1)
    expect(lanes.get('c')).toBe(0)
    expect(lanes.get('d')).toBe(0)
    expect(assignLanes([]).count).toBe(1)
  })
})

describe('gestes', () => {
  const bar = { debut: '2026-11-10', echeance: '2026-11-20' }
  const diamond = { debut: null, echeance: '2026-11-20' }

  it('glisser une barre déplace le début et l’échéance ensemble', () => {
    expect(applyDrag(bar, 'move', 3)).toEqual({ debut: '2026-11-13', echeance: '2026-11-23' })
    expect(applyDrag(bar, 'move', -12)).toEqual({ debut: '2026-10-29', echeance: '2026-11-08' })
    expect(applyDrag(bar, 'move', 0)).toBeNull()
  })

  it('le bord gauche change le début, le bord droit l’échéance', () => {
    expect(applyDrag(bar, 'resize-start', -4)).toEqual({
      debut: '2026-11-06',
      echeance: '2026-11-20'
    })
    expect(applyDrag(bar, 'resize-end', 5)).toEqual({ debut: '2026-11-10', echeance: '2026-11-25' })
  })

  it('un début ne dépasse pas l’échéance : le glisser s’arrête à la limite', () => {
    expect(applyDrag(bar, 'resize-start', 99)).toEqual({
      debut: '2026-11-20',
      echeance: '2026-11-20'
    })
    expect(applyDrag(bar, 'resize-end', -99)).toEqual({
      debut: '2026-11-10',
      echeance: '2026-11-10'
    })
    expect(applyDrag({ debut: '2026-11-20', echeance: '2026-11-20' }, 'resize-start', 2)).toBeNull()
  })

  it('un losange se déplace ; sa poignée gauche ajoute un début', () => {
    expect(applyDrag(diamond, 'move', 7)).toEqual({ debut: null, echeance: '2026-11-27' })
    expect(applyDrag(diamond, 'diamond-to-bar', -3)).toEqual({
      debut: '2026-11-17',
      echeance: '2026-11-20'
    })
    // Vers la droite, la poignée ne fait rien : le début ne peut pas dépasser l'échéance.
    expect(applyDrag(diamond, 'diamond-to-bar', 3)).toBeNull()
    expect(applyDrag(diamond, 'diamond-to-bar', 0)).toBeNull()
  })

  it('une barre d’un jour (début seul) se déplace et peut gagner une échéance', () => {
    const only = { debut: '2026-11-10', echeance: null }
    expect(applyDrag(only, 'move', 2)).toEqual({ debut: '2026-11-12', echeance: null })
    expect(applyDrag(only, 'resize-end', 4)).toEqual({
      debut: '2026-11-10',
      echeance: '2026-11-14'
    })
    expect(applyDrag(only, 'resize-end', -4)).toBeNull()
  })

  it('créer en glissant dans une rangée vide, dans les deux sens', () => {
    const a = dayNumber('2026-11-10')
    const b = dayNumber('2026-11-14')
    expect(datesFromRowDrag(a, b)).toEqual({ debut: '2026-11-10', echeance: '2026-11-14' })
    expect(datesFromRowDrag(b, a)).toEqual({ debut: '2026-11-10', echeance: '2026-11-14' })
    expect(datesFromRowDrag(a, a)).toEqual({ debut: null, echeance: '2026-11-10' })
  })
})

describe('année civile et zoom libre', () => {
  it('année civile : du 1er janvier au 31 décembre', () => {
    const range = timelineRange('civil', ['2026-11-10'], '2026-11-20', 1000)
    expect([isoFromDay(range.start), isoFromDay(range.end)]).toEqual(['2026-01-01', '2026-12-31'])
    const two = timelineRange('civil', ['2027-02-10'], '2026-11-20', 1000)
    expect([isoFromDay(two.start), isoFromDay(two.end)]).toEqual(['2026-01-01', '2027-12-31'])
  })

  it('le zoom libre reste entre quelques jours et environ deux ans', () => {
    expect(clampPixelsPerDay(0.01)).toBe(MIN_PIXELS_PER_DAY)
    expect(clampPixelsPerDay(9999)).toBe(MAX_PIXELS_PER_DAY)
    expect(clampPixelsPerDay(14)).toBe(14)
    // ≈ 2 ans sur 1100 px, et de 5 à 6 jours au plus près.
    expect(1100 / MIN_PIXELS_PER_DAY).toBeGreaterThanOrEqual(700)
    expect(1100 / MAX_PIXELS_PER_DAY).toBeLessThan(7)
  })

  it('la molette éloigne ou rapproche, le pincement plus vite', () => {
    expect(wheelZoomFactor(-100, false)).toBeGreaterThan(1)
    expect(wheelZoomFactor(100, false)).toBeLessThan(1)
    expect(wheelZoomFactor(0, false)).toBe(1)
    expect(wheelZoomFactor(-5, true)).toBeGreaterThan(wheelZoomFactor(-5, false))
    expect(wheelZoomFactor(-100000, false)).toBe(wheelZoomFactor(-300, false))
  })

  it('le jour sous le pointeur ne bouge pas quand on zoome', () => {
    const range = { start: 1000, end: 1500 }
    const labelWidth = 150
    const pointerX = 400
    const anchor = dayUnderPointer(320, pointerX, range, 14, labelWidth)
    const zoomed = clampPixelsPerDay(14 * 2.5)
    const left = scrollLeftForAnchor(anchor, pointerX, range, zoomed, labelWidth)
    expect(dayUnderPointer(left, pointerX, range, zoomed, labelWidth)).toBeCloseTo(anchor, 1)
  })

  it('graduation : les jours à fort zoom, les semaines seulement quand elles sont lisibles', () => {
    const range = { start: dayNumber('2026-01-05'), end: dayNumber('2026-12-31') }
    expect(timelineTicks(range, 1.6).minor).toHaveLength(0)
    expect(timelineTicks(range, 2.8).minor.length).toBeGreaterThan(40)
    expect(timelineTicks(range, 100).major.length).toBeGreaterThan(40)
  })
})

describe('en-tête à trois lignes', () => {
  const range = { start: dayNumber('2026-11-23'), end: dayNumber('2027-02-10') }

  it('une ligne pour les années, coupée aux bornes de l’étendue', () => {
    expect(
      yearSegments(range).map((seg) => [seg.label, isoFromDay(seg.start), isoFromDay(seg.end)])
    ).toEqual([
      ['2026', '2026-11-23', '2026-12-31'],
      ['2027', '2027-01-01', '2027-02-10']
    ])
  })

  it('une ligne pour les mois, sans l’année', () => {
    const months = monthSegments(range)
    expect(months.map((seg) => seg.label)).toEqual(['nov.', 'déc.', 'janv.', 'févr.'])
    expect(isoFromDay(months[0].start)).toBe('2026-11-23')
    expect(isoFromDay(months[0].end)).toBe('2026-11-30')
    expect(isoFromDay(months[3].end)).toBe('2027-02-10')
    // Les segments se suivent sans trou ni recouvrement.
    months.slice(1).forEach((seg, i) => expect(seg.start).toBe(months[i].end + 1))
  })

  it('une année bissextile et le passage d’une année à l’autre', () => {
    const feb = monthSegments({ start: dayNumber('2028-02-01'), end: dayNumber('2028-03-05') })
    expect(isoFromDay(feb[0].end)).toBe('2028-02-29')
  })

  it('les jours : tous, les lundis, ou rien, selon la largeur', () => {
    const week = { start: dayNumber('2026-11-23'), end: dayNumber('2026-11-29') }
    expect(dayLabels(week, 56).map((t) => t.label)).toEqual([
      'lun 23',
      'mar 24',
      'mer 25',
      'jeu 26',
      'ven 27',
      'sam 28',
      'dim 29'
    ])
    expect(dayLabels(week, 30).map((t) => t.label)).toEqual([
      '23',
      '24',
      '25',
      '26',
      '27',
      '28',
      '29'
    ])
    expect(dayLabels(week, 14).map((t) => t.label)).toEqual(['23'])
    expect(dayLabels(week, 3.4)).toEqual([])
  })
})
