import type { MenuItemConstructorOptions } from 'electron'
import { fr } from '../renderer/i18n/fr'
import type { UndoState } from '../shared/api'

/** Actions des entrées propres à NeoScenar, fournies par le processus principal. */
export interface MenuActions {
  newProject(): void
  openProject(): void
  completeStructure(): void
  /** Format de l'image et cadence du projet ouvert. */
  projectSettings(): void
  /** Fenêtre d'export vers Blender. */
  exportToBlender(): void
  /** Fenêtre « Exporter le scénario en PDF… ». */
  exportPdf(): void
  exportStoryboard(): void
  exportPlanning(): void
  /** Fenêtre « Exporter le générique… ». */
  exportCredits(): void
  /** Fenêtre « Versions… » (étape 13C). */
  versions(): void
  /** Vide le cache des aperçus de vignettes (dossier de l'application). */
  clearPreviews(): void
  closeProject(): void
  /** Écrit immédiatement le projet (l'enregistrement est de toute façon automatique). */
  saveNow(): void
  /** Annuler / Rétablir : transmis à l'interface (champ de texte ou découpage). */
  undo(): void
  redo(): void
  /** Dupliquer la sélection du module Cartes. */
  duplicate(): void
  /** Dans le Scénario : dupliquer la scène où se trouve le curseur. */
  duplicateScene(): void
  /** Zoom : la toile dans l'éditeur de dessin, sinon toute la fenêtre. */
  zoom(direction: 'in' | 'out' | 'reset'): void
  /** Masquer NeoScenar (sans raccourci : Cmd + H sert à la didascalie, comme dans KIT). */
  hideApp(): void
  /** Afficher ou masquer le navigateur de scènes du module Scénario. */
  toggleSceneNavigator(): void
  /** Afficher ou masquer la barre des éléments du module Scénario. */
  toggleElementBar(): void
  /** Mode développement : compare les coupures de lignes de l'écran à celles de la pagination. */
  checkLineWrapping(): void
  /** Fenêtre « Page de titre… » du scénario. */
  titlePage(): void
  /** Rechercher et remplacer dans le scénario. */
  find(): void
  /** Fenêtre « Réglages… » (thème…). */
  settings(): void
  /** Fenêtre « À propos de NeoScenar ». */
  about(): void
  /** Mode concentration (F5) du module Scénario. */
  toggleFocusMode(): void
}

export interface MenuOptions {
  isMac: boolean
  isDev: boolean
  /** Un projet est ouvert : active « Compléter la structure » et « Fermer le projet ». */
  hasProject: boolean
  /** Dernières modifications du découpage, pour nommer « Annuler… » et « Rétablir… ». */
  undoState?: UndoState
  /** Coche de « Présentation > Navigateur de scènes ». */
  sceneNavigatorShown?: boolean
  /** Coche de « Présentation > Barre des éléments ». */
  elementBarShown?: boolean
  /** Le module Scénario est affiché : Rechercher, mode concentration. */
  scriptActive?: boolean
  /** Coche de « Présentation > Mode concentration ». */
  focusMode?: boolean
  actions: MenuActions
}

const t = fr.menu

// Construit le modèle du menu sans dépendre d'Electron à l'exécution, pour pouvoir le tester.
// Les « rôles » donnent le comportement et les raccourcis standard de chaque système.
export function buildMenuTemplate(options: MenuOptions): MenuItemConstructorOptions[] {
  const { isMac } = options
  const template: MenuItemConstructorOptions[] = []

  if (isMac) {
    template.push(appMenu(options.actions))
  }
  template.push(
    fileMenu(options),
    editMenu(options),
    viewMenu(options),
    windowMenu(isMac),
    helpMenu(options.actions)
  )
  return template
}

function appMenu(actions: MenuActions): MenuItemConstructorOptions {
  return {
    label: fr.app.name,
    submenu: [
      { label: t.about, click: () => actions.about() },
      { type: 'separator' },
      { label: t.settings, accelerator: 'CmdOrCtrl+,', click: () => actions.settings() },
      { type: 'separator' },
      { role: 'services', label: t.services },
      { type: 'separator' },
      // Pas de « rôle » ici : il imposerait Cmd + H, réservé à la didascalie dans l'éditeur (KIT).
      { label: t.hide, click: () => actions.hideApp() },
      { role: 'hideOthers', label: t.hideOthers },
      { role: 'unhide', label: t.unhide },
      { type: 'separator' },
      { role: 'quit', label: t.quit }
    ]
  }
}

function fileMenu({ isMac, hasProject, actions }: MenuOptions): MenuItemConstructorOptions {
  // Sur Mac, « Quitter » se trouve dans le menu de l'application ; ailleurs, en bas de Fichier.
  const quit: MenuItemConstructorOptions[] = isMac
    ? []
    : [{ type: 'separator' }, { role: 'quit', label: t.quit }]
  return {
    label: t.file,
    submenu: [
      { label: t.newProject, accelerator: 'CmdOrCtrl+N', click: () => actions.newProject() },
      { label: t.open, accelerator: 'CmdOrCtrl+O', click: () => actions.openProject() },
      {
        label: t.saveNow,
        accelerator: 'CmdOrCtrl+S',
        enabled: hasProject,
        click: () => actions.saveNow()
      },
      { type: 'separator' },
      {
        label: t.projectSettings,
        enabled: hasProject,
        click: () => actions.projectSettings()
      },
      { label: t.titlePage, enabled: hasProject, click: () => actions.titlePage() },
      { label: t.versions, enabled: hasProject, click: () => actions.versions() },
      {
        label: t.completeStructure,
        enabled: hasProject,
        click: () => actions.completeStructure()
      },
      { label: t.clearPreviews, click: () => actions.clearPreviews() },
      { type: 'separator' },
      {
        label: t.exportPdf,
        enabled: hasProject,
        click: () => actions.exportPdf()
      },
      {
        label: t.exportStoryboard,
        enabled: hasProject,
        click: () => actions.exportStoryboard()
      },
      {
        label: t.exportPlanning,
        enabled: hasProject,
        click: () => actions.exportPlanning()
      },
      {
        label: t.exportCredits,
        enabled: hasProject,
        click: () => actions.exportCredits()
      },
      {
        label: t.exportToBlender,
        enabled: hasProject,
        click: () => actions.exportToBlender()
      },
      { type: 'separator' },
      {
        label: t.closeProject,
        accelerator: 'CmdOrCtrl+W',
        enabled: hasProject,
        click: () => actions.closeProject()
      },
      // Cmd + W est pris par « Fermer le projet » : la fenêtre se ferme avec Cmd + Maj + W.
      { role: 'close', label: t.closeWindow, accelerator: 'CmdOrCtrl+Shift+W' },
      ...quit
    ]
  }
}

function editMenu({
  isMac,
  hasProject,
  undoState,
  scriptActive,
  actions
}: MenuOptions): MenuItemConstructorOptions {
  const undoAction = undoState?.undo
  const redoAction = undoState?.redo
  const macOnly: MenuItemConstructorOptions[] = isMac
    ? [{ role: 'pasteAndMatchStyle', label: t.pasteAndMatchStyle }]
    : []
  return {
    label: t.edit,
    submenu: [
      // Pas de « rôle » ici : l'interface choisit entre annuler la frappe dans un champ de texte
      // et annuler une modification du découpage.
      {
        label: undoAction ? t.undoAction(fr.undoActions[undoAction]) : t.undo,
        accelerator: 'CmdOrCtrl+Z',
        click: () => actions.undo()
      },
      {
        label: redoAction ? t.redoAction(fr.undoActions[redoAction]) : t.redo,
        accelerator: 'Shift+CmdOrCtrl+Z',
        click: () => actions.redo()
      },
      { type: 'separator' },
      { role: 'cut', label: t.cut },
      { role: 'copy', label: t.copy },
      { role: 'paste', label: t.paste },
      ...macOnly,
      { role: 'delete', label: t.delete },
      {
        // Dans le Scénario, Dupliquer agit sur la scène du curseur, pas sur la sélection des Cartes.
        label: scriptActive ? t.duplicateScene : t.duplicate,
        accelerator: 'CmdOrCtrl+D',
        enabled: hasProject,
        click: () => (scriptActive ? actions.duplicateScene() : actions.duplicate())
      },
      { type: 'separator' },
      { role: 'selectAll', label: t.selectAll },
      { type: 'separator' },
      // Seulement dans le Scénario. « Rechercher le suivant » n'a pas de raccourci : Cmd + G est la
      // transition (KIT) ; le suivant se fait par Entrée dans le champ de recherche.
      {
        label: t.find,
        accelerator: 'CmdOrCtrl+F',
        enabled: scriptActive === true,
        click: () => actions.find()
      },
      // Sur Mac, « Réglages… » est dans le menu de l'application ; ailleurs, en bas d'Édition.
      ...(isMac
        ? []
        : [
            { type: 'separator' } as const,
            { label: t.settings, accelerator: 'CmdOrCtrl+,', click: () => actions.settings() }
          ])
    ]
  }
}

function viewMenu({
  isDev,
  hasProject,
  sceneNavigatorShown,
  elementBarShown,
  scriptActive,
  focusMode,
  actions
}: MenuOptions): MenuItemConstructorOptions {
  // Les outils de rechargement et de développement ne sont pas montrés aux élèves.
  const devTools: MenuItemConstructorOptions[] = isDev
    ? [
        { role: 'reload', label: t.reload },
        { role: 'forceReload', label: t.forceReload },
        { role: 'toggleDevTools', label: t.toggleDevTools },
        { label: t.checkLineWrapping, click: () => actions.checkLineWrapping() },
        { type: 'separator' }
      ]
    : []
  return {
    label: t.view,
    submenu: [
      ...devTools,
      // Pas de raccourci : les combinaisons libres entrent en collision avec ceux de KIT.
      {
        label: t.sceneNavigator,
        type: 'checkbox',
        checked: sceneNavigatorShown ?? true,
        enabled: hasProject,
        click: () => actions.toggleSceneNavigator()
      },
      {
        label: t.elementBar,
        type: 'checkbox',
        checked: elementBarShown ?? true,
        enabled: hasProject,
        click: () => actions.toggleElementBar()
      },
      { type: 'separator' },
      // Pas de « rôle » : dans l'éditeur de dessin, ces raccourcis agrandissent la toile.
      { label: t.resetZoom, accelerator: 'CmdOrCtrl+0', click: () => actions.zoom('reset') },
      { label: t.zoomIn, accelerator: 'CmdOrCtrl+Plus', click: () => actions.zoom('in') },
      // Même action avec la touche « = » (sans Maj), comme dans les navigateurs.
      {
        label: t.zoomIn,
        accelerator: 'CmdOrCtrl+=',
        visible: false,
        acceleratorWorksWhenHidden: true,
        click: () => actions.zoom('in')
      },
      { label: t.zoomOut, accelerator: 'CmdOrCtrl+-', click: () => actions.zoom('out') },
      { type: 'separator' },
      // F5 comme dans KIT ; l'entrée de menu compte, car F5 demande souvent fn sur un portable Mac.
      {
        label: t.focusMode,
        type: 'checkbox',
        accelerator: 'F5',
        checked: focusMode === true,
        enabled: scriptActive === true,
        click: () => actions.toggleFocusMode()
      },
      { role: 'togglefullscreen', label: t.toggleFullScreen }
    ]
  }
}

function windowMenu(isMac: boolean): MenuItemConstructorOptions {
  const macOnly: MenuItemConstructorOptions[] = isMac
    ? [{ type: 'separator' }, { role: 'front', label: t.front }]
    : []
  return {
    label: t.window,
    role: 'windowMenu',
    submenu: [{ role: 'minimize', label: t.minimize }, { role: 'zoom', label: t.zoom }, ...macOnly]
  }
}

function helpMenu(actions: MenuActions): MenuItemConstructorOptions {
  return {
    label: t.help,
    role: 'help',
    submenu: [{ label: t.about, click: () => actions.about() }]
  }
}
