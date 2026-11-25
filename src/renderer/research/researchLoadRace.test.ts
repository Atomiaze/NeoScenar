import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { creditsStore, loadCredits, unloadCredits } from './creditsStore'
import { loadDocuments } from './documentsActions'
import { loadSheets, researchStore, unloadResearch } from './researchStore'

// Changement de projet A → B pendant que Données du projet relit encore A (fiches, documents,
// générique) : la réponse de A, arrivée après celle de B, ne doit pas écraser B.

type Key = 'A' | 'B'

const FILES = {
  A: { sheet: 'ALICE', document: 'notes-alpha', credits: 'Générique A', script: 'INT. ALPHA' },
  B: { sheet: 'BORIS', document: 'notes-bravo', credits: 'Générique B', script: 'INT. BRAVO' }
}

let current: Key = 'A'

/** Le processus principal répond pour le projet ouvert au moment de la demande ; A plus lentement. */
function installFakeMain(): void {
  const answer = <T>(value: (key: Key) => T) => {
    const key = current
    return new Promise((resolve) =>
      setTimeout(() => resolve({ ok: true, value: value(key) }), key === 'A' ? 40 : 5)
    )
  }
  vi.stubGlobal('window', {
    neoscenar: {
      flushSheets: () => Promise.resolve(),
      listSheets: (kind: string) =>
        answer((key) =>
          kind === 'personnages'
            ? [{ fileName: `${FILES[key].sheet}.md`, nom: FILES[key].sheet, props: {}, images: [] }]
            : []
        ),
      listDocuments: () =>
        answer((key) => ({
          name: '',
          path: '',
          folders: [],
          notes: [{ name: FILES[key].document, path: FILES[key].document }]
        })),
      getCredits: () =>
        answer((key) => ({ data: { titre: FILES[key].credits }, template: { blocs: [] } })),
      getScenario: () => answer((key) => FILES[key].script)
    }
  })
}

/**
 * Ce que fait la vue du projet quand un autre projet est ouvert, une fois les demandes de A parties
 * (le générique écrit d'abord ce qui est en attente, puis demande).
 */
async function switchToB(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1))
  current = 'B'
  unloadResearch()
  unloadCredits()
}

beforeEach(() => {
  current = 'A'
  unloadResearch()
  unloadCredits()
  installFakeMain()
})

afterEach(() => vi.unstubAllGlobals())

const settle = () => new Promise((resolve) => setTimeout(resolve, 80))

describe('Données du projet : réponse tardive de l’ancien projet', () => {
  it('fiches : la liste de A arrivée en retard n’écrase pas celle de B', async () => {
    void loadSheets()
    await switchToB()
    await loadSheets()
    await settle()
    const names = researchStore.get().sheets.personnages.map((sheet) => sheet.nom)
    expect(names).toEqual(['BORIS'])
  })

  it('documents : l’arbre de A arrivé en retard n’écrase pas celui de B', async () => {
    void loadDocuments()
    await switchToB()
    await loadDocuments()
    await settle()
    expect(JSON.stringify(researchStore.get().documents)).toContain('notes-bravo')
    expect(JSON.stringify(researchStore.get().documents)).not.toContain('notes-alpha')
  })

  it('générique : celui de A arrivé en retard n’écrase pas celui de B', async () => {
    void loadCredits()
    await switchToB()
    await loadCredits()
    await settle()
    expect(JSON.stringify(creditsStore.get().content?.data)).toContain('Générique B')
    expect(creditsStore.get().script).toBe('INT. BRAVO')
  })

  it('sans changement de projet, une relecture s’applique normalement', async () => {
    await Promise.all([loadSheets(), loadDocuments(), loadCredits()])
    expect(researchStore.get().sheets.personnages.map((sheet) => sheet.nom)).toEqual(['ALICE'])
    expect(JSON.stringify(researchStore.get().documents)).toContain('notes-alpha')
    expect(creditsStore.get().script).toBe('INT. ALPHA')
  })
})
