import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatSceneNumber } from '../../shared/numbering'
import type { Decoupage } from '../../shared/projectTypes'
import { numberKey } from '../../shared/decoupage/order'
import { readScriptScenes } from '../../shared/scriptLink'
import { cards } from '../../shared/scriptLink/testHelpers'
import { duplicateSelection } from '../cards/actions'
import {
  cardsStore,
  closeDialog,
  setSelection,
  unloadProject,
  type CardsDialog
} from '../cards/cardsStore'
import { EMPTY_SELECTION, single } from '../cards/selection'
import { fr } from '../i18n/fr'
import { scriptText, unloadScenario } from '../script/scriptStore'
import { installFakeMain } from './fakeMain'
import { openLink, unloadLink } from './linkStore'

// Essai 7 de l'étape 8C : dupliquer S_0020 plusieurs fois de suite (Cmd + D), avec une vignette
// (sa copie attend le disque), numéros verrouillés ou non. Rien ne doit échouer en silence.

const HEADINGS = ['INT. A - JOUR', 'INT. B - JOUR', 'INT. C - JOUR']
let projectCounter = 0
const errors: unknown[] = []

async function open(locked: boolean, numbers = ['10', '20*', '30']): Promise<void> {
  const decoupage: Decoupage = cards(numbers, { locked })
  decoupage.scenes.forEach((scene, i) => (scene.heading = HEADINGS[i]))
  decoupage.scenes[1].shots[0].thumbnail = 'storyboard/vignettes/S20-P10.png'
  // Le texte du scénario porte les mêmes numéros que les cartes.
  const body = decoupage.scenes
    .map((scene, i) => `${HEADINGS[i]} #${scene.number}#\n\nTexte ${i + 1}.\n`)
    .join('\n')
  installFakeMain(`Title: Film\n\n${body}`, decoupage)
  await openLink(`projet-${++projectCounter}`)
}

const present = (): Decoupage => cardsStore.get().history!.present
const labels = (): string[] =>
  present().scenes.map((scene) => formatSceneNumber(scene.number, scene.letter))
const selectedLabels = (): string[] =>
  present()
    .scenes.filter((scene) => cardsStore.get().selection.ids.includes(scene.id))
    .map((scene) => formatSceneNumber(scene.number, scene.letter))
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 20))

/** Cmd + D, puis attente de la copie de la vignette. Renvoie la fenêtre ouverte (et la ferme). */
async function duplicate(answer: 'yes' | 'no' = 'yes'): Promise<CardsDialog | null> {
  duplicateSelection()
  await settle()
  const dialog = cardsStore.get().dialog
  if (dialog) closeDialog()
  if (dialog?.kind === 'confirm' && answer === 'yes') {
    dialog.onConfirm()
    await settle()
  }
  return dialog
}

/** Le texte et les cartes sont d'accord : mêmes numéros, dans le même ordre. */
function expectInAgreement(): void {
  const inText = readScriptScenes(scriptText()!).map(
    (scene) => scene.number && numberKey(scene.number)
  )
  expect(present().scenes.map(numberKey)).toEqual(inText)
}

beforeEach(() => {
  installFakeMain('', cards([]))
  unloadLink()
  unloadProject()
  unloadScenario()
  errors.length = 0
  vi.stubGlobal('document', { activeElement: null })
  vi.stubGlobal('HTMLElement', class {})
  process.on('unhandledRejection', (error) => errors.push(error))
})

afterEach(() => {
  process.removeAllListeners('unhandledRejection')
  vi.unstubAllGlobals()
})

describe('dupliquer S_0020 plusieurs fois de suite', () => {
  it.each(['original', 'copie'] as const)(
    'en sélectionnant %s : copies après les précédentes, S_0021 à S_0029, puis proposition de renuméroter',
    async (select) => {
      await open(false)
      setSelection(single({ kind: 'scene', id: 'S20' }))
      const asked: string[] = []
      for (let i = 0; i < 10; i++) {
        if (select === 'original') setSelection(single({ kind: 'scene', id: 'S20' }))
        const dialog = await duplicate()
        if (dialog?.kind === 'confirm') asked.push(dialog.title)
        // La dernière copie est sélectionnée (étape 2b), juste après les précédentes.
        expect(selectedLabels()).toHaveLength(1)
        expectInAgreement()
        if (i === 8) {
          expect(labels()).toEqual([
            'S_0010',
            'S_0020',
            ...[21, 22, 23, 24, 25, 26, 27, 28, 29].map((n) => `S_00${n}`),
            'S_0030'
          ])
          expect(selectedLabels()).toEqual(['S_0029'])
        }
      }
      // Dixième copie : plus de numéro libre ; l'élève accepte de renuméroter.
      expect(asked).toEqual([fr.numbering.noFreeNumberScenes])
      expect(present().scenes).toHaveLength(13)
      expect(errors).toEqual([])
    }
  )

  it('numéros verrouillés : lettres qui se suivent, puis un message clair quand il n’y a plus de place', async () => {
    await open(true, ['10', '20*', '21'])
    const messages: string[] = []
    for (let i = 0; i < 28; i++) {
      setSelection(single({ kind: 'scene', id: 'S20' }))
      const dialog = await duplicate()
      if (dialog?.kind === 'message') messages.push(dialog.message)
      expectInAgreement()
    }
    expect(labels().slice(0, 4)).toEqual(['S_0010', 'S_0020', 'S_0020A', 'S_0020B'])
    expect(labels()).toContain('S_0020Z')
    expect(messages).toEqual([fr.numbering.noRoomDuplicate, fr.numbering.noRoomDuplicate])
    expect(errors).toEqual([])
  })
})

describe('jamais d’échec silencieux', () => {
  it('Cmd + D sans rien de sélectionné : un message le dit', async () => {
    await open(false)
    setSelection(EMPTY_SELECTION)
    const dialog = await duplicate()
    expect(dialog).toMatchObject({ kind: 'message', title: fr.numbering.nothingSelectedTitle })
  })

  it('erreur pendant la copie des vignettes : un message le dit, rien n’est modifié', async () => {
    await open(false)
    const neoscenar = (window as unknown as { neoscenar: Record<string, unknown> }).neoscenar
    neoscenar['copyThumbnailFiles'] = () => Promise.reject(new Error('Disque débranché.'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    setSelection(single({ kind: 'scene', id: 'S20' }))
    const dialog = await duplicate()
    expect(dialog?.kind === 'message' && dialog.message).toBe(
      fr.numbering.failed('Disque débranché.')
    )
    expect(labels()).toEqual(['S_0010', 'S_0020', 'S_0030'])
    expect(errors).toEqual([])
  })
})
