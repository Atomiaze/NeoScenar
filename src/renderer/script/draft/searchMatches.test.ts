import { describe, expect, it } from 'vitest'
import { SearchQuery } from '@codemirror/search'
import { EditorState } from '@codemirror/state'
import { matchesOf } from './searchMatches'

describe('recherche dans la fenêtre d’un brouillon', () => {
  it('trouve chaque occurrence, avec les mêmes options que l’éditeur', () => {
    const state = EditorState.create({ doc: 'INT. B - JOUR\n\nSecrète, très secrète.' })
    expect(matchesOf(state, new SearchQuery({ search: 'secrète' }))).toEqual([
      { from: 15, to: 22 },
      { from: 29, to: 36 }
    ])
    expect(matchesOf(state, new SearchQuery({ search: 'secrète', caseSensitive: true }))).toEqual([
      { from: 29, to: 36 }
    ])
  })
})
