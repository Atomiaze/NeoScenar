// Contrat entre le preload et l'interface : la seule porte d'accès du renderer vers le système.
import type { FolderTemplate, TemplateFolder } from './folderTemplate'
import type { FormatCatalog, Size } from './imageFormat'
import type { Decoupage, ProjectSettings, ProjectType } from './projectTypes'
import type {
  PdfExportOptions,
  PdfExportRequest,
  PdfFileAction,
  PdfPreview,
  PdfSavedFile,
  PdfSaveMode
} from './pdfExport'
import type {
  StoryboardExportInfo,
  StoryboardExportOptions,
  StoryboardPreview
} from './storyboardExport'
import type {
  PlanningExportInfo,
  PlanningExportPreview,
  PlanningExportRequest
} from './planningExport'
import type { CreditsContent, CreditsData } from './credits/types'
import type { CrewMember, Planning } from './planning/types'
import type { DocumentFolder, DocumentImage } from './research/documents'
import type { ProjectTextName } from './projectTexts'
import type { Sheet, SheetImage, SheetKind, SheetPatch, SheetRename } from './research/types'
import type { ScriptColors } from './themes/scriptColors'
import type { ThemeChoice } from './themes/themes'
import type { CustomVocabulary } from './customVocabulary'
import type { Vocabulary } from './vocabulary'
import type { VersionEntry } from './versions/versions'

export const IPC_CHANNELS = {
  getAppVersion: 'app:get-version',
  openRepository: 'app:open-repository',
  getInitialState: 'app:get-initial-state',
  getHomeData: 'home:get-data',
  removeRecentProject: 'home:remove-recent',
  getCreationData: 'create:get-data',
  chooseLocation: 'create:choose-location',
  isFolderAvailable: 'create:is-folder-available',
  createProject: 'project:create',
  openProjectDialog: 'project:open-dialog',
  openProject: 'project:open',
  closeProject: 'project:close',
  getStructureStatus: 'project:get-structure',
  completeStructure: 'project:complete-structure',
  getDecoupage: 'decoupage:get',
  updateDecoupage: 'decoupage:update',
  flushDecoupage: 'decoupage:flush',
  getCardZoom: 'prefs:get-card-zoom',
  setCardZoom: 'prefs:set-card-zoom',
  setUndoState: 'menu:set-undo-state',
  setDrawingOpen: 'menu:set-drawing-open',
  setActiveModule: 'menu:set-active-module',
  setFocusMode: 'window:set-focus-mode',
  getVocabulary: 'app:get-vocabulary',
  getFormatCatalog: 'app:get-formats',
  updateProjectSettings: 'project:update-settings',
  chooseImageFiles: 'images:choose',
  storeOriginalFile: 'images:store-original-file',
  storeOriginalBytes: 'images:store-original-bytes',
  readProjectImage: 'images:read',
  storeThumbnail: 'images:store-thumbnail',
  getImageSizes: 'images:get-sizes',
  copyThumbnailFiles: 'images:copy-thumbnail',
  getShowThumbnails: 'prefs:get-show-thumbnails',
  getShowSceneNavigator: 'prefs:get-show-scene-navigator',
  getShowElementBar: 'prefs:get-show-element-bar',
  setShowElementBar: 'prefs:set-show-element-bar',
  getScriptZoom: 'prefs:get-script-zoom',
  getContinuedMarks: 'prefs:get-continued-marks',
  setContinuedMarks: 'prefs:set-continued-marks',
  getHighlightActiveLine: 'prefs:get-highlight-active-line',
  setHighlightActiveLine: 'prefs:set-highlight-active-line',
  getTheme: 'prefs:get-theme',
  setTheme: 'prefs:set-theme',
  themeChanged: 'prefs:theme-changed',
  getScriptColors: 'prefs:get-script-colors',
  setScriptColors: 'prefs:set-script-colors',
  scriptColorsChanged: 'prefs:script-colors-changed',
  getWelcomeImage: 'prefs:get-welcome-image',
  chooseWelcomeImage: 'prefs:choose-welcome-image',
  resetWelcomeImage: 'prefs:reset-welcome-image',
  setScriptZoom: 'prefs:set-script-zoom',
  setShowSceneNavigator: 'prefs:set-show-scene-navigator',
  setShowThumbnails: 'prefs:set-show-thumbnails',
  getCreditsOpenBlocks: 'prefs:get-credits-open-blocks',
  setCreditsOpenBlocks: 'prefs:set-credits-open-blocks',
  getRevisionPanelShown: 'prefs:get-revision-panel-shown',
  setRevisionPanelShown: 'prefs:set-revision-panel-shown',
  getCustomVocabulary: 'prefs:get-custom-vocabulary',
  setCustomVocabulary: 'prefs:set-custom-vocabulary',
  getBlenderExportInfo: 'blender:get-export-info',
  chooseBlendTarget: 'blender:choose-target',
  chooseBlender: 'blender:choose-app',
  exportToBlender: 'blender:export',
  launchBlender: 'blender:launch',
  getPdfOptions: 'pdf:get-options',
  previewPdf: 'pdf:preview',
  savePdf: 'pdf:save',
  openSavedPdf: 'pdf:open-saved',
  getStoryboardInfo: 'storyboard-pdf:get-info',
  previewStoryboard: 'storyboard-pdf:preview',
  saveStoryboard: 'storyboard-pdf:save',
  getPlanningExportInfo: 'planning-export:get-info',
  previewPlanningExport: 'planning-export:preview',
  savePlanningExport: 'planning-export:save',
  getScenario: 'scenario:get',
  updateProjectTitle: 'project:update-title',
  updateScenario: 'scenario:update',
  checkScenario: 'scenario:check',
  resolveScenarioConflict: 'scenario:resolve-conflict',
  backupLinkFiles: 'link:backup',
  listSheets: 'research:list',
  createSheet: 'research:create',
  createAutoSheets: 'research:create-auto',
  updateSheet: 'research:update',
  renameSheet: 'research:rename',
  deleteSheet: 'research:delete',
  storeSheetImageFile: 'research:store-image-file',
  storeSheetImageBytes: 'research:store-image-bytes',
  flushSheets: 'research:flush',
  listDocuments: 'documents:list',
  createDocumentFolder: 'documents:create-folder',
  createDocumentNote: 'documents:create-note',
  renameDocument: 'documents:rename',
  deleteDocument: 'documents:delete',
  readDocumentNote: 'documents:read-note',
  writeDocumentNote: 'documents:write-note',
  readProjectText: 'texts:read',
  writeProjectText: 'texts:write',
  storeDocumentImageFile: 'documents:store-image-file',
  storeDocumentImageBytes: 'documents:store-image-bytes',
  removeDocumentImage: 'documents:remove-image',
  // Messages envoyés par le processus principal à l'interface
  projectChanged: 'event:project-changed',
  errorRaised: 'event:error',
  saveStatus: 'event:save-status',
  scenarioStatus: 'event:scenario-status',
  getPlanning: 'planning:get',
  updatePlanning: 'planning:update',
  getCredits: 'credits:get',
  updateCredits: 'credits:update',
  storeCreditsLogoFile: 'credits:store-logo-file',
  storeCreditsLogoBytes: 'credits:store-logo-bytes',
  readCreditsLogo: 'credits:read-logo',
  saveCreditsPngs: 'credits:save-pngs',
  saveCreditsText: 'credits:save-text',
  copyText: 'app:copy-text',
  revealCreditsExport: 'credits:reveal-export',
  listVersions: 'versions:list',
  saveVersion: 'versions:save',
  restoreVersion: 'versions:restore',
  deleteVersion: 'versions:delete',
  duplicateVersion: 'versions:duplicate',
  readVersionScript: 'versions:read-script',
  researchStatus: 'event:research-status',
  menuCommand: 'event:menu-command',
  revisionContextQuery: 'event:revision-context-query',
  revisionContextReply: 'revision:context-reply'
} as const

/** Marque de révision visée par un clic droit dans l'éditeur (étape 13E). */
export interface RevisionContextInfo {
  hasComment: boolean
}

/** Image d'origine copiée dans storyboard/originaux/ (dimensions lues dans le fichier). */
export interface StoredOriginal {
  /** Chemin relatif au dossier neoscenar/. */
  path: string
  width: number
  height: number
}

/** Fichiers de la vignette d'un plan (chemins relatifs au dossier neoscenar/). */
export interface ThumbnailFiles {
  thumbnail: string | null
  thumbnailSource: string | null
}

/** Versions du projet (étape 13C) et nom proposé pour la prochaine. */
export interface VersionList {
  versions: VersionEntry[]
  suggestedName: string
}

/**
 * Scénario lu pour Consulter ou Comparer : celui d'une version, ou le scénario actuel (`version`
 * null) une fois tout enregistré (cartes comprises), avec les identifiants des cartes.
 */
export interface VersionScript {
  text: string
  /** Identifiant de carte par numéro de scène (« 30A » → id), pour associer les scènes. */
  sceneIds: Record<string, string>
  version: VersionEntry | null
}

/** Version restaurée ; `beforeFolder` : la version « Avant restauration » (null pour une annulation). */
export interface RestoredVersion {
  name: string
  beforeFolder: string | null
}

/** Résultat d'une opération qui peut échouer avec un message en français. */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

/** Résumé du projet ouvert, affiché provisoirement à l'étape 1. */
export interface ProjectSummary {
  /** Identifiant permanent du projet (pour savoir si c'est toujours le même projet). */
  id: string
  title: string
  /** Dossier du film (chemin absolu, pour l'affichage uniquement). */
  location: string
  sceneCount: number
  shotCount: number
  /** Format de l'image et cadence. */
  settings: ProjectSettings
}

export interface RecentProjectView {
  /** Chemin absolu du fichier .neoscenar. */
  filePath: string
  title: string
  /** Dossier du film. */
  location: string
  /** Date ISO 8601 de la dernière ouverture. */
  lastOpenedAt: string
  /** Faux si le projet a été déplacé, renommé, ou si la clé USB a été retirée. */
  found: boolean
}

export interface HomeData {
  recentProjects: RecentProjectView[]
}

export interface CreationData {
  template: FolderTemplate
  defaultLocation: string
}

export interface CreateProjectRequest {
  title: string
  location: string
  projectType: ProjectType
  /** Noms des dossiers du film cochés (« 04_Son »…). */
  folders: string[]
  withReadme: boolean
  /** Format de l'image et cadence choisis. */
  settings: ProjectSettings
}

export interface FolderStatus extends TemplateFolder {
  exists: boolean
}

export interface CompleteStructureRequest {
  folders: string[]
  withReadme: boolean
}

/** Fichier .blend retenu pour l'export vers Blender. */
export interface BlendTarget {
  /** Chemin absolu (pour le refaire passer au processus principal). */
  path: string
  /** Relatif au dossier du film, avec « / » : c'est ce qui est affiché. */
  relativePath: string
  /** Le fichier demandé existait déjà : `path` est un nom libre proposé à la place. */
  replacedExisting: boolean
}

/** Ce que la fenêtre d'export affiche en s'ouvrant. */
export interface BlenderExportInfo {
  /** Proposition par défaut ; null si le film n'a pas de dossier 06_Blender. */
  target: BlendTarget | null
  /** Blender retenu dans les préférences (chemin affiché), ou null. */
  blenderPath: string | null
}

export interface BlenderExportRequest {
  /** Chemin absolu du .blend visé (vérifié à nouveau avant l'export). */
  blendPath: string
  openInBlender: boolean
}

/** Ce qui s'est passé après l'export, du côté de Blender. */
/**
 * Pourquoi l'élève doit choisir Blender : aucun trouvé, plusieurs Blender 4.5, ou seulement une
 * version Microsoft Store (Windows) ou Flatpak (Linux), que NeoScenar ne sait pas lancer.
 */
export type BlenderNeedChoice = 'none' | 'several' | 'store-only' | 'flatpak-only'

export type BlenderLaunchStatus =
  | { state: 'not-requested' }
  /** `untestedVersion` : Blender lancé dans une autre version que 4.5 (« 5.0.1 »). */
  | { state: 'launched'; untestedVersion?: string }
  | { state: 'need-choice'; reason: BlenderNeedChoice }
  | { state: 'failed'; message: string }

/** État au chargement de l'interface (un projet a pu être ouvert depuis le Finder avant). */
export interface InitialState {
  project: ProjectSummary | null
  error: string | null
}

/** Lecture du planning : données, équipe du générique, et fichier modifié ailleurs ou non. */
export interface PlanningContent {
  planning: Planning
  crew: CrewMember[]
  changed: boolean
}

/** État de l'enregistrement automatique, affiché dans la barre d'outils. */
export type SaveStatus =
  { state: 'saved' } | { state: 'saving' } | { state: 'error'; message: string }

/**
 * Enregistrement du scénario : « conflict » quand scenario.fountain a été modifié dans un autre
 * logiciel ; rien n'est écrit tant que l'élève n'a pas choisi.
 */
export type ScenarioSaveStatus = SaveStatus | { state: 'conflict' }

/** Après une modification extérieure : relire le fichier, ou garder la version de NeoScenar. */
export type ScenarioConflictChoice = 'reload' | 'keep'

/**
 * Copie de sécurité avant que le lien scénario ↔ cartes modifie les fichiers : « link » à la première
 * liaison (toujours conservée), « reconcile » ensuite (les 10 dernières sont conservées).
 */
export type LinkBackupKind = 'link' | 'reconcile' | 'rename'

/** Module affiché dans la fenêtre du projet (null : accueil, aucun projet ouvert). */
export type ActiveModule = 'research' | 'cards' | 'script' | 'stats' | 'planning' | null

/** Commandes du menu que l'interface doit traiter elle-même. */
export type MenuCommand =
  | 'new-project'
  | 'complete-structure'
  | 'undo'
  | 'redo'
  | 'duplicate'
  | 'duplicate-scene'
  | 'project-settings'
  | 'export-blender'
  | 'export-pdf'
  | 'export-storyboard'
  | 'export-planning'
  | 'export-credits'
  | 'versions'
  | 'toggle-scene-navigator'
  | 'toggle-element-bar'
  | 'check-line-wrapping'
  | 'title-page'
  | 'find'
  | 'settings'
  | 'about'
  | 'toggle-focus-mode'
  | 'exit-focus-mode'
  | 'revision-edit-comment'
  | 'revision-remove-mark'
  | `drawing-zoom-${'in' | 'out' | 'reset'}`
  | `script-zoom-${'in' | 'out' | 'reset'}`

/** Types de modification du découpage, pour nommer l'annulation dans le menu Édition. */
export const UNDO_ACTIONS = [
  'addShot',
  'addShots',
  'addScene',
  'addScenes',
  'delete',
  'move',
  'duplicate',
  'importThumbnail',
  'replaceThumbnail',
  'recropThumbnail',
  'removeThumbnail',
  'importThumbnails',
  'drawThumbnail',
  'renumber',
  'lock',
  'unlock',
  'color',
  'edit',
  'recreateHeading'
] as const

export type UndoAction = (typeof UNDO_ACTIONS)[number]

/** Ce que « Annuler » et « Rétablir » feraient dans le découpage (null : rien). */
export interface UndoState {
  undo: UndoAction | null
  redo: UndoAction | null
}

export interface NeoScenarApi {
  getAppVersion(): Promise<string>
  /** Ouvre la page GitHub de NeoScenar dans le navigateur (adresse fixe, choisie par le processus principal). */
  openRepository(): Promise<void>
  getInitialState(): Promise<InitialState>
  getHomeData(): Promise<HomeData>
  removeRecentProject(filePath: string): Promise<HomeData>
  getCreationData(): Promise<Result<CreationData>>
  /** Ouvre le sélecteur de dossier ; null si l'élève annule. */
  chooseLocation(currentLocation: string): Promise<string | null>
  isFolderAvailable(location: string, folderName: string): Promise<boolean>
  createProject(request: CreateProjectRequest): Promise<Result<ProjectSummary>>
  /** Ouvre le sélecteur de fichier .neoscenar ; null si l'élève annule. */
  openProjectDialog(): Promise<Result<ProjectSummary> | null>
  openProject(filePath: string): Promise<Result<ProjectSummary>>
  closeProject(): Promise<void>
  getStructureStatus(): Promise<Result<FolderStatus[]>>
  completeStructure(request: CompleteStructureRequest): Promise<Result<ProjectSummary>>
  /** Découpage du projet ouvert. */
  getDecoupage(): Promise<Result<Decoupage>>
  /** Nouvelle version du découpage : vérifiée, puis enregistrée automatiquement. */
  updateDecoupage(decoupage: Decoupage): Promise<Result<void>>
  /** Enregistre immédiatement ce qui est en attente (Cmd + S). */
  flushDecoupage(): Promise<void>
  getCardZoom(): Promise<number>
  setCardZoom(zoom: number): Promise<void>
  /** Vocabulaire du cours pour les listes de la fiche plan. */
  getVocabulary(): Promise<Result<Vocabulary>>
  /** Préréglages de format d'image et cadences proposées. */
  getFormatCatalog(): Promise<Result<FormatCatalog>>
  /** Change le format et la cadence du projet ouvert (projet.json). */
  updateProjectSettings(settings: ProjectSettings): Promise<Result<ProjectSummary>>
  /** Sélecteur d'images PNG ou JPEG ; liste vide si l'élève annule. */
  chooseImageFiles(multiple: boolean): Promise<string[]>
  /** Copie une image choisie (ou glissée) dans storyboard/originaux/. */
  storeOriginalFile(shotId: string, sourcePath: string): Promise<Result<StoredOriginal>>
  /** Même chose pour une image collée (octets du presse-papiers). */
  storeOriginalBytes(shotId: string, bytes: Uint8Array): Promise<Result<StoredOriginal>>
  /** Octets d'une image du storyboard (pour la recadrer). */
  readProjectImage(path: string): Promise<Result<Uint8Array>>
  /** Enregistre une vignette PNG dans storyboard/vignettes/ ; renvoie son chemin relatif. */
  storeThumbnail(shotId: string, bytes: Uint8Array): Promise<Result<string>>
  /** Copie la vignette et l'image d'origine d'un plan dupliqué sous le nom de la copie. */
  copyThumbnailFiles(shotId: string, files: ThumbnailFiles): Promise<Result<ThumbnailFiles>>
  /** Chemin d'un fichier glissé depuis le Finder. */
  pathForFile(file: File): string
  /** Système (« darwin », « win32 », « linux ») : textes et raccourcis affichés (étape 16A). */
  platform: string
  /** Dimensions des vignettes (null si illisible). */
  getImageSizes(paths: string[]): Promise<Result<Record<string, Size | null>>>
  /** Réglages : (SUITE) aux reprises de parole, surbrillance de la ligne, thème ; appliqués tout de suite. */
  getContinuedMarks(): Promise<boolean>
  setContinuedMarks(enabled: boolean): Promise<void>
  getHighlightActiveLine(): Promise<boolean>
  setHighlightActiveLine(highlight: boolean): Promise<void>
  getTheme(): Promise<ThemeChoice>
  setTheme(theme: ThemeChoice): Promise<void>
  getScriptColors(): Promise<ScriptColors>
  setScriptColors(colors: ScriptColors): Promise<void>
  /** Adresse de l'image d'accueil (celle de l'élève ou l'image livrée). */
  getWelcomeImage(): Promise<string>
  /** Sélecteur d'image ; copiée dans les données de l'application. Null si l'élève annule. */
  chooseWelcomeImage(): Promise<Result<string> | null>
  /** Retour à l'image d'origine. */
  resetWelcomeImage(): Promise<string>
  /** Zoom du texte de l'éditeur de scénario, mémorisé dans les préférences. */
  getScriptZoom(): Promise<number>
  setScriptZoom(zoom: number): Promise<void>
  /** Barre des éléments affichée, mémorisée dans les préférences (coche du menu Présentation). */
  getShowElementBar(): Promise<boolean>
  setShowElementBar(show: boolean): Promise<void>
  /** Navigateur de scènes affiché, mémorisé dans les préférences (coche du menu Présentation). */
  getShowSceneNavigator(): Promise<boolean>
  setShowSceneNavigator(show: boolean): Promise<void>
  /** Mode « avec vignettes » des cartes, mémorisé dans les préférences. */
  getShowThumbnails(): Promise<boolean>
  setShowThumbnails(show: boolean): Promise<void>
  /** Blocs ouverts du formulaire du générique pour le projet ouvert (vide = tout replié). */
  getCreditsOpenBlocks(): Promise<string[]>
  setCreditsOpenBlocks(open: string[]): Promise<void>
  /** Panneau des révisions affiché pour le projet ouvert (affiché par défaut). */
  getRevisionPanelShown(): Promise<boolean>
  setRevisionPanelShown(shown: boolean): Promise<void>
  /** Entrées personnelles des menus de plan (préférences de l'application). */
  getCustomVocabulary(): Promise<CustomVocabulary>
  setCustomVocabulary(value: CustomVocabulary): Promise<void>
  /** Fenêtre d'export vers Blender : proposition de .blend et Blender retenu. */
  getBlenderExportInfo(): Promise<Result<BlenderExportInfo>>
  /** Sélecteur d'enregistrement d'un .blend ; null si l'élève annule. */
  chooseBlendTarget(currentPath: string | null): Promise<Result<BlendTarget> | null>
  /** Sélecteur de l'application Blender 4.5 (vérifiée) ; null si l'élève annule. */
  chooseBlender(): Promise<Result<string> | null>
  /** Écrit le paquet d'échange, puis lance Blender si demandé. */
  exportToBlender(request: BlenderExportRequest): Promise<Result<BlenderLaunchStatus>>
  /** Relance Blender sur le dernier paquet exporté (après avoir choisi Blender). */
  launchBlender(): Promise<Result<BlenderLaunchStatus>>
  /** Options mémorisées de l'export PDF du scénario. */
  getPdfOptions(): Promise<Result<PdfExportOptions>>
  /** Génère le vrai PDF (texte actuel de l'éditeur) pour l'aperçu ; mémorise les options. */
  previewPdf(request: PdfExportRequest): Promise<Result<PdfPreview>>
  /** Enregistre le PDF (dans exports/ ou à l'endroit choisi) ; null si l'élève annule. */
  savePdf(request: PdfExportRequest, mode: PdfSaveMode): Promise<Result<PdfSavedFile> | null>
  /** Ouvre le dernier PDF enregistré, ou l'affiche dans son dossier. */
  openSavedPdf(action: PdfFileAction): Promise<Result<void>>
  /** Options mémorisées de l'export du storyboard et scènes du film (Cartes enregistrées d'abord). */
  getStoryboardInfo(): Promise<Result<StoryboardExportInfo>>
  /** Génère le vrai PDF du storyboard pour l'aperçu ; mémorise les options. */
  previewStoryboard(options: StoryboardExportOptions): Promise<Result<StoryboardPreview>>
  /** Enregistre le PDF et le fichier d'impression ; null si l'élève annule. */
  saveStoryboard(
    options: StoryboardExportOptions,
    mode: PdfSaveMode
  ): Promise<Result<PdfSavedFile> | null>
  /** Options mémorisées de l'export du planning. */
  getPlanningExportInfo(): Promise<Result<PlanningExportInfo>>
  /** Génère le vrai PDF (ou compte les événements du calendrier) pour l'aperçu. */
  previewPlanningExport(request: PlanningExportRequest): Promise<Result<PlanningExportPreview>>
  /** Enregistre le PDF ou le calendrier ; null si l'élève annule. */
  savePlanningExport(
    request: PlanningExportRequest,
    mode: PdfSaveMode
  ): Promise<Result<PdfSavedFile> | null>
  /** Met à jour les libellés « Annuler… » et « Rétablir… » du menu Édition. */
  setUndoState(state: UndoState): Promise<void>
  /** L'éditeur de dessin est ouvert : le zoom du menu agit sur la toile. */
  setDrawingOpen(open: boolean): Promise<void>
  /** Mode concentration : plein écran (et retour à l'état d'avant en sortant). */
  setFocusMode(active: boolean): Promise<void>
  /** Module affiché : le menu adapte Rechercher, le zoom et le mode concentration. */
  setActiveModule(module: ActiveModule): Promise<void>
  /** Titre modifié dans la fenêtre « Page de titre… » (texte sans marqueurs). */
  updateProjectTitle(title: string): Promise<Result<ProjectSummary>>
  /** Texte complet de scenario.fountain (page de titre comprise). */
  getScenario(): Promise<Result<string>>
  /** Nouveau texte complet du scénario, enregistré automatiquement. */
  updateScenario(text: string): Promise<Result<void>>
  /**
   * Vérifie si scenario.fountain a été modifié dans un autre logiciel. Sans modification en attente
   * dans NeoScenar, il est relu : renvoie son texte (null s'il n'y a rien à recharger).
   */
  checkScenario(): Promise<string | null>
  /** Décision de l'élève après une modification extérieure ; renvoie le texte à afficher. */
  resolveScenarioConflict(choice: ScenarioConflictChoice): Promise<Result<string>>
  /**
   * Copie scenario.fountain et decoupage.json dans neoscenar/sauvegardes/ avant que le rapprochement
   * ne les modifie. Renvoie le dossier créé, relatif à neoscenar/ (« sauvegardes/avant_liaison_… »).
   */
  backupLinkFiles(kind: LinkBackupKind): Promise<Result<string>>
  /** Fiches du module Recherches (relues sur le disque). */
  listSheets(kind: SheetKind): Promise<Result<Sheet[]>>
  /** Nouvelle fiche ; refusée si le nom est déjà pris. */
  createSheet(kind: SheetKind, name: string): Promise<Result<Sheet>>
  /** Fiches vides (« auto ») pour des noms du scénario ; les noms déjà pris sont passés. */
  createAutoSheets(kind: SheetKind, names: string[]): Promise<Result<Sheet[]>>
  /** Modification d'une fiche, enregistrée automatiquement (seuls les champs présents changent). */
  updateSheet(kind: SheetKind, fileName: string, patch: SheetPatch): Promise<Result<void>>
  /**
   * Renomme une fiche (nom et fichier) ; refusé si le nom est pris. `backup` : copie
   * « avant_renommage_… » d'abord (renvoyée, relative à neoscenar/).
   */
  renameSheet(
    kind: SheetKind,
    fileName: string,
    name: string,
    backup: boolean
  ): Promise<Result<SheetRename>>
  /** Supprime une fiche après l'avoir copiée dans sauvegardes/ ; renvoie le chemin de la copie. */
  deleteSheet(kind: SheetKind, fileName: string): Promise<Result<string>>
  /** Copie une image (choisie ou glissée) dans le dossier images/ des fiches. */
  storeSheetImageFile(kind: SheetKind, sourcePath: string): Promise<Result<SheetImage>>
  /** Même chose pour une image sans fichier (glissée depuis une autre application). */
  storeSheetImageBytes(
    kind: SheetKind,
    bytes: Uint8Array,
    name: string
  ): Promise<Result<SheetImage>>
  /** Écrit tout de suite les modifications de fiches en attente. */
  flushSheets(): Promise<void>
  /** Arbre des documents (neoscenar/documents/), relu sur le disque. */
  listDocuments(): Promise<Result<DocumentFolder>>
  /** Nouveau dossier dans `parent` (« » = racine) ; renvoie son chemin. Refusé si le nom est pris. */
  createDocumentFolder(parent: string, name: string): Promise<Result<string>>
  /** Nouvelle note vide dans `folder` ; renvoie son chemin. */
  createDocumentNote(folder: string, name: string): Promise<Result<string>>
  /** Renomme un dossier ou une note ; renvoie le nouveau chemin. */
  renameDocument(path: string, name: string): Promise<Result<string>>
  /** Supprime un dossier ou une note après copie dans sauvegardes/ ; renvoie le chemin de la copie. */
  deleteDocument(path: string): Promise<Result<string>>
  readDocumentNote(path: string): Promise<Result<string>>
  /** Nouveau texte d'une note, enregistré automatiquement. */
  writeDocumentNote(path: string, text: string): Promise<Result<void>>
  /** Synopsis, pitch, note d'intention, log line ou tag line (dans neoscenar/) ; un fichier absent donne ''. */
  readProjectText(name: ProjectTextName): Promise<Result<string>>
  writeProjectText(name: ProjectTextName, text: string): Promise<Result<void>>
  storeDocumentImageFile(folder: string, sourcePath: string): Promise<Result<DocumentImage>>
  storeDocumentImageBytes(
    folder: string,
    bytes: Uint8Array,
    name: string
  ): Promise<Result<DocumentImage>>
  /** Retire une image de la galerie : le fichier est déplacé dans sauvegardes/. */
  removeDocumentImage(folder: string, fileName: string): Promise<Result<string>>
  /**
   * Planning du projet (étape 15B) et équipe du générique, relus à chaque appel. `changed` : le
   * fichier a été modifié ailleurs depuis la dernière lecture ou le dernier enregistrement.
   */
  getPlanning(): Promise<Result<PlanningContent>>
  /** Nouveau planning de l'interface, enregistré automatiquement. */
  updatePlanning(planning: Planning): Promise<Result<void>>
  /** Générique : modèle de l'école, données du projet (generique.json) et type du projet. */
  getCredits(): Promise<Result<CreditsContent>>
  /** Nouvelles données du générique, enregistrées automatiquement. */
  updateCredits(data: CreditsData): Promise<Result<void>>
  /** Copie un logo dans le projet ; renvoie son chemin relatif à neoscenar/. */
  storeCreditsLogoFile(sourcePath: string): Promise<Result<string>>
  storeCreditsLogoBytes(bytes: Uint8Array, name: string): Promise<Result<string>>
  /** Octets d'un logo du générique (chemin relatif à neoscenar/), pour le dessiner. */
  readCreditsLogo(path: string): Promise<Result<Uint8Array>>
  /** Écrit les PNG du générique dans 08_Graphisme/Generique/ ; renvoie ce dossier (relatif). */
  saveCreditsPngs(files: { name: string; bytes: Uint8Array }[]): Promise<Result<string>>
  /** Écrit generique.txt ; renvoie son chemin relatif au dossier du film. */
  saveCreditsText(text: string): Promise<Result<string>>
  /** Montre le dossier des exports du générique dans le Finder ou l'Explorateur. */
  revealCreditsExport(): Promise<Result<void>>
  /** Copie un texte dans le presse-papiers du système. */
  copyText(text: string): Promise<void>
  /** Versions du projet ouvert (étape 13C). */
  listVersions(): Promise<Result<VersionList>>
  saveVersion(name: string, note: string): Promise<Result<VersionEntry>>
  /** Restaure une version ; `undo` : annulation d'une restauration (pas de version « Avant… »). */
  restoreVersion(folder: string, undo: boolean): Promise<Result<RestoredVersion>>
  /** Déplace une version dans sauvegardes/versions_supprimees/. */
  deleteVersion(folder: string): Promise<Result<string>>
  /** Texte de scenario.fountain d'une version ; `folder` null = scénario actuel (étape 13C). */
  readVersionScript(folder: string | null): Promise<Result<VersionScript>>
  /** Choix du dossier, copie, puis ouverture du nouveau projet ; null si l'élève annule. */
  duplicateVersion(folder: string): Promise<Result<ProjectSummary> | null>
  /** Abonnements : chaque fonction renvoie de quoi se désabonner. */
  onProjectChanged(listener: (project: ProjectSummary | null) => void): () => void
  /** Le thème a changé (réglages) : toutes les fenêtres appliquent les nouvelles couleurs. */
  onThemeChanged(listener: (theme: ThemeChoice) => void): () => void
  onScriptColorsChanged(listener: (colors: ScriptColors) => void): () => void
  onError(listener: (message: string) => void): () => void
  onSaveStatus(listener: (status: SaveStatus) => void): () => void
  onScenarioStatus(listener: (status: ScenarioSaveStatus) => void): () => void
  onResearchStatus(listener: (status: SaveStatus) => void): () => void
  onMenuCommand(listener: (command: MenuCommand) => void): () => void
  /**
   * Répond aux questions du processus principal, au moment du clic droit : la marque de révision
   * visée, ou null (étape 13E).
   */
  onRevisionContextQuery(answer: () => RevisionContextInfo | null): () => void
}
