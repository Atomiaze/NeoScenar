import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { writeJsonSafely } from './fs/safeWrite'
import { CARD_ZOOM, clampCardZoom } from '../shared/cardZoom'
import { parseCreditsOpen, type CreditsOpenByProject } from '../shared/credits/openState'
import { clampScriptZoom, DEFAULT_SCRIPT_ZOOM } from '../shared/scriptZoom'
import { parseScriptColors, type ScriptColors } from '../shared/themes/scriptColors'
import { isWelcomeImageCopyName } from '../shared/welcomeImage'
import { DEFAULT_THEME, parseTheme, type ThemeChoice } from '../shared/themes/themes'

// Préférences de l'application, dans le dossier userData d'Electron, jamais dans les projets.
// C'est le seul endroit où des chemins absolus sont enregistrés.

export const MAX_RECENT_PROJECTS = 10
const PREFERENCES_FILE = 'preferences.json'

export interface RecentProject {
  /** Chemin absolu du fichier .neoscenar. */
  filePath: string
  title: string
  /** Identifiant du projet (projet.json), pour reconnaître une copie ; absent des anciennes listes. */
  id?: string
  /** Date ISO 8601. */
  lastOpenedAt: string
}

export interface Preferences {
  formatVersion: 1
  lastLocation: string | null
  recentProjects: RecentProject[]
  /** Taille des cartes du module Cartes. */
  cardZoom: number
  /** Mode « avec vignettes » du module Cartes. */
  showThumbnails: boolean
  /** Emplacement de Blender 4.5 (application sur Mac), ou null : recherche automatique. */
  blenderPath: string | null
  /** Navigateur de scènes affiché à gauche de l'éditeur de scénario. */
  showSceneNavigator: boolean
  /** Barre des éléments (colonne d'icônes) affichée entre le navigateur et la page. */
  showElementBar: boolean
  /** Zoom du texte de l'éditeur de scénario (1 = 100 %). */
  scriptZoom: number
  /** Surbrillance discrète de la ligne du curseur dans l'éditeur de scénario. */
  highlightActiveLine: boolean
  /** Ajouter (SUITE) quand un personnage reprend la parole après une action (étape 13D). */
  continuedMarks: boolean
  /** Thème de l'application : Automatique (comme le Mac), Clair ou Sombre. */
  theme: ThemeChoice
  /** Couleurs du scénario à l'écran, par jeu de couleurs : seulement les différences (14B). */
  scriptColors: ScriptColors
  /** Nom de la copie de l'image d'accueil (dossier `accueil/` de userData), ou null : image livrée. */
  welcomeImage: string | null
  /** Blocs ouverts du formulaire du générique, par projet (17C). */
  creditsOpen: CreditsOpenByProject
}

export function emptyPreferences(): Preferences {
  return {
    formatVersion: 1,
    lastLocation: null,
    recentProjects: [],
    cardZoom: CARD_ZOOM.default,
    showThumbnails: false,
    blenderPath: null,
    showSceneNavigator: true,
    showElementBar: true,
    scriptZoom: DEFAULT_SCRIPT_ZOOM,
    highlightActiveLine: true,
    continuedMarks: false,
    theme: DEFAULT_THEME,
    scriptColors: {},
    welcomeImage: null,
    creditsOpen: {}
  }
}

/** Place le projet en tête de liste, sans doublon, et garde les 10 plus récents. */
export function addRecentProject(list: RecentProject[], entry: RecentProject): RecentProject[] {
  return [entry, ...list.filter((item) => item.filePath !== entry.filePath)].slice(
    0,
    MAX_RECENT_PROJECTS
  )
}

export function removeRecentProject(list: RecentProject[], filePath: string): RecentProject[] {
  return list.filter((item) => item.filePath !== filePath)
}

function isRecentProject(value: unknown): value is RecentProject {
  const item = value as RecentProject | null
  return (
    typeof item?.filePath === 'string' &&
    typeof item.title === 'string' &&
    typeof item.lastOpenedAt === 'string' &&
    (item.id === undefined || typeof item.id === 'string')
  )
}

/**
 * Lit les préférences. Un fichier absent ou abîmé donne des préférences vides : ce ne sont pas des
 * données de l'élève, et l'application doit toujours pouvoir démarrer.
 */
export async function loadPreferences(userDataDir: string): Promise<Preferences> {
  try {
    const raw = JSON.parse(await readFile(join(userDataDir, PREFERENCES_FILE), 'utf8'))
    return {
      formatVersion: 1,
      lastLocation: typeof raw.lastLocation === 'string' ? raw.lastLocation : null,
      recentProjects: Array.isArray(raw.recentProjects)
        ? raw.recentProjects.filter(isRecentProject).slice(0, MAX_RECENT_PROJECTS)
        : [],
      cardZoom: clampCardZoom(raw.cardZoom),
      showThumbnails: raw.showThumbnails === true,
      blenderPath: typeof raw.blenderPath === 'string' ? raw.blenderPath : null,
      showSceneNavigator: raw.showSceneNavigator !== false,
      showElementBar: raw.showElementBar !== false,
      scriptZoom: clampScriptZoom(raw.scriptZoom),
      highlightActiveLine: raw.highlightActiveLine !== false,
      continuedMarks: raw.continuedMarks === true,
      theme: parseTheme(raw.theme),
      scriptColors: parseScriptColors(raw.scriptColors),
      welcomeImage: isWelcomeImageCopyName(raw.welcomeImage) ? raw.welcomeImage : null,
      creditsOpen: parseCreditsOpen(raw.creditsOpen)
    }
  } catch {
    return emptyPreferences()
  }
}

export function savePreferences(userDataDir: string, preferences: Preferences): Promise<void> {
  return writeJsonSafely(join(userDataDir, PREFERENCES_FILE), preferences)
}
