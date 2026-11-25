import { describe, expect, it } from 'vitest'
import { getScenes, parse } from '@neoscenar/fountain'
import {
  appendSection,
  deleteSection,
  insertSectionAbove,
  renameSection,
  sectionHasSynopsis,
  shiftRefusal,
  shiftSection
} from './sectionEdit'
import { applyTextChanges, type TextChange } from './textChanges'

const parseBody = (text: string) => parse(text, { titlePage: false })
const apply = (text: string, change: TextChange | null): string =>
  change ? applyTextChanges(text, [change]) : text
const at = (text: string, line: string): number => {
  const offset = text.indexOf(line)
  if (offset < 0) throw new Error(`ligne absente : ${line}`)
  return offset
}
const numbers = (text: string): string[] =>
  getScenes(parseBody(text)).map((scene) => scene.info.number ?? '')
const sections = (text: string): string[] =>
  parseBody(text)
    .elements.filter((element) => element.type === 'section')
    .map((element) => `${element.section!.level}:${element.text}`)

const SCRIPT = [
  '# ACTE 1',
  '',
  'INT. A - JOUR #10#',
  '',
  'Action A.',
  '',
  '## Séquence 1',
  '',
  'INT. B - JOUR #20#',
  '',
  'Action B.',
  '',
  '# ACTE 2',
  '[[COULEUR #2463EB]]',
  '= Le milieu.',
  '',
  'INT. C - JOUR #30#',
  '',
  'Action C.',
  ''
].join('\n')

describe('ajouter une section', () => {
  it('au-dessus d’une scène : niveau de la section qui la contient, lignes vides autour', () => {
    const result = apply(SCRIPT, insertSectionAbove(SCRIPT, at(SCRIPT, 'INT. B'), '  Le  pont '))
    expect(result).toContain('## Séquence 1\n\n## Le pont\n\nINT. B - JOUR #20#')
    expect(numbers(SCRIPT)).toEqual(['10', '20', '30'])
    expect(numbers(result)).toEqual(numbers(SCRIPT))
  })

  it('au-dessus d’une section : même niveau', () => {
    const result = apply(SCRIPT, insertSectionAbove(SCRIPT, at(SCRIPT, '## Séquence'), 'Avant'))
    expect(result).toContain('Action A.\n\n## Avant\n\n## Séquence 1')
  })

  it('sans section au-dessus : niveau 1, en tête du texte sans ligne vide avant', () => {
    const text = 'INT. A - JOUR #10#\n\nAction.\n'
    const result = apply(text, insertSectionAbove(text, 0, 'Début'))
    expect(result).toBe('# Début\n\nINT. A - JOUR #10#\n\nAction.\n')
  })

  it('titre vide : rien', () => {
    expect(insertSectionAbove(SCRIPT, 0, '   ')).toBeNull()
    expect(appendSection(SCRIPT, '')).toBeNull()
  })

  it('« + Section » : toujours niveau 1, à la fin, fin de ligne finale gardée', () => {
    const result = apply(SCRIPT, appendSection(SCRIPT, 'Épilogue'))
    expect(result).toBe(SCRIPT + '\n# Épilogue\n')
    expect(apply('', appendSection('', 'Un'))).toBe('# Un\n')
    expect(apply('Action.', appendSection('Action.', 'Un'))).toBe('Action.\n\n# Un\n')
  })
})

describe('renommer une section', () => {
  it('garde les # et les notes de la ligne', () => {
    const text = '## Vieux titre [[à revoir]]\n\nINT. A - JOUR #10#\n'
    expect(apply(text, renameSection(text, 0, 'Nouveau'))).toBe(
      '## Nouveau [[à revoir]]\n\nINT. A - JOUR #10#\n'
    )
  })

  it('ne touche ni à la note de couleur ni au synopsis', () => {
    const result = apply(SCRIPT, renameSection(SCRIPT, at(SCRIPT, '# ACTE 2'), 'FIN'))
    expect(result).toContain('# FIN\n[[COULEUR #2463EB]]\n= Le milieu.')
  })

  it('même titre ou titre vide : rien', () => {
    expect(renameSection(SCRIPT, 0, 'ACTE 1')).toBeNull()
    expect(renameSection(SCRIPT, 0, ' ')).toBeNull()
    expect(renameSection(SCRIPT, at(SCRIPT, 'INT. A'), 'X')).toBeNull()
  })
})

describe('supprimer une section', () => {
  it('retire la ligne, la note de couleur et le synopsis ; les scènes restent', () => {
    expect(sectionHasSynopsis(SCRIPT, at(SCRIPT, '# ACTE 2'))).toBe(true)
    expect(sectionHasSynopsis(SCRIPT, 0)).toBe(false)
    const result = apply(SCRIPT, deleteSection(SCRIPT, at(SCRIPT, '# ACTE 2')))
    expect(result).toContain('Action B.\n\nINT. C - JOUR #30#')
    expect(result).not.toContain('COULEUR')
    expect(result).not.toContain('Le milieu')
    expect(numbers(result)).toEqual(numbers(SCRIPT))
  })

  it('les sous-sections gardent leur niveau', () => {
    const result = apply(SCRIPT, deleteSection(SCRIPT, 0))
    expect(result.startsWith('INT. A - JOUR #10#\n')).toBe(true)
    expect(sections(result)).toEqual(['2:Séquence 1', '1:ACTE 2'])
  })

  it('ajouter puis supprimer redonne le texte d’origine', () => {
    for (const add of [
      insertSectionAbove(SCRIPT, at(SCRIPT, 'INT. C'), 'X'),
      insertSectionAbove(SCRIPT, 0, 'X'),
      appendSection(SCRIPT, 'X')
    ]) {
      const added = apply(SCRIPT, add)
      const from = parseBody(added).elements.find(
        (element) => element.type === 'section' && element.text === 'X'
      )!.position!.startOffset
      expect(apply(added, deleteSection(added, from))).toBe(SCRIPT)
    }
  })

  it('une scène, pas une section : rien', () => {
    expect(deleteSection(SCRIPT, at(SCRIPT, 'INT. A'))).toBeNull()
  })
})

describe('imbriquer et désimbriquer', () => {
  const doc = parseBody(SCRIPT)
  const index = (title: string): number =>
    doc.elements.findIndex((element) => element.type === 'section' && element.text === title)

  it('refus : première section, pas de sœur juste avant, niveau 1', () => {
    expect(shiftRefusal(doc, index('ACTE 1'), 1)).toBe('noSibling')
    expect(shiftRefusal(doc, index('Séquence 1'), 1)).toBe('noSibling')
    expect(shiftRefusal(doc, index('ACTE 1'), -1)).toBe('topLevel')
    expect(shiftRefusal(doc, index('ACTE 2'), 1)).toBeNull()
    expect(shiftRefusal(doc, index('Séquence 1'), -1)).toBeNull()
  })

  it('les sous-sections suivent ; numéros inchangés', () => {
    const text = '# A\n\n# B\n\n## B1\n\n### B11\n\n# C\n'
    const deeper = parseBody(text)
    const b = deeper.elements.findIndex((element) => element.text === 'B')
    expect(shiftRefusal(deeper, b, 1)).toBe('tooDeep')
    const up = apply(text, shiftSection(text, at(text, '## B1'), -1))
    expect(sections(up)).toEqual(['1:A', '1:B', '1:B1', '2:B11', '1:C'])
    const nested = apply(up, shiftSection(up, at(up, '# B\n'), 1))
    expect(sections(nested)).toEqual(['1:A', '2:B', '1:B1', '2:B11', '1:C'])
    expect(shiftSection(text, 0, 1)).toBeNull()
    const result = apply(SCRIPT, shiftSection(SCRIPT, at(SCRIPT, '# ACTE 2'), 1))
    expect(sections(result)).toEqual(['1:ACTE 1', '2:Séquence 1', '2:ACTE 2'])
    expect(numbers(result)).toEqual(numbers(SCRIPT))
    expect(result).toContain('## ACTE 2\n[[COULEUR #2463EB]]')
  })
})
