import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { redo, undo, undoDepth } from '@codemirror/commands'
import { replaceAll, SearchQuery, setSearchQuery } from '@codemirror/search'
import { Transaction, type EditorState, type TransactionSpec } from '@codemirror/state'
import { keymap, type EditorView } from '@codemirror/view'
import { SCRIPT_KEYS } from '../editing/scriptEditing'
import { createScriptState } from './createScriptState'
import { SEARCH_PHRASES } from './scriptSearch'

/** Phrases utilisées par le panneau de recherche de CodeMirror, lues dans son code. */
function searchPhrases(): string[] {
  const file = createRequire(import.meta.url).resolve('@codemirror/search')
  const code = readFileSync(file, 'utf8')
  const phrases = new Set<string>()
  for (const match of code.matchAll(/phrase\((?:[\w.]+,\s*)?"([^"]+)"/g)) phrases.add(match[1])
  return [...phrases]
}

/** Exécute une commande qui attend une vue avec seulement un état et un dispatch. */
function run(state: EditorState, command: (view: EditorView) => boolean): EditorState {
  let next = state
  const fake = {
    get state() {
      return next
    },
    dispatch: (...specs: (Transaction | TransactionSpec)[]) => {
      const [first] = specs
      next =
        first instanceof Transaction
          ? first.state
          : next.update(...(specs as TransactionSpec[])).state
    }
  }
  command(fake as unknown as EditorView)
  return next
}

describe('rechercher et remplacer', () => {
  it('toutes les phrases du panneau ont une traduction française', () => {
    const phrases = searchPhrases()
    expect(phrases.length).toBeGreaterThan(10)
    expect(phrases.filter((phrase) => !(phrase in SEARCH_PHRASES))).toEqual([])
  })

  it('Cmd + G reste la transition, même depuis le panneau de recherche', () => {
    const binding = SCRIPT_KEYS.find((key) => key.key === 'Mod-g')
    expect(binding?.scope).toContain('search-panel')
    // Le raccourci « Rechercher le suivant » de CodeMirror n'est pas installé.
    const state = createScriptState('Elle sort.')
    const modG = state
      .facet(keymap)
      .flat()
      .filter((key) => key.key === 'Mod-g' || key.mac === 'Mod-g')
    expect(modG.map((key) => key.run)).toEqual([binding?.run])
  })

  it('« Tout remplacer » compte pour une seule étape d’annulation', () => {
    let state = createScriptState('MARIE\nBonjour.\n\nMARIE\nAu revoir.\n\nMARIE\nÀ demain.')
    state = state.update({
      effects: setSearchQuery.of(new SearchQuery({ search: 'MARIE', replace: 'LÉA' }))
    }).state
    state = run(state, replaceAll)
    expect(state.doc.toString()).toBe('LÉA\nBonjour.\n\nLÉA\nAu revoir.\n\nLÉA\nÀ demain.')
    expect(undoDepth(state)).toBe(1)
    state = run(state, (view) => undo(view))
    expect(state.doc.toString()).toBe('MARIE\nBonjour.\n\nMARIE\nAu revoir.\n\nMARIE\nÀ demain.')
    state = run(state, (view) => redo(view))
    expect(state.doc.toString()).toContain('LÉA')
  })
})

describe('correcteur orthographique', () => {
  it('désactivé sur les lignes d’en-tête et de personnage, actif ailleurs', async () => {
    const { lineAttributes } = await import('./decorations')
    expect(lineAttributes('scene_heading')).toEqual({ spellcheck: 'false' })
    expect(lineAttributes('character')).toEqual({ spellcheck: 'false' })
    for (const type of ['action', 'dialogue', 'parenthetical', 'transition', 'lyrics'] as const) {
      expect(lineAttributes(type)).toEqual({})
    }
  })
})
