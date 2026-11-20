import { describe, expect, it, vi } from 'vitest'
import type { MenuItemConstructorOptions } from 'electron'
import { buildMenuTemplate, type MenuActions, type MenuOptions } from './menuTemplate'

const noop = (): void => undefined
const actions: MenuActions = {
  newProject: noop,
  openProject: noop,
  completeStructure: noop,
  projectSettings: noop,
  exportToBlender: noop,
  exportPdf: noop,
  exportStoryboard: noop,
  exportPlanning: noop,
  exportCredits: noop,
  versions: noop,
  clearPreviews: noop,
  closeProject: noop,
  saveNow: noop,
  undo: noop,
  redo: noop,
  duplicate: noop,
  duplicateScene: noop,
  zoom: noop,
  hideApp: noop,
  toggleSceneNavigator: noop,
  toggleElementBar: noop,
  checkLineWrapping: noop,
  titlePage: noop,
  find: noop,
  settings: noop,
  about: noop,
  toggleFocusMode: noop
}

function build(options: Partial<MenuOptions>): MenuItemConstructorOptions[] {
  return buildMenuTemplate({ isMac: true, isDev: false, hasProject: false, actions, ...options })
}

function labels(items: MenuItemConstructorOptions[]): (string | undefined)[] {
  return items.map((item) => item.label)
}

function submenuOf(template: MenuItemConstructorOptions[], label: string) {
  const menu = template.find((item) => item.label === label)
  return (menu?.submenu ?? []) as MenuItemConstructorOptions[]
}

describe('menu de l’application', () => {
  it('contient les menus en français sur Mac, précédés du menu NeoScenar', () => {
    const template = build({ isMac: true, isDev: false })
    expect(labels(template)).toEqual([
      'NeoScenar',
      'Fichier',
      'Édition',
      'Présentation',
      'Fenêtre',
      'Aide'
    ])
  })

  it('contient les cinq menus en français sur Windows et Linux', () => {
    const template = build({ isMac: false, isDev: false })
    expect(labels(template)).toEqual(['Fichier', 'Édition', 'Présentation', 'Fenêtre', 'Aide'])
  })

  it('propose « Exporter vers Blender… » dans Fichier, seulement avec un projet ouvert', () => {
    const find = (hasProject: boolean) =>
      submenuOf(build({ hasProject }), 'Fichier').find(
        (item) => item.label === 'Exporter vers Blender…'
      )
    expect(find(false)?.enabled).toBe(false)
    expect(find(true)?.enabled).toBe(true)
  })

  it('propose Copier, Coller et Tout sélectionner dans Édition', () => {
    const edit = submenuOf(build({ isMac: true, isDev: false }), 'Édition')
    const roles = edit.map((item) => item.role)
    expect(roles).toEqual(expect.arrayContaining(['cut', 'copy', 'paste']))
    expect(roles).toContain('selectAll')
  })

  it('nomme l’annulation d’après la dernière modification du découpage', () => {
    const plain = submenuOf(build({}), 'Édition')
    expect(plain[0]).toMatchObject({ label: 'Annuler', accelerator: 'CmdOrCtrl+Z' })
    expect(plain[1]).toMatchObject({ label: 'Rétablir', accelerator: 'Shift+CmdOrCtrl+Z' })
    const named = submenuOf(build({ undoState: { undo: 'addShot', redo: 'delete' } }), 'Édition')
    expect(named[0].label).toBe('Annuler l’ajout du plan')
    expect(named[1].label).toBe('Rétablir la suppression')
  })

  it('propose « Dupliquer » (Cmd + D) dans Édition quand un projet est ouvert', () => {
    const find = (hasProject: boolean) =>
      submenuOf(build({ hasProject }), 'Édition').find((item) => item.label === 'Dupliquer')
    expect(find(true)).toMatchObject({ accelerator: 'CmdOrCtrl+D', enabled: true })
    expect(find(false)?.enabled).toBe(false)
  })

  it('propose « Quitter NeoScenar » sur tous les systèmes', () => {
    for (const isMac of [true, false]) {
      const all = build({ isMac }).flatMap(
        (menu) => (menu.submenu ?? []) as MenuItemConstructorOptions[]
      )
      expect(all.find((item) => item.role === 'quit')?.label).toBe('Quitter NeoScenar')
    }
  })

  it('cache les outils de développement en dehors du mode développement', () => {
    const roles = (isDev: boolean): unknown[] =>
      submenuOf(build({ isDev }), 'Présentation').map((item) => item.role)
    expect(roles(false)).not.toContain('toggleDevTools')
    expect(roles(true)).toContain('toggleDevTools')
  })

  it('propose les entrées du projet dans Fichier, avec leurs raccourcis', () => {
    const file = submenuOf(build({}), 'Fichier')
    const byLabel = (label: string) => file.find((item) => item.label === label)
    expect(byLabel('Nouveau projet…')?.accelerator).toBe('CmdOrCtrl+N')
    expect(byLabel('Ouvrir…')?.accelerator).toBe('CmdOrCtrl+O')
    expect(byLabel('Fermer le projet')?.accelerator).toBe('CmdOrCtrl+W')
    expect(byLabel('Fermer la fenêtre')?.accelerator).toBe('CmdOrCtrl+Shift+W')
  })

  it('active les entrées du projet seulement si un projet est ouvert', () => {
    const projectItems = [
      'Réglages du projet…',
      'Compléter la structure du projet…',
      'Fermer le projet'
    ]
    const enabled = (hasProject: boolean): (boolean | undefined)[] =>
      submenuOf(build({ hasProject }), 'Fichier')
        .filter((item) => projectItems.includes(item.label ?? ''))
        .map((item) => item.enabled)
    expect(enabled(false)).toEqual([false, false, false])
    expect(enabled(true)).toEqual([true, true, true])
  })

  it('« Masquer NeoScenar » n’a pas de raccourci : Cmd + H sert à la didascalie (KIT)', () => {
    const hide = submenuOf(build({ isMac: true }), 'NeoScenar').find(
      (item) => item.label === 'Masquer NeoScenar'
    )
    expect(hide).toBeDefined()
    expect(hide?.accelerator).toBeUndefined()
    expect(hide?.role).toBeUndefined()
    const all = build({ isMac: true, hasProject: true }).flatMap(
      (menu) => (menu.submenu ?? []) as MenuItemConstructorOptions[]
    )
    // Aucune entrée du menu ne prend un raccourci de KIT.
    const kit = [
      'CmdOrCtrl+H',
      'CmdOrCtrl+J',
      'CmdOrCtrl+U',
      'CmdOrCtrl+L',
      'CmdOrCtrl+G',
      'CmdOrCtrl+B',
      'CmdOrCtrl+I'
    ]
    expect(all.filter((item) => kit.includes(String(item.accelerator)))).toEqual([])
  })

  it('« Présentation > Navigateur de scènes » : case cochée selon la préférence, sans raccourci', () => {
    const find = (options: Partial<MenuOptions>) =>
      submenuOf(build(options), 'Présentation').find(
        (item) => item.label === 'Navigateur de scènes'
      )
    expect(find({ hasProject: true, sceneNavigatorShown: true })).toMatchObject({
      type: 'checkbox',
      checked: true,
      enabled: true
    })
    expect(find({ hasProject: true, sceneNavigatorShown: false })?.checked).toBe(false)
    expect(find({ hasProject: false })?.enabled).toBe(false)
    expect(find({ hasProject: true })?.accelerator).toBeUndefined()
  })

  it('« Édition > Rechercher… » (Cmd + F) n’est actif que dans le module Scénario', () => {
    const find = (scriptActive: boolean) =>
      submenuOf(build({ hasProject: true, scriptActive }), 'Édition').find(
        (item) => item.label === 'Rechercher…'
      )
    expect(find(true)).toMatchObject({ accelerator: 'CmdOrCtrl+F', enabled: true })
    expect(find(false)?.enabled).toBe(false)
  })

  it('Cmd + D : « Dupliquer » dans les Cartes, « Dupliquer la scène » dans le Scénario', () => {
    const sent: string[] = []
    const edit = (scriptActive: boolean) =>
      submenuOf(
        build({
          hasProject: true,
          scriptActive,
          actions: {
            ...actions,
            duplicate: () => sent.push('cartes'),
            duplicateScene: () => sent.push('scène du curseur')
          }
        }),
        'Édition'
      )
    const cards = edit(false).find((item) => item.label === 'Dupliquer')
    const script = edit(true).find((item) => item.label === 'Dupliquer la scène')
    expect(cards?.accelerator).toBe('CmdOrCtrl+D')
    expect(script?.accelerator).toBe('CmdOrCtrl+D')
    ;(cards?.click as () => void)()
    ;(script?.click as () => void)()
    expect(sent).toEqual(['cartes', 'scène du curseur'])
  })

  it('« NeoScenar > Réglages… » (Cmd + ,) sur Mac, dans Édition ailleurs', () => {
    const mac = submenuOf(build({ isMac: true }), 'NeoScenar').find(
      (item) => item.label === 'Réglages…'
    )
    expect(mac?.accelerator).toBe('CmdOrCtrl+,')
    const other = submenuOf(build({ isMac: false }), 'Édition').find(
      (item) => item.label === 'Réglages…'
    )
    expect(other?.accelerator).toBe('CmdOrCtrl+,')
    expect(submenuOf(build({ isMac: true }), 'Édition').some((i) => i.label === 'Réglages…')).toBe(
      false
    )
    expect(submenuOf(build({ isMac: false }), 'Fichier').some((i) => i.label === 'Réglages…')).toBe(
      false
    )
  })

  it('Windows et Linux : « Quitter » en bas de Fichier, « À propos » dans Aide', () => {
    const file = submenuOf(build({ isMac: false }), 'Fichier')
    expect(file.at(-1)).toMatchObject({ role: 'quit', label: 'Quitter NeoScenar' })
    const help = submenuOf(build({ isMac: false }), 'Aide')
    expect(help).toHaveLength(1)
    expect(help[0].label).toBe('À propos de NeoScenar')
    expect(help[0].role).toBeUndefined()
  })

  it('« À propos » appelle notre fenêtre, sur Mac comme ailleurs', () => {
    const about = vi.fn()
    const withAbout = { ...actions, about }
    const mac = build({ isMac: true, actions: withAbout })
    const appItems = mac[0].submenu as MenuItemConstructorOptions[]
    const macItem = appItems.find((i) => i.label === 'À propos de NeoScenar')
    const helpItem = (
      submenuOf(build({ isMac: false, actions: withAbout }), 'Aide') as MenuItemConstructorOptions[]
    )[0]
    ;(macItem?.click as () => void)()
    ;(helpItem.click as () => void)()
    expect(about).toHaveBeenCalledTimes(2)
  })

  it('« Présentation > Mode concentration » (F5), coché, actif seulement dans le Scénario', () => {
    const find = (options: Partial<MenuOptions>) =>
      submenuOf(build({ hasProject: true, ...options }), 'Présentation').find(
        (item) => item.label === 'Mode concentration'
      )
    expect(find({ scriptActive: true, focusMode: true })).toMatchObject({
      type: 'checkbox',
      accelerator: 'F5',
      checked: true,
      enabled: true
    })
    expect(find({ scriptActive: false })?.enabled).toBe(false)
  })

  it('« Présentation > Barre des éléments » : case cochée selon la préférence, sans raccourci', () => {
    const find = (options: Partial<MenuOptions>) =>
      submenuOf(build(options), 'Présentation').find((item) => item.label === 'Barre des éléments')
    expect(find({ hasProject: true, elementBarShown: true })).toMatchObject({
      type: 'checkbox',
      checked: true,
      enabled: true
    })
    expect(find({ hasProject: true, elementBarShown: false })?.checked).toBe(false)
    expect(find({ hasProject: false })?.enabled).toBe(false)
    expect(find({ hasProject: true })?.accelerator).toBeUndefined()
  })
})
