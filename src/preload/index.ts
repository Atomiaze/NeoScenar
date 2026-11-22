import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from 'electron'
import {
  IPC_CHANNELS,
  type MenuCommand,
  type NeoScenarApi,
  type ProjectSummary,
  type SaveStatus,
  type ScenarioSaveStatus
} from '../shared/api'
import type { ScriptColors } from '../shared/themes/scriptColors'
import type { ThemeChoice } from '../shared/themes/themes'

function subscribe<T>(channel: string, listener: (value: T) => void): () => void {
  const handler = (_event: IpcRendererEvent, value: T): void => listener(value)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

// Seules les fonctions listées ici sont accessibles à l'interface (window.neoscenar).
const api: NeoScenarApi = {
  getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.getAppVersion),
  openRepository: () => ipcRenderer.invoke(IPC_CHANNELS.openRepository),
  getInitialState: () => ipcRenderer.invoke(IPC_CHANNELS.getInitialState),
  getHomeData: () => ipcRenderer.invoke(IPC_CHANNELS.getHomeData),
  removeRecentProject: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.removeRecentProject, filePath),
  getCreationData: () => ipcRenderer.invoke(IPC_CHANNELS.getCreationData),
  chooseLocation: (currentLocation) =>
    ipcRenderer.invoke(IPC_CHANNELS.chooseLocation, currentLocation),
  isFolderAvailable: (location, folderName) =>
    ipcRenderer.invoke(IPC_CHANNELS.isFolderAvailable, location, folderName),
  createProject: (request) => ipcRenderer.invoke(IPC_CHANNELS.createProject, request),
  openProjectDialog: () => ipcRenderer.invoke(IPC_CHANNELS.openProjectDialog),
  openProject: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.openProject, filePath),
  closeProject: () => ipcRenderer.invoke(IPC_CHANNELS.closeProject),
  getStructureStatus: () => ipcRenderer.invoke(IPC_CHANNELS.getStructureStatus),
  completeStructure: (request) => ipcRenderer.invoke(IPC_CHANNELS.completeStructure, request),
  getDecoupage: () => ipcRenderer.invoke(IPC_CHANNELS.getDecoupage),
  updateDecoupage: (decoupage) => ipcRenderer.invoke(IPC_CHANNELS.updateDecoupage, decoupage),
  flushDecoupage: () => ipcRenderer.invoke(IPC_CHANNELS.flushDecoupage),
  getCardZoom: () => ipcRenderer.invoke(IPC_CHANNELS.getCardZoom),
  setCardZoom: (zoom) => ipcRenderer.invoke(IPC_CHANNELS.setCardZoom, zoom),
  setUndoState: (state) => ipcRenderer.invoke(IPC_CHANNELS.setUndoState, state),
  setDrawingOpen: (open) => ipcRenderer.invoke(IPC_CHANNELS.setDrawingOpen, open),
  setActiveModule: (module) => ipcRenderer.invoke(IPC_CHANNELS.setActiveModule, module),
  setFocusMode: (active) => ipcRenderer.invoke(IPC_CHANNELS.setFocusMode, active),
  getVocabulary: () => ipcRenderer.invoke(IPC_CHANNELS.getVocabulary),
  getFormatCatalog: () => ipcRenderer.invoke(IPC_CHANNELS.getFormatCatalog),
  updateProjectSettings: (settings) =>
    ipcRenderer.invoke(IPC_CHANNELS.updateProjectSettings, settings),
  chooseImageFiles: (multiple) => ipcRenderer.invoke(IPC_CHANNELS.chooseImageFiles, multiple),
  storeOriginalFile: (shotId, sourcePath) =>
    ipcRenderer.invoke(IPC_CHANNELS.storeOriginalFile, shotId, sourcePath),
  storeOriginalBytes: (shotId, bytes) =>
    ipcRenderer.invoke(IPC_CHANNELS.storeOriginalBytes, shotId, bytes),
  readProjectImage: (path) => ipcRenderer.invoke(IPC_CHANNELS.readProjectImage, path),
  storeThumbnail: (shotId, bytes) => ipcRenderer.invoke(IPC_CHANNELS.storeThumbnail, shotId, bytes),
  getImageSizes: (paths) => ipcRenderer.invoke(IPC_CHANNELS.getImageSizes, paths),
  copyThumbnailFiles: (shotId, files) =>
    ipcRenderer.invoke(IPC_CHANNELS.copyThumbnailFiles, shotId, files),
  pathForFile: (file) => webUtils.getPathForFile(file),
  platform: process.platform,
  getShowThumbnails: () => ipcRenderer.invoke(IPC_CHANNELS.getShowThumbnails),
  getShowSceneNavigator: () => ipcRenderer.invoke(IPC_CHANNELS.getShowSceneNavigator),
  getShowElementBar: () => ipcRenderer.invoke(IPC_CHANNELS.getShowElementBar),
  setShowElementBar: (show) => ipcRenderer.invoke(IPC_CHANNELS.setShowElementBar, show),
  getScriptZoom: () => ipcRenderer.invoke(IPC_CHANNELS.getScriptZoom),
  getContinuedMarks: () => ipcRenderer.invoke(IPC_CHANNELS.getContinuedMarks),
  setContinuedMarks: (enabled) => ipcRenderer.invoke(IPC_CHANNELS.setContinuedMarks, enabled),
  getHighlightActiveLine: () => ipcRenderer.invoke(IPC_CHANNELS.getHighlightActiveLine),
  setHighlightActiveLine: (highlight) =>
    ipcRenderer.invoke(IPC_CHANNELS.setHighlightActiveLine, highlight),
  getTheme: () => ipcRenderer.invoke(IPC_CHANNELS.getTheme),
  setTheme: (theme) => ipcRenderer.invoke(IPC_CHANNELS.setTheme, theme),
  getScriptColors: () => ipcRenderer.invoke(IPC_CHANNELS.getScriptColors),
  setScriptColors: (colors) => ipcRenderer.invoke(IPC_CHANNELS.setScriptColors, colors),
  getWelcomeImage: () => ipcRenderer.invoke(IPC_CHANNELS.getWelcomeImage),
  chooseWelcomeImage: () => ipcRenderer.invoke(IPC_CHANNELS.chooseWelcomeImage),
  resetWelcomeImage: () => ipcRenderer.invoke(IPC_CHANNELS.resetWelcomeImage),
  setScriptZoom: (zoom) => ipcRenderer.invoke(IPC_CHANNELS.setScriptZoom, zoom),
  setShowSceneNavigator: (show) => ipcRenderer.invoke(IPC_CHANNELS.setShowSceneNavigator, show),
  setShowThumbnails: (show) => ipcRenderer.invoke(IPC_CHANNELS.setShowThumbnails, show),
  getCreditsOpenBlocks: () => ipcRenderer.invoke(IPC_CHANNELS.getCreditsOpenBlocks),
  setCreditsOpenBlocks: (open) => ipcRenderer.invoke(IPC_CHANNELS.setCreditsOpenBlocks, open),
  getRevisionPanelShown: () => ipcRenderer.invoke(IPC_CHANNELS.getRevisionPanelShown),
  setRevisionPanelShown: (shown) => ipcRenderer.invoke(IPC_CHANNELS.setRevisionPanelShown, shown),
  getCustomVocabulary: () => ipcRenderer.invoke(IPC_CHANNELS.getCustomVocabulary),
  setCustomVocabulary: (value) => ipcRenderer.invoke(IPC_CHANNELS.setCustomVocabulary, value),
  getBlenderExportInfo: () => ipcRenderer.invoke(IPC_CHANNELS.getBlenderExportInfo),
  chooseBlendTarget: (currentPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.chooseBlendTarget, currentPath),
  chooseBlender: () => ipcRenderer.invoke(IPC_CHANNELS.chooseBlender),
  exportToBlender: (request) => ipcRenderer.invoke(IPC_CHANNELS.exportToBlender, request),
  launchBlender: () => ipcRenderer.invoke(IPC_CHANNELS.launchBlender),
  getPdfOptions: () => ipcRenderer.invoke(IPC_CHANNELS.getPdfOptions),
  previewPdf: (request) => ipcRenderer.invoke(IPC_CHANNELS.previewPdf, request),
  savePdf: (request, mode) => ipcRenderer.invoke(IPC_CHANNELS.savePdf, request, mode),
  openSavedPdf: (action) => ipcRenderer.invoke(IPC_CHANNELS.openSavedPdf, action),
  getStoryboardInfo: () => ipcRenderer.invoke(IPC_CHANNELS.getStoryboardInfo),
  previewStoryboard: (options) => ipcRenderer.invoke(IPC_CHANNELS.previewStoryboard, options),
  saveStoryboard: (options, mode) => ipcRenderer.invoke(IPC_CHANNELS.saveStoryboard, options, mode),
  getPlanningExportInfo: () => ipcRenderer.invoke(IPC_CHANNELS.getPlanningExportInfo),
  previewPlanningExport: (request) =>
    ipcRenderer.invoke(IPC_CHANNELS.previewPlanningExport, request),
  savePlanningExport: (request, mode) =>
    ipcRenderer.invoke(IPC_CHANNELS.savePlanningExport, request, mode),
  getScenario: () => ipcRenderer.invoke(IPC_CHANNELS.getScenario),
  updateProjectTitle: (title) => ipcRenderer.invoke(IPC_CHANNELS.updateProjectTitle, title),
  updateScenario: (text) => ipcRenderer.invoke(IPC_CHANNELS.updateScenario, text),
  checkScenario: () => ipcRenderer.invoke(IPC_CHANNELS.checkScenario),
  resolveScenarioConflict: (choice) =>
    ipcRenderer.invoke(IPC_CHANNELS.resolveScenarioConflict, choice),
  backupLinkFiles: (kind) => ipcRenderer.invoke(IPC_CHANNELS.backupLinkFiles, kind),
  listSheets: (kind) => ipcRenderer.invoke(IPC_CHANNELS.listSheets, kind),
  createSheet: (kind, name) => ipcRenderer.invoke(IPC_CHANNELS.createSheet, kind, name),
  createAutoSheets: (kind, names) => ipcRenderer.invoke(IPC_CHANNELS.createAutoSheets, kind, names),
  updateSheet: (kind, fileName, patch) =>
    ipcRenderer.invoke(IPC_CHANNELS.updateSheet, kind, fileName, patch),
  renameSheet: (kind, fileName, name, backup) =>
    ipcRenderer.invoke(IPC_CHANNELS.renameSheet, kind, fileName, name, backup),
  deleteSheet: (kind, fileName) => ipcRenderer.invoke(IPC_CHANNELS.deleteSheet, kind, fileName),
  storeSheetImageFile: (kind, sourcePath) =>
    ipcRenderer.invoke(IPC_CHANNELS.storeSheetImageFile, kind, sourcePath),
  storeSheetImageBytes: (kind, bytes, name) =>
    ipcRenderer.invoke(IPC_CHANNELS.storeSheetImageBytes, kind, bytes, name),
  flushSheets: () => ipcRenderer.invoke(IPC_CHANNELS.flushSheets),
  listDocuments: () => ipcRenderer.invoke(IPC_CHANNELS.listDocuments),
  createDocumentFolder: (parent, name) =>
    ipcRenderer.invoke(IPC_CHANNELS.createDocumentFolder, parent, name),
  createDocumentNote: (folder, name) =>
    ipcRenderer.invoke(IPC_CHANNELS.createDocumentNote, folder, name),
  renameDocument: (path, name) => ipcRenderer.invoke(IPC_CHANNELS.renameDocument, path, name),
  deleteDocument: (path) => ipcRenderer.invoke(IPC_CHANNELS.deleteDocument, path),
  readDocumentNote: (path) => ipcRenderer.invoke(IPC_CHANNELS.readDocumentNote, path),
  writeDocumentNote: (path, text) => ipcRenderer.invoke(IPC_CHANNELS.writeDocumentNote, path, text),
  readProjectText: (name) => ipcRenderer.invoke(IPC_CHANNELS.readProjectText, name),
  writeProjectText: (name, text) => ipcRenderer.invoke(IPC_CHANNELS.writeProjectText, name, text),
  storeDocumentImageFile: (folder, sourcePath) =>
    ipcRenderer.invoke(IPC_CHANNELS.storeDocumentImageFile, folder, sourcePath),
  storeDocumentImageBytes: (folder, bytes, name) =>
    ipcRenderer.invoke(IPC_CHANNELS.storeDocumentImageBytes, folder, bytes, name),
  removeDocumentImage: (folder, fileName) =>
    ipcRenderer.invoke(IPC_CHANNELS.removeDocumentImage, folder, fileName),
  getPlanning: () => ipcRenderer.invoke(IPC_CHANNELS.getPlanning),
  updatePlanning: (planning) => ipcRenderer.invoke(IPC_CHANNELS.updatePlanning, planning),
  getCredits: () => ipcRenderer.invoke(IPC_CHANNELS.getCredits),
  updateCredits: (data) => ipcRenderer.invoke(IPC_CHANNELS.updateCredits, data),
  storeCreditsLogoFile: (sourcePath) =>
    ipcRenderer.invoke(IPC_CHANNELS.storeCreditsLogoFile, sourcePath),
  storeCreditsLogoBytes: (bytes, name) =>
    ipcRenderer.invoke(IPC_CHANNELS.storeCreditsLogoBytes, bytes, name),
  readCreditsLogo: (path) => ipcRenderer.invoke(IPC_CHANNELS.readCreditsLogo, path),
  saveCreditsPngs: (files) => ipcRenderer.invoke(IPC_CHANNELS.saveCreditsPngs, files),
  saveCreditsText: (text) => ipcRenderer.invoke(IPC_CHANNELS.saveCreditsText, text),
  revealCreditsExport: () => ipcRenderer.invoke(IPC_CHANNELS.revealCreditsExport),
  copyText: (text) => ipcRenderer.invoke(IPC_CHANNELS.copyText, text),
  listVersions: () => ipcRenderer.invoke(IPC_CHANNELS.listVersions),
  saveVersion: (name, note) => ipcRenderer.invoke(IPC_CHANNELS.saveVersion, name, note),
  restoreVersion: (folder, undo) => ipcRenderer.invoke(IPC_CHANNELS.restoreVersion, folder, undo),
  deleteVersion: (folder) => ipcRenderer.invoke(IPC_CHANNELS.deleteVersion, folder),
  readVersionScript: (folder) => ipcRenderer.invoke(IPC_CHANNELS.readVersionScript, folder),
  duplicateVersion: (folder) => ipcRenderer.invoke(IPC_CHANNELS.duplicateVersion, folder),
  onProjectChanged: (listener) =>
    subscribe<ProjectSummary | null>(IPC_CHANNELS.projectChanged, listener),
  onError: (listener) => subscribe<string>(IPC_CHANNELS.errorRaised, listener),
  onSaveStatus: (listener) => subscribe<SaveStatus>(IPC_CHANNELS.saveStatus, listener),
  onScenarioStatus: (listener) =>
    subscribe<ScenarioSaveStatus>(IPC_CHANNELS.scenarioStatus, listener),
  onResearchStatus: (listener) => subscribe<SaveStatus>(IPC_CHANNELS.researchStatus, listener),
  onThemeChanged: (listener) => subscribe<ThemeChoice>(IPC_CHANNELS.themeChanged, listener),
  onScriptColorsChanged: (listener) =>
    subscribe<ScriptColors>(IPC_CHANNELS.scriptColorsChanged, listener),
  onMenuCommand: (listener) => subscribe<MenuCommand>(IPC_CHANNELS.menuCommand, listener),
  onRevisionContextQuery: (answer) =>
    subscribe<number>(IPC_CHANNELS.revisionContextQuery, (id) =>
      ipcRenderer.send(IPC_CHANNELS.revisionContextReply, id, answer())
    )
}

contextBridge.exposeInMainWorld('neoscenar', api)
