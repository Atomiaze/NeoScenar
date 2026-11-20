import { redo, undo } from '@codemirror/commands'
import { EditorSelection, type EditorState, type StateCommand } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { counterIds } from '../../../shared/decoupage/testFixtures'
import type { Decoupage } from '../../../shared/projectTypes'
import { readScriptScenes, type ReconcileResult } from '../../../shared/scriptLink'
import { cards, labels } from '../../../shared/scriptLink/testHelpers'
import { enterCommand, setElementType } from '../editing/commands'
import { createScriptState } from './createScriptState'
import { linkResult, numbersWaiting, settleLink, writeNumbers, type LinkSource } from './scriptLink'

/** Éditeur sans affichage, relié à des cartes en mémoire, comme dans l'application. */
class LinkedEditor {
  state: EditorState
  decoupage: Decoupage
  results: ReconcileResult[] = []

  constructor(text: string, decoupage: Decoupage, cursor = 0) {
    this.decoupage = decoupage
    const source: LinkSource = {
      current: () => ({ decoupage: this.decoupage, knownCards: [] }),
      ids: counterIds('n')
    }
    this.state = createScriptState(text, undefined, [], source)
    this.apply(this.state.update({ selection: { anchor: cursor } }))
  }

  /** Comme l'application : les cartes reprennent le résultat du rapprochement. */
  private apply(tr: ReturnType<EditorState['update']>): void {
    this.state = tr.state
    let waiting = false
    for (const effect of tr.effects) {
      if (effect.is(linkResult)) {
        this.results.push(effect.value)
        this.decoupage = effect.value.decoupage
      }
      if (effect.is(numbersWaiting)) waiting = true
    }
    // Comme l'éditeur affiché : les numéros en attente sont écrits aussitôt, à part.
    if (waiting) this.apply(this.state.update({ effects: writeNumbers.of(null) }))
  }

  type(text: string): this {
    for (const char of text) {
      const head = this.state.selection.main.head
      this.apply(
        this.state.update({
          changes: { from: head, insert: char },
          selection: { anchor: head + char.length },
          userEvent: 'input.type'
        })
      )
    }
    return this
  }

  paste(text: string, at: number): this {
    this.apply(
      this.state.update({
        changes: { from: at, insert: text },
        selection: { anchor: at + text.length },
        userEvent: 'input.paste'
      })
    )
    return this
  }

  moveTo(pos: number): this {
    this.apply(this.state.update({ selection: EditorSelection.cursor(pos) }))
    return this
  }

  settle(): this {
    this.apply(this.state.update({ effects: settleLink.of(null) }))
    return this
  }

  run(command: StateCommand): this {
    command({ state: this.state, dispatch: (tr) => this.apply(tr) })
    return this
  }

  get text(): string {
    return this.state.doc.toString()
  }

  get numbers(): (string | null)[] {
    return readScriptScenes(this.text).map((scene) => scene.rawNumber)
  }
}

const TEXT = 'INT. A - JOUR #10#\n\nAction A.\n\nINT. B - JOUR #20#\n\nAction B.\n'

describe('lien scénario ↔ cartes dans l’éditeur', () => {
  it('nouvel en-tête : numéroté seulement en quittant la ligne, et sa carte apparaît', () => {
    const fresh = new LinkedEditor(TEXT, cards(['10', '20']), TEXT.indexOf('Action A.') + 9)
    fresh.run(enterCommand).run(setElementType('scene_heading')).type('int. cuisine - jour')
    expect(fresh.numbers).toEqual(['10', null, '20'])
    expect(labels(fresh.decoupage)).toEqual(['S_0010', 'S_0020'])

    fresh.moveTo(0)
    expect(fresh.numbers).toEqual(['10', '15', '20'])
    expect(fresh.text).toContain('INT. CUISINE - JOUR #15#\n')
    expect(labels(fresh.decoupage)).toEqual(['S_0010', 'S_0015', 'S_0020'])
    expect(fresh.decoupage.scenes[1].heading).toBe('INT. CUISINE - JOUR')
  })

  it('le numéro écrit en quittant la ligne est une étape d’annulation à lui seul', () => {
    const editor = new LinkedEditor(TEXT, cards(['10', '20']), TEXT.indexOf('Action A.') + 9)
    editor.run(enterCommand).run(setElementType('scene_heading')).type('int. cuisine - jour')
    editor.moveTo(0)
    expect(editor.numbers).toEqual(['10', '15', '20'])
    // Premier Cmd + Z : seul « #15# » part, les lettres tapées restent.
    editor.run(undo)
    expect(editor.numbers).toEqual(['10', null, '20'])
    expect(editor.text).toContain('\n\nINT. CUISINE - JOUR\n\n')
    expect(labels(editor.decoupage)).toEqual(['S_0010', 'S_0020'])
    // Le numéro ne réapparaît pas tout seul ; le Cmd + Z suivant défait la frappe.
    editor.run(undo)
    expect(editor.text).not.toContain('CUISINE')
    // Rétablir, deux fois : la frappe, puis le numéro et la carte.
    editor.run(redo).run(redo)
    expect(editor.numbers).toEqual(['10', '15', '20'])
    expect(labels(editor.decoupage)).toEqual(['S_0010', 'S_0015', 'S_0020'])
  })

  it('Entrée en fin d’en-tête : le numéro est aussi une étape à part', () => {
    const editor = new LinkedEditor(TEXT, cards(['10', '20']), TEXT.length)
    editor.run(enterCommand).run(setElementType('scene_heading')).type('ext. rue - nuit')
    editor.run(enterCommand)
    expect(editor.numbers).toEqual(['10', '20', '30'])
    expect(labels(editor.decoupage)).toEqual(['S_0010', 'S_0020', 'S_0030'])
    editor.run(undo)
    expect(editor.numbers).toEqual(['10', '20', null])
    expect(editor.text).toContain('EXT. RUE - NUIT')
  })

  it('Annuler une autre frappe ne touche pas aux numéros ni aux cartes', () => {
    const editor = new LinkedEditor(TEXT, cards(['10', '20']), TEXT.indexOf('Action A.') + 9)
    editor.run(enterCommand).run(setElementType('scene_heading')).type('int. cuisine - jour')
    editor.moveTo(0).moveTo(editor.text.length)
    // Une seconde frappe, ailleurs dans le texte : Annuler ne défait qu'elle.
    const before = editor.text
    editor.run(({ state, dispatch }) => {
      const end = state.doc.length
      dispatch(
        state.update({ changes: { from: end, insert: '\nNote.\n' }, userEvent: 'input.type' })
      )
      return true
    })
    editor.run(undo)
    expect(editor.text).toBe(before)
    expect(editor.numbers).toEqual(['10', '15', '20'])
  })

  it('modifier un en-tête met à jour l’en-tête de la carte', () => {
    const editor = new LinkedEditor(TEXT, cards(['10', '20']), 'INT. A - JOUR'.length)
    editor.type('X')
    expect(editor.decoupage.scenes[0].heading).toBe('INT. A - JOURX')
  })

  it('copier-coller une scène : la copie reçoit un numéro et une carte, en une étape d’annulation', () => {
    const editor = new LinkedEditor(TEXT, cards(['10', '20*']), 0)
    editor.paste('INT. B - JOUR #20#\n\nAction B.\n\n', 0)
    expect(editor.numbers).toEqual(['5', '10', '20'])
    expect(editor.decoupage.scenes.map((scene) => scene.id)).toEqual(['n-1', 'S10', 'S20'])
    editor.run(undo)
    expect(editor.text).toBe(TEXT)
    expect(labels(editor.decoupage)).toEqual(['S_0010', 'S_0020'])
  })

  it('effacer un en-tête : la carte remplie devient orpheline ; Annuler la reconnecte', () => {
    const editor = new LinkedEditor(TEXT, cards(['10', '20*']), TEXT.length)
    const from = TEXT.indexOf('INT. B')
    editor.run(({ state, dispatch }) => {
      dispatch(
        state.update({
          changes: { from, to: from + 'INT. B - JOUR #20#\n\n'.length },
          userEvent: 'delete'
        })
      )
      return true
    })
    // La carte remplie reste (orpheline) ; une carte vide aurait été supprimée.
    expect(editor.decoupage.scenes.map((scene) => scene.id)).toEqual(['S10', 'S20'])
    expect(editor.numbers).toEqual(['10'])
    editor.run(undo)
    expect(editor.text).toBe(TEXT)
    expect(editor.decoupage.scenes[1].id).toBe('S20')
    expect(editor.decoupage.scenes[1].heading).toBe('INT. B - JOUR')
  })

  it('quitter l’éditeur numérote l’en-tête en cours de frappe', () => {
    const editor = new LinkedEditor(TEXT, cards(['10', '20']), TEXT.length)
    editor.run(enterCommand).run(setElementType('scene_heading')).type('ext. rue - nuit')
    expect(editor.numbers).toEqual(['10', '20', null])
    editor.settle()
    expect(editor.numbers).toEqual(['10', '20', '30'])
  })
})
