import { app } from 'electron'
import { join } from 'node:path'

// Emplacements qui dépendent du système ou du mode (développement / application construite).

/** Modèle de dossiers livré avec l'application (copié dans les ressources par electron-builder). */
export function folderTemplatePath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'modeles', 'saint-luc.json')
    : join(app.getAppPath(), 'resources', 'modeles', 'saint-luc.json')
}

/** Modèle de générique, rangé à côté du modèle de dossiers (un seul dossier de modèles). */
export function creditsTemplatePath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'modeles', 'generique-saint-luc.json')
    : join(app.getAppPath(), 'resources', 'modeles', 'generique-saint-luc.json')
}

/** Vocabulaire du cours livré avec l'application (échelles, mouvements, angles). */
export function vocabularyPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'vocabulaire', 'saint-luc.json')
    : join(app.getAppPath(), 'resources', 'vocabulaire', 'saint-luc.json')
}

/** Formats d'image proposés (préréglages et cadences). */
export function formatsPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'formats', 'formats.json')
    : join(app.getAppPath(), 'resources', 'formats', 'formats.json')
}

/** Polices Courier Prime (incorporées dans le PDF) et profil de mise en page du scénario. */
export function pdfResourcePaths(): { fontsDir: string; layoutPath: string } {
  const base = app.isPackaged ? process.resourcesPath : join(app.getAppPath(), 'resources')
  return {
    fontsDir: join(base, 'polices', 'courier-prime'),
    layoutPath: join(base, 'mise-en-page', 'final-draft-a4.json')
  }
}

/** Police Inter (OFL) du storyboard, incorporée dans le PDF. */
export function storyboardFontsDir(): string {
  const base = app.isPackaged ? process.resourcesPath : join(app.getAppPath(), 'resources')
  return join(base, 'polices', 'inter')
}

/** Dossier proposé par défaut pour un nouveau projet : Documents, sur les trois systèmes. */
export function defaultProjectsLocation(): string {
  return app.getPath('documents')
}

/**
 * Dossier ouvert par le sélecteur de Blender : Applications sur Mac, Program Files sous Windows,
 * le dossier personnel sous Linux.
 */
export function blenderDialogFolder(): string {
  if (process.platform === 'darwin') return '/Applications'
  if (process.platform === 'win32' && process.env.ProgramFiles) return process.env.ProgramFiles
  return app.getPath('home')
}

/** Dictionnaire français du correcteur (Windows et Linux), livré avec l'application. */
export function dictionariesDir(): string {
  const base = app.isPackaged ? process.resourcesPath : join(app.getAppPath(), 'resources')
  return join(base, 'dictionnaires')
}

/** Image d'accueil livrée avec l'application. */
export function defaultWelcomeImagePath(): string {
  const base = app.isPackaged ? process.resourcesPath : join(app.getAppPath(), 'resources')
  return join(base, 'accueil', 'visuel-accueil.jpg')
}
