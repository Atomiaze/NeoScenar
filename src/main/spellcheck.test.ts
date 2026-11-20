import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ Menu: {} }))
const { contextMenuTemplate } = await import('./spellcheck')

const flags = { canCut: true, canCopy: true, canPaste: true, canSelectAll: true }
const labels = (items: { label?: string; type?: string }[]): string[] =>
  items.map((item) => (item.type === 'separator' ? '—' : (item.label ?? '')))

const NO_ACTIONS = {
  replaceMisspelling: () => undefined,
  addToDictionary: () => undefined,
  editRevisionComment: () => undefined,
  removeRevisionMark: () => undefined
}

describe('menu du clic droit', () => {
  it('sur un texte surligné du mode révision : commentaire et « Effacer cette marque » avant Couper', () => {
    const info = {
      misspelledWord: '',
      dictionarySuggestions: [],
      isEditable: true,
      selectionText: '',
      editFlags: flags
    }
    expect(
      labels(contextMenuTemplate(info, NO_ACTIONS, { hasComment: false })).slice(0, 4)
    ).toEqual(['Ajouter un commentaire…', 'Effacer cette marque', '—', 'Couper'])
    expect(labels(contextMenuTemplate(info, NO_ACTIONS, { hasComment: true }))[0]).toBe(
      'Modifier le commentaire…'
    )
    expect(labels(contextMenuTemplate(info, NO_ACTIONS))[0]).toBe('Couper')
  })

  it('sur un mot souligné : suggestions en tête, Ajouter au dictionnaire, puis Couper / Copier / Coller', () => {
    const replaced: string[] = []
    const added: string[] = []
    const items = contextMenuTemplate(
      {
        misspelledWord: 'mainteant',
        dictionarySuggestions: ['maintenant', 'maintiens'],
        isEditable: true,
        selectionText: '',
        editFlags: flags
      },
      {
        replaceMisspelling: (word) => replaced.push(word),
        addToDictionary: (word) => added.push(word),
        editRevisionComment: () => undefined,
        removeRevisionMark: () => undefined
      }
    )
    expect(labels(items)).toEqual([
      'maintenant',
      'maintiens',
      '—',
      'Ajouter au dictionnaire',
      '—',
      'Couper',
      'Copier',
      'Coller',
      '—',
      'Tout sélectionner'
    ])
    items[0].click?.({} as never, undefined, {} as never)
    items[3].click?.({} as never, undefined, {} as never)
    expect(replaced).toEqual(['maintenant'])
    expect(added).toEqual(['mainteant'])
  })

  it('sans suggestion : une ligne grisée « Aucune suggestion »', () => {
    const items = contextMenuTemplate(
      {
        misspelledWord: 'zzz',
        dictionarySuggestions: [],
        isEditable: true,
        selectionText: '',
        editFlags: flags
      },
      NO_ACTIONS
    )
    expect(items[0]).toMatchObject({ label: 'Aucune suggestion', enabled: false })
  })

  it('hors d’un champ de texte : Copier seulement s’il y a une sélection, sinon pas de menu', () => {
    const base = {
      misspelledWord: '',
      dictionarySuggestions: [],
      isEditable: false,
      editFlags: flags
    }
    const actions = NO_ACTIONS
    expect(labels(contextMenuTemplate({ ...base, selectionText: 'texte' }, actions))).toEqual([
      'Copier'
    ])
    expect(contextMenuTemplate({ ...base, selectionText: '' }, actions)).toEqual([])
  })
})
