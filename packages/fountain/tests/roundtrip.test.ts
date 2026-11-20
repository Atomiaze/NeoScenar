import { describe, expect, it } from 'vitest'
import { parse, serialize, type FountainDocument } from '../src/index.ts'
import { exampleNames, readExample, seededRandom } from './helpers.ts'

/** Vérifie que chaque morceau de source correspond exactement à sa position dans le texte. */
function expectConsistentPositions(text: string, doc: FountainDocument): void {
  let previousEnd = -1
  for (const element of doc.elements) {
    const position = element.position!
    expect(text.slice(position.startOffset, position.endOffset)).toBe(element.raw)
    expect(position.startOffset).toBeGreaterThanOrEqual(previousEnd)
    expect(position.endLine).toBeGreaterThanOrEqual(position.startLine)
    previousEnd = position.endOffset
  }
}

describe('réécriture à l’identique des fichiers d’exemple', () => {
  for (const name of exampleNames()) {
    it(name, () => {
      const text = readExample(name)
      const doc = parse(text)
      expect(serialize(doc)).toBe(text)
      expectConsistentPositions(text, doc)
    })
  }

  it('les fichiers d’exemple couvrent les cas demandés', () => {
    expect(readExample('fins-de-ligne-windows.fountain')).toContain('\r\n')
    expect(readExample('avec-bom.fountain').charCodeAt(0)).toBe(0xfeff)
    expect(readExample('vide.fountain')).toBe('')
    expect(parse(readExample('avec-bom.fountain')).bom).toBe(true)
    expect(parse(readExample('fins-de-ligne-windows.fountain')).lineEnding).toBe('\r\n')
  })
})

describe('réécriture à l’identique de cas limites', () => {
  const cases = [
    '',
    '\n',
    '\r\n\r\n',
    '\r',
    '﻿',
    '﻿\n',
    '   ',
    '  \n  \n',
    'Sans fin de ligne',
    'INT. MAISON - JOUR',
    'MARIE\nBonjour',
    'MARIE\n  \n',
    'Ligne Mac\rautre ligne\r',
    'Mélange\r\nde\nfins\rde ligne',
    '/*',
    '*/',
    '[[',
    ']]',
    '[[]]',
    '/**/',
    '[[ note\r\n\r\nsans fin ]]',
    'Title:',
    'Title: X',
    'Title: X\n',
    'Title:\n    a\n    b\n\n\n',
    'FADE IN:\n\nINT. X - JOUR',
    '\t\t\n\tTab',
    '\u0000\u0001 caractères de contrôle',
    '😀 émoji\n\nÉLODIE 😀\nSalut 👋'
  ]
  for (const text of cases) {
    it(JSON.stringify(text), () => {
      const doc = parse(text)
      expect(serialize(doc)).toBe(text)
      expectConsistentPositions(text, doc)
    })
  }

  it('ne lève pas d’exception sur une entrée qui n’est pas du texte', () => {
    expect(() => parse(undefined as unknown as string)).not.toThrow()
    expect(serialize(parse(null as unknown as string))).toBe('')
  })
})

describe('réécriture à l’identique de textes aléatoires', () => {
  const fragments = [
    '',
    '',
    '',
    '  ',
    '   ',
    '\t',
    'INT. MAISON - CUISINE - JOUR',
    'ext. parc - nuit #12A#',
    'INT./EXT. VOITURE - JOUR',
    'I/E BUS',
    'EST. VILLE',
    '.FORCÉ',
    '..pas forcé',
    'MARIE',
    'ÉLODIE (V.O.)',
    'FRANÇOIS (SUITE) ^',
    '@McCLANE',
    '(riant)',
    'Bonjour, comment ça va ?',
    'Marie entre dans la pièce.',
    '!FORCER L’ACTION',
    'CUT TO:',
    '>FONDU AU NOIR.',
    '> FIN <',
    '===',
    '=====',
    '= Synopsis de la scène',
    '# Acte un',
    '### Séquence',
    '~Paroles de chanson',
    '[[note]]',
    '[[début de note',
    'fin de note]]',
    '/* mis de côté',
    'fin du mis de côté */',
    'texte /* au milieu */ de la ligne',
    'Title: Mon film',
    'Author: Moi',
    '    valeur indentée',
    '*italique* **gras** _souligné_ \\*',
    '﻿',
    'Ligne avec espaces   ',
    '\tTabulation'
  ]
  const endings = ['\n', '\n', '\n', '\r\n', '\r']

  it('serialize(parse(t)) === t sur 5000 textes générés', () => {
    const random = seededRandom(20261118)
    const pick = <T>(list: T[]): T => list[Math.floor(random() * list.length)]
    for (let n = 0; n < 5000; n++) {
      const lineCount = Math.floor(random() * 25)
      let text = ''
      for (let k = 0; k < lineCount; k++) {
        text += pick(fragments)
        if (k < lineCount - 1 || random() < 0.7) text += pick(endings)
      }
      const doc = parse(text)
      const result = serialize(doc)
      if (result !== text) expect.fail(`Réécriture différente pour : ${JSON.stringify(text)}`)
      expectConsistentPositions(text, doc)
    }
  })
})
