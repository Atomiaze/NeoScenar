import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cards } from '../../shared/scriptLink/testHelpers'
import { cardsStore, loadProject, unloadProject } from '../cards/cardsStore'
import { loadScenario, scriptStore, unloadScenario } from '../script/scriptStore'
import { installFakeMain } from './fakeMain'
import { linkStore, openLink, unloadLink } from './linkStore'

// Changement de projet alors qu'un module est affiché : le module (Scénario ou Cartes) lance le
// chargement du nouveau projet juste avant que la vue du projet ne lance le rapprochement. Celui-ci
// doit attendre ce chargement en cours, pas le croire déjà fini.

beforeEach(() => {
  unloadLink()
  unloadProject()
  unloadScenario()
})

afterEach(() => vi.unstubAllGlobals())

/** Le fichier demandé répond après l'autre (lecture plus lente), comme dans l'application. */
function slow(name: 'getScenario' | 'getDecoupage'): void {
  const api = (window as unknown as { neoscenar: Record<string, () => Promise<unknown>> }).neoscenar
  const fast = api[name]
  api[name] = () => new Promise((resolve) => setTimeout(() => resolve(fast()), 20))
}

const SCRIPT = 'Title: Mon film\n\nINT. A #10#\n\nINT. B #20#\n\nINT. C #30#\n\nINT. D #40#\n'

describe('rapprochement à l’ouverture, chargement déjà lancé par un module', () => {
  it('le Scénario a lancé le chargement du texte : les cartes sont quand même liées', async () => {
    const main = installFakeMain(SCRIPT, cards(['10', '20']))
    slow('getScenario')
    void loadScenario('projet-a')
    await openLink('projet-a')
    expect(scriptStore.get().parts?.body).toContain('INT. D')
    expect(linkStore.get()).toMatchObject({ ready: true, active: true })
    expect(cardsStore.get().history?.present.scenes.map((s) => s.number)).toEqual([10, 20, 30, 40])
    expect(main.sentDecoupage.at(-1)?.scenes).toHaveLength(4)
  })

  it('les Cartes ont lancé le chargement du découpage : les cartes sont quand même liées', async () => {
    installFakeMain(SCRIPT, cards(['10', '20']))
    slow('getDecoupage')
    void loadProject('projet-b')
    await openLink('projet-b')
    expect(linkStore.get()).toMatchObject({ ready: true, active: true })
    expect(cardsStore.get().history?.present.scenes.map((s) => s.number)).toEqual([10, 20, 30, 40])
  })

  it('changement A → B pendant que A charge encore : la lecture tardive de A n’écrase pas B', async () => {
    // Le faux processus principal répond pour le projet ouvert au moment de la demande, avec un
    // délai par projet : A (demandé d'abord) répond après B.
    const files: Record<string, { scenario: string; decoupage: ReturnType<typeof cards> }> = {
      A: { scenario: 'Title: A\n\nINT. ALPHA #10#\n', decoupage: cards(['10'], { locked: true }) },
      B: { scenario: SCRIPT, decoupage: cards(['10', '20']) }
    }
    let current = 'A'
    const main = installFakeMain(files.A.scenario, files.A.decoupage)
    const api = (window as unknown as { neoscenar: Record<string, unknown> }).neoscenar
    const delayed = <T>(value: T, ms: number) =>
      new Promise((resolve) => setTimeout(() => resolve({ ok: true, value }), ms))
    api.getScenario = () => {
      const file = files[current]
      return delayed(file.scenario, current === 'A' ? 40 : 5)
    }
    api.getDecoupage = () => {
      const file = files[current]
      return delayed(file.decoupage, current === 'A' ? 40 : 5)
    }

    // A s'ouvre depuis le Scénario affiché, puis B est ouvert avant la fin des lectures de A.
    void loadScenario('A')
    const openingA = openLink('A')
    current = 'B'
    unloadLink()
    unloadProject()
    unloadScenario()
    void loadScenario('B')
    await openLink('B')
    await openingA
    await new Promise((resolve) => setTimeout(resolve, 60))

    expect(scriptStore.get()).toMatchObject({ projectId: 'B' })
    expect(scriptStore.get().parts?.body).toContain('INT. D')
    expect(scriptStore.get().parts?.body).not.toContain('ALPHA')
    expect(cardsStore.get().projectId).toBe('B')
    expect(cardsStore.get().history?.present.numbersLocked).toBe(false)
    expect(cardsStore.get().history?.present.scenes.map((s) => s.number)).toEqual([10, 20, 30, 40])
    expect(linkStore.get()).toMatchObject({ projectId: 'B', ready: true, active: true })
    // Rien de A n'a été envoyé pendant que B est ouvert.
    expect(main.sentScenario.every((text) => !text.includes('ALPHA'))).toBe(true)
  })
})
