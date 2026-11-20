import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Decoupage } from '../../shared/projectTypes'
import { readScriptScenes } from '../../shared/scriptLink'
import { cards } from '../../shared/scriptLink/testHelpers'
import { deleteSelection, handleUndoCommand, recreateHeading } from '../cards/actions'
import { cardsStore, setSelection, unloadProject } from '../cards/cardsStore'
import { checkScenario, scriptStore, scriptText, unloadScenario } from '../script/scriptStore'
import { installFakeMain, type FakeMain } from './fakeMain'
import { closeBanner, linkStore, openLink, unloadLink } from './linkStore'

// Cartes orphelines (étape 8D) : scénario modifié dans un autre logiciel puis relu, résumé qui ne
// signale que ce qui vient de changer, « Recréer l'en-tête ».

const TITLE = 'Title: Mon film\n\n'
const BODY =
  'INT. A - JOUR #10#\n\nUn.\n\nINT. B - JOUR #20#\n\nDeux.\n\nINT. C - JOUR #30#\n\nTrois.\n'
const WITHOUT_B = 'INT. A - JOUR #10#\n\nUn.\n\nINT. C - JOUR #30#\n\nTrois.\n'

let main: FakeMain
let projectCounter = 0

/** Trois cartes reliées ; S_0020 a un nom (elle n'est donc jamais supprimée en silence). */
function decoupage(orphan20 = false): Decoupage {
  const result = cards(['10', '20*', '30'])
  result.scenes[0].heading = 'INT. A - JOUR'
  result.scenes[1].heading = 'INT. B - JOUR'
  result.scenes[1].orphan = orphan20
  result.scenes[2].heading = 'INT. C - JOUR'
  return result
}

async function open(body: string, decoupageAtOpening: Decoupage): Promise<void> {
  main = installFakeMain(TITLE + body, decoupageAtOpening)
  await openLink(`projet-orphelines-${++projectCounter}`)
}

const present = (): Decoupage => cardsStore.get().history!.present
const card = (id: string) => present().scenes.find((scene) => scene.id === id)!
const numbers = (): (string | null)[] =>
  readScriptScenes(scriptText() ?? '').map((scene) => scene.rawNumber)

/** Le fichier a été modifié dans un autre logiciel ; l'élève revient dans NeoScenar. */
async function editElsewhere(body: string): Promise<void> {
  main.external = TITLE + body
  await checkScenario()
}

beforeEach(() => {
  installFakeMain('', cards([]))
  unloadLink()
  unloadProject()
  unloadScenario()
  vi.stubGlobal('document', { activeElement: null })
  vi.stubGlobal('HTMLElement', class {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('scénario modifié ailleurs puis relu', () => {
  it('une scène disparaît : copie de sécurité, carte orpheline, bandeau qui reste avec « Voir »', async () => {
    await open(BODY, decoupage())
    vi.useFakeTimers()
    await editElsewhere(WITHOUT_B)

    expect(main.backups).toEqual(['reconcile'])
    expect(card('S20').orphan).toBe(true)
    expect(main.sentDecoupage.at(-1)?.scenes[1].orphan).toBe(true)
    expect(linkStore.get().banner).toEqual({
      lines: ['1 carte devenue orpheline (absente du scénario) : S_0020'],
      orphanId: 'S20',
      sheets: null
    })
    // Il reste affiché jusqu'à ce qu'on le ferme.
    vi.advanceTimersByTime(60_000)
    expect(linkStore.get().banner?.orphanId).toBe('S20')
    closeBanner()
    expect(linkStore.get().banner).toBeNull()
  })

  it('la carte orpheline est supprimée : le bandeau ne la signale plus', async () => {
    await open(BODY, decoupage())
    await editElsewhere(WITHOUT_B)
    expect(linkStore.get().banner?.orphanId).toBe('S20')
    setSelection({ ids: ['S20'], anchor: null })
    deleteSelection()
    const dialog = cardsStore.get().dialog
    if (dialog?.kind === 'confirm') dialog.onConfirm()
    expect(present().scenes.some((scene) => scene.id === 'S20')).toBe(false)
    // Le résumé ne contenait que cette carte : le bandeau se ferme.
    expect(linkStore.get().banner).toBeNull()
  })

  it('carte orpheline reconnectée (« Recréer l’en-tête ») : la ligne disparaît, les autres restent', async () => {
    // S_0030 reçoit un nom : elle n'est pas supprimée en silence, elle devient orpheline aussi.
    const named = decoupage()
    named.scenes[2].name = 'Trente'
    await open(BODY, named)
    vi.useFakeTimers()
    await editElsewhere('INT. A - JOUR #10#\n\nUn.\n')
    const lines = linkStore.get().banner?.lines ?? []
    expect(lines).toContain('2 cartes devenues orphelines (absentes du scénario) : S_0020, S_0030')
    recreateHeading('S20')
    const after = linkStore.get().banner
    expect(after?.lines).toContain('1 carte devenue orpheline (absente du scénario) : S_0030')
    expect(after?.lines.some((line) => line.includes('S_0020'))).toBe(false)
    expect(after?.orphanId).toBe('S30')
  })

  it('la scène revient : la carte se reconnecte ; le bandeau disparaît seul au bout de 10 s', async () => {
    await open(WITHOUT_B, decoupage(true))
    expect(linkStore.get().banner).toBeNull()
    vi.useFakeTimers()
    await editElsewhere(BODY)

    expect(card('S20').orphan).toBe(false)
    expect(linkStore.get().banner).toEqual({
      lines: ['1 carte reconnectée à sa scène : S_0020'],
      orphanId: null,
      sheets: null
    })
    vi.advanceTimersByTime(9_000)
    expect(linkStore.get().banner).not.toBeNull()
    vi.advanceTimersByTime(1_000)
    expect(linkStore.get().banner).toBeNull()
  })

  it('nouvelle scène sans numéro : numérotée et enregistrée, l’éditeur repart de ce texte', async () => {
    await open(BODY, decoupage())
    const version = scriptStore.get().version
    await editElsewhere(BODY + '\nEXT. RUE - NUIT\n\nQuatre.\n')

    expect(numbers()).toEqual(['10', '20', '30', '40'])
    expect(scriptStore.get().parts?.body).toContain('EXT. RUE - NUIT #40#')
    expect(scriptStore.get().version).toBe(version + 1)
    expect(main.sentScenario.at(-1)).toBe(TITLE + BODY + '\nEXT. RUE - NUIT #40#\n\nQuatre.\n')
    expect(present().scenes.map((scene) => scene.heading)).toContain('EXT. RUE - NUIT')
    expect(linkStore.get().banner?.lines).toEqual(['1 scène numérotée : S_0040'])
  })

  it('rien à rapprocher (texte seul modifié) : ni copie, ni bandeau', async () => {
    await open(BODY, decoupage())
    await editElsewhere(BODY.replace('Deux.', 'Deux, réécrit.'))
    expect(main.backups).toEqual([])
    expect(linkStore.get().banner).toBeNull()
    expect(scriptText()).toContain('Deux, réécrit.')
  })
})

describe('résumé à l’ouverture', () => {
  it('une carte déjà orpheline n’est plus signalée', async () => {
    await open(WITHOUT_B, decoupage(true))
    expect(main.backups).toEqual([])
    expect(main.sentDecoupage).toEqual([])
    expect(linkStore.get().banner).toBeNull()
  })

  it('une carte devenue orpheline depuis la dernière fois est signalée, une seule fois', async () => {
    await open(WITHOUT_B, decoupage())
    expect(main.backups).toEqual(['reconcile'])
    expect(linkStore.get().banner?.orphanId).toBe('S20')
    expect(main.sentDecoupage.at(-1)?.scenes[1].orphan).toBe(true)
  })
})

describe('recréer l’en-tête d’une carte orpheline', () => {
  it('l’en-tête revient à sa place avec son numéro ; Cmd + Z le retire', async () => {
    await open(WITHOUT_B, decoupage(true))
    recreateHeading('S20')
    expect(scriptText()).toBe(
      'INT. A - JOUR #10#\n\nUn.\n\nINT. B - JOUR #20#\n\nINT. C - JOUR #30#\n\nTrois.\n'
    )
    expect(card('S20').orphan).toBe(false)
    expect(cardsStore.get().selection.ids).toEqual(['S20'])

    handleUndoCommand('undo')
    expect(scriptText()).toBe(WITHOUT_B)
    expect(card('S20').orphan).toBe(true)
    handleUndoCommand('redo')
    expect(numbers()).toEqual(['10', '20', '30'])
    expect(card('S20').orphan).toBe(false)
  })

  it('carte orpheline sans en-tête : « SCÈNE À ÉCRIRE »', async () => {
    const withoutHeading = decoupage(true)
    withoutHeading.scenes[1].heading = ''
    await open(WITHOUT_B, withoutHeading)
    recreateHeading('S20')
    expect(scriptText()).toContain('Un.\n\n.SCÈNE À ÉCRIRE #20#\n\nINT. C')
  })
})
