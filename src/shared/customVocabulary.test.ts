import { describe, expect, it } from 'vitest'
import {
  addTerm,
  emptyCustomVocabulary,
  mergedTerms,
  parseCustomVocabulary,
  removeTerm,
  renameTerm
} from './customVocabulary'
import type { Vocabulary } from './vocabulary'

const course: Vocabulary = {
  formatVersion: 1,
  id: 'x',
  name: 'x',
  shotSizes: [{ label: 'Plan moyen', definition: '' }],
  cameraMovements: [{ label: 'Travelling', definition: '' }],
  cameraAngles: [{ label: 'Plongée', definition: '' }],
  sceneTimes: []
}

describe('entrées personnelles du vocabulaire', () => {
  it('ajoute une entrée avec sa définition', () => {
    const result = addTerm(
      emptyCustomVocabulary(),
      course,
      'cameraMovements',
      ' Plan drone ',
      ' Vue du ciel '
    )
    expect(result).toEqual({
      ok: true,
      value: {
        ...emptyCustomVocabulary(),
        cameraMovements: [{ label: 'Plan drone', definition: 'Vue du ciel' }]
      }
    })
  })

  it('refuse un libellé vide', () => {
    expect(addTerm(emptyCustomVocabulary(), course, 'shotSizes', '  ', '')).toEqual({
      ok: false,
      problem: 'empty'
    })
  })

  it('refuse un doublon du cours ou personnel, sans casse ni accents', () => {
    expect(addTerm(emptyCustomVocabulary(), course, 'cameraAngles', 'plongee', '')).toEqual({
      ok: false,
      problem: 'duplicate'
    })
    const first = addTerm(emptyCustomVocabulary(), course, 'shotSizes', 'Drone', '')
    if (!first.ok) throw new Error('attendu')
    expect(addTerm(first.value, course, 'shotSizes', 'DRONE', '').ok).toBe(false)
  })

  it('renomme sans se refuser soi-même, et refuse le libellé d’une autre entrée', () => {
    let all = emptyCustomVocabulary()
    for (const label of ['A', 'B']) {
      const r = addTerm(all, course, 'shotSizes', label, '')
      if (r.ok) all = r.value
    }
    expect(renameTerm(all, course, 'shotSizes', 0, 'a', 'def').ok).toBe(true)
    expect(renameTerm(all, course, 'shotSizes', 0, 'b', '').ok).toBe(false)
  })

  it('supprime une entrée', () => {
    const r = addTerm(emptyCustomVocabulary(), course, 'shotSizes', 'A', '')
    if (!r.ok) throw new Error('attendu')
    expect(removeTerm(r.value, 'shotSizes', 0).shotSizes).toEqual([])
  })

  it('fusionne : cours d’abord, puis personnelles', () => {
    const merged = mergedTerms(course.shotSizes, [
      { label: 'plan MOYEN', definition: '' },
      { label: 'Drone', definition: '' }
    ])
    expect(merged.map((term) => term.label)).toEqual(['Plan moyen', 'Drone'])
  })

  it('lit prudemment un fichier abîmé', () => {
    expect(parseCustomVocabulary('nimporte quoi')).toEqual(emptyCustomVocabulary())
    expect(
      parseCustomVocabulary({
        shotSizes: [{ label: 'A' }, { label: 'a' }, 3, { label: '' }],
        cameraAngles: 'x'
      }).shotSizes
    ).toEqual([{ label: 'A', definition: '' }])
  })
})
