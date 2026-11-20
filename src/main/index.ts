import { app, BrowserWindow, dialog, Menu, nativeTheme, session } from 'electron'
import { basename, join } from 'node:path'
import {
  IPC_CHANNELS,
  UNDO_ACTIONS,
  type ActiveModule,
  type InitialState,
  type MenuCommand,
  type SaveStatus,
  type ScenarioSaveStatus,
  type UndoAction,
  type UndoState
} from '../shared/api'
import { fr } from '../renderer/i18n/fr'
import { AppController } from './appController'
import { resolvePalette, themeSource, type ThemeChoice } from '../shared/themes/themes'
import { setupContextMenu } from './spellcheck'
import {
  configureSpellchecker,
  dictionaryTarget,
  installDictionary,
  DICTIONARY_FILE
} from './spellcheckDictionary'
import { FocusMode } from './focusMode'
import { handleImageProtocol, registerImageScheme } from './images/imageProtocol'
import { WELCOME_IMAGE_DEFAULT } from '../shared/welcomeImage'
import { projectFileFromArgs } from './launchArgs'
import { welcomeCopyPath } from './welcomeImage'
import { registerIpcHandlers, showOpenProjectDialog } from './ipc'
import { buildMenuTemplate } from './menuTemplate'
import { systemEnvironment } from './blender/blenderService'
import {
  creditsTemplatePath,
  defaultProjectsLocation,
  defaultWelcomeImagePath,
  dictionariesDir,
  folderTemplatePath,
  formatsPath,
  pdfResourcePaths,
  storyboardFontsDir
} from './systemPaths'

const isMac = process.platform === 'darwin'
const isDev = !app.isPackaged

app.setName(fr.app.name)

let mainWindow: BrowserWindow | null = null
let controller: AppController | null = null
/** Interface prête à recevoir des messages (elle a demandé son état initial). */
let rendererReady = false
/** Erreur survenue avant que l'interface soit prête (ouverture depuis le Finder au lancement). */
let pendingError: string | null = null
/** Fichier demandé par le système avant que l'application soit prête. */
let pendingOpenPath: string | null = null
/** Dernier état de l'enregistrement, pour le message en cas de fermeture. */
let lastSaveStatus: SaveStatus = { state: 'saved' }
let lastScenarioStatus: ScenarioSaveStatus = { state: 'saved' }
/** Libellés actuels de « Annuler… » et « Rétablir… ». */
let undoState: UndoState = { undo: null, redo: null }
/** L'élève a confirmé qu'il voulait quitter : on ne redemande plus. */
let quitConfirmed = false

function send(channel: string, value: unknown): void {
  if (mainWindow && rendererReady) mainWindow.webContents.send(channel, value)
}

function showError(message: string): void {
  if (mainWindow && rendererReady) send(IPC_CHANNELS.errorRaised, message)
  else pendingError = message
}

function sendMenuCommand(command: MenuCommand): void {
  if (!mainWindow) createMainWindow()
  send(IPC_CHANNELS.menuCommand, command)
}

/** L'éditeur de dessin est ouvert (le zoom du menu agit alors sur la toile). */
let drawingOpen = false
/** Mode concentration : plein écran, puis retour à l'état d'avant. */
const focusMode = new FocusMode()
/** Module affiché (Rechercher, zoom et mode concentration ne concernent que le Scénario). */
let activeModule: ActiveModule = null
/** Coche de « Présentation > Navigateur de scènes » (préférence de l'application). */
let sceneNavigatorShown = true
/** Coche de « Présentation > Barre des éléments » (préférence de l'application). */
let elementBarShown = true

/** Zoom de toute la fenêtre, comme les rôles standard du menu Affichage. */
const PAGE_ZOOM_STEP = 0.5

function zoom(direction: 'in' | 'out' | 'reset'): void {
  if (drawingOpen) {
    send(IPC_CHANNELS.menuCommand, `drawing-zoom-${direction}` satisfies MenuCommand)
    return
  }
  // Dans le Scénario, seul le texte du scénario change de taille (pas les barres ni le navigateur).
  if (activeModule === 'script') {
    send(IPC_CHANNELS.menuCommand, `script-zoom-${direction}` satisfies MenuCommand)
    return
  }
  const contents = mainWindow?.webContents
  if (!contents) return
  const level = contents.getZoomLevel()
  contents.setZoomLevel(
    direction === 'reset' ? 0 : level + (direction === 'in' ? PAGE_ZOOM_STEP : -PAGE_ZOOM_STEP)
  )
}

function refreshMenu(): void {
  const template = buildMenuTemplate({
    isMac,
    isDev,
    hasProject: controller?.hasProject ?? false,
    undoState,
    sceneNavigatorShown,
    elementBarShown,
    scriptActive: activeModule === 'script' && (controller?.hasProject ?? false),
    focusMode: focusMode.isActive,
    actions: {
      newProject: () => sendMenuCommand('new-project'),
      openProject: () => void openWithDialog(),
      completeStructure: () => sendMenuCommand('complete-structure'),
      projectSettings: () => sendMenuCommand('project-settings'),
      exportToBlender: () => sendMenuCommand('export-blender'),
      exportPdf: () => sendMenuCommand('export-pdf'),
      exportStoryboard: () => sendMenuCommand('export-storyboard'),
      exportPlanning: () => sendMenuCommand('export-planning'),
      exportCredits: () => sendMenuCommand('export-credits'),
      versions: () => sendMenuCommand('versions'),
      clearPreviews: () => void confirmClearPreviews(),
      closeProject: () => void controller?.close(),
      saveNow: () => void controller?.flushAll(),
      undo: () => send(IPC_CHANNELS.menuCommand, 'undo' satisfies MenuCommand),
      redo: () => send(IPC_CHANNELS.menuCommand, 'redo' satisfies MenuCommand),
      duplicate: () => send(IPC_CHANNELS.menuCommand, 'duplicate' satisfies MenuCommand),
      duplicateScene: () => send(IPC_CHANNELS.menuCommand, 'duplicate-scene' satisfies MenuCommand),
      zoom: (direction) => zoom(direction),
      hideApp: () => app.hide(),
      settings: () => sendMenuCommand('settings'),
      about: () => sendMenuCommand('about'),
      toggleFocusMode: () => sendMenuCommand('toggle-focus-mode'),
      toggleSceneNavigator: () => sendMenuCommand('toggle-scene-navigator'),
      toggleElementBar: () => sendMenuCommand('toggle-element-bar'),
      checkLineWrapping: () => sendMenuCommand('check-line-wrapping'),
      titlePage: () => sendMenuCommand('title-page'),
      find: () => sendMenuCommand('find')
    }
  })
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

async function openWithDialog(): Promise<void> {
  if (!controller) return
  const result = await showOpenProjectDialog(mainWindow, controller)
  if (result && !result.ok) showError(result.error)
}

/** Ouverture demandée par le système (double-clic sur un .neoscenar). */
async function openFromSystem(filePath: string): Promise<void> {
  if (!controller) {
    pendingOpenPath = filePath
    return
  }
  if (!mainWindow) createMainWindow()
  mainWindow?.show()
  const result = await controller.open(filePath)
  if (!result.ok) showError(result.error)
}

/** « Vider le cache des aperçus… » : confirmation avec la taille du cache, puis effacement. */
async function confirmClearPreviews(): Promise<void> {
  if (!controller) return
  const t = fr.previewsCache
  const bytes = await controller.previewsCacheSize()
  const info = (message: string) =>
    mainWindow
      ? dialog.showMessageBox(mainWindow, { type: 'info', message })
      : dialog.showMessageBox({ type: 'info', message })
  if (bytes === 0) {
    await info(t.empty)
    return
  }
  const options = {
    type: 'question' as const,
    message: t.question(t.megabytes(bytes / (1024 * 1024))),
    detail: t.detail,
    buttons: [t.confirm, fr.common.cancel],
    defaultId: 0,
    cancelId: 1
  }
  const choice = mainWindow
    ? await dialog.showMessageBox(mainWindow, options)
    : await dialog.showMessageBox(options)
  if (choice.response !== 0) return
  await controller.clearPreviewsCache()
  await info(t.done)
}

/** Demande s'il faut fermer malgré des modifications non enregistrées. */
async function confirmDiscardUnsaved(): Promise<boolean> {
  const error =
    lastSaveStatus.state === 'error'
      ? lastSaveStatus.message
      : lastScenarioStatus.state === 'error'
        ? lastScenarioStatus.message
        : lastScenarioStatus.state === 'conflict'
          ? fr.script.conflict.unsavedDetail
          : ''
  const options = {
    type: 'warning' as const,
    message: fr.unsaved.message,
    detail: fr.unsaved.detail(error),
    buttons: [fr.unsaved.keepOpen, fr.unsaved.closeAnyway],
    defaultId: 0,
    cancelId: 0
  }
  const choice = mainWindow
    ? await dialog.showMessageBox(mainWindow, options)
    : await dialog.showMessageBox(options)
  return choice.response === 1
}

/** Reçu de l'interface : on ne garde que des valeurs connues, puis on refait le menu. */
function setUndoState(raw: unknown): void {
  const pick = (value: unknown): UndoAction | null =>
    UNDO_ACTIONS.includes(value as UndoAction) ? (value as UndoAction) : null
  const state = raw as Partial<UndoState> | null
  const next = { undo: pick(state?.undo), redo: pick(state?.redo) }
  if (next.undo === undoState.undo && next.redo === undoState.redo) return
  undoState = next
  refreshMenu()
}

/** Thème choisi (« Par défaut » suit le Mac). */
let currentTheme: ThemeChoice = 'defaut'

/**
 * Thème de l'application : nativeTheme (barres de défilement, fenêtres du système) prend le ton du
 * thème, et la page reçoit le thème pour poser ses variables CSS.
 */
function applyTheme(theme: ThemeChoice): void {
  currentTheme = theme
  nativeTheme.themeSource = themeSource(theme)
  mainWindow?.setBackgroundColor(windowBackground())
  mainWindow?.webContents.send(IPC_CHANNELS.themeChanged, theme)
}

/** Fond de la fenêtre avant l'affichage de la page (même couleur que --background du thème). */
function windowBackground(): string {
  return resolvePalette(currentTheme, nativeTheme.shouldUseDarkColors).colors.background
}

// Le Mac passe du clair au sombre : « Par défaut » doit suivre, fond de fenêtre compris.
nativeTheme.on('updated', () => mainWindow?.setBackgroundColor(windowBackground()))

function createMainWindow(): BrowserWindow {
  rendererReady = false
  const window = new BrowserWindow({
    title: fr.app.name,
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    resizable: true,
    show: false,
    backgroundColor: windowBackground(),
    webPreferences: {
      preload: join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  mainWindow = window

  window.once('ready-to-show', () => window.show())
  setupContextMenu(window)
  // Avant de fermer la fenêtre, toutes les modifications doivent être écrites sur le disque.
  let closeConfirmed = false
  window.on('close', (event) => {
    if (closeConfirmed || quitConfirmed || !controller?.hasUnsavedChanges) return
    event.preventDefault()
    void controller.ensureSaved().then((canClose) => {
      if (!canClose) return
      closeConfirmed = true
      window.close()
    })
  })
  // Plein écran quitté par le système (bouton vert…) : le mode concentration s'arrête aussi.
  window.on('leave-full-screen', () => {
    if (!focusMode.leftFullScreen()) return
    refreshMenu()
    send(IPC_CHANNELS.menuCommand, 'exit-focus-mode' satisfies MenuCommand)
  })
  // Le titre de la fenêtre est géré ici (projet ouvert), pas par la page.
  window.on('page-title-updated', (event) => event.preventDefault())
  window.on('closed', () => {
    mainWindow = null
    rendererReady = false
    void controller?.close()
  })

  // L'interface ne doit jamais quitter l'application ni ouvrir de page web.
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => event.preventDefault())

  const devServerUrl = process.env['ELECTRON_RENDERER_URL']
  if (isDev && devServerUrl) {
    window.loadURL(devServerUrl)
  } else {
    window.loadFile(join(__dirname, '..', 'renderer', 'index.html'))
  }
  return window
}

function takeInitialState(): InitialState {
  rendererReady = true
  const state = { project: controller?.currentProject ?? null, error: pendingError }
  pendingError = null
  return state
}

// Une seule instance : un double-clic sur un projet réutilise la fenêtre ouverte.
// Les vignettes sont servies par un protocole interne, déclaré avant que l'application soit prête.
registerImageScheme()

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  // Sur Mac, le Finder envoie « open-file », parfois avant même que l'application soit prête.
  app.on('open-file', (event, filePath) => {
    event.preventDefault()
    void openFromSystem(filePath)
  })

  // Sous Windows et Linux, le fichier arrive dans les arguments de la seconde instance.
  app.on('second-instance', (_event, args, workingDirectory) => {
    if (mainWindow?.isMinimized()) mainWindow.restore()
    mainWindow?.focus()
    const filePath = projectFileFromArgs(args, workingDirectory)
    if (filePath) void openFromSystem(filePath)
  })

  // Dictionnaire du correcteur déposé avant que Chromium ne le cherche (sinon il le téléchargerait).
  const dictionary = dictionaryTarget(process.platform, app.getPath('userData'))
  if (dictionary) installDictionary(join(dictionariesDir(), DICTIONARY_FILE), dictionary)

  app.whenReady().then(async () => {
    configureSpellchecker(session.defaultSession, process.platform, dictionariesDir())
    controller = new AppController({
      userDataDir: app.getPath('userData'),
      templatePath: folderTemplatePath(),
      formatsPath: formatsPath(),
      creditsTemplatePath: creditsTemplatePath(),
      documentsDir: defaultProjectsLocation(),
      appVersion: app.getVersion(),
      blenderEnvironment: systemEnvironment(),
      pdfResources: pdfResourcePaths(),
      storyboardFontsDir: storyboardFontsDir(),
      onProjectChanged: (project) => {
        mainWindow?.setTitle(project ? fr.app.windowTitle(basename(project.location)) : fr.app.name)
        refreshMenu()
        send(IPC_CHANNELS.projectChanged, project)
      },
      onSaveStatus: (status) => {
        lastSaveStatus = status
        send(IPC_CHANNELS.saveStatus, status)
      },
      onThemeChanged: (theme) => applyTheme(theme),
      onScriptColorsChanged: (colors) =>
        mainWindow?.webContents.send(IPC_CHANNELS.scriptColorsChanged, colors),
      onElementBarChanged: (show) => {
        elementBarShown = show
        refreshMenu()
      },
      onSceneNavigatorChanged: (show) => {
        sceneNavigatorShown = show
        refreshMenu()
      },
      onResearchStatus: (status) => send(IPC_CHANNELS.researchStatus, status),
      onScenarioStatus: (status) => {
        lastScenarioStatus = status
        send(IPC_CHANNELS.scenarioStatus, status)
      },
      confirmDiscardUnsaved
    })
    registerIpcHandlers(
      controller,
      takeInitialState,
      setUndoState,
      (open) => {
        drawingOpen = open === true
      },
      (module) => {
        const next =
          module === 'research' ||
          module === 'cards' ||
          module === 'script' ||
          module === 'stats' ||
          module === 'planning'
            ? module
            : null
        if (next === activeModule) return
        activeModule = next
        refreshMenu()
      },
      (active) => {
        if (active === true && mainWindow) focusMode.enter(mainWindow)
        else focusMode.exit(mainWindow)
        refreshMenu()
      }
    )
    handleImageProtocol(
      () => controller?.imageSource ?? null,
      (name) =>
        name === WELCOME_IMAGE_DEFAULT
          ? defaultWelcomeImagePath()
          : welcomeCopyPath(app.getPath('userData'), name)
    )
    // Le thème est appliqué avant d'afficher la fenêtre : pas d'éclair blanc au démarrage.
    applyTheme(await controller.getTheme())
    refreshMenu()
    void Promise.all([controller.getShowSceneNavigator(), controller.getShowElementBar()]).then(
      ([navigator, elementBar]) => {
        sceneNavigatorShown = navigator
        elementBarShown = elementBar
        refreshMenu()
      }
    )
    createMainWindow()

    const startupFile =
      pendingOpenPath ?? (isMac ? null : projectFileFromArgs(process.argv.slice(1), process.cwd()))
    pendingOpenPath = null
    if (startupFile) void openFromSystem(startupFile)

    // Sur Mac, cliquer sur l'icône du Dock rouvre une fenêtre si aucune n'est ouverte.
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
    })
  })

  // Quitter (Cmd + Q) : même vérification que pour la fermeture de la fenêtre.
  // Le projet est aussi fermé proprement (images inutilisées rangées) avant de quitter.
  app.on('before-quit', (event) => {
    if (quitConfirmed || (!controller?.hasUnsavedChanges && !controller?.hasProject)) return
    event.preventDefault()
    void controller.ensureSaved().then(async (canQuit) => {
      if (!canQuit) return
      await controller?.close()
      quitConfirmed = true
      app.quit()
    })
  })

  app.on('window-all-closed', () => {
    if (!isMac) app.quit()
  })
}
