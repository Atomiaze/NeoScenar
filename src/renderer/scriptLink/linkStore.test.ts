import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Decoupage } from '../../shared/projectTypes'
import { cards } from '../../shared/scriptLink/testHelpers'
import { cardsStore, unloadProject } from '../cards/cardsStore'
import { scriptStore, unloadScenario } from '../script/scriptStore'
import { installFakeMain as install, type FakeMain } from './fakeMain'
import { linkStore, openLink, unloadLink } from './linkStore'

// Ouverture d'un projet : chargement des deux fichiers, copie de sécurité, première liaison.
// Le processus principal est remplacé par un faux qui retient ce qu'on lui envoie.

let main: FakeMain

function installFakeMain(scenario: string, decoupage: Decoupage, backupFails = false): void {
  main = install(scenario, decoupage, backupFails)
}

let projectCounter = 0
const nextProject = (): string => `projet-${++projectCounter}`

beforeEach(() => {
  unloadLink()
  unloadProject()
  unloadScenario()
})

afterEach(() => vi.unstubAllGlobals())

const TITLE = 'Title: Mon film\n\n'

describe('ouverture d’un projet : lien scénario ↔ cartes', () => {
  it('première liaison : copie de sécurité d’abord, puis numéros écrits et fenêtre de résumé', async () => {
    const decoupage = cards(['10', '20', '30'], { linked: false })
    installFakeMain(`${TITLE}INT. CUISINE - JOUR\n\nAction.\n`, decoupage)
    await openLink(nextProject())

    expect(main.backups).toEqual(['link'])
    expect(main.sentScenario).toEqual([
      `${TITLE}INT. CUISINE - JOUR #10#\n\nAction.\n\n.SCÈNE À ÉCRIRE #20#\n\n.SCÈNE À ÉCRIRE #30#\n`
    ])
    expect(main.sentDecoupage.at(-1)?.scriptLinked).toBe(true)
    // Le texte de départ de l'éditeur est déjà le texte relié.
    expect(scriptStore.get().parts?.body).toContain('#10#')
    // La liaison n'est pas une étape d'annulation des cartes.
    expect(cardsStore.get().history?.past).toEqual([])

    const { ready, active, report } = linkStore.get()
    expect(ready && active).toBe(true)
    expect(report).toMatchObject({
      cardCount: 3,
      sceneCount: 1,
      pairs: ['S_0010 ↔ INT. CUISINE - JOUR'],
      backupFolder: 'neoscenar/sauvegardes/avant_liaison_x'
    })
  })

  it('projet déjà lié et rien à faire : ni copie, ni écriture, ni fenêtre', async () => {
    installFakeMain(`${TITLE}INT. A #10#\n`, {
      ...cards(['10']),
      scenes: [{ ...cards(['10']).scenes[0], heading: 'INT. A' }]
    })
    await openLink(nextProject())
    expect(main.backups).toEqual([])
    expect(main.sentScenario).toEqual([])
    expect(main.sentDecoupage).toEqual([])
    expect(linkStore.get()).toMatchObject({ ready: true, active: true, report: null })
  })

  it('projet déjà lié, scénario modifié ailleurs : copie « avant_rapprochement », sans fenêtre', async () => {
    installFakeMain(`${TITLE}INT. A #10#\n\nINT. NOUVELLE\n`, cards(['10']))
    await openLink(nextProject())
    expect(main.backups).toEqual(['reconcile'])
    expect(main.sentScenario.at(-1)).toContain('INT. NOUVELLE #20#')
    expect(linkStore.get().report).toBeNull()
  })

  it('copie de sécurité impossible : rien n’est modifié, le lien reste inactif', async () => {
    installFakeMain(`${TITLE}INT. CUISINE\n`, cards(['10'], { linked: false }), true)
    await openLink(nextProject())
    expect(main.sentScenario).toEqual([])
    expect(main.sentDecoupage).toEqual([])
    expect(linkStore.get()).toMatchObject({
      ready: true,
      active: false,
      backupError: 'Disque plein.'
    })
  })
})
