import { access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { creditsOpenKey, openBlocksOf, withProjectOpen } from '../shared/credits/openState'
import type {
  CompleteStructureRequest,
  CreateProjectRequest,
  CreationData,
  FolderStatus,
  HomeData,
  ProjectSummary,
  Result,
  SaveStatus,
  ScenarioSaveStatus
} from '../shared/api'
import { clampCardZoom } from '../shared/cardZoom'
import { clampScriptZoom } from '../shared/scriptZoom'
import { parseScriptColors, type ScriptColors } from '../shared/themes/scriptColors'
import { parseTheme, type ThemeChoice } from '../shared/themes/themes'
import { isValidSettings, type FormatCatalog } from '../shared/imageFormat'
import { PROJECT_FILES, type Decoupage, type ProjectSettings } from '../shared/projectTypes'
import { loadFormatCatalog } from './formats'
import { retireUnusedImages } from './images/retireImages'
import {
  copyThumbnailFiles,
  resolveDataPath,
  storeOriginalBytes,
  storeOriginalFile,
  storeThumbnail
} from './images/thumbnailFiles'
import { isStoryboardImagePath } from '../shared/thumbnail/files'
import { readFile } from 'node:fs/promises'
import type { StoredOriginal, ThumbnailFiles } from '../shared/api'
import type { Size } from '../shared/imageFormat'
import type { ImageSource } from './images/imageProtocol'
import { clearPreviewsCache, previewsCacheSize, readImageSizes } from './images/previews'

/** Garde-fou : un scénario de 120 pages fait environ 200 000 caractères. */
const MAX_SCENARIO_LENGTH = 20_000_000

/** Dossier des aperçus de vignettes, dans le dossier de l'application (hors des projets). */
const PREVIEWS_FOLDER = 'apercus'

/** Garde-fou : nombre de fiches créées d'un coup par le rapprochement. */
const MAX_AUTO_SHEETS = 1000
import { writeJsonSafely } from './fs/safeWrite'
import { BlenderExporter } from './blender/blenderExporter'
import type { BlenderEnvironment } from './blender/blenderService'
import type {
  BlenderExportInfo,
  BlenderExportRequest,
  BlenderLaunchStatus,
  BlendTarget
} from '../shared/api'
import { PdfExporter, parsePdfRequest } from './pdfExport/pdfExporter'
import { StoryboardExporter, parseStoryboardRequest } from './storyboardExport/storyboardExporter'
import type { StoryboardExportInfo, StoryboardPreview } from '../shared/storyboardExport'
import { PlanningExporter, parsePlanningExportRequest } from './planningExport/planningExporter'
import type { PlanningExportInfo, PlanningExportPreview } from '../shared/planningExport'
import type { PdfExportOptions, PdfPreview, PdfSavedFile } from '../shared/pdfExport'
import { AutoSaver } from './project/autoSaver'
import { loadCreditsTemplate } from './credits/creditsTemplate'
import { CreditsSession } from './credits/creditsSession'
import { PlanningSession } from './planning/planningSession'
import { crewMembers } from '../shared/planning/crew'
import { giveNewId, isCopiedProject, sameProjectFile } from './project/projectCopy'
import {
  creditsExportFolder,
  parsePngFiles,
  readCreditsLogo,
  writeCreditsPngs,
  writeCreditsText
} from './credits/creditsExport'
import { DocumentsFolder } from './research/documentsFolder'
import { SheetFolder } from './research/sheetFolder'
import { parseSheetKind, parseSheetPatch } from './research/sheetRequests'
import type { CreditsContent } from '../shared/credits/types'
import type { DocumentFolder, DocumentImage } from '../shared/research/documents'
import type { Sheet, SheetImage, SheetKind, SheetRename } from '../shared/research/types'
import { ScenarioSession } from './project/scenarioSession'
import { VersionService } from './versions/versionService'
import type { PlanningContent, RestoredVersion, VersionList, VersionScript } from '../shared/api'
import type { VersionEntry } from '../shared/versions/versions'
import { backupLinkFiles } from './project/linkBackups'
import { parseDecoupage } from './project/validators'
import type { FolderTemplate } from '../shared/folderTemplate'
import { fr } from '../renderer/i18n/fr'
import {
  addRecentProject,
  loadPreferences,
  removeRecentProject,
  savePreferences,
  type Preferences
} from './preferences'
import { completeStructure, getStructureStatus } from './project/completeStructure'
import { cleanTitle, createProject } from './project/createProject'
import { syncTitleFromScenario, writeProjectTitle } from './project/titleSync'
import { ProjectError, toUserMessage } from './project/errors'
import { isDirectory } from './project/filmFolders'
import { readProject, type LoadedProject } from './project/readProject'
import { WELCOME_IMAGE_DEFAULT, welcomeImageUrl } from '../shared/welcomeImage'
import { installWelcomeImage, removeWelcomeCopies, welcomeCopyPath } from './welcomeImage'
import { loadFolderTemplate } from './project/template'

export interface AppControllerOptions {
  userDataDir: string
  templatePath: string
  /** Fichier des formats d'image (préréglages et cadences). */
  formatsPath: string
  /** Modèle de générique (resources/modeles/generique-saint-luc.json). */
  creditsTemplatePath: string
  documentsDir: string
  /** Version de NeoScenar, écrite dans le paquet d'échange avec Blender. */
  appVersion: string
  /** Système et outils pour trouver et lancer Blender (remplaçables dans les tests). */
  blenderEnvironment: BlenderEnvironment
  /** Polices et profil de mise en page de l'export PDF. */
  pdfResources: { fontsDir: string; layoutPath: string }
  /** Police Inter du PDF du storyboard. */
  storyboardFontsDir: string
  /** Appelé à chaque ouverture ou fermeture de projet. */
  onProjectChanged(project: ProjectSummary | null): void
  /** Appelé à chaque changement d'état de l'enregistrement automatique. */
  onSaveStatus(status: SaveStatus): void
  /** Même chose pour le scénario (avec l'état « modifié dans un autre logiciel »). */
  onScenarioStatus(status: ScenarioSaveStatus): void
  /** Même chose pour les fiches du module Recherches. */
  onResearchStatus(status: SaveStatus): void
  /** Le navigateur de scènes a été affiché ou masqué (coche du menu Présentation). */
  onSceneNavigatorChanged(show: boolean): void
  /** Nouveau thème choisi dans les Réglages. */
  onThemeChanged(theme: ThemeChoice): void
  onScriptColorsChanged(colors: ScriptColors): void
  /** La barre des éléments a été affichée ou masquée (coche du menu Présentation). */
  onElementBarChanged(show: boolean): void
  /**
   * Des modifications n'ont pas pu être enregistrées : demande à l'élève s'il veut fermer quand
   * même. Vrai = fermer et abandonner ces modifications.
   */
  confirmDiscardUnsaved(): Promise<boolean>
}

export function summarize(loaded: LoadedProject): ProjectSummary {
  return {
    id: loaded.project.id,
    title: loaded.project.title,
    location: loaded.rootDir,
    sceneCount: loaded.decoupage.scenes.length,
    shotCount: loaded.decoupage.scenes.reduce((total, scene) => total + scene.shots.length, 0),
    settings: loaded.project.settings
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function attempt<T>(action: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, value: await action() }
  } catch (error) {
    return { ok: false, error: toUserMessage(error) }
  }
}

/** État de l'application : un seul projet ouvert à la fois, préférences et modèle de dossiers. */
export class AppController {
  private current: LoadedProject | null = null
  private preferences: Preferences | null = null
  private template: FolderTemplate | null = null
  private formats: FormatCatalog | null = null
  private saver: AutoSaver<Decoupage> | null = null
  private scenario: ScenarioSession | null = null
  /** Fiches du module Recherches, un dossier par type (personnages/…). */
  private sheets: Record<SheetKind, SheetFolder> | null = null
  /** Documents du module Recherches (neoscenar/documents/). */
  private documents: DocumentsFolder | null = null
  /** Générique du film (neoscenar/generique.json). */
  private credits: CreditsSession | null = null
  /** Planning du projet (neoscenar/planning.json). */
  private planning: PlanningSession | null = null
  private readonly blender: BlenderExporter
  private readonly pdf: PdfExporter
  private readonly storyboard: StoryboardExporter
  private readonly planningExport: PlanningExporter
  private readonly versions: VersionService
  /** Dernier PDF enregistré : « Ouvrir » et « Afficher » n'agissent que sur lui. */
  private lastSavedPdf: string | null = null

  constructor(private readonly options: AppControllerOptions) {
    this.blender = new BlenderExporter({
      current: () => this.requireCurrent(),
      flush: () => this.flushDecoupage(),
      getBlenderPath: async () => (await this.getPreferences()).blenderPath,
      setBlenderPath: (blenderPath) =>
        this.updatePreferences((prefs) => ({ ...prefs, blenderPath })),
      appVersion: options.appVersion,
      env: options.blenderEnvironment
    })
    this.pdf = new PdfExporter({ current: () => this.requireCurrent(), ...options.pdfResources })
    this.storyboard = new StoryboardExporter({
      current: () => this.requireCurrent(),
      flush: () => this.flushDecoupage(),
      fontsDir: options.storyboardFontsDir
    })
    this.planningExport = new PlanningExporter({
      current: () => this.requireCurrent(),
      flush: async () => {
        await this.planning?.flush()
      },
      fontsDir: options.storyboardFontsDir
    })
    this.versions = new VersionService({
      current: () => this.requireCurrent(),
      flushAll: () => this.flushAll(),
      reload: () => this.reloadCurrent(),
      layoutPath: options.pdfResources.layoutPath
    })
  }

  get currentProject(): ProjectSummary | null {
    return this.current ? summarize(this.current) : null
  }

  get hasProject(): boolean {
    return this.current !== null
  }

  /** Vrai si des modifications du découpage ou du scénario ne sont pas encore écrites sur le disque. */
  get hasUnsavedChanges(): boolean {
    return (
      (this.saver?.hasUnsavedChanges ?? false) ||
      (this.scenario?.hasUnsavedChanges ?? false) ||
      this.sheetFolders().some((folder) => folder.hasUnsavedChanges) ||
      (this.documents?.hasUnsavedChanges ?? false) ||
      (this.credits?.hasUnsavedChanges ?? false) ||
      (this.planning?.hasUnsavedChanges ?? false)
    )
  }

  private sheetFolders(): SheetFolder[] {
    return this.sheets ? Object.values(this.sheets) : []
  }

  /**
   * À appeler avant de fermer ou de changer de projet : termine les écritures en attente. En cas
   * d'échec, demande confirmation. Faux si l'élève préfère ne pas fermer.
   */
  async ensureSaved(): Promise<boolean> {
    if (await this.flushAll()) return true
    if (!(await this.options.confirmDiscardUnsaved())) return false
    this.saver?.discard()
    this.scenario?.discard()
    this.sheetFolders().forEach((folder) => folder.discard())
    this.documents?.discard()
    this.credits?.discard()
    this.planning?.discard()
    return true
  }

  /** Écrit tout ce qui est en attente (découpage, scénario, fiches). Vrai si tout est enregistré. */
  async flushAll(): Promise<boolean> {
    const decoupageSaved = (await this.saver?.flush()) ?? true
    const scenarioSaved = (await this.scenario?.flush()) ?? true
    const sheetsSaved = await this.flushSheets()
    return decoupageSaved && scenarioSaved && sheetsSaved
  }

  private async getPreferences(): Promise<Preferences> {
    this.preferences ??= await loadPreferences(this.options.userDataDir)
    return this.preferences
  }

  private async updatePreferences(change: (prefs: Preferences) => Preferences): Promise<void> {
    this.preferences = change(await this.getPreferences())
    await savePreferences(this.options.userDataDir, this.preferences)
  }

  private async getTemplate(): Promise<FolderTemplate> {
    this.template ??= await loadFolderTemplate(this.options.templatePath)
    return this.template
  }

  private async getFormats(): Promise<FormatCatalog> {
    this.formats ??= await loadFormatCatalog(this.options.formatsPath)
    return this.formats
  }

  getFormatCatalog(): Promise<Result<FormatCatalog>> {
    return attempt(() => this.getFormats())
  }

  /** Vérifie des réglages venus de l'interface (format pair de 16 à 8192, cadence proposée). */
  private async checkSettings(raw: unknown): Promise<ProjectSettings> {
    const value = raw as Partial<ProjectSettings> | null
    const resolution = value?.resolution
    const settings: ProjectSettings = {
      fps: Number(value?.fps),
      resolution: { width: Number(resolution?.width), height: Number(resolution?.height) }
    }
    if (!isValidSettings(await this.getFormats(), settings)) {
      throw new ProjectError(fr.errors.invalidSettings)
    }
    return settings
  }

  /** Nouveau format ou nouvelle cadence : projet.json est réécrit, les vignettes ne sont pas touchées. */
  updateSettings(raw: unknown): Promise<Result<ProjectSummary>> {
    return attempt(async () => {
      const current = this.requireCurrent()
      const settings = await this.checkSettings(raw)
      const project = { ...current.project, settings, modifiedAt: new Date().toISOString() }
      await writeJsonSafely(join(current.dataDir, PROJECT_FILES.project), project)
      current.project = project
      this.options.onProjectChanged(this.currentProject)
      return summarize(current)
    })
  }

  /**
   * `reload` : le même projet est relu après le remplacement de ses fichiers (restauration d'une
   * version) ; tout ce qui gardait l'ancien contenu en mémoire est recréé.
   */
  private async setCurrent(loaded: LoadedProject | null, reload = false): Promise<void> {
    // Un projet est reconnu par son emplacement, jamais par son seul identifiant (copies).
    const sameProject =
      !reload &&
      loaded !== null &&
      this.current !== null &&
      sameProjectFile(loaded.projectFilePath, this.current.projectFilePath)
    // Le projet quitté perd son historique d'annulation : ses images inutilisées sont rangées.
    // Une restauration n'est pas un départ du projet : ses vignettes ne sont pas rangées.
    if (this.current && !sameProject && !reload) await this.retireImages(this.current)
    this.current = loaded
    if (!sameProject) {
      this.lastSavedPdf = null
      this.saver = loaded ? this.createSaver(loaded) : null
      this.scenario = loaded ? this.createScenarioSession(loaded) : null
      this.sheets = loaded ? this.createSheetFolders(loaded) : null
      this.documents = loaded
        ? new DocumentsFolder({ dataDir: loaded.dataDir, onStatus: this.options.onResearchStatus })
        : null
      this.credits = loaded
        ? new CreditsSession({ dataDir: loaded.dataDir, onStatus: this.options.onResearchStatus })
        : null
      this.planning = loaded
        ? new PlanningSession({ dataDir: loaded.dataDir, onStatus: this.options.onResearchStatus })
        : null
    }
    if (loaded) {
      const entry = {
        filePath: loaded.projectFilePath,
        title: loaded.project.title,
        id: loaded.project.id,
        lastOpenedAt: new Date().toISOString()
      }
      // Un échec d'écriture des préférences ne doit pas empêcher d'ouvrir le projet.
      await this.updatePreferences((prefs) => ({
        ...prefs,
        recentProjects: addRecentProject(prefs.recentProjects, entry)
      })).catch(() => undefined)
    }
    this.options.onProjectChanged(this.currentProject)
  }

  /** Range les images inutilisées ; un échec (clé USB retirée…) n'empêche pas de fermer. */
  private async retireImages(project: LoadedProject): Promise<void> {
    await retireUnusedImages(project.dataDir, project.decoupage).catch(() => undefined)
  }

  private createSaver(loaded: LoadedProject): AutoSaver<Decoupage> {
    const filePath = join(loaded.dataDir, PROJECT_FILES.decoupage)
    this.options.onSaveStatus({ state: 'saved' })
    return new AutoSaver<Decoupage>({
      write: (decoupage) => writeJsonSafely(filePath, decoupage),
      // Le découpage n'est jamais bloqué : seul le scénario peut être modifié ailleurs.
      onStatus: (status) => {
        if (status.state !== 'blocked') this.options.onSaveStatus(status)
      }
    })
  }

  private createScenarioSession(loaded: LoadedProject): ScenarioSession {
    this.options.onScenarioStatus({ state: 'saved' })
    return new ScenarioSession({
      path: join(loaded.dataDir, PROJECT_FILES.scenario),
      onStatus: (status) => this.options.onScenarioStatus(status)
    })
  }

  private createSheetFolders(loaded: LoadedProject): Record<SheetKind, SheetFolder> {
    this.options.onResearchStatus({ state: 'saved' })
    const folder = (kind: SheetKind): SheetFolder =>
      new SheetFolder({ dataDir: loaded.dataDir, kind, onStatus: this.options.onResearchStatus })
    return { personnages: folder('personnages'), lieux: folder('lieux') }
  }

  private requireSheets(kind: unknown): SheetFolder {
    this.requireCurrent()
    if (!this.sheets) throw new ProjectError(fr.errors.noProjectOpen)
    return this.sheets[parseSheetKind(kind)]
  }

  listSheets(kind: unknown): Promise<Result<Sheet[]>> {
    return attempt(() => this.requireSheets(kind).list())
  }

  createSheet(kind: unknown, name: unknown): Promise<Result<Sheet>> {
    return attempt(() => this.requireSheets(kind).create(name))
  }

  createAutoSheets(kind: unknown, names: unknown): Promise<Result<Sheet[]>> {
    return attempt(async () => {
      const list = Array.isArray(names) ? names.slice(0, MAX_AUTO_SHEETS) : []
      return this.requireSheets(kind).createAuto(list)
    })
  }

  updateSheet(kind: unknown, fileName: unknown, patch: unknown): Promise<Result<void>> {
    return attempt(async () => {
      const folder = this.requireSheets(kind)
      folder.update(fileName, parseSheetPatch(parseSheetKind(kind), patch))
    })
  }

  /**
   * Renomme une fiche (étape 10D). Avec `backup`, une copie « avant_renommage_… » (scénario,
   * découpage, fiche) est faite d'abord ; elle n'est pas refaite pour une annulation.
   */
  renameSheet(
    kind: unknown,
    fileName: unknown,
    name: unknown,
    backup: unknown
  ): Promise<Result<SheetRename>> {
    return attempt(async () => {
      const folder = this.requireSheets(kind)
      await folder.checkRename(fileName, name)
      let backupFolder: string | null = null
      if (backup === true) {
        await this.flushAll()
        backupFolder = await backupLinkFiles(this.requireCurrent().dataDir, 'rename', new Date(), [
          [parseSheetKind(kind), String(fileName)]
        ])
      }
      return { sheet: await folder.rename(fileName, name), backupFolder }
    })
  }

  deleteSheet(kind: unknown, fileName: unknown): Promise<Result<string>> {
    return attempt(() => this.requireSheets(kind).remove(fileName))
  }

  storeSheetImageFile(kind: unknown, sourcePath: unknown): Promise<Result<SheetImage>> {
    return attempt(async () => {
      if (typeof sourcePath !== 'string') throw new ProjectError(fr.images.unreadable)
      return this.requireSheets(kind).storeImageFile(sourcePath)
    })
  }

  storeSheetImageBytes(kind: unknown, bytes: unknown, name: unknown): Promise<Result<SheetImage>> {
    return attempt(async () => {
      if (!(bytes instanceof Uint8Array)) throw new ProjectError(fr.images.unreadable)
      return this.requireSheets(kind).storeImageBytes(bytes, typeof name === 'string' ? name : '')
    })
  }

  private requireDocuments(): DocumentsFolder {
    this.requireCurrent()
    if (!this.documents) throw new ProjectError(fr.errors.noProjectOpen)
    return this.documents
  }

  listDocuments(): Promise<Result<DocumentFolder>> {
    return attempt(() => this.requireDocuments().list())
  }

  createDocumentFolder(parent: unknown, name: unknown): Promise<Result<string>> {
    return attempt(() => this.requireDocuments().createFolder(parent, name))
  }

  createDocumentNote(folder: unknown, name: unknown): Promise<Result<string>> {
    return attempt(() => this.requireDocuments().createNote(folder, name))
  }

  renameDocument(path: unknown, name: unknown): Promise<Result<string>> {
    return attempt(() => this.requireDocuments().renameEntry(path, name))
  }

  deleteDocument(path: unknown): Promise<Result<string>> {
    return attempt(() => this.requireDocuments().removeEntry(path))
  }

  readDocumentNote(path: unknown): Promise<Result<string>> {
    return attempt(() => this.requireDocuments().readNote(path))
  }

  writeDocumentNote(path: unknown, text: unknown): Promise<Result<void>> {
    return attempt(() => this.requireDocuments().writeNote(path, text))
  }

  storeDocumentImageFile(folder: unknown, sourcePath: unknown): Promise<Result<DocumentImage>> {
    return attempt(async () => {
      if (typeof sourcePath !== 'string') throw new ProjectError(fr.images.unreadable)
      return this.requireDocuments().storeImageFile(folder, sourcePath)
    })
  }

  storeDocumentImageBytes(
    folder: unknown,
    bytes: unknown,
    name: unknown
  ): Promise<Result<DocumentImage>> {
    return attempt(async () => {
      if (!(bytes instanceof Uint8Array)) throw new ProjectError(fr.images.unreadable)
      return this.requireDocuments().storeImageBytes(
        folder,
        bytes,
        typeof name === 'string' ? name : ''
      )
    })
  }

  removeDocumentImage(folder: unknown, fileName: unknown): Promise<Result<string>> {
    return attempt(() => this.requireDocuments().removeImage(folder, fileName))
  }

  private requireCredits(): CreditsSession {
    this.requireCurrent()
    if (!this.credits) throw new ProjectError(fr.errors.noProjectOpen)
    return this.credits
  }

  /** Modèle de générique, données du projet et type du projet (pour les blocs facultatifs). */
  getCredits(): Promise<Result<CreditsContent>> {
    return attempt(async () => ({
      template: await loadCreditsTemplate(this.options.creditsTemplatePath),
      data: await this.requireCredits().read(),
      projectType: this.requireCurrent().project.projectType
    }))
  }

  private requirePlanning(): PlanningSession {
    this.requireCurrent()
    if (!this.planning) throw new ProjectError(fr.errors.noProjectOpen)
    return this.planning
  }

  /** Planning relu sur le disque et équipe du générique recalculée (le générique est écrit d'abord). */
  getPlanning(): Promise<Result<PlanningContent>> {
    return attempt(async () => {
      const session = this.requirePlanning()
      await this.credits?.flush()
      const { planning, changed } = await session.read()
      const credits = await this.requireCredits().read()
      const template = await loadCreditsTemplate(this.options.creditsTemplatePath)
      return { planning, crew: crewMembers(credits, template), changed }
    })
  }

  updatePlanning(planning: unknown): Promise<Result<void>> {
    return attempt(async () => this.requirePlanning().update(planning))
  }

  updateCredits(data: unknown): Promise<Result<void>> {
    return attempt(async () => this.requireCredits().update(data))
  }

  storeCreditsLogoFile(sourcePath: unknown): Promise<Result<string>> {
    return attempt(async () => {
      if (typeof sourcePath !== 'string') throw new ProjectError(fr.images.unreadable)
      return this.requireCredits().storeLogoFile(sourcePath)
    })
  }

  storeCreditsLogoBytes(bytes: unknown, name: unknown): Promise<Result<string>> {
    return attempt(async () => {
      if (!(bytes instanceof Uint8Array)) throw new ProjectError(fr.images.unreadable)
      return this.requireCredits().storeLogoBytes(bytes, typeof name === 'string' ? name : '')
    })
  }

  readCreditsLogo(path: unknown): Promise<Result<Uint8Array>> {
    return attempt(() => readCreditsLogo(this.requireCurrent().dataDir, path))
  }

  saveCreditsPngs(files: unknown): Promise<Result<string>> {
    return attempt(async () =>
      writeCreditsPngs(this.requireCurrent().rootDir, parsePngFiles(files))
    )
  }

  saveCreditsText(text: unknown): Promise<Result<string>> {
    return attempt(async () => {
      if (typeof text !== 'string') throw new ProjectError(fr.creditsExport.invalid)
      return writeCreditsText(this.requireCurrent().rootDir, text)
    })
  }

  /** Dossier des exports du générique (créé au premier export), ou null sans projet. */
  creditsExportFolder(): string | null {
    return this.current ? creditsExportFolder(this.current.rootDir) : null
  }

  /** Écrit les fiches et les notes en attente. Vrai si tout est enregistré. */
  async flushSheets(): Promise<boolean> {
    const results = await Promise.all([
      ...this.sheetFolders().map((folder) => folder.flush()),
      this.documents?.flush() ?? true,
      this.credits?.flush() ?? true,
      this.planning?.flush() ?? true
    ])
    return results.every(Boolean)
  }

  private requireScenario(): ScenarioSession {
    this.requireCurrent()
    if (!this.scenario) throw new ProjectError(fr.errors.noProjectOpen)
    return this.scenario
  }

  getScenario(): Promise<Result<string>> {
    return attempt(() => this.requireScenario().get())
  }

  updateScenario(text: unknown): Promise<Result<void>> {
    return attempt(async () => {
      if (typeof text !== 'string' || text.length > MAX_SCENARIO_LENGTH) {
        throw new ProjectError(fr.errors.invalidScenario)
      }
      this.requireScenario().update(text)
    })
  }

  /** Texte relu si scenario.fountain a été modifié ailleurs sans conflit, sinon null. */
  async checkScenario(): Promise<string | null> {
    return (await this.scenario?.check().catch(() => null)) ?? null
  }

  resolveScenarioConflict(choice: unknown): Promise<Result<string>> {
    return attempt(() => this.requireScenario().resolve(choice === 'reload' ? 'reload' : 'keep'))
  }

  /** Copie de sécurité avant que le rapprochement scénario ↔ cartes modifie les fichiers. */
  backupLinkFiles(kind: unknown): Promise<Result<string>> {
    return attempt(() =>
      backupLinkFiles(this.requireCurrent().dataDir, kind === 'link' ? 'link' : 'reconcile')
    )
  }

  getDecoupage(): Promise<Result<Decoupage>> {
    return attempt(async () => this.requireCurrent().decoupage)
  }

  /** Vérifie les données reçues de l'interface, puis les confie à l'enregistrement automatique. */
  updateDecoupage(raw: unknown): Promise<Result<void>> {
    return attempt(async () => {
      const current = this.requireCurrent()
      const decoupage = parseDecoupage(raw)
      current.decoupage = decoupage
      this.saver?.update(decoupage)
    })
  }

  async flushDecoupage(): Promise<void> {
    await this.saver?.flush()
  }

  async getCardZoom(): Promise<number> {
    return (await this.getPreferences()).cardZoom
  }

  async setCardZoom(zoom: unknown): Promise<void> {
    const cardZoom = clampCardZoom(zoom)
    await this.updatePreferences((prefs) => ({ ...prefs, cardZoom })).catch(() => undefined)
  }

  /** Projet ouvert, pour servir ses images et leurs aperçus ; null sans projet. */
  get imageSource(): ImageSource | null {
    if (!this.current) return null
    return {
      dataDir: this.current.dataDir,
      projectId: this.current.project.id,
      previewsDir: this.previewsDir
    }
  }

  private get previewsDir(): string {
    return join(this.options.userDataDir, PREVIEWS_FOLDER)
  }

  /** Taille du cache des aperçus, en octets. */
  previewsCacheSize(): Promise<number> {
    return previewsCacheSize(this.previewsDir)
  }

  /** Vide le cache des aperçus (ils sont refabriqués à la demande). */
  clearPreviewsCache(): Promise<void> {
    return clearPreviewsCache(this.previewsDir)
  }

  /** Dimensions des vignettes (pour les badges « À recadrer »). */
  getImageSizes(paths: unknown): Promise<Result<Record<string, Size | null>>> {
    return attempt(async () => {
      const { dataDir } = this.requireCurrent()
      const list = Array.isArray(paths)
        ? paths.filter((p): p is string => typeof p === 'string')
        : []
      return readImageSizes(dataDir, list)
    })
  }

  /**
   * Titre modifié dans la fenêtre « Page de titre… » : projet.json, titre de la fenêtre et projets
   * récents suivent. Le nom du dossier du film ne change jamais.
   */
  updateProjectTitle(raw: unknown): Promise<Result<ProjectSummary>> {
    return attempt(async () => {
      const current = this.requireCurrent()
      const title = typeof raw === 'string' ? cleanTitle(raw) : ''
      if (title === '' || title === current.project.title) return summarize(current)
      this.current = await writeProjectTitle(current, title)
      await this.updatePreferences((prefs) => ({
        ...prefs,
        recentProjects: prefs.recentProjects.map((recent) =>
          recent.filePath === current.projectFilePath ? { ...recent, title } : recent
        )
      })).catch(() => undefined)
      this.options.onProjectChanged(this.currentProject)
      return summarize(this.current)
    })
  }

  async getTheme(): Promise<ThemeChoice> {
    return (await this.getPreferences()).theme
  }

  /** Thème choisi dans les Réglages : enregistré, puis appliqué tout de suite (sans redémarrage). */
  async setTheme(raw: unknown): Promise<void> {
    const theme = parseTheme(raw)
    this.options.onThemeChanged(theme)
    await this.updatePreferences((prefs) => ({ ...prefs, theme })).catch(() => undefined)
  }

  async getScriptColors(): Promise<ScriptColors> {
    return (await this.getPreferences()).scriptColors
  }

  /** Couleurs du scénario (Réglages) : nettoyées, enregistrées, puis diffusées à la fenêtre. */
  async setScriptColors(raw: unknown): Promise<void> {
    const scriptColors = parseScriptColors(raw)
    this.options.onScriptColorsChanged(scriptColors)
    await this.updatePreferences((prefs) => ({ ...prefs, scriptColors })).catch(() => undefined)
  }

  /** Adresse de l'image d'accueil : la copie choisie si elle existe encore, sinon l'image livrée. */
  async getWelcomeImageUrl(): Promise<string> {
    const name = (await this.getPreferences()).welcomeImage
    const copy = welcomeCopyPath(this.options.userDataDir, name)
    return welcomeImageUrl(copy && name ? name : WELCOME_IMAGE_DEFAULT)
  }

  /** Copie l'image choisie dans les données de l'application (elle remplace la précédente). */
  chooseWelcomeImage(sourcePath: string): Promise<Result<string>> {
    return attempt(async () => {
      const name = await installWelcomeImage(this.options.userDataDir, sourcePath)
      await this.updatePreferences((prefs) => ({ ...prefs, welcomeImage: name }))
      return welcomeImageUrl(name)
    })
  }

  /** Retour à l'image d'origine : la copie est supprimée. */
  async resetWelcomeImage(): Promise<string> {
    await this.updatePreferences((prefs) => ({ ...prefs, welcomeImage: null }))
    await removeWelcomeCopies(this.options.userDataDir, null)
    return welcomeImageUrl(WELCOME_IMAGE_DEFAULT)
  }

  async getScriptZoom(): Promise<number> {
    return (await this.getPreferences()).scriptZoom
  }

  async setScriptZoom(zoom: unknown): Promise<void> {
    const scriptZoom = clampScriptZoom(zoom)
    await this.updatePreferences((prefs) => ({ ...prefs, scriptZoom })).catch(() => undefined)
  }

  async getHighlightActiveLine(): Promise<boolean> {
    return (await this.getPreferences()).highlightActiveLine
  }

  async setHighlightActiveLine(highlight: unknown): Promise<void> {
    const highlightActiveLine = highlight === true
    await this.updatePreferences((prefs) => ({ ...prefs, highlightActiveLine })).catch(
      () => undefined
    )
  }

  async getContinuedMarks(): Promise<boolean> {
    return (await this.getPreferences()).continuedMarks
  }

  async setContinuedMarks(enabled: unknown): Promise<void> {
    const continuedMarks = enabled === true
    await this.updatePreferences((prefs) => ({ ...prefs, continuedMarks })).catch(() => undefined)
  }

  async getShowElementBar(): Promise<boolean> {
    return (await this.getPreferences()).showElementBar
  }

  async setShowElementBar(show: unknown): Promise<void> {
    const showElementBar = show === true
    await this.updatePreferences((prefs) => ({ ...prefs, showElementBar })).catch(() => undefined)
    this.options.onElementBarChanged(showElementBar)
  }

  async getShowSceneNavigator(): Promise<boolean> {
    return (await this.getPreferences()).showSceneNavigator
  }

  async setShowSceneNavigator(show: unknown): Promise<void> {
    const showSceneNavigator = show === true
    await this.updatePreferences((prefs) => ({ ...prefs, showSceneNavigator })).catch(
      () => undefined
    )
    this.options.onSceneNavigatorChanged(showSceneNavigator)
  }

  async getShowThumbnails(): Promise<boolean> {
    return (await this.getPreferences()).showThumbnails
  }

  async setShowThumbnails(show: unknown): Promise<void> {
    const showThumbnails = show === true
    await this.updatePreferences((prefs) => ({ ...prefs, showThumbnails })).catch(() => undefined)
  }

  private creditsOpenKey(): string | null {
    return this.current
      ? creditsOpenKey(this.current.project.id, this.current.projectFilePath)
      : null
  }

  async getCreditsOpenBlocks(): Promise<string[]> {
    const key = this.creditsOpenKey()
    if (key === null) return []
    return openBlocksOf((await this.getPreferences()).creditsOpen, key)
  }

  async setCreditsOpenBlocks(open: unknown): Promise<void> {
    const key = this.creditsOpenKey()
    if (key === null || !Array.isArray(open)) return
    const blocks = open.filter((id): id is string => typeof id === 'string')
    await this.updatePreferences((prefs) => ({
      ...prefs,
      creditsOpen: withProjectOpen(prefs.creditsOpen, key, blocks)
    })).catch(() => undefined)
  }

  storeOriginalFile(shotId: unknown, sourcePath: unknown): Promise<Result<StoredOriginal>> {
    return attempt(async () => {
      const { dataDir } = this.requireCurrent()
      if (typeof shotId !== 'string' || typeof sourcePath !== 'string') {
        throw new ProjectError(fr.images.unreadable)
      }
      return storeOriginalFile(dataDir, shotId, sourcePath)
    })
  }

  storeOriginalBytes(shotId: unknown, bytes: unknown): Promise<Result<StoredOriginal>> {
    return attempt(async () => {
      const { dataDir } = this.requireCurrent()
      if (typeof shotId !== 'string' || !(bytes instanceof Uint8Array)) {
        throw new ProjectError(fr.images.unreadable)
      }
      return storeOriginalBytes(dataDir, shotId, bytes)
    })
  }

  /** Seules les images du storyboard peuvent être relues par l'interface. */
  readProjectImage(path: unknown): Promise<Result<Uint8Array>> {
    return attempt(async () => {
      const { dataDir } = this.requireCurrent()
      if (typeof path !== 'string' || !isStoryboardImagePath(path)) {
        throw new ProjectError(fr.images.unreadable)
      }
      try {
        return new Uint8Array(await readFile(resolveDataPath(dataDir, path)))
      } catch {
        throw new ProjectError(fr.images.unreadable)
      }
    })
  }

  /** Duplication d'un plan : sa vignette et son image d'origine sont copiées sous son nom. */
  copyThumbnailFiles(shotId: unknown, files: unknown): Promise<Result<ThumbnailFiles>> {
    return attempt(async () => {
      const { dataDir } = this.requireCurrent()
      const value = files as Partial<ThumbnailFiles> | null
      const text = (field: unknown): string | null => (typeof field === 'string' ? field : null)
      if (typeof shotId !== 'string') throw new ProjectError(fr.images.unreadable)
      return copyThumbnailFiles(dataDir, shotId, {
        thumbnail: text(value?.thumbnail),
        thumbnailSource: text(value?.thumbnailSource)
      })
    })
  }

  storeThumbnail(shotId: unknown, bytes: unknown): Promise<Result<string>> {
    return attempt(async () => {
      const { dataDir } = this.requireCurrent()
      if (typeof shotId !== 'string' || !(bytes instanceof Uint8Array)) {
        throw new ProjectError(fr.images.unsupported)
      }
      return storeThumbnail(dataDir, shotId, bytes)
    })
  }

  getBlenderExportInfo(): Promise<Result<BlenderExportInfo>> {
    return attempt(() => this.blender.info())
  }

  /** Fichier proposé à l'ouverture du sélecteur de .blend. */
  blendDialogDefaultPath(currentPath: unknown): string | null {
    if (!this.current) return null
    return this.blender.dialogDefaultPath(typeof currentPath === 'string' ? currentPath : null)
  }

  checkBlendTarget(path: string): Promise<Result<BlendTarget>> {
    return attempt(() => this.blender.checkTarget(path))
  }

  chooseBlender(appPath: string): Promise<Result<string>> {
    return attempt(() => this.blender.chooseBlender(appPath))
  }

  exportToBlender(raw: unknown): Promise<Result<BlenderLaunchStatus>> {
    return attempt(async () => {
      const value = raw as Partial<BlenderExportRequest> | null
      if (typeof value?.blendPath !== 'string') throw new ProjectError(fr.blender.outsideFilm)
      return this.blender.export({
        blendPath: value.blendPath,
        openInBlender: value.openInBlender === true
      })
    })
  }

  launchBlender(): Promise<Result<BlenderLaunchStatus>> {
    return attempt(() => this.blender.launchAgain())
  }

  getPdfOptions(): Promise<Result<PdfExportOptions>> {
    return attempt(async () => {
      this.requireCurrent()
      return this.pdf.options()
    })
  }

  previewPdf(raw: unknown): Promise<Result<PdfPreview>> {
    return attempt(async () => {
      const request = parsePdfRequest(raw)
      const preview = await this.pdf.preview(request)
      await this.pdf.rememberOptions(request.options)
      return preview
    })
  }

  /** Emplacement proposé à « Enregistrer sous… » ; null sans projet. */
  pdfDialogDefaultPath(): string | null {
    return this.current ? this.pdf.defaultPath() : null
  }

  /** Écrit le PDF ; `targetPath` null = dans exports/ du projet. */
  savePdf(raw: unknown, targetPath: string | null): Promise<Result<PdfSavedFile>> {
    return attempt(async () => {
      this.requireCurrent()
      const saved = await this.pdf.save(parsePdfRequest(raw), targetPath)
      this.lastSavedPdf = saved.path
      return saved
    })
  }

  getStoryboardInfo(): Promise<Result<StoryboardExportInfo>> {
    return attempt(async () => {
      this.requireCurrent()
      return this.storyboard.info()
    })
  }

  previewStoryboard(raw: unknown): Promise<Result<StoryboardPreview>> {
    return attempt(async () => {
      this.requireCurrent()
      const options = parseStoryboardRequest(raw)
      const preview = await this.storyboard.preview(options)
      await this.storyboard.rememberOptions(options)
      return preview
    })
  }

  /** Emplacement proposé à « Enregistrer sous… » ; null sans projet. */
  storyboardDialogDefaultPath(raw: unknown): string | null {
    return this.current ? this.storyboard.defaultPath(parseStoryboardRequest(raw)) : null
  }

  /** Écrit le PDF et le fichier d'impression ; `targetPath` null = dans exports/ du projet. */
  saveStoryboard(raw: unknown, targetPath: string | null): Promise<Result<PdfSavedFile>> {
    return attempt(async () => {
      this.requireCurrent()
      const saved = await this.storyboard.save(parseStoryboardRequest(raw), targetPath)
      this.lastSavedPdf = saved.path
      return saved
    })
  }

  getPlanningExportInfo(): Promise<Result<PlanningExportInfo>> {
    return attempt(async () => {
      this.requireCurrent()
      return this.planningExport.info()
    })
  }

  previewPlanningExport(raw: unknown): Promise<Result<PlanningExportPreview>> {
    return attempt(async () => {
      this.requireCurrent()
      const request = parsePlanningExportRequest(raw)
      const preview = await this.planningExport.preview(request)
      await this.planningExport.rememberOptions(request)
      return preview
    })
  }

  /** Emplacement proposé à « Enregistrer sous… » ; null sans projet. */
  async planningExportDialogDefaultPath(raw: unknown): Promise<string | null> {
    return this.current ? this.planningExport.defaultPath(parsePlanningExportRequest(raw)) : null
  }

  /** Écrit le PDF ou le calendrier ; `targetPath` null = dans l'emplacement habituel. */
  savePlanningExport(raw: unknown, targetPath: string | null): Promise<Result<PdfSavedFile>> {
    return attempt(async () => {
      this.requireCurrent()
      const saved = await this.planningExport.save(parsePlanningExportRequest(raw), targetPath)
      this.lastSavedPdf = saved.path
      return saved
    })
  }

  listVersions(): Promise<Result<VersionList>> {
    return attempt(() => this.versions.list())
  }

  saveVersion(name: unknown, note: unknown): Promise<Result<VersionEntry>> {
    return attempt(() => this.versions.save(name, note))
  }

  restoreVersion(folder: unknown, undo: boolean): Promise<Result<RestoredVersion>> {
    return attempt(() => this.versions.restore(folder, undo))
  }

  readVersionScript(folder: unknown): Promise<Result<VersionScript>> {
    return attempt(() => this.versions.readScript(folder))
  }

  deleteVersion(folder: unknown): Promise<Result<string>> {
    return attempt(() => this.versions.remove(folder))
  }

  versionDuplicatePath(folder: unknown): Promise<Result<string>> {
    return attempt(() => this.versions.duplicateDefaultPath(folder))
  }

  /** Copie le projet avec les fichiers de la version, puis l'ouvre (le projet actuel se ferme). */
  duplicateVersion(folder: unknown, target: string): Promise<Result<ProjectSummary>> {
    return attempt(async () => {
      const copyFile = await this.versions.duplicate(folder, target)
      const opened = await this.open(copyFile)
      if (!opened.ok) throw new ProjectError(opened.error)
      return opened.value
    })
  }

  /** Relit le projet ouvert depuis le disque (le titre suit le scénario). */
  private async reloadCurrent(): Promise<void> {
    const read = await readProject(this.requireCurrent().projectFilePath)
    const loaded = await syncTitleFromScenario(read).catch(() => read)
    await this.setCurrent(loaded, true)
  }

  /** Chemin du dernier PDF enregistré, pour l'ouvrir ou l'afficher dans le dossier. */
  savedPdfPath(): string | null {
    return this.lastSavedPdf
  }

  private requireCurrent(): LoadedProject {
    if (!this.current) throw new ProjectError(fr.errors.noProjectOpen)
    return this.current
  }

  async getHomeData(): Promise<HomeData> {
    const prefs = await this.getPreferences()
    const recentProjects = await Promise.all(
      prefs.recentProjects.map(async (recent) => ({
        ...recent,
        location: dirname(recent.filePath),
        found: await exists(recent.filePath)
      }))
    )
    return { recentProjects }
  }

  async removeRecent(filePath: string): Promise<HomeData> {
    await this.updatePreferences((prefs) => ({
      ...prefs,
      recentProjects: removeRecentProject(prefs.recentProjects, filePath)
    }))
    return this.getHomeData()
  }

  getCreationData(): Promise<Result<CreationData>> {
    return attempt(async () => {
      const lastLocation = (await this.getPreferences()).lastLocation
      const useLast = lastLocation !== null && (await isDirectory(lastLocation))
      return {
        template: await this.getTemplate(),
        defaultLocation: useLast ? lastLocation : this.options.documentsDir
      }
    })
  }

  async isFolderAvailable(location: string, folderName: string): Promise<boolean> {
    if (folderName === '') return true
    return !(await exists(join(location, folderName)))
  }

  create(request: CreateProjectRequest): Promise<Result<ProjectSummary>> {
    return attempt(async () => {
      const settings = await this.checkSettings(request.settings)
      if (!(await this.ensureSaved())) return this.keepCurrent()
      const loaded = await createProject({ ...request, settings }, await this.getTemplate())
      await this.updatePreferences((prefs) => ({ ...prefs, lastLocation: request.location }))
      await this.setCurrent(loaded)
      return summarize(loaded)
    })
  }

  /** Ouvrir un autre projet ferme le premier ; en cas d'échec, le projet ouvert reste ouvert. */
  open(filePath: string): Promise<Result<ProjectSummary>> {
    return attempt(async () => {
      if (!(await this.ensureSaved())) return this.keepCurrent()
      const read = await this.separateCopy(await readProject(filePath))
      // Le titre du scénario fait foi ; un échec d'écriture n'empêche pas d'ouvrir le projet.
      const loaded = await syncTitleFromScenario(read).catch(() => read)
      await this.setCurrent(loaded)
      return summarize(loaded)
    })
  }

  /**
   * Copie d'un projet déjà connu ailleurs (dossier dupliqué) : elle reçoit un nouvel identifiant, sans
   * rien demander à l'élève. Les deux projets restent ainsi indépendants (aperçus, interface).
   */
  private async separateCopy(loaded: LoadedProject): Promise<LoadedProject> {
    const prefs = await this.getPreferences().catch(() => null)
    const known = [
      ...(this.current
        ? [{ id: this.current.project.id, filePath: this.current.projectFilePath }]
        : []),
      ...(prefs?.recentProjects ?? [])
    ]
    const idAt = async (path: string): Promise<string | null> => {
      if (this.current && sameProjectFile(path, this.current.projectFilePath))
        return this.current.project.id
      return readProject(path).then(
        (other) => other.project.id,
        () => null
      )
    }
    if (!(await isCopiedProject(loaded, { known, idAt }))) return loaded
    return giveNewId(loaded)
  }

  async close(): Promise<void> {
    if (this.current && (await this.ensureSaved())) await this.setCurrent(null)
  }

  /** L'élève a refusé de fermer le projet : il reste ouvert tel quel. */
  private keepCurrent(): ProjectSummary {
    return summarize(this.requireCurrent())
  }

  getStructureStatus(): Promise<Result<FolderStatus[]>> {
    return attempt(async () => {
      if (!this.current) throw new ProjectError(fr.errors.noProjectOpen)
      return getStructureStatus(this.current.rootDir, await this.getTemplate())
    })
  }

  completeStructure(request: CompleteStructureRequest): Promise<Result<ProjectSummary>> {
    return attempt(async () => {
      if (!this.current) throw new ProjectError(fr.errors.noProjectOpen)
      // Le projet est relu depuis le disque : tout doit d'abord y être écrit.
      if (!(await this.ensureSaved())) return this.keepCurrent()
      const loaded = await completeStructure(
        this.current.projectFilePath,
        request.folders,
        request.withReadme,
        await this.getTemplate()
      )
      await this.setCurrent(loaded)
      return summarize(loaded)
    })
  }
}
