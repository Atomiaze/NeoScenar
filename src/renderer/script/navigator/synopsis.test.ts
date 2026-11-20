import { describe, expect, it } from 'vitest'
import { ChangeSet, Text, type ChangeSpec } from '@codemirror/state'
import { parse } from '@neoscenar/fountain'
import { readSynopsis, setSynopsis } from './synopsis'

function apply(text: string, change: ChangeSpec | null): string {
  return change === null
    ? text
    : ChangeSet.of(change, text.length)
        .apply(Text.of(text.split('\n')))
        .toString()
}

/** Le reste du scénario, relu par Fountain (sans les synopsis). */
function others(text: string): [string, string][] {
  return parse(text, { titlePage: false })
    .elements.filter((element) => element.type !== 'synopsis')
    .map((element) => [element.type, element.text])
}

function write(text: string, headingLine: number, description: string): string {
  const from =
    text
      .split('\n')
      .slice(0, headingLine - 1)
      .join('\n').length + (headingLine > 1 ? 1 : 0)
  const result = apply(text, setSynopsis(text, from, description))
  expect(others(result)).toEqual(others(text))
  return result
}

describe('lecture du synopsis', () => {
  it('une ou plusieurs lignes « = » sous l’en-tête, notes intercalées ignorées', () => {
    const doc = parse(
      'INT. A - JOUR\n\n= Un.\n\n[[note]]\n\n= Deux.\n\nAction.\n\n= Pas celui-ci.',
      {
        titlePage: false
      }
    )
    expect(readSynopsis(doc, 0).lines).toEqual(['Un.', 'Deux.'])
  })

  it('rien si un autre élément vient d’abord', () => {
    const doc = parse('INT. A - JOUR\n\nAction.\n\n= Trop loin.', { titlePage: false })
    expect(readSynopsis(doc, 0).lines).toEqual([])
  })
})

describe('écriture du synopsis', () => {
  const SCENE = 'INT. CUISINE - JOUR\n\nÉlodie entre.\n'

  it('ajoute les lignes sous l’en-tête, entre deux lignes vides', () => {
    expect(write(SCENE, 1, 'Élodie apprend la nouvelle.')).toBe(
      'INT. CUISINE - JOUR\n\n= Élodie apprend la nouvelle.\n\nÉlodie entre.\n'
    )
  })

  it('une ligne « = » par ligne non vide du champ', () => {
    expect(write(SCENE, 1, 'Un.\n\n  Deux.  \n')).toBe(
      'INT. CUISINE - JOUR\n\n= Un.\n= Deux.\n\nÉlodie entre.\n'
    )
  })

  it('remplace un synopsis existant', () => {
    const text = 'INT. CUISINE - JOUR\n\n= Ancien.\n= Résumé.\n\nÉlodie entre.\n'
    expect(write(text, 1, 'Nouveau.')).toBe('INT. CUISINE - JOUR\n\n= Nouveau.\n\nÉlodie entre.\n')
  })

  it('une description vidée revient exactement au texte sans synopsis', () => {
    const added = write(SCENE, 1, 'Un.\nDeux.')
    expect(write(added, 1, '')).toBe(SCENE)
    const atEnd = write('INT. A - JOUR', 1, 'Fin.')
    expect(atEnd).toBe('INT. A - JOUR\n\n= Fin.')
    expect(write(atEnd, 1, '  ')).toBe('INT. A - JOUR')
  })

  it('garde les notes intercalées', () => {
    const text = 'INT. A - JOUR\n\n= Un.\n\n[[note]]\n\n= Deux.\n\nAction.'
    expect(write(text, 1, 'Nouveau.')).toBe('INT. A - JOUR\n\n= Nouveau.\n\n[[note]]\n\n\nAction.')
  })

  it('la scène qui commence par un personnage est relue à l’identique', () => {
    const text = 'EXT. RUE - NUIT\n\nMARIE\nBonjour.\n\nINT. B - JOUR\n'
    const added = write(text, 1, 'Marie salue.')
    expect(added).toBe('EXT. RUE - NUIT\n\n= Marie salue.\n\nMARIE\nBonjour.\n\nINT. B - JOUR\n')
    expect(write(added, 1, '')).toBe(text)
  })

  it('fonctionne aussi pour un acte (ligne de section)', () => {
    const text = '# ACTE 1\n\nINT. A - JOUR\n'
    const added = write(text, 1, 'Le début.')
    expect(added).toBe('# ACTE 1\n\n= Le début.\n\nINT. A - JOUR\n')
    expect(write(added, 1, '')).toBe(text)
  })

  it('dernière scène du scénario : retirer la description garde la fin de ligne finale', () => {
    for (const text of ['INT. A - JOUR\n', 'INT. A - JOUR']) {
      const added = write(text, 1, 'Un.')
      expect(write(added, 1, '')).toBe(text)
    }
  })

  it('ne change rien si la description est identique, ou si la position ne désigne rien', () => {
    expect(setSynopsis('INT. A - JOUR\n\n= Un.', 0, 'Un.')).toBeNull()
    expect(setSynopsis('Action.', 0, 'Un.')).toBeNull()
  })
})
