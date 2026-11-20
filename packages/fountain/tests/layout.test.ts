import { describe, expect, it } from 'vitest'
import { layoutElements, parse, resolveLayout, wrapLine } from '../src/index.ts'
import { readExample, readProfile } from './helpers.ts'

const layout = resolveLayout(readProfile())

function laidOut(text: string) {
  return layoutElements(parse(text), layout).filter((element) => element.lines.length > 0)
}

describe('profil « Scénario Final Draft (A4) »', () => {
  it('reprend les mesures relevées sur le PDF de KIT', () => {
    const profile = readProfile()
    expect(profile.page).toEqual({ widthPt: 595, heightPt: 842 })
    expect(profile.font.family).toBe('Courier Prime')
    expect(profile.text).toMatchObject({ leftPt: 108, widthCh: 61, linesPerPage: 58 })
    expect(profile.elements.dialogue.indentMm).toBe(26)
    expect(profile.elements.parenthetical.indentMm).toBe(36)
    expect(profile.elements.character.indentMm).toBe(51)
  })

  it('convertit les retraits en caractères et en largeurs de coupure', () => {
    expect(layout.linesPerPage).toBe(58)
    const { styles } = layout
    expect(styles.action).toMatchObject({ indentCh: 0, wrapWidth: 61 })
    expect(styles.scene_heading).toMatchObject({ indentCh: 0, wrapWidth: 61, uppercase: true })
    expect(styles.dialogue.indentCh).toBeCloseTo(10.24, 2)
    expect(styles.dialogue.wrapWidth).toBe(35)
    expect(styles.parenthetical.indentCh).toBeCloseTo(14.17, 2)
    expect(styles.parenthetical.wrapWidth).toBe(25)
    expect(styles.character.indentCh).toBeCloseTo(20.08, 2)
    // Jusqu'au bord droit : 61 − 20,08 → 40 caractères entiers.
    expect(styles.character.wrapWidth).toBe(40)
  })
})

describe('wrapLine', () => {
  it('coupe entre les mots sans dépasser la largeur', () => {
    expect(wrapLine('Une clé mais pour quelle porte', 12)).toEqual([
      'Une clé mais',
      'pour quelle',
      'porte'
    ])
  })

  it('garde une ligne qui fait exactement la largeur', () => {
    expect(wrapLine('abcde fghij', 11)).toEqual(['abcde fghij'])
    expect(wrapLine('abcde fghij', 10)).toEqual(['abcde', 'fghij'])
  })

  it('coupe net un mot plus long que la ligne', () => {
    expect(wrapLine('aaaaaaaaaaaa b', 5)).toEqual(['aaaaa', 'aaaaa', 'aa b'])
  })

  it('garde le retrait de début de ligne et les espaces multiples entre les mots', () => {
    expect(wrapLine('   Retrait  double', 40)).toEqual(['   Retrait  double'])
  })

  it('remplace les tabulations par quatre espaces', () => {
    expect(wrapLine('\tTab', 40)).toEqual(['    Tab'])
  })

  it('coupe après un trait d’union entre deux lettres, qui reste en fin de ligne (comme KIT)', () => {
    // Cas vérifié sur le PDF de référence de KIT : la première ligne fait exactement 35 caractères.
    const lines = wrapLine(
      "Je serai là demain matin au rendez-vous, devant l'abri, avec ton écharpe",
      35
    )
    expect(lines[0]).toBe('Je serai là demain matin au rendez-')
    expect(lines[0]).toHaveLength(35)
    expect(lines[1]).toBe("vous, devant l'abri, avec ton")
    expect(wrapLine('INT. ÉCOLE - APRÈS-MIDI', 20)).toEqual(['INT. ÉCOLE - APRÈS-', 'MIDI'])
  })

  it('ne coupe pas après un tiret isolé, ni devant un chiffre', () => {
    expect(wrapLine('MAISON - NUIT', 8)).toEqual(['MAISON -', 'NUIT'])
    expect(wrapLine('aaaa - bbbb', 6)).toEqual(['aaaa -', 'bbbb'])
    expect(wrapLine('Un calibre semi-9mm', 16)).toEqual(['Un calibre', 'semi-9mm'])
    expect(wrapLine('Un calibre semi-automatique', 16)).toEqual(['Un calibre semi-', 'automatique'])
  })

  it('garde le mot entier quand il tient sur la ligne', () => {
    expect(wrapLine('rendez-vous ici', 40)).toEqual(['rendez-vous ici'])
    expect(wrapLine('dit rendez-vous', 11)).toEqual(['dit rendez-', 'vous'])
  })

  it('donne une ligne vide pour une ligne vide', () => {
    expect(wrapLine('', 10)).toEqual([''])
  })
})

describe('mise en lignes des éléments', () => {
  it('« (levant les yeux au ciel) » tient sur une ligne, la suivante passe à la ligne (PDF de KIT)', () => {
    const [, short, , long] = laidOut(
      'CHLOÉ\n(levant les yeux au ciel)\nBon.\n(regardant Mélanie dans les yeux)\nD’accord.\n'
    )
    expect(short.lines.map((line) => line.text)).toEqual(['(levant les yeux au ciel)'])
    expect(long.lines.map((line) => line.text)).toEqual(['(regardant Mélanie dans', 'les yeux)'])
  })

  it('coupe le dialogue à 35 caractères', () => {
    const [, dialogue] = laidOut(
      'CHLOÉ\nLe bus passe dans cinq minutes et je ne trouve toujours pas mes clés.\n'
    )
    expect(dialogue.lines.map((line) => line.text)).toEqual([
      'Le bus passe dans cinq minutes et',
      'je ne trouve toujours pas mes clés.'
    ])
    expect(dialogue.lines.every((line) => line.text.length <= 35)).toBe(true)
  })

  it('place chaque élément à son retrait ; transition à droite, texte centré au milieu', () => {
    const elements = laidOut(
      'INT. CUISINE - JOUR\n\nCHLOÉ\n(bas)\nOui.\n\n>FONDU AU NOIR.\n\n> FIN <\n'
    )
    const columns = elements.map((element) => element.lines[0].column)
    expect(columns[0]).toBe(0)
    expect(columns[1]).toBeCloseTo(20.08, 2)
    expect(columns[2]).toBeCloseTo(14.17, 2)
    expect(columns[3]).toBeCloseTo(10.24, 2)
    expect(columns[4]).toBe(61 - 'FONDU AU NOIR.'.length)
    expect(columns[5]).toBe((61 - 'FIN'.length) / 2)
  })

  it('met en majuscules l’en-tête, le personnage et la transition', () => {
    const elements = laidOut('int./ext. voiture - nuit\n\n@McCLANE\nSalut.\n\n> fondu au noir\n')
    expect(elements.map((element) => element.lines[0].text)).toEqual([
      'INT./EXT. VOITURE - NUIT',
      'MCCLANE',
      'Salut.',
      'FONDU AU NOIR'
    ])
  })

  it('applique les espacements par type : 2 lignes avant un en-tête, 1 avant action et personnage, 0 dans le dialogue', () => {
    const elements = laidOut(
      'Avant.\n\nINT. CUISINE - JOUR\n\nAction.\n\nCHLOÉ\n(bas)\nOui.\n\n~La la la\n\nCUT TO:\n'
    )
    expect(elements.map((element) => [element.type, element.spaceBefore])).toEqual([
      ['action', 0],
      ['scene_heading', 2],
      ['action', 1],
      ['character', 1],
      ['parenthetical', 0],
      ['dialogue', 0],
      ['lyrics', 1],
      ['transition', 1]
    ])
  })

  it('des paroles collées à une réplique font partie du bloc de dialogue', () => {
    const elements = laidOut('CHLOÉ\nBonjour.\n~La la la\n')
    expect(
      elements.map((element) => [element.type, element.spaceBefore, element.dialogueBlock])
    ).toEqual([
      ['character', 0, 0],
      ['dialogue', 0, 0],
      ['lyrics', 0, 0]
    ])
  })

  it('des lignes de paroles qui se suivent ne sont pas séparées par une ligne vide', () => {
    const elements = laidOut('Action.\n\n~Dans le grenier,\n~la clé chantait.\n')
    expect(elements.map((element) => [element.type, element.spaceBefore])).toEqual([
      ['action', 0],
      ['lyrics', 1],
      ['lyrics', 0]
    ])
  })

  it('n’imprime ni le numéro de scène, ni les marqueurs, ni les notes, ni le texte mis de côté', () => {
    const elements = laidOut(
      'INT. MAISON - JOUR #12A#\n\n!Elle **court** _vite_ [[plan large]] /* ancien */ dehors.\n'
    )
    expect(elements.map((element) => element.lines[0].text)).toEqual([
      'INT. MAISON - JOUR',
      'Elle court vite   dehors.'
    ])
  })

  it('n’imprime pas les notes, sections, synopsis et textes mis de côté isolés', () => {
    const all = layoutElements(
      parse('# ACTE 1\n\n= Résumé.\n\n[[Note]]\n\n/* mis\nde côté */\n\nAction.\n'),
      layout
    )
    expect(all.map((element) => [element.type, element.lines.length])).toEqual([
      ['section', 0],
      ['synopsis', 0],
      ['note', 0],
      ['boneyard', 0],
      ['action', 1]
    ])
    // Rien n'était imprimé avant : pas de ligne vide avant la première action.
    expect(all[4].spaceBefore).toBe(0)
  })

  it('supprime une ligne faite uniquement d’une note, garde les lignes vides d’un dialogue', () => {
    const [action] = laidOut('Ligne un.\n[[note\nsur deux lignes]]\nLigne deux.\n')
    expect(action.lines.map((line) => line.text)).toEqual(['Ligne un.', 'Ligne deux.'])
    expect(action.lines.map((line) => line.sourceLine)).toEqual([1, 4])
    const [, dialogue] = laidOut('CHLOÉ\nJ’arrive !\n  \nEnfin… presque.\n')
    expect(dialogue.lines.map((line) => line.text)).toEqual(['J’arrive !', '', 'Enfin… presque.'])
  })

  it('indique la ligne source et le rang dans la coupure', () => {
    const text = `INT. CUISINE - JOUR\n\n${'mot '.repeat(20).trim()}\nFin.\n`
    const [, action] = laidOut(text)
    expect(action.lines.map((line) => [line.sourceLine, line.wrapIndex])).toEqual([
      [3, 0],
      [3, 1],
      [4, 0]
    ])
  })
})

describe('position source de chaque ligne imprimée', () => {
  const firstChar = (text: string): string => text.trimStart()[0] ?? ''

  for (const name of ['le-dernier-bus.fountain', 'exemple-complet.fountain']) {
    it(`${name} : chaque ligne commence à la position indiquée dans le texte`, () => {
      const source = readExample(name)
      const mismatches = layoutElements(parse(source), layout)
        .flatMap((element) => element.lines)
        .filter((line) => line.text.trim() !== '')
        .filter((line) => {
          const at = source.slice(line.sourceOffset).trimStart()[0] ?? ''
          return at.toUpperCase() !== firstChar(line.text).toUpperCase()
        })
        .map(
          (line) =>
            `${line.text} → ${source.slice(line.sourceOffset, (line.sourceOffset ?? 0) + 10)}`
        )
      expect(mismatches).toEqual([])
    })
  }

  it('au milieu d’un paragraphe coupé, la ligne suivante commence au bon caractère', () => {
    const text = 'CHLOÉ\nCalme-toi, je vais juste au rendez-vous, je lui file le flingue.\n'
    const [, dialogue] = laidOut(text)
    expect(
      dialogue.lines.map((line) => text.slice(line.sourceOffset, (line.sourceOffset ?? 0) + 5))
    ).toEqual(['Calme', 'vous,'])
  })

  it('les marqueurs retirés ne décalent pas les positions', () => {
    const text = `!Elle **court** [[plan large]] ${'très '.repeat(12)}vite.`
    const [action] = laidOut(text)
    expect(action.lines[0].sourceOffset).toBe(1)
    const second = action.lines[1]
    expect(text.slice(second.sourceOffset, (second.sourceOffset ?? 0) + second.text.length)).toBe(
      second.text
    )
  })
})

describe('mise en forme des lignes (pour le PDF)', () => {
  const mark = (from: number, to: number, bold: boolean, italic: boolean, underline: boolean) => ({
    from,
    to,
    bold,
    italic,
    underline
  })

  it('garde le gras, l’italique et le souligné, positions dans le texte imprimé', () => {
    const [element] = laidOut('Un **mot** [[note]] *penché* et _souligné_.\n')
    expect(element.lines[0].text).toBe('Un mot  penché et souligné.')
    expect(element.lines[0].marks).toEqual([
      mark(3, 6, true, false, false),
      mark(8, 14, false, true, false),
      mark(18, 26, false, false, true)
    ])
  })

  it('suit la mise en forme à travers une coupure de ligne', () => {
    const [element] = laidOut(`${'a '.repeat(28)}**début de gras qui continue**\n`)
    expect(element.lines.map((line) => line.marks)).toEqual([
      [mark(56, 61, true, false, false)],
      [mark(0, 20, true, false, false)]
    ])
  })

  it('n’ajoute rien à une ligne sans mise en forme', () => {
    const [element] = laidOut('Texte simple.\n')
    expect(element.lines[0]).not.toHaveProperty('marks')
  })
})
