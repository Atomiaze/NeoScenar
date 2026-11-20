import type { ProjectType } from './projectTypes'

/** Modèle de dossiers du film (resources/modeles/saint-luc.json). */
export interface FolderTemplate {
  formatVersion: number
  id: string
  name: string
  folders: TemplateFolder[]
}

export interface TemplateFolder {
  /** Nom du dossier, sans accent ni espace (« 04_Son »). */
  name: string
  /** Courte description, affichée dans la fenêtre et reprise dans le LISEZMOI. */
  description: string
  /** Sous-dossiers, séparés par « / » (« Assets/Personnages »). */
  subfolders: string[]
  /** Types de projet pour lesquels le dossier est coché par défaut. */
  defaultFor: ('film' | 'animation')[]
}

/** Dossiers cochés par défaut selon le type de projet. Mixte = Film + Animation. */
export function defaultFoldersFor(template: FolderTemplate, type: ProjectType): string[] {
  const accepted: Record<ProjectType, ('film' | 'animation')[]> = {
    film: ['film'],
    animation: ['animation'],
    mixte: ['film', 'animation'],
    personnalise: []
  }
  return template.folders
    .filter((folder) => folder.defaultFor.some((kind) => accepted[type].includes(kind)))
    .map((folder) => folder.name)
}
