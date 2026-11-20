import { app, BrowserWindow, clipboard, dialog, ipcMain, shell } from 'electron'
import { fr } from '../renderer/i18n/fr'
import {
  IPC_CHANNELS,
  type CompleteStructureRequest,
  type CreateProjectRequest,
  type InitialState,
  type ProjectSummary,
  type Result
} from '../shared/api'
import { REPOSITORY_URL } from '../shared/appInfo'
import { PROJECT_FILE_EXTENSION } from '../shared/projectTypes'
import { WELCOME_IMAGE_EXTENSIONS } from '../shared/welcomeImage'
import type { AppController } from './appController'
import { toUserMessage } from './project/errors'
import { blenderDialogFolder, vocabularyPath } from './systemPaths'
import { loadVocabulary } from './vocabulary'

/** Sélecteur de fichier .neoscenar ; null si l'élève annule. */
export async function showOpenProjectDialog(
  window: BrowserWindow | null,
  controller: AppController
): Promise<Result<ProjectSummary> | null> {
  const options = {
    title: fr.dialogs.openTitle,
    properties: ['openFile' as const],
    filters: [{ name: fr.dialogs.openFilter, extensions: [PROJECT_FILE_EXTENSION] }]
  }
  const choice = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options)
  if (choice.canceled || choice.filePaths.length === 0) return null
  return controller.open(choice.filePaths[0])
}

/** Déclare les appels que l'interface peut faire. Chaque appel passe par le contrôleur. */
export function registerIpcHandlers(
  controller: AppController,
  takeInitialState: () => InitialState,
  setUndoState: (state: unknown) => void,
  setDrawingOpen: (open: unknown) => void,
  setActiveModule: (module: unknown) => void,
  setFocusMode: (active: unknown) => void
): void {
  const windowOf = (event: Electron.IpcMainInvokeEvent): BrowserWindow | null =>
    BrowserWindow.fromWebContents(event.sender)

  ipcMain.handle(IPC_CHANNELS.getAppVersion, () => app.getVersion())
  ipcMain.handle(IPC_CHANNELS.openRepository, () => shell.openExternal(REPOSITORY_URL))
  ipcMain.handle(IPC_CHANNELS.getInitialState, () => takeInitialState())
  ipcMain.handle(IPC_CHANNELS.getHomeData, () => controller.getHomeData())
  ipcMain.handle(IPC_CHANNELS.removeRecentProject, (_event, filePath: string) =>
    controller.removeRecent(filePath)
  )
  ipcMain.handle(IPC_CHANNELS.getCreationData, () => controller.getCreationData())
  ipcMain.handle(IPC_CHANNELS.chooseLocation, async (event, currentLocation: string) => {
    const window = windowOf(event)
    const options = {
      title: fr.dialogs.chooseLocationTitle,
      defaultPath: currentLocation,
      properties: ['openDirectory' as const, 'createDirectory' as const]
    }
    const choice = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)
    return choice.canceled || choice.filePaths.length === 0 ? null : choice.filePaths[0]
  })
  ipcMain.handle(IPC_CHANNELS.isFolderAvailable, (_event, location: string, folderName: string) =>
    controller.isFolderAvailable(location, folderName)
  )
  ipcMain.handle(IPC_CHANNELS.createProject, (_event, request: CreateProjectRequest) =>
    controller.create(request)
  )
  ipcMain.handle(IPC_CHANNELS.openProjectDialog, (event) =>
    showOpenProjectDialog(windowOf(event), controller)
  )
  ipcMain.handle(IPC_CHANNELS.openProject, (_event, filePath: string) => controller.open(filePath))
  ipcMain.handle(IPC_CHANNELS.closeProject, () => controller.close())
  ipcMain.handle(IPC_CHANNELS.getStructureStatus, () => controller.getStructureStatus())
  ipcMain.handle(IPC_CHANNELS.completeStructure, (_event, request: CompleteStructureRequest) =>
    controller.completeStructure(request)
  )
  ipcMain.handle(IPC_CHANNELS.getDecoupage, () => controller.getDecoupage())
  // Les données venant de l'interface sont vérifiées par le contrôleur avant toute écriture.
  ipcMain.handle(IPC_CHANNELS.updateDecoupage, (_event, decoupage: unknown) =>
    controller.updateDecoupage(decoupage)
  )
  ipcMain.handle(IPC_CHANNELS.flushDecoupage, () => controller.flushDecoupage())
  ipcMain.handle(IPC_CHANNELS.getScenario, () => controller.getScenario())
  ipcMain.handle(IPC_CHANNELS.updateProjectTitle, (_event, title: unknown) =>
    controller.updateProjectTitle(title)
  )
  ipcMain.handle(IPC_CHANNELS.updateScenario, (_event, text: unknown) =>
    controller.updateScenario(text)
  )
  ipcMain.handle(IPC_CHANNELS.checkScenario, () => controller.checkScenario())
  ipcMain.handle(IPC_CHANNELS.resolveScenarioConflict, (_event, choice: unknown) =>
    controller.resolveScenarioConflict(choice)
  )
  ipcMain.handle(IPC_CHANNELS.backupLinkFiles, (_event, kind: unknown) =>
    controller.backupLinkFiles(kind)
  )
  ipcMain.handle(IPC_CHANNELS.listSheets, (_event, kind: unknown) => controller.listSheets(kind))
  ipcMain.handle(IPC_CHANNELS.createSheet, (_event, kind: unknown, name: unknown) =>
    controller.createSheet(kind, name)
  )
  ipcMain.handle(IPC_CHANNELS.createAutoSheets, (_event, kind: unknown, names: unknown) =>
    controller.createAutoSheets(kind, names)
  )
  ipcMain.handle(
    IPC_CHANNELS.updateSheet,
    (_event, kind: unknown, fileName: unknown, patch: unknown) =>
      controller.updateSheet(kind, fileName, patch)
  )
  ipcMain.handle(
    IPC_CHANNELS.renameSheet,
    (_event, kind: unknown, fileName: unknown, name: unknown, backup: unknown) =>
      controller.renameSheet(kind, fileName, name, backup)
  )
  ipcMain.handle(IPC_CHANNELS.deleteSheet, (_event, kind: unknown, fileName: unknown) =>
    controller.deleteSheet(kind, fileName)
  )
  ipcMain.handle(IPC_CHANNELS.storeSheetImageFile, (_event, kind: unknown, sourcePath: unknown) =>
    controller.storeSheetImageFile(kind, sourcePath)
  )
  ipcMain.handle(
    IPC_CHANNELS.storeSheetImageBytes,
    (_event, kind: unknown, bytes: unknown, name: unknown) =>
      controller.storeSheetImageBytes(kind, bytes, name)
  )
  ipcMain.handle(IPC_CHANNELS.flushSheets, () => controller.flushSheets())
  ipcMain.handle(IPC_CHANNELS.getPlanning, () => controller.getPlanning())
  ipcMain.handle(IPC_CHANNELS.updatePlanning, (_event, planning: unknown) =>
    controller.updatePlanning(planning)
  )
  ipcMain.handle(IPC_CHANNELS.getCredits, () => controller.getCredits())
  ipcMain.handle(IPC_CHANNELS.updateCredits, (_event, data: unknown) =>
    controller.updateCredits(data)
  )
  ipcMain.handle(IPC_CHANNELS.storeCreditsLogoFile, (_event, sourcePath: unknown) =>
    controller.storeCreditsLogoFile(sourcePath)
  )
  ipcMain.handle(IPC_CHANNELS.readCreditsLogo, (_event, path: unknown) =>
    controller.readCreditsLogo(path)
  )
  ipcMain.handle(IPC_CHANNELS.saveCreditsPngs, (_event, files: unknown) =>
    controller.saveCreditsPngs(files)
  )
  ipcMain.handle(IPC_CHANNELS.saveCreditsText, (_event, text: unknown) =>
    controller.saveCreditsText(text)
  )
  ipcMain.handle(IPC_CHANNELS.revealCreditsExport, async () => {
    const folder = controller.creditsExportFolder()
    if (folder === null) return { ok: false, error: fr.errors.noProjectOpen }
    // Le dossier lui-même s'ouvre dans le Finder (ou l'Explorateur), avec les fichiers exportés.
    const failure = await shell.openPath(folder)
    return failure === '' ? { ok: true, value: undefined } : { ok: false, error: failure }
  })
  ipcMain.handle(IPC_CHANNELS.copyText, (_event, text: unknown) => {
    if (typeof text === 'string') clipboard.writeText(text)
  })
  ipcMain.handle(IPC_CHANNELS.listVersions, () => controller.listVersions())
  ipcMain.handle(IPC_CHANNELS.saveVersion, (_event, name: unknown, note: unknown) =>
    controller.saveVersion(name, note)
  )
  ipcMain.handle(IPC_CHANNELS.restoreVersion, (_event, folder: unknown, undo: unknown) =>
    controller.restoreVersion(folder, undo === true)
  )
  ipcMain.handle(IPC_CHANNELS.readVersionScript, (_event, folder: unknown) =>
    controller.readVersionScript(folder)
  )
  ipcMain.handle(IPC_CHANNELS.deleteVersion, (_event, folder: unknown) =>
    controller.deleteVersion(folder)
  )
  // Le nouveau projet est un dossier : « Enregistrer sous » propose son nom et son emplacement.
  ipcMain.handle(IPC_CHANNELS.duplicateVersion, async (event, folder: unknown) => {
    const defaultPath = await controller.versionDuplicatePath(folder)
    if (!defaultPath.ok) return defaultPath
    const window = windowOf(event)
    const options = {
      title: fr.versions.duplicateTitle,
      buttonLabel: fr.versions.duplicateButton,
      defaultPath: defaultPath.value,
      properties: ['createDirectory' as const]
    }
    const choice = window
      ? await dialog.showSaveDialog(window, options)
      : await dialog.showSaveDialog(options)
    if (choice.canceled || !choice.filePath) return null
    return controller.duplicateVersion(folder, choice.filePath)
  })
  ipcMain.handle(IPC_CHANNELS.storeCreditsLogoBytes, (_event, bytes: unknown, name: unknown) =>
    controller.storeCreditsLogoBytes(bytes, name)
  )
  ipcMain.handle(IPC_CHANNELS.listDocuments, () => controller.listDocuments())
  ipcMain.handle(IPC_CHANNELS.createDocumentFolder, (_event, parent: unknown, name: unknown) =>
    controller.createDocumentFolder(parent, name)
  )
  ipcMain.handle(IPC_CHANNELS.createDocumentNote, (_event, folder: unknown, name: unknown) =>
    controller.createDocumentNote(folder, name)
  )
  ipcMain.handle(IPC_CHANNELS.renameDocument, (_event, path: unknown, name: unknown) =>
    controller.renameDocument(path, name)
  )
  ipcMain.handle(IPC_CHANNELS.deleteDocument, (_event, path: unknown) =>
    controller.deleteDocument(path)
  )
  ipcMain.handle(IPC_CHANNELS.readDocumentNote, (_event, path: unknown) =>
    controller.readDocumentNote(path)
  )
  ipcMain.handle(IPC_CHANNELS.writeDocumentNote, (_event, path: unknown, text: unknown) =>
    controller.writeDocumentNote(path, text)
  )
  ipcMain.handle(
    IPC_CHANNELS.storeDocumentImageFile,
    (_event, folder: unknown, sourcePath: unknown) =>
      controller.storeDocumentImageFile(folder, sourcePath)
  )
  ipcMain.handle(
    IPC_CHANNELS.storeDocumentImageBytes,
    (_event, folder: unknown, bytes: unknown, name: unknown) =>
      controller.storeDocumentImageBytes(folder, bytes, name)
  )
  ipcMain.handle(IPC_CHANNELS.removeDocumentImage, (_event, folder: unknown, fileName: unknown) =>
    controller.removeDocumentImage(folder, fileName)
  )
  ipcMain.handle(IPC_CHANNELS.getCardZoom, () => controller.getCardZoom())
  ipcMain.handle(IPC_CHANNELS.setCardZoom, (_event, zoom: unknown) => controller.setCardZoom(zoom))
  ipcMain.handle(IPC_CHANNELS.getVocabulary, async () => {
    try {
      return { ok: true, value: await loadVocabulary(vocabularyPath()) }
    } catch (error) {
      return { ok: false, error: toUserMessage(error) }
    }
  })
  ipcMain.handle(IPC_CHANNELS.getFormatCatalog, () => controller.getFormatCatalog())
  ipcMain.handle(IPC_CHANNELS.updateProjectSettings, (_event, settings: unknown) =>
    controller.updateSettings(settings)
  )
  ipcMain.handle(IPC_CHANNELS.chooseImageFiles, async (event, multiple: boolean) => {
    const window = windowOf(event)
    const options = {
      title: multiple ? fr.dialogs.chooseImagesTitle : fr.dialogs.chooseImageTitle,
      properties: multiple
        ? ['openFile' as const, 'multiSelections' as const]
        : ['openFile' as const],
      filters: [{ name: fr.dialogs.imageFilter, extensions: ['png', 'jpg', 'jpeg'] }]
    }
    const choice = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)
    return choice.canceled ? [] : choice.filePaths
  })
  ipcMain.handle(IPC_CHANNELS.storeOriginalFile, (_event, shotId: unknown, sourcePath: unknown) =>
    controller.storeOriginalFile(shotId, sourcePath)
  )
  ipcMain.handle(IPC_CHANNELS.storeOriginalBytes, (_event, shotId: unknown, bytes: unknown) =>
    controller.storeOriginalBytes(shotId, bytes)
  )
  ipcMain.handle(IPC_CHANNELS.readProjectImage, (_event, path: unknown) =>
    controller.readProjectImage(path)
  )
  ipcMain.handle(IPC_CHANNELS.storeThumbnail, (_event, shotId: unknown, bytes: unknown) =>
    controller.storeThumbnail(shotId, bytes)
  )
  ipcMain.handle(IPC_CHANNELS.getImageSizes, (_event, paths: unknown) =>
    controller.getImageSizes(paths)
  )
  ipcMain.handle(IPC_CHANNELS.copyThumbnailFiles, (_event, shotId: unknown, files: unknown) =>
    controller.copyThumbnailFiles(shotId, files)
  )
  ipcMain.handle(IPC_CHANNELS.getShowThumbnails, () => controller.getShowThumbnails())
  ipcMain.handle(IPC_CHANNELS.getShowSceneNavigator, () => controller.getShowSceneNavigator())
  ipcMain.handle(IPC_CHANNELS.getShowElementBar, () => controller.getShowElementBar())
  ipcMain.handle(IPC_CHANNELS.setShowElementBar, (_event, show: unknown) =>
    controller.setShowElementBar(show)
  )
  ipcMain.handle(IPC_CHANNELS.getScriptZoom, () => controller.getScriptZoom())
  ipcMain.handle(IPC_CHANNELS.getContinuedMarks, () => controller.getContinuedMarks())
  ipcMain.handle(IPC_CHANNELS.setContinuedMarks, (_event, enabled: unknown) =>
    controller.setContinuedMarks(enabled)
  )
  ipcMain.handle(IPC_CHANNELS.getHighlightActiveLine, () => controller.getHighlightActiveLine())
  ipcMain.handle(IPC_CHANNELS.setHighlightActiveLine, (_event, highlight: unknown) =>
    controller.setHighlightActiveLine(highlight)
  )
  ipcMain.handle(IPC_CHANNELS.getTheme, () => controller.getTheme())
  ipcMain.handle(IPC_CHANNELS.setTheme, (_event, theme: unknown) => controller.setTheme(theme))
  ipcMain.handle(IPC_CHANNELS.getWelcomeImage, () => controller.getWelcomeImageUrl())
  ipcMain.handle(IPC_CHANNELS.chooseWelcomeImage, async (event) => {
    const window = windowOf(event)
    const options = {
      title: fr.dialogs.chooseWelcomeImageTitle,
      properties: ['openFile' as const],
      filters: [{ name: fr.dialogs.welcomeImageFilter, extensions: [...WELCOME_IMAGE_EXTENSIONS] }]
    }
    const choice = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)
    if (choice.canceled || choice.filePaths.length === 0) return null
    return controller.chooseWelcomeImage(choice.filePaths[0])
  })
  ipcMain.handle(IPC_CHANNELS.resetWelcomeImage, () => controller.resetWelcomeImage())
  ipcMain.handle(IPC_CHANNELS.getScriptColors, () => controller.getScriptColors())
  ipcMain.handle(IPC_CHANNELS.setScriptColors, (_event, colors: unknown) =>
    controller.setScriptColors(colors)
  )
  ipcMain.handle(IPC_CHANNELS.setScriptZoom, (_event, zoom: unknown) =>
    controller.setScriptZoom(zoom)
  )
  ipcMain.handle(IPC_CHANNELS.setShowSceneNavigator, (_event, show: unknown) =>
    controller.setShowSceneNavigator(show)
  )
  ipcMain.handle(IPC_CHANNELS.setShowThumbnails, (_event, show: unknown) =>
    controller.setShowThumbnails(show)
  )
  ipcMain.handle(IPC_CHANNELS.getBlenderExportInfo, () => controller.getBlenderExportInfo())
  ipcMain.handle(IPC_CHANNELS.chooseBlendTarget, async (event, currentPath: unknown) => {
    const defaultPath = controller.blendDialogDefaultPath(currentPath)
    if (defaultPath === null) return null
    const window = windowOf(event)
    const options = {
      title: fr.blender.saveDialogTitle,
      defaultPath,
      filters: [{ name: fr.blender.blendFilter, extensions: ['blend'] }],
      properties: ['createDirectory' as const, 'showOverwriteConfirmation' as const]
    }
    const choice = window
      ? await dialog.showSaveDialog(window, options)
      : await dialog.showSaveDialog(options)
    if (choice.canceled || !choice.filePath) return null
    return controller.checkBlendTarget(choice.filePath)
  })
  ipcMain.handle(IPC_CHANNELS.chooseBlender, async (event) => {
    const window = windowOf(event)
    const isMac = process.platform === 'darwin'
    const options = {
      title: fr.blender.chooseBlenderTitle,
      defaultPath: blenderDialogFolder(),
      properties: ['openFile' as const],
      // Sur Mac, Blender est une application (« Blender.app ») ; sous Windows, « blender.exe » ;
      // sous Linux, un programme sans extension.
      filters: isMac
        ? [{ name: fr.blender.blenderAppFilter, extensions: ['app'] }]
        : process.platform === 'win32'
          ? [{ name: fr.blender.blenderExeFilter, extensions: ['exe'] }]
          : []
    }
    const choice = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)
    if (choice.canceled || choice.filePaths.length === 0) return null
    return controller.chooseBlender(choice.filePaths[0])
  })
  ipcMain.handle(IPC_CHANNELS.exportToBlender, (_event, request: unknown) =>
    controller.exportToBlender(request)
  )
  ipcMain.handle(IPC_CHANNELS.launchBlender, () => controller.launchBlender())
  ipcMain.handle(IPC_CHANNELS.getPdfOptions, () => controller.getPdfOptions())
  ipcMain.handle(IPC_CHANNELS.previewPdf, (_event, request: unknown) =>
    controller.previewPdf(request)
  )
  ipcMain.handle(IPC_CHANNELS.savePdf, async (event, request: unknown, mode: unknown) => {
    if (mode !== 'choose') return controller.savePdf(request, null)
    const defaultPath = controller.pdfDialogDefaultPath()
    if (defaultPath === null) return null
    const window = windowOf(event)
    const options = {
      title: fr.pdfExport.saveDialogTitle,
      defaultPath,
      filters: [{ name: fr.pdfExport.pdfFilter, extensions: ['pdf'] }],
      properties: ['createDirectory' as const, 'showOverwriteConfirmation' as const]
    }
    const choice = window
      ? await dialog.showSaveDialog(window, options)
      : await dialog.showSaveDialog(options)
    if (choice.canceled || !choice.filePath) return null
    return controller.savePdf(request, choice.filePath)
  })
  ipcMain.handle(IPC_CHANNELS.getStoryboardInfo, () => controller.getStoryboardInfo())
  ipcMain.handle(IPC_CHANNELS.previewStoryboard, (_event, options: unknown) =>
    controller.previewStoryboard(options)
  )
  ipcMain.handle(IPC_CHANNELS.saveStoryboard, async (event, options: unknown, mode: unknown) => {
    if (mode !== 'choose') return controller.saveStoryboard(options, null)
    const defaultPath = controller.storyboardDialogDefaultPath(options)
    if (defaultPath === null) return null
    const window = windowOf(event)
    const dialogOptions = {
      title: fr.storyboardExport.saveDialogTitle,
      defaultPath,
      filters: [{ name: fr.pdfExport.pdfFilter, extensions: ['pdf'] }],
      properties: ['createDirectory' as const, 'showOverwriteConfirmation' as const]
    }
    const choice = window
      ? await dialog.showSaveDialog(window, dialogOptions)
      : await dialog.showSaveDialog(dialogOptions)
    if (choice.canceled || !choice.filePath) return null
    return controller.saveStoryboard(options, choice.filePath)
  })
  ipcMain.handle(IPC_CHANNELS.getPlanningExportInfo, () => controller.getPlanningExportInfo())
  ipcMain.handle(IPC_CHANNELS.previewPlanningExport, (_event, request: unknown) =>
    controller.previewPlanningExport(request)
  )
  ipcMain.handle(
    IPC_CHANNELS.savePlanningExport,
    async (event, request: unknown, mode: unknown) => {
      if (mode !== 'choose') return controller.savePlanningExport(request, null)
      const defaultPath = await controller.planningExportDialogDefaultPath(request)
      if (defaultPath === null) return null
      const isCalendar = defaultPath.toLowerCase().endsWith('.ics')
      const window = windowOf(event)
      const dialogOptions = {
        title: fr.planningExport.saveDialogTitle,
        defaultPath,
        filters: isCalendar
          ? [{ name: fr.planningExport.icsFilter, extensions: ['ics'] }]
          : [{ name: fr.pdfExport.pdfFilter, extensions: ['pdf'] }],
        properties: ['createDirectory' as const, 'showOverwriteConfirmation' as const]
      }
      const choice = window
        ? await dialog.showSaveDialog(window, dialogOptions)
        : await dialog.showSaveDialog(dialogOptions)
      if (choice.canceled || !choice.filePath) return null
      return controller.savePlanningExport(request, choice.filePath)
    }
  )
  ipcMain.handle(IPC_CHANNELS.openSavedPdf, async (_event, action: unknown) => {
    const path = controller.savedPdfPath()
    if (path === null) return { ok: false, error: fr.pdfExport.nothingSaved }
    if (action === 'reveal') {
      shell.showItemInFolder(path)
      return { ok: true, value: undefined }
    }
    const failure = await shell.openPath(path)
    return failure === '' ? { ok: true, value: undefined } : { ok: false, error: failure }
  })
  ipcMain.handle(IPC_CHANNELS.setUndoState, (_event, state: unknown) => setUndoState(state))
  ipcMain.handle(IPC_CHANNELS.setDrawingOpen, (_event, open: unknown) => setDrawingOpen(open))
  ipcMain.handle(IPC_CHANNELS.setActiveModule, (_event, module: unknown) => setActiveModule(module))
  ipcMain.handle(IPC_CHANNELS.setFocusMode, (_event, active: unknown) => setFocusMode(active))
}
