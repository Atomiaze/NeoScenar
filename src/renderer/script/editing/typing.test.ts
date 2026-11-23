import { describe, expect, it } from 'vitest'
import { EditorSelection, type EditorState, type StateCommand } from '@codemirror/state'
import { parse, type ElementType } from '@neoscenar/fountain'
import { createScriptState, cursorType } from '../editor/createScriptState'
import {
  backspaceCommand,
  changeCase,
  enterCommand,
  lineBreakCommand,
  setElementType,
  tabCommand,
  toggleFormat
} from './commands'

/** Petite machine à écrire : frappe au clavier simulée sur l'état de l'éditeur. */
class Typist {
  state: EditorState
  constructor(text = '', cursor = text.length) {
    this.state = createScriptState(text)
    this.state = this.state.update({ selection: { anchor: cursor } }).state
  }
  type(text: string): this {
    for (const char of text) {
      const head = this.state.selection.main.head
      this.state = this.state.update({
        changes: { from: head, insert: char },
        selection: { anchor: head + char.length },
        userEvent: 'input.type'
      }).state
    }
    return this
  }
  run(command: StateCommand): this {
    command({ state: this.state, dispatch: (tr) => (this.state = tr.state) })
    return this
  }
  enter = (): this => this.run(enterCommand)
  tab = (): this => this.run(tabCommand)
  moveTo(pos: number): this {
    this.state = this.state.update({ selection: EditorSelection.cursor(pos) }).state
    return this
  }
  get text(): string {
    return this.state.doc.toString()
  }
  get types(): ElementType[] {
    return parse(this.text, { titlePage: false }).elements.map((element) => element.type)
  }
  get cursorType(): ElementType {
    return cursorType(this.state)
  }
}

describe('enchaînement au clavier (comme dans KIT)', () => {
  it('écrit une scène entière au clavier seulement', () => {
    const t = new Typist()
    t.run(setElementType('scene_heading')).type('int. cuisine - jour')
    expect(t.cursorType).toBe('scene_heading')
    t.enter()
    expect(t.cursorType).toBe('action')
    t.type('Chloé fouille un tiroir.').tab()
    expect(t.cursorType).toBe('character')
    t.type('chloé').enter()
    expect(t.cursorType).toBe('dialogue')
    t.tab()
    expect(t.cursorType).toBe('parenthetical')
    t.type('(à elle-même)').enter()
    expect(t.cursorType).toBe('dialogue')
    t.type('Une clé… mais pour quelle porte ?').tab()
    expect(t.cursorType).toBe('character')
    t.type('françois (o.s.)').enter().type('Le bus !').enter()
    expect(t.cursorType).toBe('action')
    t.type('Elle sort.').run(setElementType('transition'))
    t.enter()
    expect(t.cursorType).toBe('scene_heading')
    t.type('ext. rue - jour')
    // On quitte la dernière ligne pour que tout soit réglé.
    t.moveTo(0)

    expect(t.text).toBe(
      [
        'INT. CUISINE - JOUR',
        '',
        'Chloé fouille un tiroir.',
        '',
        'CHLOÉ',
        '(à elle-même)',
        'Une clé… mais pour quelle porte ?',
        '',
        'FRANÇOIS (O.S.)',
        'Le bus !',
        '',
        '> ELLE SORT.',
        '',
        'EXT. RUE - JOUR'
      ].join('\n')
    )
    expect(t.types).toEqual([
      'scene_heading',
      'action',
      'character',
      'parenthetical',
      'dialogue',
      'character',
      'dialogue',
      'transition',
      'scene_heading'
    ])
  })

  it('Entrée crée l’élément suivant de la table, avec les lignes vides qu’il faut', () => {
    const cases: [string, ElementType, string][] = [
      ['INT. A - JOUR', 'action', 'INT. A - JOUR\n\n'],
      ['Elle entre.', 'action', 'Elle entre.\n\n'],
      ['Elle entre.\n\nMARIE\nOui.', 'action', 'Elle entre.\n\nMARIE\nOui.\n\n'],
      ['CUT TO:', 'scene_heading', 'CUT TO:\n\n']
    ]
    for (const [text, expected, after] of cases) {
      const t = new Typist(text).enter()
      expect(t.cursorType, text).toBe(expected)
      expect(t.text, text).toBe(after)
    }
  })

  it('Entrée après un personnage : réplique collée, sans ligne vide', () => {
    const t = new Typist('Elle entre.', 11).tab().type('marie').enter()
    expect(t.text).toBe('Elle entre.\n\nMARIE\n')
    expect(t.cursorType).toBe('dialogue')
  })

  it('Entrée sur un élément vide le transforme en action (pour sortir d’un dialogue)', () => {
    const t = new Typist('Elle entre.', 11).tab().type('marie').enter().type('Oui.').enter()
    expect(t.cursorType).toBe('action')
    const u = new Typist('Elle entre.', 11).tab().type('marie').enter()
    u.enter()
    expect(u.cursorType).toBe('action')
    expect(u.text).toBe('Elle entre.\n\nMARIE\n\n')
  })

  it('Tab sur une ligne vide change son type, selon la table', () => {
    const t = new Typist('Elle entre.').enter()
    expect(t.cursorType).toBe('action')
    t.tab()
    expect(t.cursorType).toBe('character')
    t.tab()
    expect(t.cursorType).toBe('parenthetical')
    // Pas de suite prévue pour une didascalie vide : rien ne change.
    t.tab()
    expect(t.cursorType).toBe('parenthetical')
  })

  it('Tab sur une réplique écrite : nouvelle réplique (personnage)', () => {
    const t = new Typist('MARIE\nOui.').tab()
    expect(t.cursorType).toBe('character')
    expect(t.text).toBe('MARIE\nOui.\n\n')
  })

  it('Maj + Entrée : retour à la ligne dans la même réplique', () => {
    const t = new Typist('MARIE\nOui.').run(lineBreakCommand).type('Enfin, non.')
    expect(t.text).toBe('MARIE\nOui.\nEnfin, non.')
    expect(t.types).toEqual(['character', 'dialogue'])
  })

  it('Entrée au milieu d’une action la coupe en deux paragraphes', () => {
    const t = new Typist('Elle entre. Il sort.', 11).enter()
    expect(t.text).toBe('Elle entre.\n\nIl sort.')
  })

  it('Retour arrière sur une ligne vide annule un Entrée de trop', () => {
    const t = new Typist('Elle entre.').enter().run(backspaceCommand)
    expect(t.text).toBe('Elle entre.')
    expect(t.state.selection.main.head).toBe(11)
  })

  it('un personnage abandonné sans réplique reste un personnage (forcé par @)', () => {
    const t = new Typist('Elle entre.').tab().type('marie').moveTo(0)
    expect(t.text).toBe('Elle entre.\n\n@MARIE')
    expect(t.types).toEqual(['action', 'character'])
  })

  it('une ligne vide quittée ne laisse aucune trace', () => {
    const t = new Typist('Elle entre.').tab().moveTo(0)
    expect(t.text).toBe('Elle entre.\n\n')
    expect(t.types).toEqual(['action'])
  })

  it('met en majuscules pendant la frappe, sauf les extensions du personnage', () => {
    const t = new Typist('Elle entre.').tab().type('élodie (v.o.)')
    expect(t.text).toBe('Elle entre.\n\nÉLODIE (v.o.)')
  })

  it('en quittant un personnage, les extensions connues passent en majuscules, pas les autres', () => {
    const t = new Typist('Elle entre.')
      .tab()
      .type('élodie (v.o.) (au téléphone)')
      .enter()
      .type('Allô ?')
    expect(t.text).toBe('Elle entre.\n\nÉLODIE (V.O.) (au téléphone)\nAllô ?')
  })

  it('ne touche pas la casse d’une ligne simplement traversée par le curseur', () => {
    const t = new Typist('Elle entre.\n\n@McCLANE\nYippee.', 0).moveTo(16).moveTo(0)
    expect(t.text).toBe('Elle entre.\n\n@McCLANE\nYippee.')
  })
})

describe('raccourcis de KIT', () => {
  it('Cmd + G : « fondu au noir » devient « > FONDU AU NOIR »', () => {
    const t = new Typist('Elle sort.\n\nfondu au noir').run(setElementType('transition'))
    expect(t.text).toBe('Elle sort.\n\n> FONDU AU NOIR')
    expect(t.types).toEqual(['action', 'transition'])
  })

  it('Cmd + Entrée, Cmd + J, Cmd + U, Cmd + H, Cmd + L changent le type de la ligne', () => {
    const t = new Typist('CHLOÉ\nBonjour.', 6)
    t.run(setElementType('parenthetical'))
    expect(t.text).toBe('CHLOÉ\n(Bonjour.)')
    t.run(setElementType('dialogue'))
    expect(t.text).toBe('CHLOÉ\nBonjour.')
    t.run(setElementType('action'))
    expect(t.types).toEqual(['action', 'action'])
    const h = new Typist('Elle entre.\n\nla cave').run(setElementType('scene_heading'))
    expect(h.text).toBe('Elle entre.\n\n.LA CAVE')
    const c = new Typist('Elle entre.\n\nmarie\nBonjour.', 15).run(setElementType('character'))
    expect(c.text).toBe('Elle entre.\n\nMARIE\nBonjour.')
  })

  it('Cmd + ↑ / Cmd + ↓ : majuscules / minuscules sur le mot', () => {
    expect(new Typist('une clé', 2).run(changeCase(true)).text).toBe('UNE clé')
    expect(new Typist('UNE CLÉ', 6).run(changeCase(false)).text).toBe('UNE clé')
  })

  it('Cmd + B / Cmd + I / Cmd + Maj + U : met en forme le mot, puis retire la mise en forme', () => {
    const bold = new Typist('une clé', 2).run(toggleFormat('**'))
    expect(bold.text).toBe('**une** clé')
    expect(bold.run(toggleFormat('**')).text).toBe('une clé')
    expect(new Typist('une clé', 6).run(toggleFormat('*')).text).toBe('une *clé*')
    expect(new Typist('une clé', 6).run(toggleFormat('_')).text).toBe('une _clé_')
  })
})

describe('fidélité', () => {
  it('après une suite de frappes, le texte est relu sans perte et sans élément mal classé', () => {
    const t = new Typist()
    t.run(setElementType('scene_heading')).type('ext. jardin - nuit').enter()
    t.type('La lune éclaire le jardin.').tab().type('paul').enter().tab().type('(bas)').enter()
    t.type('Tu entends ?').tab().type('marie (o.s.)').enter().type('Non.').enter()
    t.type('Silence.').enter().type('Un chien aboie.').run(setElementType('transition')).enter()
    t.type('int. maison - nuit').enter().type('Paul ferme la porte.').moveTo(0)

    const doc = parse(t.text, { titlePage: false })
    expect(doc.elements.map((element) => [element.type, element.text])).toEqual([
      ['scene_heading', 'EXT. JARDIN - NUIT'],
      ['action', 'La lune éclaire le jardin.'],
      ['character', 'PAUL'],
      ['parenthetical', '(bas)'],
      ['dialogue', 'Tu entends ?'],
      ['character', 'MARIE (O.S.)'],
      ['dialogue', 'Non.'],
      ['action', 'Silence.'],
      ['transition', 'UN CHIEN ABOIE.'],
      ['scene_heading', 'INT. MAISON - NUIT'],
      ['action', 'Paul ferme la porte.']
    ])
  })
})

describe('symboles Fountain tapés en début de ligne (18C-11)', () => {
  const HEADING = 'INT. A - JOUR'
  const CONTEXTS: [string, string, (t: Typist) => Typist][] = [
    ['Entrée après une action', `${HEADING}\n\nElle entre.`, (t) => t.enter()],
    ['Entrée après un en-tête', HEADING, (t) => t.enter()],
    ['Entrée après une réplique', `${HEADING}\n\nCHLOÉ\nBonjour.`, (t) => t.enter()],
    ['Entrée après une transition', `${HEADING}\n\nElle sort.\n\nCUT TO:`, (t) => t.enter()],
    ['Tab après une action', `${HEADING}\n\nElle entre.`, (t) => t.tab()]
  ]
  const MARKS: [string, ElementType][] = [
    ['# ACTE 1', 'section'],
    ['= Résumé.', 'synopsis'],
    ['~la la', 'lyrics'],
    ['> FIN <', 'centered'],
    ['===', 'page_break'],
    ['!BOUM', 'action'],
    ['@MCCLANE', 'character'],
    ['.FLASHBACK', 'scene_heading'],
    ['> FONDU AU NOIR', 'transition'],
    ['[[note]]', 'note']
  ]

  /** Tape `mark` dans le contexte, puis quitte la ligne : texte et type de la ligne écrite. */
  function typeIn(start: string, go: (t: Typist) => Typist, mark: string) {
    const t = go(new Typist(start)).type(mark)
    const shown = t.cursorType
    const line = t.state.doc.lineAt(t.state.selection.main.head).number
    t.moveTo(0)
    const text = t.state.doc.line(line).text
    const read = parse(t.text, { titlePage: false }).elements.find(
      (e) => e.position && e.position.startLine <= line && line <= e.position.endLine
    )?.type
    return { shown, text, read, typist: t }
  }

  for (const [name, start, go] of CONTEXTS) {
    it(`${name} : le symbole l'emporte, pendant la frappe et dans le fichier`, () => {
      for (const [mark, type] of MARKS) {
        const result = typeIn(start, go, mark)
        expect({ mark, shown: result.shown, text: result.text, read: result.read }).toEqual({
          mark,
          shown: type,
          text: mark,
          read: type
        })
      }
    })
  }

  it('« > texte » est une transition, « > texte < » un texte centré, sans majuscules en route', () => {
    const t = new Typist(`${HEADING}\n\nElle entre.`).enter().type('> trois ans plus tard')
    expect(t.cursorType).toBe('transition')
    t.type(' <')
    expect(t.cursorType).toBe('centered')
    t.moveTo(0)
    expect(t.text.endsWith('\n\n> trois ans plus tard <')).toBe(true)
    // Une vraie transition est mise en majuscules en quittant la ligne.
    const u = new Typist(`${HEADING}\n\nElle entre.`).enter().type('> fondu au noir').moveTo(0)
    expect(u.text.endsWith('\n\n> FONDU AU NOIR')).toBe(true)
  })

  it('« ... » en début d’action reste une action, après Entrée comme après une transition', () => {
    for (const [, start, go] of CONTEXTS.slice(0, 4)) {
      const result = typeIn(start, go, '... et puis')
      expect([result.shown, result.text, result.read]).toEqual(['action', '... et puis', 'action'])
    }
  })

  it('« .5 » en début d’action : action, écrite « !.5 » pour être lue ainsi partout', () => {
    for (const [, start, go] of CONTEXTS.slice(0, 4)) {
      const result = typeIn(start, go, '.5 seconde plus tard')
      expect([result.shown, result.text, result.read]).toEqual([
        'action',
        '!.5 seconde plus tard',
        'action'
      ])
    }
  })

  it('« .5 » : le « ! » est écrit dès la frappe (aucun faux en-tête enregistré entre-temps)', () => {
    const t = new Typist(`${HEADING}\n\nElle entre.`).enter().type('.')
    expect(t.text.endsWith('\n\n.')).toBe(true)
    t.type('5')
    expect(t.text.endsWith('\n\n!.5')).toBe(true)
    expect(t.cursorType).toBe('action')
    t.type(' seconde')
    expect(t.types.at(-1)).toBe('action')
  })

  it('dans une réplique, seuls les paroles (~) changent le type', () => {
    const base = `${HEADING}\n\nCHLOÉ\nBonjour.`
    const sung = new Typist(base).run(lineBreakCommand).type('~la la').moveTo(0)
    expect(sung.types.at(-1)).toBe('lyrics')
    const hash = new Typist(base).run(lineBreakCommand).type('# pas un acte').moveTo(0)
    expect(hash.text.endsWith('Bonjour.\n# pas un acte')).toBe(true)
    expect(hash.types.at(-1)).toBe('dialogue')
  })

  it('sans symbole, le type choisi par Entrée ou Tab est toujours tenu', () => {
    expect(
      typeIn(`${HEADING}\n\nElle sort.\n\nCUT TO:`, (t) => t.enter(), 'ext. rue - nuit').text
    ).toBe('EXT. RUE - NUIT')
    const name = typeIn(`${HEADING}\n\nElle entre.`, (t) => t.tab(), 'chloé')
    expect(name.shown).toBe('character')
  })

  it('Cmd + J sur une ligne « .5 » (en-tête lu par Fountain) garde le texte : « !.5 »', () => {
    const t = new Typist(`${HEADING}\n\n.5 SECONDES`).run(setElementType('action')).moveTo(0)
    expect(t.text).toBe(`${HEADING}\n\n!.5 SECONDES`)
    expect(t.types).toEqual(['scene_heading', 'action'])
  })

  it('saut de page sur une ligne vide (après Entrée) : « === » écrit à chaque fois', () => {
    const t = new Typist(`${HEADING}\n\n`)
    for (let i = 1; i <= 4; i++)
      t.type(`Action ${i}.`).enter().run(setElementType('page_break')).enter()
    t.type('Fin.')
    expect(t.text).toBe(
      `${HEADING}\n\nAction 1.\n\n===\n\nAction 2.\n\n===\n\nAction 3.\n\n===\n\nAction 4.\n\n===\n\nFin.`
    )
    expect(t.types.filter((type) => type === 'page_break')).toHaveLength(4)
  })
})
