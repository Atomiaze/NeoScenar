import { ChangeSet } from '@codemirror/state'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readScriptScenes } from '../../shared/scriptLink'
import { cards } from '../../shared/scriptLink/testHelpers'
import type { Decoupage } from '../../shared/projectTypes'
import {
  addScene,
  deleteSelection,
  editScene,
  editSceneDescription,
  handleUndoCommand,
  moveSceneTo,
  setSceneDraft
} from '../cards/actions'
import { cardsStore, closeDialog, setSelection, unloadProject } from '../cards/cardsStore'
import { single } from '../cards/selection'
import { fr } from '../i18n/fr'
import { ScenarioConflictGate } from '../script/ScenarioConflictGate'
import {
  editScriptFromCards,
  scriptText,
  setScenarioStatus,
  unloadScenario
} from '../script/scriptStore'
import { installFakeMain, type FakeMain } from './fakeMain'
import { openLink, unloadLink } from './linkStore'

// Des cartes vers le scénario (étape 8C), sans l'éditeur affiché : chaque action des cartes modifie
// aussi le texte, enregistré comme d'habitude, et Cmd + Z dans les cartes défait les deux.

const TITLE = 'Title: Mon film\n\n'
const BODY = [
  'INT. A - JOUR #10#',
  '',
  'Action A.',
  '',
  'INT. B - JOUR #20#',
  '',
  'MARIE',
  'Bonjour.',
  '',
  '.SCÈNE À ÉCRIRE #30#',
  ''
].join('\n')

let main: FakeMain
let projectCounter = 0

async function open(): Promise<void> {
  const decoupage: Decoupage = cards(['10', '20*', '30'])
  decoupage.scenes[0].heading = 'INT. A - JOUR'
  decoupage.scenes[1].heading = 'INT. B - JOUR'
  main = installFakeMain(TITLE + BODY, decoupage)
  await openLink(`projet-${++projectCounter}`)
  expect(main.sentScenario).toEqual([])
}

const numbers = (): (string | null)[] =>
  readScriptScenes(scriptText() ?? '').map((scene) => scene.rawNumber)
const lastSaved = (): string => main.sentScenario[main.sentScenario.length - 1]
const undo = (): void => handleUndoCommand('undo')
const redo = (): void => handleUndoCommand('redo')

/** Confirme la fenêtre ouverte et renvoie son message. */
function confirmDialog(): string | undefined {
  const dialog = cardsStore.get().dialog
  if (dialog?.kind !== 'confirm') throw new Error('Pas de confirmation ouverte')
  closeDialog()
  dialog.onConfirm()
  return dialog.message
}

beforeEach(async () => {
  // Le nettoyage parle déjà au processus principal (menu Annuler).
  installFakeMain('', cards([]))
  unloadLink()
  unloadProject()
  unloadScenario()
  // Cmd + Z vérifie qu'aucun champ de saisie n'a le focus.
  vi.stubGlobal('document', { activeElement: null })
  vi.stubGlobal('HTMLElement', class {})
  await open()
})

afterEach(() => vi.unstubAllGlobals())

describe('des cartes vers le scénario', () => {
  it('ajouter une scène : l’en-tête est écrit et enregistré, même sans l’éditeur ; Cmd + Z le retire', () => {
    setSelection(single({ kind: 'scene', id: 'S20' }))
    addScene()
    expect(numbers()).toEqual(['10', '20', '25', '30'])
    expect(lastSaved()).toContain('Bonjour.\n\n.SCÈNE À ÉCRIRE #25#\n\n.SCÈNE À ÉCRIRE #30#')
    expect(lastSaved().startsWith(TITLE)).toBe(true)
    undo()
    expect(scriptText()).toBe(BODY)
    expect(cardsStore.get().history?.present.scenes.map((scene) => scene.id)).toEqual([
      'S10',
      'S20',
      'S30'
    ])
    redo()
    expect(numbers()).toEqual(['10', '20', '25', '30'])
  })

  it('supprimer une scène : la confirmation donne la longueur du texte ; Cmd + Z le restitue', () => {
    setSelection(single({ kind: 'scene', id: 'S20' }))
    deleteSelection()
    expect(confirmDialog()).toBe(fr.scriptLink.textDeleted(1, '4 lignes'))
    expect(numbers()).toEqual(['10', '30'])
    undo()
    expect(scriptText()).toBe(BODY)
    expect(cardsStore.get().history?.present.scenes[1].name).toBe('Nom 20')
  })

  it('supprimer une scène qui n’a que son en-tête : « Cette scène n’a pas encore de texte »', () => {
    setSelection(single({ kind: 'scene', id: 'S30' }))
    deleteSelection()
    expect(confirmDialog()).toBe('Cette scène n’a pas encore de texte.')
    expect(numbers()).toEqual(['10', '20'])
  })

  it('annuler l’ajout d’une scène sous laquelle on a écrit : confirmation avec le nombre de lignes', () => {
    setSelection(single({ kind: 'scene', id: 'S20' }))
    addScene()
    // L'élève écrit sous le nouvel en-tête (comme dans l'éditeur).
    const text = scriptText()!.replace(
      '.SCÈNE À ÉCRIRE #25#\n',
      '.SCÈNE À ÉCRIRE #25#\n\nIl pleut.\n'
    )
    typeInScript(text)
    undo()
    expect(confirmDialog()).toBe(fr.scriptLink.undoAddMessage(1))
    expect(scriptText()).not.toContain('Il pleut.')
    expect(numbers()).toEqual(['10', '20', '30'])
  })

  it('déplacer une scène : le bloc suit avec son nouveau numéro ; Cmd + Z le remet', () => {
    moveSceneTo('S10', 2)
    expect(numbers()).toEqual(['20', '30', '40'])
    expect(scriptText()!.indexOf('INT. A')).toBeGreaterThan(scriptText()!.indexOf('Bonjour.'))
    undo()
    expect(scriptText()).toBe(BODY)
  })

  it('modifier l’en-tête et écrire la description depuis la fiche, puis annuler', () => {
    editScene('S30', { heading: 'ext. jardin - nuit' }, 'heading')
    expect(scriptText()).toContain('EXT. JARDIN - NUIT #30#')
    editSceneDescription('S30', 'Chloé creuse.')
    expect(scriptText()).toContain('EXT. JARDIN - NUIT #30#\n\n= Chloé creuse.')
    undo()
    expect(scriptText()).not.toContain('Chloé creuse.')
    undo()
    expect(scriptText()).toBe(BODY)
  })

  it('marquer une scène comme brouillon depuis sa fiche, puis annuler et rétablir', () => {
    setSceneDraft('S20', true)
    expect(scriptText()).toContain('INT. B - JOUR #20#\n[[BROUILLON]]\n')
    undo()
    expect(scriptText()).toBe(BODY)
    redo()
    expect(scriptText()).toContain('INT. B - JOUR #20#\n[[BROUILLON]]\n')
    setSceneDraft('S20', false)
    expect(scriptText()).toBe(BODY)
    undo()
    expect(scriptText()).toContain('[[BROUILLON]]')
  })

  it('scenario.fountain modifié ailleurs : la fenêtre de conflit s’affiche, même dans les Cartes', () => {
    setSelection(single({ kind: 'scene', id: 'S20' }))
    addScene()
    // Le processus principal a refusé d'écraser le fichier (voir scenarioSession.test.ts) et le
    // signale à l'interface.
    expect(renderToString(createElement(ScenarioConflictGate))).toBe('')
    setScenarioStatus({ state: 'conflict' })
    expect(renderToString(createElement(ScenarioConflictGate))).toContain(fr.script.conflict.title)
  })
})

/**
 * L'élève écrit dans le scénario (ici sans éditeur affiché) : le document reçoit le nouveau texte,
 * sans étape dans l'historique des cartes.
 */
function typeInScript(text: string): void {
  const current = scriptText()!
  editScriptFromCards(ChangeSet.of([{ from: 0, to: current.length, insert: text }], current.length))
}
