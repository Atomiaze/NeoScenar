import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parse } from '@neoscenar/fountain'
import { formatSceneNumber } from '../../shared/numbering'
import type { Decoupage } from '../../shared/projectTypes'
import { numberKey } from '../../shared/decoupage/order'
import { draftNumberKeys, readScriptScenes, sceneDescription } from '../../shared/scriptLink'
import { cards } from '../../shared/scriptLink/testHelpers'
import { duplicateScenesFromMenu } from '../cards/actions'
import {
  cardsStore,
  closeDialog,
  setSelection,
  unloadProject,
  type CardsDialog
} from '../cards/cardsStore'
import { single } from '../cards/selection'
import { editScriptFromSheets, scriptText, unloadScenario } from '../script/scriptStore'
import { stepCards } from './cardsLink'
import { installFakeMain, type FakeMain } from './fakeMain'
import { openLink, unloadLink } from './linkStore'

// Clic droit « Dupliquer avec contenu » / « Dupliquer sans contenu » : la copie suit son original,
// porte un numéro neuf, garde le lien avec sa carte ; une étape d'annulation des cartes.

const SCRIPT = [
  'INT. A - JOUR #10#\n\nTexte un.\n',
  'INT. B - NUIT #20#\n\n= Résumé de B.\n\nAction de B.\n\nMARIE\nBonjour.\n',
  'INT. C - JOUR #30#\n\n[[BROUILLON]]\n\n= Résumé de C.\n\nTexte trois.\n'
].join('\n')

let main: FakeMain
let projectCounter = 0

async function open(): Promise<void> {
  const decoupage: Decoupage = cards(['10', '20*', '30'])
  decoupage.scenes.forEach(
    (scene, i) => (scene.heading = ['INT. A - JOUR', 'INT. B - NUIT', 'INT. C - JOUR'][i])
  )
  decoupage.scenes[1].color = '#f2c94c'
  main = installFakeMain(`Title: Film\n\n${SCRIPT}`, decoupage)
  await openLink(`projet-${++projectCounter}`)
}

const present = (): Decoupage => cardsStore.get().history!.present
const labels = (): string[] =>
  present().scenes.map((scene) => formatSceneNumber(scene.number, scene.letter))
const text = (): string => scriptText()!
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 20))
const copyOf = (id: string) => present().scenes.find((scene) => scene.id === id)!

/** Clic droit sur la carte `id`, puis l'entrée choisie ; renvoie la fenêtre ouverte (fermée). */
async function duplicate(id: string, withContent: boolean): Promise<CardsDialog | null> {
  duplicateScenesFromMenu({ kind: 'scene', id }, withContent)
  await settle()
  const dialog = cardsStore.get().dialog
  if (dialog?.kind === 'confirm') {
    closeDialog()
    dialog.onConfirm()
    await settle()
  } else if (dialog) closeDialog()
  return dialog
}

/** Texte et cartes d'accord, aucun numéro en double, et le Fountain enregistré se relit. */
function expectSound(): void {
  const inText = readScriptScenes(text()).map((scene) => scene.number && numberKey(scene.number))
  expect(present().scenes.map(numberKey)).toEqual(inText)
  expect(new Set(inText).size).toBe(inText.length)
  const saved = main.sentScenario[main.sentScenario.length - 1]
  expect(saved).toBeDefined()
  const doc = parse(saved, { titlePage: true })
  expect(doc.elements.filter((element) => element.type === 'scene_heading')).toHaveLength(
    inText.length
  )
}

/** Bloc d'une scène dans le texte (sans les lignes vides finales). */
function block(label: string): string {
  const key = label.replace(/^S_0*/, '')
  const scene = readScriptScenes(text()).find(
    (item) => item.number && numberKey(item.number) === key
  )!
  return text().slice(scene.block.from, scene.block.to).replace(/\n+$/, '')
}

beforeEach(() => {
  installFakeMain('', cards([]))
  unloadLink()
  unloadProject()
  unloadScenario()
  vi.stubGlobal('document', { activeElement: null })
  vi.stubGlobal('HTMLElement', class {})
})

afterEach(() => vi.unstubAllGlobals())

describe('dupliquer sans contenu', () => {
  it('en-tête, titre, résumé et couleur ; corps vide ; pas de plans', async () => {
    await open()
    setSelection(single({ kind: 'scene', id: 'S20' }))
    await duplicate('S20', false)
    expect(labels()).toEqual(['S_0010', 'S_0020', 'S_0021', 'S_0030'])
    const copy = present().scenes[2]
    expect(copy).toMatchObject({ name: 'Nom 20', heading: 'INT. B - NUIT', color: '#f2c94c' })
    expect(copy.shots).toEqual([])
    expect(copy.id).not.toBe('S20')
    expect(block('S_0021')).toBe('INT. B - NUIT #21#\n\n= Résumé de B.')
    expect(sceneDescription(text(), { number: 21, letter: '' })).toBe('Résumé de B.')
    expect(cardsStore.get().selection.ids).toEqual([copy.id])
    expectSound()
  })

  it('une scène brouillon donne une copie brouillon', async () => {
    await open()
    await duplicate('S30', false)
    expect(labels()).toEqual(['S_0010', 'S_0020', 'S_0030', 'S_0031'])
    expect(draftNumberKeys(text()).has('31')).toBe(true)
    expect(sceneDescription(text(), { number: 31, letter: '' })).toBe('Résumé de C.')
    expect(block('S_0031')).not.toContain('Texte trois.')
    expectSound()
  })

  it('Cmd + Z (cartes) rend le texte exact d’avant, puis Rétablir refait la copie', async () => {
    await open()
    const before = text()
    await duplicate('S20', false)
    const after = text()
    stepCards('undo')
    expect(cardsStore.get().dialog).toBeNull()
    expect(text()).toBe(before)
    expect(labels()).toEqual(['S_0010', 'S_0020', 'S_0030'])
    stepCards('redo')
    expect(text()).toBe(after)
    expect(labels()).toEqual(['S_0010', 'S_0020', 'S_0021', 'S_0030'])
    expectSound()
  })
})

describe('dupliquer avec contenu', () => {
  it('tout le texte de la scène, la carte, mais pas les plans', async () => {
    await open()
    await duplicate('S20', true)
    expect(block('S_0021')).toBe(block('S_0020').replace('#20#', '#21#'))
    expect(copyOf(present().scenes[2].id).shots).toEqual([])
    expect(present().scenes[1].shots).toHaveLength(1)
    expectSound()
  })

  it('la note de brouillon suit le texte', async () => {
    await open()
    await duplicate('S30', true)
    expect(draftNumberKeys(text()).has('31')).toBe(true)
    expect(block('S_0031')).toContain('Texte trois.')
    expectSound()
  })

  it('annuler sans question tant que la copie n’a pas été modifiée ; rétablir rend le texte', async () => {
    await open()
    const before = text()
    await duplicate('S20', true)
    const after = text()
    stepCards('undo')
    expect(cardsStore.get().dialog).toBeNull()
    expect(text()).toBe(before)
    stepCards('redo')
    expect(text()).toBe(after)
    expectSound()
  })

  it('texte ajouté dans la copie : l’annulation prévient avant de le supprimer', async () => {
    await open()
    await duplicate('S20', true)
    const at = text().indexOf('Bonjour.', text().indexOf('#21#')) + 'Bonjour.'.length
    editScriptFromSheets([{ from: at, to: at, insert: '\n\nUne ligne de plus.' }])
    stepCards('undo')
    expect(cardsStore.get().dialog?.kind).toBe('confirm')
    closeDialog()
    expect(text()).toContain('Une ligne de plus.')
  })
})

describe('plusieurs scènes et copies successives', () => {
  it('chaque copie juste après son original', async () => {
    await open()
    setSelection({
      ids: ['S10', 'S20'],
      anchor: { kind: 'scene', id: 'S20' }
    })
    await duplicate('S20', true)
    expect(labels()).toEqual(['S_0010', 'S_0011', 'S_0020', 'S_0021', 'S_0030'])
    expect(block('S_0011')).toBe('INT. A - JOUR #11#\n\nTexte un.')
    expect(cardsStore.get().selection.ids).toHaveLength(2)
    expectSound()
  })

  it('carte visée hors de la sélection : seule elle est copiée', async () => {
    await open()
    setSelection(single({ kind: 'scene', id: 'S10' }))
    await duplicate('S30', false)
    expect(labels()).toEqual(['S_0010', 'S_0020', 'S_0030', 'S_0031'])
  })

  it('dix copies : numéros qui se suivent, jamais en double, puis renumérotation proposée', async () => {
    await open()
    const asked: string[] = []
    for (let i = 0; i < 10; i++) {
      const dialog = await duplicate('S20', i % 2 === 0)
      if (dialog) asked.push(dialog.kind)
      expectSound()
    }
    expect(asked).toEqual(['confirm'])
    expect(present().scenes).toHaveLength(13)
    expect(
      present().scenes.every((scene, i) => i === 0 || scene.number > present().scenes[i - 1].number)
    ).toBe(true)
  })
})
